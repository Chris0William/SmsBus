using SmsBus.Web.Entities;

namespace SmsBus.Web.Services.Interfaces;

public interface IPricingService
{
    Task<PricingConfig> GetConfigAsync();
    Task UpdateConfigAsync(PricingConfig update);
    decimal CalcUserPrice(decimal costPrice, string mode, int months, Country? country, PricingConfig config);
}
