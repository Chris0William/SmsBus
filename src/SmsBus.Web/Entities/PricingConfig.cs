namespace SmsBus.Web.Entities;

public class PricingConfig : ISoftDelete
{
    public long Id { get; set; } = 1;
    public decimal RentalProfitPercent { get; set; }      // 租赁商品费用利润（百分比）
    public decimal ActivationProfitPercent { get; set; }  // 临时商品费用利润（百分比）
    public decimal ServiceFee1m { get; set; }             // 1个月服务费利润（百分比）
    public decimal ServiceFee3m { get; set; }             // 3个月服务费利润（百分比）
    public decimal ServiceFee6m { get; set; }             // 6个月服务费利润（百分比）
    public decimal ServiceFee12m { get; set; }            // 12个月服务费利润（百分比）
    public bool MarkupEnabled { get; set; }
    public decimal UsdCnyRate { get; set; } = 7.25m;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;

    // 软删除
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}
