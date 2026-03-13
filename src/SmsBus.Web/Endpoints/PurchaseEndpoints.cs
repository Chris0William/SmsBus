using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Data;
using SmsBus.Web.Dto;
using SmsBus.Web.Infrastructure.Auth;
using SmsBus.Web.Services;
using SmsBus.Web.Services.Interfaces;

using Order = SmsBus.Web.Entities.Order;

namespace SmsBus.Web.Endpoints;

public static class PurchaseEndpoints
{
    public static void MapPurchaseEndpoints(this WebApplication app)
    {
        // 用户购买临时接码
        app.MapPost("/api/user/purchase/activation", async (UserActivationRequest req, HttpContext ctx,
            AppDbContext db, SupplierRouter router, IPricingService pricing, IBalanceService balance, IOrderService orders) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var country = await db.Countries.Include(c => c.Supplier)
                .FirstOrDefaultAsync(c => c.Code == req.CountryCode && c.IsActive && c.ActivationEnabled);
            if (country?.Supplier == null) return Results.Json(new { error = "国家不可用" }, statusCode: 400);

            var supplier = router.Get(country.Supplier.Code);
            var config = await pricing.GetConfigAsync();

            var (_, costPrice) = await supplier.GetActivationCountAsync(req.ServiceCode ?? "", country.Code);
            var userPrice = pricing.CalcUserPrice(costPrice, "activation", 1, country, config);

            if (!await balance.HasSufficientBalanceAsync(session.UserId, userPrice))
                return Results.Json(new { error = $"余额不足，需要 ${userPrice:F4}" }, statusCode: 400);

            var balBefore = await supplier.GetBalanceAsync();
            var number = await supplier.GetNumberAsync(req.ServiceCode ?? "", country.Code);
            var balAfter = await supplier.GetBalanceAsync();
            var actualCost = balBefore - balAfter;

            var order = await orders.CreateAsync(new Order
            {
                UserId = session.UserId,
                SupplierId = country.SupplierId,
                CountryId = country.Id,
                Source = "user",
                PhoneNumber = number.FullNumber,
                ServiceCode = req.ServiceCode,
                Mode = "activation",
                Status = "waiting",
                CostPrice = actualCost > 0 ? actualCost : costPrice,
                UserPrice = userPrice,
                SupplierOrderId = number.Id,
                PurchasedAt = DateTime.Now
            });

            await balance.DeductAsync(session.UserId, userPrice,
                $"购买临时接码 {req.ServiceCode}", order.Id);

            return Results.Ok(new { success = true, orderId = order.Id, userPrice, number = order.PhoneNumber });
        });

        // 用户购买租赁号码
        app.MapPost("/api/user/purchase/rental", async (UserRentalRequest req, HttpContext ctx,
            AppDbContext db, SupplierRouter router, IPricingService pricing, IBalanceService balance, IOrderService orders) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var country = await db.Countries.Include(c => c.Supplier)
                .FirstOrDefaultAsync(c => c.Code == req.CountryCode && c.IsActive && c.RentalEnabled);
            if (country?.Supplier == null) return Results.Json(new { error = "国家不可用" }, statusCode: 400);

            var supplier = router.Get(country.Supplier.Code);
            var config = await pricing.GetConfigAsync();
            var subMonths = req.Months > 0 ? req.Months : 1;

            // 查询月租成本价
            var price = await supplier.GetRentalPriceAsync(country.Code, req.ServiceCode);
            var monthlyUserPrice = pricing.CalcUserPrice(price.MonthlyCostUsd, "rental", subMonths, country, config);
            var totalUserPrice = monthlyUserPrice * subMonths;

            if (!await balance.HasSufficientBalanceAsync(session.UserId, totalUserPrice))
                return Results.Json(new { error = $"余额不足，需要 ${totalUserPrice:F4}" }, statusCode: 400);

            // 上游只买1个月
            var balBefore = await supplier.GetBalanceAsync();
            var rental = await supplier.CreateRentalAsync(country.Code, req.ServiceCode);
            var balAfter = await supplier.GetBalanceAsync();
            var actualCost = balBefore - balAfter;

            try { await supplier.ActivateRentalAsync(rental.Id); } catch { /* 部分号码无需激活 */ }

            var order = await orders.CreateAsync(new Order
            {
                UserId = session.UserId,
                SupplierId = country.SupplierId,
                CountryId = country.Id,
                Source = "user",
                PhoneNumber = rental.PhoneNumber.StartsWith("+") ? rental.PhoneNumber : "+" + rental.CountryDigitCode + rental.PhoneNumber,
                ServiceCode = req.ServiceCode,
                ServiceName = price.ServiceName,
                Mode = "rental",
                Status = "active",
                CostPrice = actualCost > 0 ? actualCost : price.MonthlyCostUsd,
                UserPrice = totalUserPrice,
                SupplierOrderId = rental.Id,
                ExpiresAt = rental.ExpiresAt,
                SubscriptionMonths = subMonths,
                RenewedCount = 0,
                NextRenewalAt = subMonths > 1 ? rental.ExpiresAt.AddDays(-2) : null,
                PurchasedAt = DateTime.Now
            });

            await balance.DeductAsync(session.UserId, totalUserPrice,
                $"购买租赁 {price.ServiceName} ({subMonths}个月)", order.Id);

            return Results.Ok(new { success = true, orderId = order.Id, totalUserPrice, number = order.PhoneNumber });
        });

        // 获取租赁订单短信
        app.MapGet("/api/user/orders/{id:long}/sms", async (long id, HttpContext ctx,
            AppDbContext db, IOrderService orders, SupplierRouter router) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var order = await orders.GetByIdAsync(id);
            if (order == null || order.UserId != session.UserId) return Results.NotFound();
            if (order.Mode != "rental")
                return Results.Json(new { error = "仅租赁订单支持此操作" }, statusCode: 400);

            var supplier = router.Get(order.Supplier!.Code);

            // 同步状态
            try
            {
                var status = await supplier.GetRentalStatusAsync(order.SupplierOrderId);
                if (status != null)
                    await orders.UpdateRentalInfoAsync(id, status.ExpiresAt, status.Status);
            }
            catch { }

            // 读取短信
            try
            {
                var messages = await supplier.ReadRentalSmsAsync(order.SupplierOrderId);
                var smsList = messages.Select(m => new SmsBus.Web.Entities.OrderSms
                {
                    Text = m.Text,
                    Code = m.Code,
                    ReceivedAt = m.ReceivedAt
                }).ToList();
                await orders.UpdateRentalSmsAsync(id, smsList);

                // 重新查询获取完整列表
                var updated = await orders.GetByIdAsync(id);
                return Results.Ok(new
                {
                    messages = updated!.SmsList.OrderByDescending(s => s.ReceivedAt)
                        .Select(s => new { s.Text, s.Code, s.ReceivedAt })
                });
            }
            catch (Exception ex)
            {
                var existing = order.SmsList?.Select(s => new { s.Text, s.Code, s.ReceivedAt }) ?? [];
                return Results.Ok(new { messages = existing, error = "获取上游短信失败: " + ex.Message });
            }
        });

        // 轮询临时接码状态
        app.MapGet("/api/user/orders/{id:long}/poll", async (long id, HttpContext ctx,
            IOrderService orders, SupplierRouter router, IBalanceService balance, AppDbContext db) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var order = await orders.GetByIdAsync(id);
            if (order == null || order.UserId != session.UserId) return Results.NotFound();

            if (order.Mode == "activation" && order.Status == "waiting")
            {
                var supplier = router.Get(order.Supplier!.Code);
                try
                {
                    var sms = await supplier.GetSmsAsync(order.ServiceCode ?? "", order.Country!.Code, order.SupplierOrderId);
                    if (sms != null)
                        await orders.UpdateSmsAsync(id, sms.Text, sms.Code);
                }
                catch (Exception ex) when (ex.Message.Contains("expired") || ex.Message.Contains("cancel") || ex.Message.Contains("过期"))
                {
                    await orders.UpdateStatusAsync(id, "expired");
                    if (order.UserId != null && order.UserPrice > 0)
                        await balance.RefundAsync(order.UserId.Value, order.UserPrice,
                            $"临时接码过期自动退款", order.Id);
                    await orders.DeleteOrderAsync(id);
                    return Results.Ok(new { orderId = id, status = "expired", deleted = true });
                }
                catch { }
            }

            order = await orders.GetByIdAsync(id);
            if (order == null) return Results.Ok(new { orderId = id, status = "expired", deleted = true });
            return Results.Ok(new
            {
                order.Id, order.Status, order.PhoneNumber, order.ExpiresAt,
                smsList = order.SmsList.Select(s => new { s.Text, s.Code, s.ReceivedAt })
            });
        });

        // 取消订单
        app.MapPost("/api/user/orders/{id:long}/cancel", async (long id, HttpContext ctx,
            IOrderService orders, SupplierRouter router, IBalanceService balance) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var order = await orders.GetByIdAsync(id);
            if (order == null || order.UserId != session.UserId) return Results.NotFound();

            if (order.Status != "waiting")
                return Results.Json(new { error = "仅等待中的订单可取消" }, statusCode: 400);

            var supplier = router.Get(order.Supplier!.Code);
            if (order.Mode == "activation")
            {
                try { await supplier.DenyNumberAsync(order.ServiceCode ?? "", order.Country!.Code, order.SupplierOrderId); }
                catch { }
            }

            if (order.UserPrice > 0)
                await balance.RefundAsync(session.UserId, order.UserPrice, $"取消订单退款", order.Id);

            if (order.Mode == "activation")
                await orders.DeleteOrderAsync(id);
            else
                await orders.UpdateStatusAsync(id, "cancelled");

            return Results.Ok(new { success = true });
        });

        // 续订租赁
        app.MapPost("/api/user/orders/{id:long}/renew", async (long id, RenewRequest req, HttpContext ctx,
            IOrderService orders, IPricingService pricing, SupplierRouter router, IBalanceService balance, AppDbContext db) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var order = await orders.GetByIdAsync(id);
            if (order == null || order.UserId != session.UserId) return Results.NotFound();
            if (order.Mode != "rental")
                return Results.Json(new { error = "仅租赁订单支持续订" }, statusCode: 400);
            if (req.Months < 1 || req.Months > 12)
                return Results.Json(new { error = "续订月数无效" }, statusCode: 400);

            var supplier = router.Get(order.Supplier!.Code);
            var config = await pricing.GetConfigAsync();
            var price = await supplier.GetRentalPriceAsync(order.Country!.Code, order.ServiceCode);
            var monthlyUserPrice = pricing.CalcUserPrice(price.MonthlyCostUsd, "rental", req.Months, order.Country, config);
            var totalUserPrice = monthlyUserPrice * req.Months;

            if (!await balance.HasSufficientBalanceAsync(session.UserId, totalUserPrice))
                return Results.Json(new { error = $"余额不足，需要 ${totalUserPrice:F4}" }, statusCode: 400);

            await balance.DeductAsync(session.UserId, totalUserPrice,
                $"续订 {order.ServiceName} {req.Months}个月", order.Id);

            var dbOrder = await db.Orders.FindAsync(id);
            dbOrder!.SubscriptionMonths = (dbOrder.SubscriptionMonths ?? 1) + req.Months;
            dbOrder.UserPrice += totalUserPrice;
            if (dbOrder.NextRenewalAt == null && dbOrder.ExpiresAt != null)
                dbOrder.NextRenewalAt = dbOrder.ExpiresAt.Value.AddDays(-2);
            await db.SaveChangesAsync();

            return Results.Ok(new { success = true, subscriptionMonths = dbOrder.SubscriptionMonths, userPrice = dbOrder.UserPrice });
        });

        // 查询续订价格
        app.MapGet("/api/user/orders/{id:long}/renew-price", async (long id, int months, HttpContext ctx,
            IOrderService orders, IPricingService pricing, SupplierRouter router) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var order = await orders.GetByIdAsync(id);
            if (order == null || order.UserId != session.UserId) return Results.NotFound();
            if (order.Mode != "rental")
                return Results.Json(new { error = "仅租赁订单" }, statusCode: 400);

            var supplier = router.Get(order.Supplier!.Code);
            var config = await pricing.GetConfigAsync();
            var price = await supplier.GetRentalPriceAsync(order.Country!.Code, order.ServiceCode);
            var monthlyUserPrice = pricing.CalcUserPrice(price.MonthlyCostUsd, "rental", months, order.Country, config);
            var totalUserPrice = monthlyUserPrice * months;

            return Results.Ok(new { monthlyUserPrice, totalUserPrice, usdCnyRate = config.UsdCnyRate });
        });
    }
}
