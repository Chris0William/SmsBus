using SmsBus.Web.Data;
using SmsBus.Web.Dto;
using SmsBus.Web.Infrastructure.Auth;
using SmsBus.Web.Services.Interfaces;

using Order = SmsBus.Web.Entities.Order;

namespace SmsBus.Web.Endpoints;

public static class PurchaseEndpoints
{
    public static void MapPurchaseEndpoints(this WebApplication app)
    {
        app.MapPost("/api/user/purchase/activation", async (UserActivationRequest req, HttpContext ctx,
            ISupplierService supplier, IPricingService pricing, IBalanceService balance, IOrderService orders) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var config = await pricing.GetConfigAsync();

            var (_, costPrice) = await supplier.GetActivationCountAsync(req.ServiceCode, req.CountryCode);
            var markup = pricing.CalcMarkup(config, costPrice, "activation");
            var totalPrice = costPrice + markup;

            if (!await balance.HasSufficientBalanceAsync(session.UserId, totalPrice))
                return Results.Json(new { success = false, error = $"余额不足，需要 ${totalPrice:F2}" }, statusCode: 400);

            var balBefore = (await supplier.GetUserInfoAsync()).Balance;
            var number = await supplier.GetNumberAsync(req.ServiceCode, req.CountryCode);
            var balAfter = (await supplier.GetUserInfoAsync()).Balance;
            var actualCost = balBefore - balAfter;

            var order = await orders.CreateAsync(new Order
            {
                OrderId = $"act_{number.Id}",
                UserId = session.UserId,
                Source = "user",
                Number = number.Number,
                CountryCode = req.CountryCode,
                CountryName = req.CountryName ?? req.CountryCode,
                ServiceCode = req.ServiceCode,
                ServiceName = req.ServiceName ?? req.ServiceCode,
                Mode = "activation",
                Status = "waiting",
                CostPrice = actualCost > 0 ? actualCost : costPrice,
                ListPrice = costPrice,
                MarkupAmount = markup,
                TotalPrice = totalPrice,
                ActivationNumberId = number.Id,
                PurchasedAt = DateTime.Now
            });

            await balance.DeductAsync(session.UserId, totalPrice,
                $"购买临时接码 {req.ServiceName ?? req.ServiceCode}", order.Id);

            return Results.Ok(new { success = true, orderId = order.OrderId, totalPrice, number = order.Number });
        });

        app.MapPost("/api/user/purchase/rental", async (UserRentalRequest req, HttpContext ctx,
            ISupplierService supplier, IPricingService pricing, IBalanceService balance, IOrderService orders) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var config = await pricing.GetConfigAsync();

            // 查询1个月价格
            var services = await supplier.GetRentalServicesAsync(req.CountryCode, "month", 1);
            var svc = services.FirstOrDefault(s => s.Code == req.ServiceCode);
            if (svc == null) return Results.Json(new { success = false, error = "服务不可用" }, statusCode: 400);

            var subMonths = req.SubscriptionMonths > 0 ? req.SubscriptionMonths : 1;
            var monthlyCost = svc.Price * 30;
            var totalCost = monthlyCost * subMonths;
            var totalMarkup = pricing.CalcMarkup(config, totalCost, "rental", subMonths);
            var totalPrice = totalCost + totalMarkup;

            if (!await balance.HasSufficientBalanceAsync(session.UserId, totalPrice))
                return Results.Json(new { success = false, error = $"余额不足，需要 ${totalPrice:F2}" }, statusCode: 400);

            // 上游只买1个月
            var balBefore = (await supplier.GetUserInfoAsync()).Balance;
            var rental = await supplier.CreateRentalAsync(req.CountryCode, req.ServiceCode, "month", 1);
            var balAfter = (await supplier.GetUserInfoAsync()).Balance;
            var actualCost = balBefore - balAfter;

            // 自动激活租赁号码
            try { await supplier.ActivateRentalAsync(rental.Id); } catch { /* 部分号码无需激活 */ }

            var order = await orders.CreateAsync(new Order
            {
                OrderId = $"rent_{rental.Id}",
                UserId = session.UserId,
                Source = "user",
                Number = "+" + rental.CountryDigitCode + rental.PhoneNumber,
                CountryCode = req.CountryCode,
                CountryName = req.CountryName ?? req.CountryCode,
                ServiceCode = req.ServiceCode,
                ServiceName = req.ServiceName ?? rental.ServiceName,
                Mode = "rental",
                Status = "activating",
                CostPrice = actualCost > 0 ? actualCost : totalCost,
                ListPrice = totalCost,
                MarkupAmount = totalMarkup,
                TotalPrice = totalPrice,
                RentalOrderId = rental.Id,
                RentalDtype = "month",
                RentalDcount = 1,
                ExpiresAt = rental.ExpiresAt,
                SubscriptionMonths = subMonths,
                SubscriptionRenewedCount = 0,
                AutoSubscribe = subMonths > 1,
                NextRenewalAt = subMonths > 1 ? rental.ExpiresAt.AddDays(-2) : null,
                PurchasedAt = DateTime.Now
            });

            await balance.DeductAsync(session.UserId, totalPrice,
                $"购买租赁 {req.ServiceName ?? req.ServiceCode} ({subMonths}个月)", order.Id);

            return Results.Ok(new { success = true, orderId = order.OrderId, totalPrice, number = order.Number });
        });

        // 用户获取租赁订单短信
        app.MapGet("/api/user/orders/{orderId}/sms", async (string orderId, HttpContext ctx,
            IOrderService orders, ISupplierService supplier, SmsPva.Sdk.SmsPvaClient client,
            ILoggerFactory logFactory) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var order = await orders.GetByOrderIdAsync(orderId);
            if (order == null || order.UserId != session.UserId) return Results.NotFound();
            if (order.Mode != "rental" || order.RentalOrderId == null)
                return Results.Json(new { error = "仅租赁订单支持此操作" }, statusCode: 400);

            var log = logFactory.CreateLogger("RentalSms");

            // 同步订单状态
            try
            {
                var allRentals = await supplier.GetRentalOrdersAsync();
                var ro = allRentals.FirstOrDefault(r => r.Id == order.RentalOrderId);
                if (ro != null)
                    await orders.UpdateRentalInfoAsync(orderId, ro.ExpiresAt, ro.StateText);
            }
            catch (Exception ex) { log.LogWarning(ex, "同步租赁状态失败: {OrderId}", orderId); }

            try
            {
                var messages = await client.ReadRentalSmsAsync(order.RentalOrderId.Value);
                var smsList = messages.Select(m => new SmsBus.Web.Entities.OrderSms
                {
                    Text = m.Text,
                    Code = SmsPva.Sdk.SmsPvaClient.ExtractVerificationCode(m.Text),
                    ReceivedAt = m.ReceivedAt
                }).ToList();
                await orders.UpdateRentalSmsAsync(orderId, smsList);
                return Results.Ok(new
                {
                    messages = smsList.Select(s => new { s.Text, s.Code, s.ReceivedAt })
                });
            }
            catch (Exception ex)
            {
                log.LogError(ex, "获取租赁短信失败: {OrderId}", orderId);
                var existing = order.SmsList?.Select(s => new { s.Text, s.Code, s.ReceivedAt }) ?? [];
                return Results.Ok(new { messages = existing, error = "获取上游短信失败: " + ex.Message });
            }
        });

        // 取消订单 + 临时接码自动退款并删除
        app.MapPost("/api/user/orders/{orderId}/cancel", async (string orderId, HttpContext ctx,
            ISupplierService supplier, IBalanceService balance, IOrderService orders) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var order = await orders.GetByOrderIdAsync(orderId);
            if (order == null || order.UserId != session.UserId)
                return Results.NotFound();

            if (order.Status != "waiting")
                return Results.Json(new { success = false, error = "仅等待中的订单可取消" }, statusCode: 400);

            if (order.Mode == "activation" && order.ActivationNumberId != null)
            {
                try { await supplier.DenyNumberAsync(order.ServiceCode!, order.CountryCode!, order.ActivationNumberId.Value); }
                catch { /* 忽略 */ }
            }

            // 全额退款
            if (order.TotalPrice > 0)
                await balance.RefundAsync(session.UserId, order.TotalPrice, $"取消订单退款 {orderId}", order.Id);

            // 临时接码订单直接删除（不显示给用户）
            if (order.Mode == "activation")
            {
                await orders.DeleteOrderAsync(orderId);
            }
            else
            {
                await orders.UpdateStatusAsync(orderId, "cancelled");
            }

            return Results.Ok(new { success = true });
        });

        // 轮询订单状态（临时接码）
        app.MapGet("/api/user/orders/{orderId}/poll", async (string orderId, HttpContext ctx,
            ISupplierService supplier, IBalanceService balance, IOrderService orders) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var order = await orders.GetByOrderIdAsync(orderId);
            if (order == null || order.UserId != session.UserId)
                return Results.NotFound();

            if (order.Mode == "activation" && order.Status == "waiting" && order.ActivationNumberId != null)
            {
                try
                {
                    var sms = await supplier.GetSmsAsync(order.ServiceCode!, order.CountryCode!, order.ActivationNumberId.Value);
                    if (sms != null)
                        await orders.UpdateSmsAsync(orderId, sms.Value.Text!, sms.Value.Code);
                }
                catch (SmsPva.Sdk.Exceptions.SmsPvaException ex) when (ex.Message.Contains("expired") || ex.Message.Contains("cancel") || ex.Message.Contains("过期"))
                {
                    // 过期：全额退款 + 删除订单
                    await orders.UpdateStatusAsync(orderId, "expired");
                    if (order.UserId != null && order.TotalPrice > 0)
                        await balance.RefundAsync(order.UserId.Value, order.TotalPrice,
                            $"临时接码过期自动退款 {orderId}", order.Id);
                    await orders.DeleteOrderAsync(orderId);
                    return Results.Ok(new { orderId, status = "expired", deleted = true });
                }
                catch { /* 等待中 */ }
            }

            order = await orders.GetByOrderIdAsync(orderId);
            if (order == null) return Results.Ok(new { orderId, status = "expired", deleted = true });
            return Results.Ok(new
            {
                order.OrderId, order.Status, order.SmsContent, order.VerificationCode,
                order.Number, order.ExpiresAt
            });
        });

        // 续订（重新购买延长原订单）
        app.MapPost("/api/user/orders/{orderId}/renew", async (string orderId, RenewRequest req, HttpContext ctx,
            IOrderService orders, IPricingService pricing, ISupplierService supplier,
            IBalanceService balance, AppDbContext db) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var order = await orders.GetByOrderIdAsync(orderId);
            if (order == null || order.UserId != session.UserId) return Results.NotFound();
            if (order.Mode != "rental")
                return Results.Json(new { error = "仅租赁订单支持续订" }, statusCode: 400);
            if (req.Months < 1 || req.Months > 12)
                return Results.Json(new { error = "续订月数无效" }, statusCode: 400);

            var config = await pricing.GetConfigAsync();
            var services = await supplier.GetRentalServicesAsync(order.CountryCode!, "month", 1);
            var svc = services.FirstOrDefault(s => s.Code == order.ServiceCode);
            if (svc == null) return Results.Json(new { error = "服务暂不可用" }, statusCode: 400);

            var monthlyCost = svc.Price * 30;
            var totalCost = monthlyCost * req.Months;
            var totalMarkup = pricing.CalcMarkup(config, totalCost, "rental", req.Months);
            var totalPrice = totalCost + totalMarkup;

            if (!await balance.HasSufficientBalanceAsync(session.UserId, totalPrice))
                return Results.Json(new { error = $"余额不足，需要 ${totalPrice:F2}" }, statusCode: 400);

            await balance.DeductAsync(session.UserId, totalPrice,
                $"续订 {order.ServiceName} {req.Months}个月", order.Id);

            // 延长原订单（CostPrice 由后台实际续费时通过 balance-diff 累加）
            order.SubscriptionMonths = (order.SubscriptionMonths ?? 1) + req.Months;
            order.AutoSubscribe = true;
            order.ListPrice += totalCost;
            order.MarkupAmount += totalMarkup;
            order.TotalPrice += totalPrice;
            // 如果之前自动续费已停止，重新设置 NextRenewalAt
            if (order.NextRenewalAt == null && order.ExpiresAt != null)
                order.NextRenewalAt = order.ExpiresAt.Value.AddDays(-2);

            await db.SaveChangesAsync();
            return Results.Ok(new { success = true, subscriptionMonths = order.SubscriptionMonths, totalPrice = order.TotalPrice });
        });

        // 查询续订价格
        app.MapGet("/api/user/orders/{orderId}/renew-price", async (string orderId, int months, HttpContext ctx,
            IOrderService orders, IPricingService pricing, ISupplierService supplier) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var order = await orders.GetByOrderIdAsync(orderId);
            if (order == null || order.UserId != session.UserId) return Results.NotFound();
            if (order.Mode != "rental")
                return Results.Json(new { error = "仅租赁订单" }, statusCode: 400);

            var config = await pricing.GetConfigAsync();
            var services = await supplier.GetRentalServicesAsync(order.CountryCode!, "month", 1);
            var svc = services.FirstOrDefault(s => s.Code == order.ServiceCode);
            if (svc == null) return Results.Json(new { error = "服务暂不可用" }, statusCode: 400);

            var monthlyCost = svc.Price * 30;
            var totalCost = monthlyCost * months;
            var totalMarkup = pricing.CalcMarkup(config, totalCost, "rental", months);
            var monthlyPrice = monthlyCost + pricing.CalcMarkup(config, monthlyCost, "rental", months);
            var totalPrice = totalCost + totalMarkup;

            return Results.Ok(new { monthlyPrice, totalPrice, usdCnyRate = config.UsdCnyRate });
        });
    }
}
