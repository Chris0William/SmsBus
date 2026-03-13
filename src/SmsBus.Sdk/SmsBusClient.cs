using System.Net.Security;
using System.Text.Json;
using System.Text.RegularExpressions;
using SmsBus.Sdk.Exceptions;
using SmsBus.Sdk.Models;

namespace SmsBus.Sdk;

/// <summary>
/// SMS-BUS (sms-bus.com) 接码平台 API 客户端
///
/// API 接口（已验证）:
///   GET /get/balance?token=          — 查询余额
///   GET /list/countries?token=       — 获取可用国家列表
///   GET /list/projects?token=        — 获取可用服务列表
///   GET /list/prices?token=&amp;country_id=&amp;project_id= — 查询价格
///   GET /get/number?token=&amp;country_id=&amp;project_id=  — 获取临时号码
///   GET /get/sms?token=&amp;request_id=  — 获取短信（返回纯文本）
///   GET /cancel?token=&amp;request_id=   — 取消/释放号码
///   GET /reuse?token=&amp;country_id=&amp;project_id=&amp;mobile_number= — 复用号码
///   认证: URL 参数 token
/// </summary>
public partial class SmsBusClient : IDisposable
{
    private const string DefaultBaseUrl = "https://sms-bus.com/api/control";

    private readonly HttpClient _http;
    private readonly string _token;
    private readonly string _baseUrl;

    /// <param name="token">API Token（在 sms-bus.com 个人资料页获取）</param>
    /// <param name="baseUrl">API 基础 URL，默认 https://sms-bus.com/api/control</param>
    /// <param name="httpClient">可选的自定义 HttpClient</param>
    public SmsBusClient(string token, string? baseUrl = null, HttpClient? httpClient = null)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new ArgumentException("API Token 不能为空", nameof(token));

        _token = token;
        _baseUrl = baseUrl?.TrimEnd('/') ?? DefaultBaseUrl;
        if (httpClient != null)
        {
            _http = httpClient;
        }
        else
        {
            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (_, _, _, _) => true
            };
            _http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(30) };
        }
    }

    /// <summary>查询账户余额</summary>
    public async Task<BalanceResult> GetBalanceAsync(CancellationToken ct = default)
    {
        var json = await GetJsonAsync("/get/balance", ct);
        var balance = json.GetProperty("balance").GetDecimal();
        return new BalanceResult
        {
            Balance = balance,
            Currency = "USD"
        };
    }

    /// <summary>获取可用国家列表</summary>
    public async Task<List<Country>> GetCountriesAsync(CancellationToken ct = default)
    {
        var json = await GetJsonAsync("/list/countries", ct);
        var result = new List<Country>();
        foreach (var prop in json.EnumerateObject())
        {
            if (prop.Value.ValueKind == JsonValueKind.Object &&
                prop.Value.TryGetProperty("title", out var titleProp))
            {
                result.Add(new Country
                {
                    Id = int.Parse(prop.Name),
                    Title = titleProp.GetString() ?? prop.Name
                });
            }
        }
        return result;
    }

    /// <summary>获取可用服务/项目列表</summary>
    public async Task<List<Project>> GetProjectsAsync(CancellationToken ct = default)
    {
        var json = await GetJsonAsync("/list/projects", ct);
        var result = new List<Project>();
        foreach (var prop in json.EnumerateObject())
        {
            if (prop.Value.ValueKind == JsonValueKind.Object &&
                prop.Value.TryGetProperty("title", out var titleProp))
            {
                result.Add(new Project
                {
                    Id = int.Parse(prop.Name),
                    Title = titleProp.GetString() ?? prop.Name
                });
            }
        }
        return result;
    }

    /// <summary>查询指定国家和服务的价格</summary>
    public async Task<PriceInfo> GetPriceAsync(int countryId, int projectId, CancellationToken ct = default)
    {
        // API 返回格式: {"3": {"country_id":80, "project_id":3, "cost":0.14, "total_count":680, ...}, ...}
        var json = await GetJsonAsync($"/list/prices&country_id={countryId}&project_id={projectId}", ct);
        var key = projectId.ToString();
        if (json.TryGetProperty(key, out var item))
        {
            return new PriceInfo
            {
                CountryId = countryId,
                ProjectId = projectId,
                Price = item.GetProperty("cost").GetDecimal(),
                Count = item.GetProperty("total_count").GetInt32()
            };
        }

        throw new SmsBusException($"未找到国家 {countryId} 服务 {projectId} 的价格信息");
    }

    /// <summary>获取一个临时号码</summary>
    /// <param name="countryId">国家 ID</param>
    /// <param name="projectId">服务/项目 ID</param>
    public async Task<NumberResult> GetNumberAsync(int countryId, int projectId, CancellationToken ct = default)
    {
        var json = await GetJsonAsync($"/get/number&country_id={countryId}&project_id={projectId}", ct);
        return new NumberResult
        {
            RequestId = json.GetProperty("request_id").ToString(),
            Number = json.GetProperty("number").GetString() ?? string.Empty
        };
    }

    /// <summary>获取短信内容（返回纯文本，无短信时返回 null）</summary>
    /// <param name="requestId">获取号码时返回的 request_id</param>
    public async Task<string?> GetSmsAsync(string requestId, CancellationToken ct = default)
    {
        try
        {
            var json = await GetJsonAsync($"/get/sms&request_id={requestId}", ct);
            // GetJsonAsync 已经解包了外层 data 字段
            // 如果 data 是纯文本字符串，直接返回
            if (json.ValueKind == JsonValueKind.String)
                return json.GetString();
            // 如果 data 是对象，尝试读取 sms 字段
            if (json.TryGetProperty("sms", out var smsProp))
                return smsProp.GetString();
            return json.ToString();
        }
        catch (SmsBusException)
        {
            return null; // 尚未收到短信
        }
    }

    /// <summary>取消/释放号码</summary>
    public async Task CancelNumberAsync(string requestId, CancellationToken ct = default)
    {
        await GetJsonAsync($"/cancel&request_id={requestId}", ct);
    }

    /// <summary>复用之前用过的号码</summary>
    public async Task<NumberResult> ReuseNumberAsync(int countryId, int projectId, string mobileNumber,
        CancellationToken ct = default)
    {
        var encoded = Uri.EscapeDataString(mobileNumber);
        var json = await GetJsonAsync(
            $"/reuse&country_id={countryId}&project_id={projectId}&mobile_number={encoded}", ct);
        return new NumberResult
        {
            RequestId = json.GetProperty("request_id").ToString(),
            Number = json.GetProperty("number").GetString() ?? string.Empty
        };
    }

    /// <summary>
    /// 轮询等待短信到达
    /// </summary>
    /// <param name="requestId">获取号码时返回的 request_id</param>
    /// <param name="timeout">最长等待时间，默认 120 秒</param>
    /// <param name="pollingInterval">轮询间隔，默认 5 秒</param>
    /// <returns>短信内容；超时返回 null</returns>
    public async Task<string?> WaitForSmsAsync(
        string requestId,
        TimeSpan? timeout = null,
        TimeSpan? pollingInterval = null,
        CancellationToken ct = default)
    {
        var actualTimeout = timeout ?? TimeSpan.FromSeconds(120);
        var interval = pollingInterval ?? TimeSpan.FromSeconds(5);
        var deadline = DateTime.UtcNow + actualTimeout;

        while (DateTime.UtcNow < deadline)
        {
            ct.ThrowIfCancellationRequested();

            var sms = await GetSmsAsync(requestId, ct);
            if (sms != null)
                return sms;

            await Task.Delay(interval, ct);
        }

        return null;
    }

    /// <summary>从短信内容中提取数字验证码（4-8位）</summary>
    public static string? ExtractVerificationCode(string smsBody)
    {
        var match = VerificationCodeRegex().Match(smsBody);
        return match.Success ? match.Groups[1].Value : null;
    }

    private async Task<JsonElement> GetJsonAsync(string pathAndQuery, CancellationToken ct)
    {
        // pathAndQuery 格式: "/get/balance" 或 "/get/number&country_id=1&project_id=1"
        var url = pathAndQuery.Contains('&')
            ? $"{_baseUrl}{pathAndQuery.Split('&')[0]}?token={_token}&{string.Join("&", pathAndQuery.Split('&').Skip(1))}"
            : $"{_baseUrl}{pathAndQuery}?token={_token}";

        var response = await _http.GetAsync(url, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new SmsBusException($"HTTP {(int)response.StatusCode}: {body}");

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement.Clone();

        // SMS-BUS 返回格式: {"code": 200, "message": "Operation Success", "data": ...}
        // 错误时: {"code": xxx, "message": "错误信息"} 或 data 中包含错误码
        if (root.TryGetProperty("code", out var codeProp))
        {
            var code = codeProp.ValueKind == JsonValueKind.Number
                ? codeProp.GetInt32()
                : int.TryParse(codeProp.GetString(), out var c) ? c : 0;

            if (code != 200)
            {
                var msg = root.TryGetProperty("message", out var msgProp)
                    ? msgProp.GetString()
                    : "未知错误";
                throw new SmsBusException(msg ?? "API 返回错误", code.ToString());
            }
        }

        // 返回 data 字段内容，如果没有 data 则返回整个根
        if (root.TryGetProperty("data", out var dataProp2))
            return dataProp2;

        return root;
    }

    // ============ 租赁 API (base: https://api.sms-bus.com) ============

    private const string RentApiBase = "https://api.sms-bus.com";

    /// <summary>获取可租赁的国家/地区列表</summary>
    public async Task<List<Models.RentalArea>> GetRentalAreasAsync(CancellationToken ct = default)
    {
        var json = await GetRentJsonAsync("/v1/rent/list/area", ct);
        var result = new List<Models.RentalArea>();
        foreach (var item in json.EnumerateArray())
        {
            result.Add(new Models.RentalArea
            {
                AreaCode = item.GetProperty("area_code").GetString() ?? "",
                AreaTitle = item.GetProperty("area_title").GetString() ?? "",
                UnitPrice = item.GetProperty("unit_price").GetInt32(),
                MinMonth = item.GetProperty("min_month").GetInt32(),
                Total = item.GetProperty("total").GetInt32()
            });
        }
        return result;
    }

    /// <summary>租用一个号码</summary>
    /// <param name="areaCode">地区代码 (US/CA/GB)</param>
    /// <param name="months">租赁月数</param>
    public async Task<Models.RentalOrder> RentNumberAsync(string areaCode, int months, CancellationToken ct = default)
    {
        var json = await GetRentJsonAsync($"/v1/rent/get/number?area_code={areaCode}&time={months}", ct);
        return new Models.RentalOrder
        {
            OrderId = json.GetProperty("order_id").GetString() ?? "",
            MobileNumber = json.GetProperty("mobile_number").GetString() ?? "",
            DialingCode = json.GetProperty("dialing_code").GetString() ?? "",
            AreaCode = json.GetProperty("area_code").GetString() ?? "",
            ExpireAt = json.GetProperty("expire_at").GetDateTime(),
            KeepAt = json.GetProperty("keep_at").GetDateTime()
        };
    }

    /// <summary>续费租赁号码</summary>
    public async Task<Models.RentalOrder> RenewRentalAsync(string areaCode, string mobileNumber, int months, CancellationToken ct = default)
    {
        var json = await GetRentJsonAsync($"/v1/rent/renew/number?area_code={areaCode}&mobile_number={Uri.EscapeDataString(mobileNumber)}&time={months}", ct);
        return new Models.RentalOrder
        {
            OrderId = json.GetProperty("order_id").GetString() ?? "",
            MobileNumber = json.GetProperty("mobile_number").GetString() ?? "",
            DialingCode = json.GetProperty("dialing_code").GetString() ?? "",
            AreaCode = json.GetProperty("area_code").GetString() ?? "",
            ExpireAt = json.GetProperty("expire_at").GetDateTime(),
            KeepAt = json.GetProperty("keep_at").GetDateTime()
        };
    }

    /// <summary>取消租赁订单（20分钟内且未收到短信）</summary>
    public async Task CancelRentalAsync(string orderId, CancellationToken ct = default)
    {
        await GetRentJsonAsync($"/v1/rent/cancel/order?order_id={orderId}", ct);
    }

    /// <summary>获取租赁号码的短信列表</summary>
    public async Task<List<Models.RentalSms>> GetRentalSmsListAsync(string areaCode, string mobileNumber,
        int pageNum = 1, int pageSize = 100, CancellationToken ct = default)
    {
        var json = await GetRentJsonAsync($"/v1/rent/list/sms?area_code={areaCode}&mobile_number={Uri.EscapeDataString(mobileNumber)}&page_num={pageNum}&page_size={pageSize}", ct);
        var result = new List<Models.RentalSms>();
        if (json.TryGetProperty("list", out var list))
        {
            foreach (var item in list.EnumerateArray())
            {
                result.Add(new Models.RentalSms
                {
                    Content = item.GetProperty("content").GetString() ?? "",
                    ReceiveAt = item.GetProperty("receive_at").GetDateTime()
                });
            }
        }
        return result;
    }

    /// <summary>获取租赁号码状态（通过 list/number 接口查询）</summary>
    public async Task<Models.RentalNumber?> GetRentalNumberAsync(string areaCode, string mobileNumber, CancellationToken ct = default)
    {
        var json = await GetRentJsonAsync($"/v1/rent/list/number?area_code={areaCode}&mobile_number={Uri.EscapeDataString(mobileNumber)}&only_active=false&page_size=1", ct);
        if (json.TryGetProperty("list", out var list))
        {
            foreach (var item in list.EnumerateArray())
            {
                return new Models.RentalNumber
                {
                    AreaCode = item.GetProperty("area_code").GetString() ?? "",
                    AreaName = item.GetProperty("area_name").GetString() ?? "",
                    DialingCode = item.GetProperty("dialing_code").GetString() ?? "",
                    MobileNumber = item.GetProperty("mobile_number").GetString() ?? "",
                    FirstSeenAt = item.GetProperty("first_seen_at").GetDateTime(),
                    ExpireAt = item.GetProperty("expire_at").GetDateTime(),
                    KeepAt = item.GetProperty("keep_at").GetDateTime(),
                    AutoRenew = item.GetProperty("auto_renew").GetBoolean()
                };
            }
        }
        return null;
    }

    /// <summary>发送租赁 API 请求（基础URL不同于临时接码）</summary>
    private async Task<JsonElement> GetRentJsonAsync(string pathAndQuery, CancellationToken ct)
    {
        // pathAndQuery: "/v1/rent/list/area" 或 "/v1/rent/get/number?area_code=US&time=1"
        var separator = pathAndQuery.Contains('?') ? '&' : '?';
        var url = $"{RentApiBase}{pathAndQuery}{separator}token={_token}";

        var response = await _http.GetAsync(url, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new SmsBusException($"HTTP {(int)response.StatusCode}: {body}");

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement.Clone();

        if (root.TryGetProperty("code", out var codeProp))
        {
            var code = codeProp.ValueKind == JsonValueKind.Number
                ? codeProp.GetInt32()
                : int.TryParse(codeProp.GetString(), out var c) ? c : 0;

            if (code != 200)
            {
                var msg = root.TryGetProperty("message", out var msgProp)
                    ? msgProp.GetString()
                    : "未知错误";
                throw new SmsBusException(msg ?? "API 返回错误", code.ToString());
            }
        }

        if (root.TryGetProperty("data", out var dataProp))
            return dataProp;

        return root;
    }

    [GeneratedRegex(@"\b(\d{4,8})\b")]
    private static partial Regex VerificationCodeRegex();

    public void Dispose()
    {
        _http.Dispose();
        GC.SuppressFinalize(this);
    }
}
