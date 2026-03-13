namespace SmsBus.Web.Entities;

public class Supplier
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;       // smspva / smsbus
    public string Name { get; set; } = string.Empty;       // 显示名称
    public string? ApiKey { get; set; }
    public string? ApiBaseUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public bool SupportsActivation { get; set; }            // 支持临时接码
    public bool SupportsRental { get; set; }                // 支持租赁
    public bool RequiresService { get; set; } = true;       // 下单需选服务（false=全服务）
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
