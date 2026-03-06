using SmsBus.Web.Entities;

namespace SmsBus.Web.Services.Interfaces;

public interface IPricingService
{
    Task<PricingConfig> GetConfigAsync();
    Task UpdateConfigAsync(PricingConfig update);
    decimal CalcMarkup(PricingConfig config, decimal costPrice, string mode, int months = 1);
    decimal CalcUserPrice(PricingConfig config, decimal costPrice, string mode, int months = 1);
}
