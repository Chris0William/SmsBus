using Microsoft.Extensions.Configuration;
using SmsPva.Sdk;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

/// <summary>包装 SmsPvaClient，支持 MockMode</summary>
public class SupplierService : ISupplierService
{
    private readonly SmsPvaClient _client;
    private readonly bool _mockMode;

    public SupplierService(SmsPvaClient client, IConfiguration config)
    {
        _client = client;
        _mockMode = config.GetValue<bool>("SmsPva:MockMode");
    }

    public bool IsMockMode => _mockMode;

    // ============ 一次性接码 ============

    private List<SmsPva.Sdk.Models.ActivationServiceInfo>? _cachedServices;
    private DateTime _servicesCacheTime;

    public async Task<List<SmsPva.Sdk.Models.ActivationServiceInfo>> GetActivationServicesAsync()
    {
        if (_mockMode) return new List<SmsPva.Sdk.Models.ActivationServiceInfo>
        {
            new() { Name = "TikTok", Code = "opt104" },
            new() { Name = "Google (YouTube, Gmail)", Code = "opt1" },
            new() { Name = "Telegram", Code = "opt29" }
        };
        // 缓存 10 分钟
        if (_cachedServices != null && DateTime.Now - _servicesCacheTime < TimeSpan.FromMinutes(10))
            return _cachedServices;
        _cachedServices = await _client.GetActivationServicesAsync();
        _servicesCacheTime = DateTime.Now;
        return _cachedServices;
    }

    public async Task<(int Total, decimal Price)> GetActivationCountAsync(string service, string country)
    {
        if (_mockMode) return (99, 0.50m);
        var info = await _client.GetCountAsync(service, country);
        var price = info.Price > 0 ? info.Price : await _client.GetServicePriceAsync(service, country);
        return (info.Total, price);
    }

    public async Task<MockOrRealNumber> GetNumberAsync(string service, string country)
    {
        if (_mockMode)
        {
            var fakeId = Random.Shared.Next(100000, 999999);
            return new MockOrRealNumber(fakeId, $"+1555{fakeId % 10000000:D7}", true);
        }
        var number = await _client.GetNumberAsync(service, country);
        // CountryCode 已含 "+" 前缀（如 "+33"），避免重复
        var fullNumber = (number.CountryCode + number.Number).TrimStart('+');
        return new MockOrRealNumber(number.Id, "+" + fullNumber, false);
    }

    public async Task<(string? Text, string? Code)?> GetSmsAsync(string service, string country, int numberId)
    {
        if (_mockMode)
        {
            await Task.Delay(100);
            var code = Random.Shared.Next(1000, 9999).ToString();
            return ($"Your code is {code}", code);
        }
        var sms = await _client.GetSmsAsync(service, country, numberId);
        if (sms == null) return null;
        return (sms.Text, sms.Code ?? SmsPvaClient.ExtractVerificationCode(sms.Text));
    }

    public async Task DenyNumberAsync(string service, string country, int numberId)
    {
        if (_mockMode) return;
        await _client.DenyNumberAsync(service, country, numberId);
    }

    // ============ 租赁 ============

    public async Task<List<SmsPva.Sdk.Models.RentalCountry>> GetRentalCountriesAsync()
    {
        if (_mockMode) return new List<SmsPva.Sdk.Models.RentalCountry>
        {
            new() { Name = "United Kingdom", Code = "UK" },
            new() { Name = "United States", Code = "US" }
        };
        return await _client.GetRentalCountriesAsync();
    }

    public async Task<List<SmsPva.Sdk.Models.RentalService>> GetRentalServicesAsync(string country, string? dtype, int? dcount)
    {
        if (_mockMode) return new List<SmsPva.Sdk.Models.RentalService>
        {
            new() { Name = "Telegram", Code = "opt6", Price = 5.00m, Count = 10 },
            new() { Name = "WhatsApp", Code = "opt1", Price = 8.00m, Count = 5 }
        };
        return await _client.GetRentalServicesAsync(country, dtype, dcount);
    }

    public async Task<SmsPva.Sdk.Models.RentalOrder> CreateRentalAsync(string country, string service, string dtype, int dcount)
    {
        if (_mockMode)
        {
            var fakeId = Random.Shared.Next(10000, 99999);
            return new SmsPva.Sdk.Models.RentalOrder
            {
                Id = fakeId,
                ServiceCode = service,
                ServiceName = service,
                PhoneNumber = $"555{fakeId % 10000000:D7}",
                CountryDigitCode = "1",
                CountryCode = country,
                Until = DateTimeOffset.Now.AddDays(dtype == "week" ? 7 * dcount : 30 * dcount).ToUnixTimeSeconds()
            };
        }
        return await _client.CreateRentalAsync(country, service, dtype, dcount);
    }

    public async Task ActivateRentalAsync(int rentalOrderId)
    {
        if (_mockMode) return;
        await _client.ActivateRentalAsync(rentalOrderId);
    }

    public async Task ProlongRentalAsync(int rentalOrderId, string dtype, int dcount)
    {
        if (_mockMode) return;
        await _client.ProlongRentalAsync(rentalOrderId, dtype, dcount);
    }

    public async Task<List<SmsPva.Sdk.Models.RentalOrder>> GetRentalOrdersAsync()
    {
        if (_mockMode) return new List<SmsPva.Sdk.Models.RentalOrder>();
        return await _client.GetRentalOrdersAsync();
    }

    // ============ 供应商信息 ============

    public async Task<(decimal Balance, decimal Karma, string Name)> GetUserInfoAsync()
    {
        if (_mockMode) return (100.00m, 0m, "MockUser");
        var info = await _client.GetUserInfoAsync();
        return (info.Balance, info.Karma, info.Name);
    }
}

public record MockOrRealNumber(int Id, string Number, bool IsMock);
