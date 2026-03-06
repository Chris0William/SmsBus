namespace SmsBus.Web.Entities;

public class OrderSms : ISoftDelete
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? Code { get; set; }
    public DateTime ReceivedAt { get; set; }

    // 导航属性
    public Order? Order { get; set; }

    // 软删除
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}
