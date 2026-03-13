using SmsPva.Sdk;
using SmsBus.Web.Common;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

public class SmsPvaSupplierService : ISupplierService
{
    private readonly SmsPvaClient _client;
    private readonly bool _mockMode;

    public SmsPvaSupplierService(SmsPvaClient client, IConfiguration config)
    {
        _client = client;
        _mockMode = config.GetValue<bool>("SmsPva:MockMode");
    }

    public string Code => "smspva";
    public bool IsMockMode => _mockMode;

    // ============ 临时接码 ============

    private List<SmsPva.Sdk.Models.ActivationServiceInfo>? _cachedServices;
    private DateTime _servicesCacheTime;

    public async Task<List<ServiceInfo>> GetActivationServicesAsync()
    {
        if (_mockMode) return new List<ServiceInfo>
        {
            new("opt104", "TikTok"),
            new("opt1", "Google (YouTube, Gmail)"),
            new("opt29", "Telegram")
        };
        if (_cachedServices != null && DateTime.Now - _servicesCacheTime < TimeSpan.FromMinutes(10))
            return _cachedServices.Select(s => new ServiceInfo(s.Code, s.Name)).ToList();

        _cachedServices = await _client.GetActivationServicesAsync();
        _servicesCacheTime = DateTime.Now;
        return _cachedServices.Select(s => new ServiceInfo(s.Code, s.Name)).ToList();
    }

    public async Task<(int Count, decimal Price)> GetActivationCountAsync(string service, string country)
    {
        if (_mockMode) return (99, 0.50m);
        var info = await _client.GetCountAsync(service, country);
        var price = info.Price > 0 ? info.Price : await _client.GetServicePriceAsync(service, country);
        return (info.Total, price);
    }

    public async Task<NumberResult> GetNumberAsync(string service, string country)
    {
        if (_mockMode)
        {
            var fakeId = Random.Shared.Next(100000, 999999);
            return new NumberResult(fakeId.ToString(), $"+1555{fakeId % 10000000:D7}");
        }
        var number = await _client.GetNumberAsync(service, country);
        var fullNumber = (number.CountryCode + number.Number).TrimStart('+');
        return new NumberResult(number.Id.ToString(), "+" + fullNumber);
    }

    public async Task<SmsResult?> GetSmsAsync(string service, string country, string numberId)
    {
        if (_mockMode)
        {
            await Task.Delay(100);
            var code = Random.Shared.Next(1000, 9999).ToString();
            return new SmsResult($"Your code is {code}", code, DateTime.Now);
        }
        var sms = await _client.GetSmsAsync(service, country, int.Parse(numberId));
        if (sms == null) return null;
        return new SmsResult(sms.Text, sms.Code ?? SmsPvaClient.ExtractVerificationCode(sms.Text), DateTime.Now);
    }

    public async Task DenyNumberAsync(string service, string country, string numberId)
    {
        if (_mockMode) return;
        await _client.DenyNumberAsync(service, country, int.Parse(numberId));
    }

    // ============ 租赁 ============

    public async Task<List<ServiceInfo>> GetRentalServicesAsync(string country)
    {
        if (_mockMode) return new List<ServiceInfo>
        {
            new("opt6", "Telegram", 5.00m, 10),
            new("opt1", "WhatsApp", 8.00m, 5)
        };
        var services = await _client.GetRentalServicesAsync(country, "month", 1);
        return services.Select(s => new ServiceInfo(s.Code, s.Name, s.Price, s.Count)).ToList();
    }

    public async Task<RentalPriceResult> GetRentalPriceAsync(string country, string? service)
    {
        if (_mockMode) return new RentalPriceResult(5.00m * 30, 10, "opt6", "Telegram");

        var services = await _client.GetRentalServicesAsync(country, "month", 1);
        var svc = service != null
            ? services.FirstOrDefault(s => s.Code == service)
            : services.FirstOrDefault();
        if (svc == null) throw new InvalidOperationException("服务不可用");
        // SmsPva 返回日租价格，乘30转月租价格
        return new RentalPriceResult(svc.Price * 30, svc.Count, svc.Code, svc.Name);
    }

    public async Task<RentalResult> CreateRentalAsync(string country, string? service)
    {
        if (_mockMode)
        {
            var fakeId = Random.Shared.Next(10000, 99999);
            return new RentalResult(
                fakeId.ToString(),
                $"555{fakeId % 10000000:D7}",
                "1",
                DateTime.Now.AddDays(30),
                "active");
        }
        var rental = await _client.CreateRentalAsync(country, service!, "month", 1);
        return new RentalResult(
            rental.Id.ToString(),
            rental.PhoneNumber,
            rental.CountryDigitCode,
            rental.ExpiresAt,
            rental.StateText);
    }

    public async Task ActivateRentalAsync(string rentalId)
    {
        if (_mockMode) return;
        await _client.ActivateRentalAsync(int.Parse(rentalId));
    }

    public async Task ProlongRentalAsync(string rentalId)
    {
        if (_mockMode) return;
        await _client.ProlongRentalAsync(int.Parse(rentalId), "month", 1);
    }

    public async Task<List<SmsResult>> ReadRentalSmsAsync(string rentalId)
    {
        if (_mockMode) return new List<SmsResult>();
        var messages = await _client.ReadRentalSmsAsync(int.Parse(rentalId));
        return messages.Select(m => new SmsResult(
            m.Text,
            SmsPvaClient.ExtractVerificationCode(m.Text),
            m.ReceivedAt)).ToList();
    }

    public async Task<RentalStatusResult?> GetRentalStatusAsync(string rentalId)
    {
        if (_mockMode) return new RentalStatusResult(DateTime.Now.AddDays(30), "active");
        var allRentals = await _client.GetRentalOrdersAsync();
        var rental = allRentals.FirstOrDefault(r => r.Id == int.Parse(rentalId));
        if (rental == null) return null;
        return new RentalStatusResult(rental.ExpiresAt, rental.StateText);
    }

    public async Task DeleteRentalAsync(string rentalId)
    {
        if (_mockMode) return;
        await _client.DeleteRentalAsync(int.Parse(rentalId));
    }

    // ============ 账户 ============

    public async Task<decimal> GetBalanceAsync()
    {
        if (_mockMode) return 100.00m;
        var info = await _client.GetUserInfoAsync();
        return info.Balance;
    }
}
