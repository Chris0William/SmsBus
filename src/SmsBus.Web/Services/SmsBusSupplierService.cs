using SmsBus.Sdk;
using SmsBus.Sdk.Exceptions;
using SmsBus.Web.Common;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

/// <summary>
/// SMS-BUS (sms-bus.com) 供应商服务实现。
/// SMS-BUS 仅支持临时接码（activation），不支持长期租赁。
/// API 使用 country_id (int) 和 project_id (int)，需要缓存映射。
/// </summary>
public class SmsBusSupplierService : ISupplierService
{
    private readonly SmsBusClient _client;
    private readonly bool _mockMode;

    // 缓存: country code (US/FR) → SMS-BUS country_id
    private Dictionary<string, int>? _countryMap;
    private DateTime _countryMapTime;

    // 缓存: project list (services)
    private List<SmsBus.Sdk.Models.Project>? _cachedProjects;
    private DateTime _projectsCacheTime;

    public SmsBusSupplierService(SmsBusClient client, IConfiguration config)
    {
        _client = client;
        _mockMode = config.GetValue<bool>("SmsBus:MockMode");
    }

    public string Code => "smsbus";
    public bool IsMockMode => _mockMode;

    // ============ 临时接码 ============

    public async Task<List<ServiceInfo>> GetActivationServicesAsync()
    {
        if (_mockMode) return new List<ServiceInfo>
        {
            new("1", "Telegram"),
            new("2", "WhatsApp"),
            new("3", "Google")
        };

        var projects = await GetProjectsCachedAsync();
        return projects.Select(p => new ServiceInfo(p.Id.ToString(), p.Title)).ToList();
    }

    public async Task<(int Count, decimal Price)> GetActivationCountAsync(string service, string country)
    {
        if (_mockMode) return (50, 0.30m);

        var countryId = await ResolveCountryIdAsync(country);
        var projectId = int.Parse(service);
        var price = await _client.GetPriceAsync(countryId, projectId);
        return (price.Count, price.Price);
    }

    public async Task<NumberResult> GetNumberAsync(string service, string country)
    {
        if (_mockMode)
        {
            var fakeId = Random.Shared.Next(100000, 999999);
            return new NumberResult(fakeId.ToString(), $"+1555{fakeId % 10000000:D7}");
        }

        var countryId = await ResolveCountryIdAsync(country);
        var projectId = int.Parse(service);
        var result = await _client.GetNumberAsync(countryId, projectId);
        return new NumberResult(result.RequestId, result.Number);
    }

    public async Task<SmsResult?> GetSmsAsync(string service, string country, string numberId)
    {
        if (_mockMode)
        {
            await Task.Delay(100);
            var code = Random.Shared.Next(1000, 9999).ToString();
            return new SmsResult($"Your code is {code}", code, DateTime.Now);
        }

        var smsText = await _client.GetSmsAsync(numberId);
        if (smsText == null) return null;
        return new SmsResult(smsText, SmsBusClient.ExtractVerificationCode(smsText), DateTime.Now);
    }

    public async Task DenyNumberAsync(string service, string country, string numberId)
    {
        if (_mockMode) return;
        await _client.CancelNumberAsync(numberId);
    }

    // ============ 租赁 ============
    // SMS-BUS 租赁 API 使用 area_code (US/CA) 而不是 country_id
    // SupplierOrderId 编码为 "orderId|areaCode|mobileNumber" 便于后续操作

    /// <summary>解析 SupplierOrderId → (orderId, areaCode, mobileNumber)</summary>
    private static (string orderId, string areaCode, string mobileNumber) ParseRentalId(string rentalId)
    {
        var parts = rentalId.Split('|');
        if (parts.Length != 3) throw new ArgumentException($"无效的 SMS-BUS 租赁ID: {rentalId}");
        return (parts[0], parts[1], parts[2]);
    }

    private static string EncodeRentalId(string orderId, string areaCode, string mobileNumber)
        => $"{orderId}|{areaCode}|{mobileNumber}";

    // 缓存: rental areas
    private List<SmsBus.Sdk.Models.RentalArea>? _cachedAreas;
    private DateTime _areasCacheTime;

    public async Task<List<ServiceInfo>> GetRentalServicesAsync(string country)
    {
        // SMS-BUS 租赁不需要选服务（全服务），返回空列表
        // 但需要返回价格信息，用 area 列表获取
        if (_mockMode) return new List<ServiceInfo>();

        var areas = await GetRentalAreasCachedAsync();
        var area = areas.FirstOrDefault(a => a.AreaCode.Equals(country, StringComparison.OrdinalIgnoreCase));
        if (area == null) return new List<ServiceInfo>();
        // 返回一个虚拟的 "全服务" 条目，携带价格和库存
        return new List<ServiceInfo> { new("all", "全部服务", area.UnitPriceUsd, area.Total) };
    }

    public async Task<RentalPriceResult> GetRentalPriceAsync(string country, string? service)
    {
        if (_mockMode) return new RentalPriceResult(2.00m, 50, "all", "全部服务");

        var areas = await GetRentalAreasCachedAsync();
        var area = areas.FirstOrDefault(a => a.AreaCode.Equals(country, StringComparison.OrdinalIgnoreCase));
        if (area == null) throw new InvalidOperationException("该国家不支持租赁");
        // SMS-BUS unit_price 已经是月价(cents)，UnitPriceUsd 已换算为 USD
        return new RentalPriceResult(area.UnitPriceUsd, area.Total, "all", "全部服务");
    }

    public async Task<RentalResult> CreateRentalAsync(string country, string? service)
    {
        if (_mockMode)
        {
            var fakeId = Random.Shared.Next(10000, 99999);
            return new RentalResult(
                EncodeRentalId(fakeId.ToString(), country, $"555{fakeId % 10000000:D7}"),
                $"+1555{fakeId % 10000000:D7}", "1",
                DateTime.Now.AddDays(30), "active");
        }

        var order = await _client.RentNumberAsync(country, 1); // 每次只买1个月
        var fullNumber = $"+{order.DialingCode}{order.MobileNumber}";
        return new RentalResult(
            EncodeRentalId(order.OrderId, order.AreaCode, order.MobileNumber),
            fullNumber, order.DialingCode, order.ExpireAt, "active");
    }

    public Task ActivateRentalAsync(string rentalId)
    {
        // SMS-BUS 租赁不需要单独激活，购买即激活
        return Task.CompletedTask;
    }

    public async Task ProlongRentalAsync(string rentalId)
    {
        if (_mockMode) return;
        var (_, areaCode, mobileNumber) = ParseRentalId(rentalId);
        await _client.RenewRentalAsync(areaCode, mobileNumber, 1); // 续费1个月
    }

    public async Task<List<SmsResult>> ReadRentalSmsAsync(string rentalId)
    {
        if (_mockMode) return new List<SmsResult>();
        var (_, areaCode, mobileNumber) = ParseRentalId(rentalId);
        var smsList = await _client.GetRentalSmsListAsync(areaCode, mobileNumber);
        return smsList.Select(s => new SmsResult(
            s.Content,
            SmsBusClient.ExtractVerificationCode(s.Content),
            s.ReceiveAt)).ToList();
    }

    public async Task<RentalStatusResult?> GetRentalStatusAsync(string rentalId)
    {
        if (_mockMode) return new RentalStatusResult(DateTime.Now.AddDays(30), "active");
        var (_, areaCode, mobileNumber) = ParseRentalId(rentalId);
        var number = await _client.GetRentalNumberAsync(areaCode, mobileNumber);
        if (number == null) return null;
        var status = number.ExpireAt > DateTime.UtcNow ? "active" : "expired";
        return new RentalStatusResult(number.ExpireAt, status);
    }

    public async Task DeleteRentalAsync(string rentalId)
    {
        if (_mockMode) return;
        var (orderId, _, _) = ParseRentalId(rentalId);
        await _client.CancelRentalAsync(orderId);
    }

    private async Task<List<SmsBus.Sdk.Models.RentalArea>> GetRentalAreasCachedAsync()
    {
        if (_cachedAreas != null && DateTime.Now - _areasCacheTime < TimeSpan.FromMinutes(30))
            return _cachedAreas;
        _cachedAreas = await _client.GetRentalAreasAsync();
        _areasCacheTime = DateTime.Now;
        return _cachedAreas;
    }

    // ============ 账户 ============

    public async Task<decimal> GetBalanceAsync()
    {
        if (_mockMode) return 50.00m;
        var result = await _client.GetBalanceAsync();
        return result.Balance;
    }

    // ============ 内部方法 ============

    /// <summary>
    /// 将两位国家代码 (US/FR) 映射到 SMS-BUS 的 country_id。
    /// SMS-BUS API 的 list/countries 返回 {id, title}，title 是国家英文名。
    /// 需要一个 title → code 映射表。
    /// </summary>
    private async Task<int> ResolveCountryIdAsync(string countryCode)
    {
        if (_countryMap == null || DateTime.Now - _countryMapTime > TimeSpan.FromHours(1))
        {
            var countries = await _client.GetCountriesAsync();
            _countryMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var c in countries)
            {
                // 使用国家名→代码映射
                var code = CountryNameToCode(c.Title);
                if (code != null)
                    _countryMap[code] = c.Id;
            }
            _countryMapTime = DateTime.Now;
        }

        if (_countryMap.TryGetValue(countryCode, out var id))
            return id;
        throw new SmsBusException($"SMS-BUS 不支持国家: {countryCode}");
    }

    private async Task<List<SmsBus.Sdk.Models.Project>> GetProjectsCachedAsync()
    {
        if (_cachedProjects != null && DateTime.Now - _projectsCacheTime < TimeSpan.FromMinutes(30))
            return _cachedProjects;

        _cachedProjects = await _client.GetProjectsAsync();
        _projectsCacheTime = DateTime.Now;
        return _cachedProjects;
    }

    /// <summary>常见国家英文名 → 两位代码映射</summary>
    private static string? CountryNameToCode(string name) => name.ToLower() switch
    {
        "russia" => "RU", "ukraine" => "UA", "kazakhstan" => "KZ",
        "china" => "CN", "philippines" => "PH", "indonesia" => "ID",
        "malaysia" => "MY", "vietnam" => "VN", "thailand" => "TH",
        "india" => "IN", "myanmar" => "MM", "cambodia" => "KH",
        "usa" or "united states" => "US",
        "united kingdom" or "uk" or "england" => "UK",
        "canada" => "CA", "germany" => "DE", "france" => "FR",
        "spain" => "ES", "italy" => "IT", "netherlands" => "NL",
        "sweden" => "SE", "poland" => "PL", "romania" => "RO",
        "czech republic" or "czechia" => "CZ", "portugal" => "PT",
        "austria" => "AT", "belgium" => "BE", "switzerland" => "CH",
        "ireland" => "IE", "denmark" => "DK", "norway" => "NO",
        "finland" => "FI", "greece" => "GR", "hungary" => "HU",
        "croatia" => "HR", "serbia" => "RS", "bulgaria" => "BG",
        "slovakia" => "SK", "slovenia" => "SI", "latvia" => "LV",
        "lithuania" => "LT", "estonia" => "EE", "luxembourg" => "LU",
        "malta" => "MT", "cyprus" => "CY",
        "hong kong" => "HK", "taiwan" => "TW", "japan" => "JP",
        "south korea" or "korea" => "KR", "singapore" => "SG",
        "mexico" => "MX", "brazil" => "BR", "argentina" => "AR",
        "colombia" => "CO", "chile" => "CL", "peru" => "PE",
        "australia" => "AU", "new zealand" => "NZ",
        "turkey" => "TR", "egypt" => "EG", "nigeria" => "NG",
        "south africa" => "ZA", "israel" => "IL",
        "uae" or "united arab emirates" => "AE",
        "saudi arabia" => "SA", "georgia" => "GE",
        "moldova" => "MD", "belarus" => "BY",
        "morocco" => "MA", "kenya" => "KE", "ghana" => "GH",
        "pakistan" => "PK", "bangladesh" => "BD",
        "mongolia" => "MN", "macau" or "macao" => "MO",
        _ => null
    };
}
