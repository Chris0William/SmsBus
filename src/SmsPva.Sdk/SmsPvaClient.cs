using System.Net.Security;
using System.Security.Authentication;
using System.Text.Json;
using System.Text.RegularExpressions;
using SmsPva.Sdk.Exceptions;
using SmsPva.Sdk.Models;

namespace SmsPva.Sdk;

/// <summary>
/// SMSPVA (smspva.com) 接码平台 API 客户端
///
/// 支持两套 API:
///   1. 一次性接码 (Legacy API): smspva.com/priemnik.php
///   2. 长期租赁 (Rental API): smspva.com/api/rent.php
/// </summary>
public partial class SmsPvaClient : IDisposable
{
    private const string LegacyBaseUrl = "https://smspva.com/priemnik.php";
    private const string RentalBaseUrl = "https://smspva.com/api/rent.php";

    private readonly HttpClient _http;
    private readonly string _apiKey;

    public SmsPvaClient(string apiKey, HttpClient? httpClient = null)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new ArgumentException("API Key 不能为空", nameof(apiKey));

        _apiKey = apiKey;
        if (httpClient != null)
        {
            _http = httpClient;
        }
        else
        {
            var handler = new SocketsHttpHandler
            {
                SslOptions = new SslClientAuthenticationOptions
                {
                    RemoteCertificateValidationCallback = (_, _, _, _) => true,
                    EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13
                },
                PooledConnectionLifetime = TimeSpan.FromMinutes(10),
                ConnectTimeout = TimeSpan.FromSeconds(15)
            };
            _http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(30) };
            _http.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0");
        }
    }

    // ==================== 通用 ====================

    /// <summary>获取用户信息（余额、karma等）</summary>
    public async Task<UserInfo> GetUserInfoAsync(CancellationToken ct = default)
    {
        var json = await LegacyRequestAsync("get_userinfo", [], ct);
        return new UserInfo
        {
            Name = json.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
            Balance = json.TryGetProperty("balance", out var b) ? ParseDecimal(b) : 0,
            Karma = json.TryGetProperty("karma", out var k) ? ParseDecimal(k) : 0
        };
    }

    // ==================== 一次性接码 (Legacy API) ====================

    /// <summary>获取所有可用的一次性接码服务列表</summary>
    public async Task<List<ActivationServiceInfo>> GetActivationServicesAsync(CancellationToken ct = default)
    {
        var url = $"{LegacyBaseUrl}?metod=get_services&apikey={_apiKey}";
        var body = await GetWithRetryAsync(url, ct);
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var result = new List<ActivationServiceInfo>();
        if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in root.EnumerateArray())
            {
                var name = item.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                var code = item.TryGetProperty("code", out var c) ? c.GetString() ?? "" : "";
                if (!string.IsNullOrEmpty(code))
                    result.Add(new ActivationServiceInfo { Name = name, Code = code });
            }
        }
        return result;
    }

    /// <summary>查询可用号码数量和价格</summary>
    public async Task<CountInfo> GetCountAsync(string serviceCode, string countryCode, CancellationToken ct = default)
    {
        var json = await LegacyRequestAsync("get_count_new", [
            ("service", serviceCode),
            ("country", countryCode)
        ], ct);
        return new CountInfo
        {
            Total = json.TryGetProperty("online", out var o) ? ParseInt(o) :
                    json.TryGetProperty("count", out var c) ? ParseInt(c) : 0,
            Price = json.TryGetProperty("price", out var p) ? ParseDecimal(p) : 0
        };
    }

    /// <summary>获取服务价格</summary>
    public async Task<decimal> GetServicePriceAsync(string serviceCode, string countryCode, CancellationToken ct = default)
    {
        var json = await LegacyRequestAsync("get_service_price", [
            ("service", serviceCode),
            ("country", countryCode)
        ], ct);
        return json.TryGetProperty("price", out var p) ? ParseDecimal(p) : 0;
    }

    /// <summary>获取一个一次性号码</summary>
    public async Task<ActivationNumber> GetNumberAsync(string serviceCode, string countryCode, CancellationToken ct = default)
    {
        var json = await LegacyRequestAsync("get_number", [
            ("service", serviceCode),
            ("country", countryCode)
        ], ct);
        return new ActivationNumber
        {
            Id = json.TryGetProperty("id", out var id) ? ParseInt(id) : 0,
            Number = json.TryGetProperty("number", out var num) ? num.GetString() ?? "" : "",
            CountryCode = json.TryGetProperty("CountryCode", out var cc) ? cc.GetString() ?? "" : ""
        };
    }

    /// <summary>获取短信（一次性接码）</summary>
    /// <returns>短信信息；未收到返回 null；订单过期抛异常</returns>
    public async Task<ActivationSms?> GetSmsAsync(
        string serviceCode, string countryCode, int numberId, CancellationToken ct = default)
    {
        // get_sms 有特殊返回值 (response=2 等待, response=3 过期)，不能用通用 LegacyRequestAsync
        var url = $"{LegacyBaseUrl}?metod=get_sms&service={Uri.EscapeDataString(serviceCode)}&country={Uri.EscapeDataString(countryCode)}&id={numberId}&apikey={_apiKey}";

        var body = await GetWithRetryAsync(url, ct);

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement.Clone();

        var resp = root.TryGetProperty("response", out var rProp) ? rProp.ToString() : "";

        if (resp == "2") return null; // 尚未收到
        if (resp == "3") throw new SmsPvaException("订单已过期", 3);
        if (resp == "error")
        {
            var msg = root.TryGetProperty("error_msg", out var e) ? e.GetString() : "未知错误";
            throw new SmsPvaException(msg ?? "API 错误", 0);
        }

        var smsText = root.TryGetProperty("text", out var t) ? t.GetString() ?? "" :
                      root.TryGetProperty("sms", out var s2) ? s2.GetString() ?? "" : "";
        return new ActivationSms
        {
            Code = ExtractVerificationCode(smsText) ?? "",
            Text = smsText
        };
    }

    /// <summary>取消/退回号码（一次性接码）</summary>
    public async Task DenyNumberAsync(string serviceCode, string countryCode, int numberId, CancellationToken ct = default)
    {
        await LegacyRequestAsync("denial", [
            ("service", serviceCode),
            ("country", countryCode),
            ("id", numberId.ToString())
        ], ct);
    }

    // ==================== 长期租赁 (Rental API) ====================

    /// <summary>获取租赁可用国家列表</summary>
    public async Task<List<RentalCountry>> GetRentalCountriesAsync(CancellationToken ct = default)
    {
        var json = await RentalRequestAsync("getcountries", [], ct);
        var result = new List<RentalCountry>();
        if (json.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in data.EnumerateArray())
            {
                result.Add(new RentalCountry
                {
                    Name = item.GetProperty("name").GetString() ?? "",
                    Code = item.GetProperty("code").GetString() ?? ""
                });
            }
        }
        return result;
    }

    /// <summary>获取某国家的租赁服务列表和价格</summary>
    public async Task<List<RentalService>> GetRentalServicesAsync(
        string countryCode, string? dtype = null, int? dcount = null, CancellationToken ct = default)
    {
        var parameters = new List<(string, string)> { ("country", countryCode) };
        if (dtype != null) parameters.Add(("dtype", dtype));
        if (dcount != null) parameters.Add(("dcount", dcount.Value.ToString()));

        var json = await RentalRequestAsync("getdata", parameters, ct);
        var result = new List<RentalService>();

        // API 返回 data.services 数组 或 data 直接是数组
        JsonElement services = default;
        if (json.TryGetProperty("data", out var data))
        {
            if (data.ValueKind == JsonValueKind.Array)
                services = data;
            else if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("services", out var svc) && svc.ValueKind == JsonValueKind.Array)
                services = svc;
        }

        if (services.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in services.EnumerateArray())
            {
                result.Add(new RentalService
                {
                    Name = item.TryGetProperty("name", out var n) ? n.GetString() ?? "" :
                           item.TryGetProperty("sname", out var sn) ? sn.GetString() ?? "" : "",
                    Code = item.TryGetProperty("service", out var sv) ? sv.GetString() ?? "" :
                           item.TryGetProperty("code", out var c) ? c.GetString() ?? "" :
                           item.TryGetProperty("scode", out var sc) ? sc.GetString() ?? "" : "",
                    Price = item.TryGetProperty("price_day", out var pd) ? ParseDecimal(pd) :
                            item.TryGetProperty("price", out var p) ? ParseDecimal(p) : 0,
                    Count = item.TryGetProperty("count", out var cnt) ? ParseInt(cnt) :
                            item.TryGetProperty("total", out var tot) ? ParseInt(tot) : 0
                });
            }
        }
        return result;
    }

    /// <summary>创建租赁订单</summary>
    public async Task<RentalOrder> CreateRentalAsync(
        string countryCode, string serviceCode, string dtype, int dcount, CancellationToken ct = default)
    {
        var json = await RentalRequestAsync("create", [
            ("country", countryCode),
            ("service", serviceCode),
            ("dtype", dtype),
            ("dcount", dcount.ToString())
        ], ct);
        return ParseRentalOrder(json.GetProperty("data"));
    }

    /// <summary>获取所有租赁订单</summary>
    public async Task<List<RentalOrder>> GetRentalOrdersAsync(CancellationToken ct = default)
    {
        var json = await RentalRequestAsync("orders", [], ct);
        var result = new List<RentalOrder>();
        if (json.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in data.EnumerateArray())
                result.Add(ParseRentalOrder(item));
        }
        return result;
    }

    /// <summary>激活租赁号码</summary>
    public async Task ActivateRentalAsync(int orderId, CancellationToken ct = default)
    {
        await RentalRequestAsync("activate", [("id", orderId.ToString())], ct);
    }

    /// <summary>读取租赁号码的短信（使用 sms 方法，只需 orderId）</summary>
    public async Task<List<SmsMessage>> ReadRentalSmsAsync(int orderId, CancellationToken ct = default)
    {
        var json = await RentalRequestAsync("sms", [("id", orderId.ToString())], ct);

        var result = new List<SmsMessage>();
        if (json.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
        {
            // data.SmsList 数组
            if (data.TryGetProperty("SmsList", out var smsList) && smsList.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in smsList.EnumerateArray())
                    result.Add(ParseSmsMessage(item));
            }
            // data.OtherSms 数组（其他服务的短信）
            if (data.TryGetProperty("OtherSms", out var otherSms) && otherSms.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in otherSms.EnumerateArray())
                    result.Add(ParseSmsMessage(item));
            }
        }
        return result;
    }

    /// <summary>读取租赁号码的短信（旧签名，兼容已有调用）</summary>
    [Obsolete("Use ReadRentalSmsAsync(orderId) instead")]
    public Task<List<SmsMessage>> ReadRentalSmsAsync(
        int orderId, string serviceCode, string phoneNumber, CancellationToken ct = default)
        => ReadRentalSmsAsync(orderId, ct);

    /// <summary>续费租赁号码</summary>
    public async Task ProlongRentalAsync(int orderId, string dtype, int dcount, CancellationToken ct = default)
    {
        await RentalRequestAsync("prolong", [
            ("id", orderId.ToString()),
            ("dtype", dtype),
            ("dcount", dcount.ToString())
        ], ct);
    }

    /// <summary>删除租赁订单</summary>
    public async Task DeleteRentalAsync(int orderId, CancellationToken ct = default)
    {
        await RentalRequestAsync("delete", [("id", orderId.ToString())], ct);
    }

    // ==================== 工具 ====================

    /// <summary>从短信内容中提取数字验证码（4-8位）</summary>
    public static string? ExtractVerificationCode(string smsBody)
    {
        // 优先匹配关键词后面的验证码
        var keywordMatch = KeywordCodeRegex().Match(smsBody);
        if (keywordMatch.Success) return keywordMatch.Groups[1].Value;
        // 回退：匹配第一个独立的4-8位数字
        var match = FallbackCodeRegex().Match(smsBody);
        return match.Success ? match.Groups[1].Value : null;
    }

    // ==================== 内部方法 ====================

    private async Task<string> GetWithRetryAsync(string url, CancellationToken ct, int maxRetries = 3)
    {
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                var response = await _http.GetAsync(url, ct);
                var body = await response.Content.ReadAsStringAsync(ct);
                if (!response.IsSuccessStatusCode)
                    throw new SmsPvaException($"HTTP {(int)response.StatusCode}: {body}");
                return body;
            }
            catch (HttpRequestException) when (i < maxRetries - 1)
            {
                await Task.Delay(800 * (i + 1), ct);
            }
        }
        // 不会到这里，但编译器需要
        throw new SmsPvaException("请求失败");
    }

    private async Task<JsonElement> LegacyRequestAsync(
        string method, IEnumerable<(string key, string value)> parameters, CancellationToken ct)
    {
        var url = $"{LegacyBaseUrl}?metod={method}&apikey={_apiKey}";
        foreach (var (key, value) in parameters)
            url += $"&{key}={Uri.EscapeDataString(value)}";

        var body = await GetWithRetryAsync(url, ct);

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement.Clone();

        var resp = root.TryGetProperty("response", out var rProp) ? rProp.ToString() : "";
        if (resp == "error")
        {
            var msg = root.TryGetProperty("error_msg", out var msgProp) ? msgProp.GetString() : "未知错误";
            throw new SmsPvaException(msg ?? "API 错误", 0);
        }

        return root;
    }

    private async Task<JsonElement> RentalRequestAsync(
        string method, IEnumerable<(string key, string value)> parameters, CancellationToken ct)
    {
        var url = $"{RentalBaseUrl}?method={method}&apikey={_apiKey}";
        foreach (var (key, value) in parameters)
            url += $"&{key}={Uri.EscapeDataString(value)}";

        var body = await GetWithRetryAsync(url, ct);

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement.Clone();

        var status = root.TryGetProperty("status", out var sProp) ? sProp.GetInt32() : -1;
        if (status == 0)
        {
            // 构建不含 apikey 的参数串用于错误日志
            var paramStr = string.Join("&", parameters.Select(p => $"{p.key}={p.value}"));
            var msg = root.TryGetProperty("msg", out var msgProp) ? msgProp.GetString() : "未知错误";
            throw new SmsPvaException($"{msg} [method={method}, {paramStr}] response={body}", 0);
        }

        return root;
    }

    private static RentalOrder ParseRentalOrder(JsonElement item)
    {
        return new RentalOrder
        {
            Id = item.TryGetProperty("id", out var id) ? id.GetInt32() : 0,
            ServiceCode = item.TryGetProperty("scode", out var sc) ? sc.GetString() ?? "" : "",
            ServiceName = item.TryGetProperty("sname", out var sn) ? sn.GetString() ?? "" : "",
            State = item.TryGetProperty("state", out var st) ? st.GetInt32() : 0,
            PhoneNumber = item.TryGetProperty("pnumber", out var pn) ? pn.GetString() ?? "" : "",
            CountryDigitCode = item.TryGetProperty("ccode", out var cc) ? cc.GetString() ?? "" : "",
            CountryCode = item.TryGetProperty("cname", out var cn) ? cn.GetString() ?? "" : "",
            HasNewSms = item.TryGetProperty("hasnewsms", out var ns) && (ns.ValueKind == JsonValueKind.True || (ns.ValueKind == JsonValueKind.Number && ns.GetInt32() != 0)),
            Until = item.TryGetProperty("until", out var u) ? u.GetInt64() : 0,
            CanProlong = item.TryGetProperty("canprolong", out var cp) && (cp.ValueKind == JsonValueKind.True || (cp.ValueKind == JsonValueKind.Number && cp.GetInt32() != 0)),
            CanProlongMax = item.TryGetProperty("canprolongmax", out var cpm) ? cpm.GetInt32() : 0,
            CanProlongUntil = item.TryGetProperty("canprolonguntil", out var cpu) ? cpu.GetInt64() : 0,
            LastOnline = item.TryGetProperty("lastonline", out var lo) ? lo.GetInt64() : 0
        };
    }

    private static SmsMessage ParseSmsMessage(JsonElement item)
    {
        return new SmsMessage
        {
            Text = item.TryGetProperty("text", out var t) ? t.GetString() ?? "" : "",
            Sender = item.TryGetProperty("sender", out var s) ? s.GetString() ?? "" : "",
            Date = item.TryGetProperty("date", out var d) ? d.GetInt64() : 0
        };
    }

    private static decimal ParseDecimal(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.Number) return el.GetDecimal();
        if (el.ValueKind == JsonValueKind.String && decimal.TryParse(el.GetString(), out var d)) return d;
        return 0;
    }

    private static int ParseInt(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.Number) return el.GetInt32();
        if (el.ValueKind == JsonValueKind.String && int.TryParse(el.GetString(), out var i)) return i;
        return 0;
    }

    [GeneratedRegex(@"(?:验证码|code|Code|CODE|码)\s*[:：]?\s*(\d{4,8})", RegexOptions.IgnoreCase)]
    private static partial Regex KeywordCodeRegex();

    [GeneratedRegex(@"(?<!\d)(\d{4,8})(?!\d)")]
    private static partial Regex FallbackCodeRegex();

    public void Dispose()
    {
        _http.Dispose();
        GC.SuppressFinalize(this);
    }
}
