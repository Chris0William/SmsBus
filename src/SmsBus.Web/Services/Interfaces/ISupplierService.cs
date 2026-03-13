using SmsBus.Web.Common;

namespace SmsBus.Web.Services.Interfaces;

public interface ISupplierService
{
    string Code { get; }
    bool IsMockMode { get; }

    // 临时接码
    Task<List<ServiceInfo>> GetActivationServicesAsync();
    Task<(int Count, decimal Price)> GetActivationCountAsync(string service, string country);
    Task<NumberResult> GetNumberAsync(string service, string country);
    Task<SmsResult?> GetSmsAsync(string service, string country, string numberId);
    Task DenyNumberAsync(string service, string country, string numberId);

    // 租赁
    Task<List<ServiceInfo>> GetRentalServicesAsync(string country);
    /// <summary>查询租赁月成本价(USD)和库存。供应商内部处理单位换算。</summary>
    Task<RentalPriceResult> GetRentalPriceAsync(string country, string? service);
    Task<RentalResult> CreateRentalAsync(string country, string? service);
    Task ActivateRentalAsync(string rentalId);
    Task ProlongRentalAsync(string rentalId);
    Task<List<SmsResult>> ReadRentalSmsAsync(string rentalId);
    Task<RentalStatusResult?> GetRentalStatusAsync(string rentalId);
    Task DeleteRentalAsync(string rentalId);

    // 账户
    Task<decimal> GetBalanceAsync();
}
