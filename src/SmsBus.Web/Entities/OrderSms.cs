namespace SmsBus.Web.Entities;

public class OrderSms
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? Code { get; set; }
    public DateTime ReceivedAt { get; set; }

    // 导航属性
    public Order? Order { get; set; }
}
