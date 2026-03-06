namespace SmsBus.Web.Entities;

public class BalanceTransaction : ISoftDelete
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public decimal Amount { get; set; }            // 正=充值/退款, 负=消费
    public string Type { get; set; } = string.Empty; // recharge / purchase / refund
    public string? Description { get; set; }
    public long? RelatedOrderId { get; set; }
    public long? OperatorId { get; set; }           // 操作人(管理员充值时)
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // 导航属性
    public User? User { get; set; }
    public Order? RelatedOrder { get; set; }
    public User? Operator { get; set; }

    // 软删除
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}
