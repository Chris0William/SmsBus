namespace SmsBus.Web.Entities;

public class Order
{
    public long Id { get; set; }
    public long? UserId { get; set; }                       // NULL=管理员未分配
    public long? AssignedBy { get; set; }                   // 管理员分配操作人
    public long SupplierId { get; set; }                    // FK → suppliers
    public long CountryId { get; set; }                     // FK → countries
    public string Mode { get; set; } = "activation";        // activation / rental
    public string Source { get; set; } = "user";            // user / admin
    public string Status { get; set; } = "waiting";         // waiting/activating/active/received/cancelled/expired
    public string? PhoneNumber { get; set; }                // +33xxx
    public string? ServiceCode { get; set; }                // 服务代码（全服务=null）
    public string? ServiceName { get; set; }
    public string SupplierOrderId { get; set; } = string.Empty; // 上游订单/号码ID

    // 价格
    public decimal CostPrice { get; set; }                  // 上游实际扣款 USD（累计含续费）
    public decimal UserPrice { get; set; }                   // 用户实付 USD（一次性含所有月）

    // 租赁专用
    public DateTime? ExpiresAt { get; set; }
    public int? SubscriptionMonths { get; set; }            // 用户购买总月数
    public int RenewedCount { get; set; }                   // 已向上游续费次数（0=首月）
    public DateTime? NextRenewalAt { get; set; }
    public DateTime? RenewalFailedAt { get; set; }

    // 时间
    public DateTime PurchasedAt { get; set; } = DateTime.Now;
    public DateTime? CompletedAt { get; set; }

    // 导航属性
    public User? User { get; set; }
    public User? Assigner { get; set; }
    public Supplier? Supplier { get; set; }
    public Country? Country { get; set; }
    public List<OrderSms> SmsList { get; set; } = new();
}
