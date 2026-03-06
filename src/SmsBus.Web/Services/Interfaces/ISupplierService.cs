using SmsPva.Sdk.Models;

namespace SmsBus.Web.Services.Interfaces;

public interface ISupplierService
{
    bool IsMockMode { get; }
    Task<List<ActivationServiceInfo>> GetActivationServicesAsync();
    Task<(int Total, decimal Price)> GetActivationCountAsync(string service, string country);
    Task<MockOrRealNumber> GetNumberAsync(string service, string country);
    Task<(string? Text, string? Code)?> GetSmsAsync(string service, string country, int numberId);
    Task DenyNumberAsync(string service, string country, int numberId);
    Task<List<RentalCountry>> GetRentalCountriesAsync();
    Task<List<RentalService>> GetRentalServicesAsync(string country, string? dtype, int? dcount);
    Task<RentalOrder> CreateRentalAsync(string country, string service, string dtype, int dcount);
    Task ActivateRentalAsync(int rentalOrderId);
    Task ProlongRentalAsync(int rentalOrderId, string dtype, int dcount);
    Task<List<RentalOrder>> GetRentalOrdersAsync();
    Task<(decimal Balance, decimal Karma, string Name)> GetUserInfoAsync();
}
