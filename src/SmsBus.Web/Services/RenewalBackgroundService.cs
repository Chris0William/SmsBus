using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Data;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

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
            try { await ProcessRenewals(ct); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _log.LogError(ex, "续费批处理异常");
            }

            try { await ProcessExpiredActivations(ct); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _log.LogError(ex, "临时过期检测异常");
            }

            await Task.Delay(TimeSpan.FromMinutes(5), ct);
        }
    }

    private async Task ProcessRenewals(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var router = scope.ServiceProvider.GetRequiredService<SupplierRouter>();

        var dueOrders = await db.Orders
            .Include(o => o.Supplier)
            .Where(o => o.Mode == "rental"
                && o.NextRenewalAt != null
                && o.NextRenewalAt <= DateTime.Now
                && o.RenewedCount < (o.SubscriptionMonths ?? 1) - 1
                && o.Status != "cancelled" && o.Status != "expired")
            .ToListAsync(ct);

        if (dueOrders.Count == 0) return;
        _log.LogInformation("发现 {Count} 个待续费订单", dueOrders.Count);

        foreach (var order in dueOrders)
        {
            try
            {
                var supplier = router.Get(order.Supplier!.Code);

                var balBefore = await supplier.GetBalanceAsync();
                await supplier.ProlongRentalAsync(order.SupplierOrderId);
                var balAfter = await supplier.GetBalanceAsync();
                var renewCost = balBefore - balAfter;

                var status = await supplier.GetRentalStatusAsync(order.SupplierOrderId);

                order.RenewedCount++;
                if (renewCost > 0) order.CostPrice += renewCost;
                if (status != null)
                {
                    order.ExpiresAt = status.ExpiresAt;
                    order.NextRenewalAt = status.ExpiresAt.AddDays(-2);
                }
                order.RenewalFailedAt = null;

                if (order.RenewedCount >= (order.SubscriptionMonths ?? 1) - 1)
                    order.NextRenewalAt = null;

                await db.SaveChangesAsync(ct);
                _log.LogInformation("续费成功: Id={Id}, 第{Month}月, 实际成本=${Cost}",
                    order.Id, order.RenewedCount + 1, renewCost);
            }
            catch (Exception ex)
            {
                order.RenewalFailedAt = DateTime.Now;
                await db.SaveChangesAsync(ct);
                _log.LogError(ex, "续费失败（将在下次重试）: Id={Id}", order.Id);
            }
        }
    }

    private async Task ProcessExpiredActivations(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var router = scope.ServiceProvider.GetRequiredService<SupplierRouter>();
        var balance = scope.ServiceProvider.GetRequiredService<IBalanceService>();
        var orders = scope.ServiceProvider.GetRequiredService<IOrderService>();

        var staleOrders = await db.Orders
            .Include(o => o.Supplier)
            .Include(o => o.Country)
            .Where(o => o.Mode == "activation"
                && o.Status == "waiting"
                && o.PurchasedAt < DateTime.Now.AddMinutes(-15))
            .ToListAsync(ct);

        foreach (var order in staleOrders)
        {
            try
            {
                var supplier = router.Get(order.Supplier!.Code);
                var sms = await supplier.GetSmsAsync(order.ServiceCode ?? "", order.Country!.Code, order.SupplierOrderId);
                if (sms != null)
                {
                    await orders.UpdateSmsAsync(order.Id, sms.Text, sms.Code);
                    _log.LogInformation("后台检测到短信: Id={Id}", order.Id);
                }
            }
            catch (Exception ex) when (ex.Message.Contains("expired") || ex.Message.Contains("cancel") || ex.Message.Contains("过期"))
            {
                order.Status = "expired";
                if (order.UserId != null && order.UserPrice > 0)
                {
                    await balance.RefundAsync(order.UserId.Value, order.UserPrice,
                        $"临时接码过期自动退款", order.Id);
                    _log.LogInformation("过期退款: Id={Id}, 退款=${Amount}", order.Id, order.UserPrice);
                }
                await db.SaveChangesAsync(ct);
                await orders.DeleteOrderAsync(order.Id);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "检测临时订单状态失败: Id={Id}", order.Id);
            }
        }
    }
}
