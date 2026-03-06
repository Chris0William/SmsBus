using System.Text.Json;
using SmsBus.Web.Data;

namespace SmsBus.Web.Services;

/// <summary>后台服务：每小时自动更新 USD→CNY 汇率（使用日汇率接口，一天内不变）</summary>
public class ExchangeRateBackgroundService : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<ExchangeRateBackgroundService> _log;
    private readonly HttpClient _http = new();

    public ExchangeRateBackgroundService(IServiceProvider sp, ILogger<ExchangeRateBackgroundService> log)
    {
        _sp = sp;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("ExchangeRateBackgroundService 已启动");

        // 启动时立即更新一次
        await UpdateRateAsync(ct);

        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromHours(1), ct);
            await UpdateRateAsync(ct);
        }
    }

    private async Task UpdateRateAsync(CancellationToken ct)
    {
        try
        {
            // open.er-api.com 免费接口，每天更新一次，一天内返回相同汇率
            var res = await _http.GetAsync("https://open.er-api.com/v6/latest/USD", ct);
            res.EnsureSuccessStatusCode();
            var json = await res.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("result", out var result) && result.GetString() == "success"
                && root.TryGetProperty("rates", out var rates) && rates.TryGetProperty("CNY", out var cny))
            {
                var rate = Math.Round(cny.GetDecimal(), 2);

                using var scope = _sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var config = await db.PricingConfigs.FindAsync([1L], ct);
                if (config != null && config.UsdCnyRate != rate)
                {
                    var oldRate = config.UsdCnyRate;
                    config.UsdCnyRate = rate;
                    config.UpdatedAt = DateTime.Now;
                    await db.SaveChangesAsync(ct);
                    _log.LogInformation("汇率已更新: {OldRate} → {NewRate}", oldRate, rate);
                }
            }
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "获取汇率失败，将在下次重试");
        }
    }
}
