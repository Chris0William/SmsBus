namespace SmsBus.Web.Entities;

public class Country
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;       // FR/US/UK...
    public string Name { get; set; } = string.Empty;       // 中文名
    public long SupplierId { get; set; }                    // FK → suppliers
    public bool IsActive { get; set; } = true;
    public bool ActivationEnabled { get; set; }
    public bool RentalEnabled { get; set; }
    public decimal? ActivationMarkupPercent { get; set; }   // null=用全局
    public decimal? RentalMarkupPercent { get; set; }       // null=用全局
    public decimal? ServiceFee1m { get; set; }              // null=用全局
    public decimal? ServiceFee3m { get; set; }
    public decimal? ServiceFee6m { get; set; }
    public decimal? ServiceFee12m { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // 导航属性
    public Supplier? Supplier { get; set; }
}
