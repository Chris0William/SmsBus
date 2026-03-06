namespace SmsBus.Web.Entities;

public class Order : ISoftDelete
{
    public long Id { get; set; }
    public string OrderId { get; set; } = string.Empty;       // act_123 / rent_456
    public long? UserId { get; set; }                          // NULL=管理员未分配
    public long? AssignedBy { get; set; }                      // 管理员分配时记录操作人
    public string Source { get; set; } = "user";               // user / admin
    public string? Number { get; set; }                        // +44XXXXXXXXXX
    public string? CountryCode { get; set; }
    public string? CountryName { get; set; }
    public string? ServiceCode { get; set; }
    public string? ServiceName { get; set; }
    public string Mode { get; set; } = "activation";           // activation / rental
    public string Status { get; set; } = "waiting";            // waiting/activating/active/received/cancelled/expired
    public decimal CostPrice { get; set; }                     // 上游实际扣款 (USD)
    public decimal ListPrice { get; set; }                     // 上游查询商品价 (USD，未折扣)
    public decimal MarkupAmount { get; set; }                  // 加价金额 (USD)
    public decimal TotalPrice { get; set; }                    // 用户实付 (USD)
    public string? SmsContent { get; set; }
    public string? VerificationCode { get; set; }
    public int? ActivationNumberId { get; set; }
    public int? RentalOrderId { get; set; }
    public string? RentalDtype { get; set; }
    public int? RentalDcount { get; set; }
    public DateTime? ExpiresAt { get; set; }
    // 订阅字段
    public int? SubscriptionMonths { get; set; }       // 总订阅月数 (1/3/6/12)
    public int SubscriptionRenewedCount { get; set; }  // 已续费次数 (0=首月)
    public bool AutoSubscribe { get; set; }            // 是否自动续费
    public DateTime? NextRenewalAt { get; set; }       // 下次续费时间
    public DateTime? RenewalFailedAt { get; set; }     // 上游续费失败时间（null=正常）
    public DateTime PurchasedAt { get; set; } = DateTime.Now;
    public DateTime? CompletedAt { get; set; }

    // 导航属性
    public User? User { get; set; }
    public User? Assigner { get; set; }
    public List<OrderSms> SmsList { get; set; } = new();

    // 软删除
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}
