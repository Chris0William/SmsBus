using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Entities;

namespace SmsBus.Web.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderSms> OrderSms => Set<OrderSms>();
    public DbSet<BalanceTransaction> BalanceTransactions => Set<BalanceTransaction>();
    public DbSet<PricingConfig> PricingConfigs => Set<PricingConfig>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Users
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users", t => t.HasComment("用户表"));
            e.Property(u => u.Id).ValueGeneratedNever().HasComment("雪花ID");
            e.Property(u => u.Phone).HasComment("手机号（登录账号）");
            e.Property(u => u.PasswordHash).HasComment("密码哈希(BCrypt)");
            e.Property(u => u.DisplayName).HasComment("显示名称");
            e.Property(u => u.Balance).HasPrecision(18, 4).HasComment("账户余额(USD)");
            e.Property(u => u.IsAdmin).HasComment("是否管理员");
            e.Property(u => u.IsActive).HasComment("是否启用");
            e.Property(u => u.CreatedAt).HasComment("注册时间");
            e.Property(u => u.UpdatedAt).HasComment("更新时间");
            e.Property(u => u.IsDeleted).HasComment("软删除标记");
            e.Property(u => u.DeletedAt).HasComment("删除时间");
            e.HasIndex(u => u.Phone).IsUnique();
            e.HasQueryFilter(u => !u.IsDeleted);
        });

        // Orders
        modelBuilder.Entity<Order>(e =>
        {
            e.ToTable("orders", t => t.HasComment("订单表"));
            e.Property(o => o.Id).ValueGeneratedNever().HasComment("雪花ID");
            e.Property(o => o.OrderId).HasComment("业务订单号(act_/rent_前缀)");
            e.Property(o => o.UserId).HasComment("所属用户ID(NULL=未分配)");
            e.Property(o => o.AssignedBy).HasComment("管理员分配时的操作人ID");
            e.Property(o => o.Source).HasComment("来源: user/admin");
            e.Property(o => o.Number).HasComment("手机号码");
            e.Property(o => o.CountryCode).HasComment("国家代码");
            e.Property(o => o.CountryName).HasComment("国家名称");
            e.Property(o => o.ServiceCode).HasComment("服务代码");
            e.Property(o => o.ServiceName).HasComment("服务名称");
            e.Property(o => o.Mode).HasComment("模式: activation/rental");
            e.Property(o => o.Status).HasComment("状态: waiting/activating/active/received/cancelled/expired");
            e.Property(o => o.CostPrice).HasPrecision(18, 4).HasComment("上游实际扣款(USD,balance-diff)");
            e.Property(o => o.ListPrice).HasPrecision(18, 4).HasComment("上游查询商品价(USD,未折扣)");
            e.Property(o => o.MarkupAmount).HasPrecision(18, 4).HasComment("加价金额(USD)");
            e.Property(o => o.TotalPrice).HasPrecision(18, 4).HasComment("用户实付(USD)");
            e.Property(o => o.SmsContent).HasComment("最新短信内容");
            e.Property(o => o.VerificationCode).HasComment("提取的验证码");
            e.Property(o => o.ActivationNumberId).HasComment("临时接码上游号码ID");
            e.Property(o => o.RentalOrderId).HasComment("租赁上游订单ID");
            e.Property(o => o.RentalDtype).HasComment("租赁时长类型(month/week等)");
            e.Property(o => o.RentalDcount).HasComment("租赁时长数量");
            e.Property(o => o.ExpiresAt).HasComment("到期时间");
            e.Property(o => o.SubscriptionMonths).HasComment("总订阅月数(1/3/6/12)");
            e.Property(o => o.SubscriptionRenewedCount).HasComment("已续费次数(0=首月)");
            e.Property(o => o.AutoSubscribe).HasComment("是否自动续费");
            e.Property(o => o.NextRenewalAt).HasComment("下次续费时间");
            e.Property(o => o.RenewalFailedAt).HasComment("续费失败时间(null=正常)");
            e.Property(o => o.PurchasedAt).HasComment("购买时间");
            e.Property(o => o.CompletedAt).HasComment("完成时间");
            e.Property(o => o.IsDeleted).HasComment("软删除标记");
            e.Property(o => o.DeletedAt).HasComment("删除时间");
            e.HasIndex(o => o.OrderId).IsUnique();
            e.HasQueryFilter(o => !o.IsDeleted);

            e.HasOne(o => o.User)
                .WithMany()
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(o => o.Assigner)
                .WithMany()
                .HasForeignKey(o => o.AssignedBy)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // OrderSms
        modelBuilder.Entity<OrderSms>(e =>
        {
            e.ToTable("order_sms", t => t.HasComment("订单短信记录表"));
            e.Property(s => s.Id).ValueGeneratedNever().HasComment("雪花ID");
            e.Property(s => s.OrderId).HasComment("关联订单ID");
            e.Property(s => s.Text).HasComment("短信全文");
            e.Property(s => s.Code).HasComment("提取的验证码");
            e.Property(s => s.ReceivedAt).HasComment("接收时间");
            e.Property(s => s.IsDeleted).HasComment("软删除标记");
            e.Property(s => s.DeletedAt).HasComment("删除时间");
            e.HasQueryFilter(s => !s.IsDeleted);

            e.HasOne(s => s.Order)
                .WithMany(o => o.SmsList)
                .HasForeignKey(s => s.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // BalanceTransactions
        modelBuilder.Entity<BalanceTransaction>(e =>
        {
            e.ToTable("balance_transactions", t => t.HasComment("余额流水表"));
            e.Property(t => t.Id).ValueGeneratedNever().HasComment("雪花ID");
            e.Property(t => t.UserId).HasComment("用户ID");
            e.Property(t => t.Amount).HasPrecision(18, 4).HasComment("金额(正=充值/退款,负=消费)");
            e.Property(t => t.Type).HasComment("类型: recharge/purchase/refund");
            e.Property(t => t.Description).HasComment("描述");
            e.Property(t => t.RelatedOrderId).HasComment("关联订单ID");
            e.Property(t => t.OperatorId).HasComment("操作人ID(管理员充值时)");
            e.Property(t => t.CreatedAt).HasComment("创建时间");
            e.Property(t => t.IsDeleted).HasComment("软删除标记");
            e.Property(t => t.DeletedAt).HasComment("删除时间");
            e.HasQueryFilter(t => !t.IsDeleted);

            e.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(t => t.RelatedOrder)
                .WithMany()
                .HasForeignKey(t => t.RelatedOrderId)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(t => t.Operator)
                .WithMany()
                .HasForeignKey(t => t.OperatorId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // PricingConfig (单行配置表)
        modelBuilder.Entity<PricingConfig>(e =>
        {
            e.ToTable("pricing_config", t => t.HasComment("定价配置表(单行)"));
            e.Property(p => p.Id).ValueGeneratedNever().HasComment("固定ID=1");
            e.Property(p => p.RentalProfitPercent).HasPrecision(10, 2).HasComment("租赁商品利润百分比");
            e.Property(p => p.ActivationProfitPercent).HasPrecision(10, 2).HasComment("临时接码商品利润百分比");
            e.Property(p => p.ServiceFee1m).HasPrecision(10, 2).HasComment("1个月服务费百分比");
            e.Property(p => p.ServiceFee3m).HasPrecision(10, 2).HasComment("3个月服务费百分比");
            e.Property(p => p.ServiceFee6m).HasPrecision(10, 2).HasComment("6个月服务费百分比");
            e.Property(p => p.ServiceFee12m).HasPrecision(10, 2).HasComment("12个月服务费百分比");
            e.Property(p => p.MarkupEnabled).HasComment("是否启用加价");
            e.Property(p => p.UsdCnyRate).HasPrecision(10, 4).HasComment("USD/CNY汇率");
            e.Property(p => p.UpdatedAt).HasComment("更新时间");
            e.Property(p => p.IsDeleted).HasComment("软删除标记");
            e.Property(p => p.DeletedAt).HasComment("删除时间");
            e.HasQueryFilter(p => !p.IsDeleted);

            // 种子数据
            e.HasData(new PricingConfig
            {
                Id = 1,
                RentalProfitPercent = 0,
                ActivationProfitPercent = 0,
                ServiceFee1m = 0,
                ServiceFee3m = 0,
                ServiceFee6m = 0,
                ServiceFee12m = 0,
                MarkupEnabled = false,
                UsdCnyRate = 7.25m,
                UpdatedAt = new DateTime(2024, 1, 1)
            });
        });
    }
}
