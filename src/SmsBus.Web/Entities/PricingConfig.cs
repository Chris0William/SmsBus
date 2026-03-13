namespace SmsBus.Web.Entities;

public class PricingConfig
{
    public long Id { get; set; } = 1;
    public decimal DefaultActivationMarkupPercent { get; set; }
    public decimal DefaultRentalMarkupPercent { get; set; }
    public decimal ServiceFee1m { get; set; }
    public decimal ServiceFee3m { get; set; }
    public decimal ServiceFee6m { get; set; }
    public decimal ServiceFee12m { get; set; }
    public decimal UsdCnyRate { get; set; } = 7.25m;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
