using SmsBus.Web.Data;
using SmsBus.Web.Entities;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

public class PricingService : IPricingService
{
    private readonly AppDbContext _db;

    public PricingService(AppDbContext db) => _db = db;

    public async Task<PricingConfig> GetConfigAsync()
    {
        return await _db.PricingConfigs.FindAsync(1L)
            ?? new PricingConfig { Id = 1 };
    }

    public async Task UpdateConfigAsync(PricingConfig update)
    {
        var config = await _db.PricingConfigs.FindAsync(1L);
        if (config == null)
        {
            config = new PricingConfig { Id = 1 };
            _db.PricingConfigs.Add(config);
        }
        config.DefaultActivationMarkupPercent = update.DefaultActivationMarkupPercent;
        config.DefaultRentalMarkupPercent = update.DefaultRentalMarkupPercent;
        config.ServiceFee1m = update.ServiceFee1m;
        config.ServiceFee3m = update.ServiceFee3m;
        config.ServiceFee6m = update.ServiceFee6m;
        config.ServiceFee12m = update.ServiceFee12m;
        config.UsdCnyRate = update.UsdCnyRate;
        config.UpdatedAt = DateTime.Now;
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// 计算用户价格
    /// 加价% 优先用国家级配置，为null时用全局配置
    /// </summary>
    public decimal CalcUserPrice(decimal costPrice, string mode, int months, Country? country, PricingConfig config)
    {
        decimal markupPercent;
        if (mode == "activation")
            markupPercent = country?.ActivationMarkupPercent ?? config.DefaultActivationMarkupPercent;
        else
            markupPercent = country?.RentalMarkupPercent ?? config.DefaultRentalMarkupPercent;

        var serviceFeePercent = GetServiceFeePercent(country, config, months);
        var totalPercent = markupPercent + serviceFeePercent;
        var userPrice = costPrice * (1 + totalPercent / 100);
        return Math.Round(userPrice, 4);
    }

    private static decimal GetServiceFeePercent(Country? country, PricingConfig config, int months)
    {
        return months switch
        {
            <= 1 => country?.ServiceFee1m ?? config.ServiceFee1m,
            <= 3 => country?.ServiceFee3m ?? config.ServiceFee3m,
            <= 6 => country?.ServiceFee6m ?? config.ServiceFee6m,
            _ => country?.ServiceFee12m ?? config.ServiceFee12m
        };
    }
}
