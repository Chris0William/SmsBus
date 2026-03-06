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
        config.RentalProfitPercent = update.RentalProfitPercent;
        config.ActivationProfitPercent = update.ActivationProfitPercent;
        config.ServiceFee1m = update.ServiceFee1m;
        config.ServiceFee3m = update.ServiceFee3m;
        config.ServiceFee6m = update.ServiceFee6m;
        config.ServiceFee12m = update.ServiceFee12m;
        config.MarkupEnabled = update.MarkupEnabled;
        config.UsdCnyRate = update.UsdCnyRate;
        config.UpdatedAt = DateTime.Now;
        await _db.SaveChangesAsync();
    }

    /// <summary>计算加价金额 = 成本 × (商品利润% + 服务费利润%) / 100</summary>
    public decimal CalcMarkup(PricingConfig config, decimal costPrice, string mode, int months = 1)
    {
        if (!config.MarkupEnabled) return 0;

        if (mode == "activation")
            return Math.Round(costPrice * config.ActivationProfitPercent / 100, 4);

        var serviceFee = GetServiceFeePercent(config, months);
        var totalPercent = config.RentalProfitPercent + serviceFee;
        return Math.Round(costPrice * totalPercent / 100, 4);
    }

    /// <summary>计算用户价格 = 成本 + 加价</summary>
    public decimal CalcUserPrice(PricingConfig config, decimal costPrice, string mode, int months = 1)
    {
        return costPrice + CalcMarkup(config, costPrice, mode, months);
    }

    private static decimal GetServiceFeePercent(PricingConfig config, int months)
    {
        return months switch
        {
            <= 1 => config.ServiceFee1m,
            <= 3 => config.ServiceFee3m,
            <= 6 => config.ServiceFee6m,
            _ => config.ServiceFee12m
        };
    }
}
