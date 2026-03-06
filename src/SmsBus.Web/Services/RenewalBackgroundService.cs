using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Data;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

/// <summary>后台服务：自动续费（每5分钟）+ 临时接码过期检测</summary>
public class RenewalBackgroundService : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<RenewalBackgroundService> _log;

    public RenewalBackgroundService(IServiceProvider sp, ILogger<RenewalBackgroundService> log)
    {
        _sp = sp;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("RenewalBackgroundService 已启动");
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await ProcessRenewals(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _log.LogError(ex, "续费批处理异常");
            }

            try
            {
                await ProcessExpiredActivations(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _log.LogError(ex, "临时过期检测异常");
            }

            await Task.Delay(TimeSpan.FromMinutes(5), ct);
        }
    }

    /// <summary>自动续费租赁订单（不扣余额，用户已预付全部）</summary>
    private async Task ProcessRenewals(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var supplier = scope.ServiceProvider.GetRequiredService<ISupplierService>();

        var dueOrders = await db.Orders
            .Where(o => o.Mode == "rental"
                && o.AutoSubscribe
                && o.NextRenewalAt != null
                && o.NextRenewalAt <= DateTime.Now
                && o.SubscriptionRenewedCount < (o.SubscriptionMonths ?? 1) - 1
                && o.RentalOrderId != null
                && o.Status != "cancelled" && o.Status != "expired")
            .ToListAsync(ct);

        if (dueOrders.Count == 0) return;
        _log.LogInformation("发现 {Count} 个待续费订单", dueOrders.Count);

        foreach (var order in dueOrders)
        {
            try
            {
                // 调用上游续费（balance-diff 记录实际成本）
                var balBefore = (await supplier.GetUserInfoAsync()).Balance;
                await supplier.ProlongRentalAsync(order.RentalOrderId!.Value, "month", 1);
                var balAfter = (await supplier.GetUserInfoAsync()).Balance;
                var renewCost = balBefore - balAfter;

                // 获取更新后的到期时间
                var allRentals = await supplier.GetRentalOrdersAsync();
                var updated = allRentals.FirstOrDefault(r => r.Id == order.RentalOrderId);

                order.SubscriptionRenewedCount++;
                if (renewCost > 0) order.CostPrice += renewCost;
                if (updated != null)
                {
                    order.ExpiresAt = updated.ExpiresAt;
                    order.NextRenewalAt = updated.ExpiresAt.AddDays(-2);
                }
                order.RenewalFailedAt = null; // 清除之前的失败标记

                // 达到总月数则停止自动续费
                if (order.SubscriptionRenewedCount >= (order.SubscriptionMonths ?? 1) - 1)
                    order.AutoSubscribe = false;

                await db.SaveChangesAsync(ct);
                _log.LogInformation("续费成功: OrderId={OrderId}, 第{Month}月, 实际成本=${Cost}",
                    order.OrderId, order.SubscriptionRenewedCount + 1, renewCost);
            }
            catch (Exception ex)
            {
                // 记录失败，保持active状态，下次循环重试
                order.RenewalFailedAt = DateTime.Now;
                await db.SaveChangesAsync(ct);
                _log.LogError(ex, "续费失败（将在下次重试）: OrderId={OrderId}", order.OrderId);
            }
        }
    }

    /// <summary>检测超时未轮询的临时接码订单，退款并删除</summary>
    private async Task ProcessExpiredActivations(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var supplier = scope.ServiceProvider.GetRequiredService<ISupplierService>();
        var balance = scope.ServiceProvider.GetRequiredService<IBalanceService>();
        var orders = scope.ServiceProvider.GetRequiredService<IOrderService>();

        // 超过15分钟仍在 waiting 的临时订单
        var staleOrders = await db.Orders
            .Where(o => o.Mode == "activation"
                && o.Status == "waiting"
                && o.ActivationNumberId != null
                && o.PurchasedAt < DateTime.Now.AddMinutes(-15))
            .ToListAsync(ct);

        foreach (var order in staleOrders)
        {
            try
            {
                // 尝试调上游确认是否过期
                var sms = await supplier.GetSmsAsync(order.ServiceCode!, order.CountryCode!, order.ActivationNumberId!.Value);
                if (sms != null)
                {
                    // 收到了短信
                    await orders.UpdateSmsAsync(order.OrderId!, sms.Value.Text!, sms.Value.Code);
                    _log.LogInformation("后台检测到短信: OrderId={OrderId}", order.OrderId);
                }
            }
            catch (SmsPva.Sdk.Exceptions.SmsPvaException ex)
                when (ex.Message.Contains("expired") || ex.Message.Contains("cancel") || ex.Message.Contains("过期"))
            {
                // 过期：退款 + 删除
                order.Status = "expired";
                if (order.UserId != null && order.TotalPrice > 0)
                {
                    await balance.RefundAsync(order.UserId.Value, order.TotalPrice,
                        $"临时接码过期自动退款 {order.OrderId}", order.Id);
                    _log.LogInformation("过期退款: OrderId={OrderId}, 退款=${Amount}", order.OrderId, order.TotalPrice);
                }
                await db.SaveChangesAsync(ct);
                await orders.DeleteOrderAsync(order.OrderId!);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "检测临时订单状态失败: OrderId={OrderId}", order.OrderId);
            }
        }
    }
}
