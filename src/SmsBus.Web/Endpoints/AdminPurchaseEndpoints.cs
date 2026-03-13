using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Data;
using SmsBus.Web.Dto;
using SmsBus.Web.Services;
using SmsBus.Web.Services.Interfaces;

using Order = SmsBus.Web.Entities.Order;

namespace SmsBus.Web.Endpoints;

public static class AdminPurchaseEndpoints
{
    public static void MapAdminPurchaseEndpoints(this WebApplication app)
    {
        // 管理员购买临时接码（不扣余额）
        app.MapPost("/api/admin/purchase/activation", async (AdminActivationRequest req,
            AppDbContext db, SupplierRouter router, IOrderService orders) =>
        {
            var country = await db.Countries.Include(c => c.Supplier)
                .FirstOrDefaultAsync(c => c.Code == req.CountryCode && c.IsActive);
            if (country?.Supplier == null) return Results.Json(new { error = "国家不可用" }, statusCode: 400);

            var supplier = router.Get(country.Supplier.Code);
            var balBefore = await supplier.GetBalanceAsync();
            var number = await supplier.GetNumberAsync(req.ServiceCode ?? "", country.Code);
            var balAfter = await supplier.GetBalanceAsync();
            var actualCost = balBefore - balAfter;

            var order = await orders.CreateAsync(new Order
            {
                SupplierId = country.SupplierId,
                CountryId = country.Id,
                Source = "admin",
                PhoneNumber = number.FullNumber,
                ServiceCode = req.ServiceCode,
                Mode = "activation",
                Status = "waiting",
                CostPrice = actualCost > 0 ? actualCost : 0,
                UserPrice = 0,
                SupplierOrderId = number.Id,
                PurchasedAt = DateTime.Now
            });

            return Results.Ok(new
            {
                order.Id, order.PhoneNumber, order.Mode, order.Status,
                order.CostPrice, countryName = country.Name, order.PurchasedAt
            });
        });

        // 管理员购买租赁号码（不扣余额）
        app.MapPost("/api/admin/purchase/rental", async (AdminRentalRequest req,
            AppDbContext db, SupplierRouter router, IOrderService orders) =>
        {
            var country = await db.Countries.Include(c => c.Supplier)
                .FirstOrDefaultAsync(c => c.Code == req.CountryCode && c.IsActive);
            if (country?.Supplier == null) return Results.Json(new { error = "国家不可用" }, statusCode: 400);

            var supplier = router.Get(country.Supplier.Code);
            var balBefore = await supplier.GetBalanceAsync();
            var rental = await supplier.CreateRentalAsync(country.Code, req.ServiceCode);
            var balAfter = await supplier.GetBalanceAsync();
            var actualCost = balBefore - balAfter;

            try { await supplier.ActivateRentalAsync(rental.Id); } catch { }

            var order = await orders.CreateAsync(new Order
            {
                SupplierId = country.SupplierId,
                CountryId = country.Id,
                Source = "admin",
                PhoneNumber = rental.PhoneNumber.StartsWith("+") ? rental.PhoneNumber : "+" + rental.CountryDigitCode + rental.PhoneNumber,
                ServiceCode = req.ServiceCode,
                Mode = "rental",
                Status = "active",
                CostPrice = actualCost > 0 ? actualCost : 0,
                UserPrice = 0,
                SupplierOrderId = rental.Id,
                ExpiresAt = rental.ExpiresAt,
                PurchasedAt = DateTime.Now
            });

            return Results.Ok(new
            {
                order.Id, order.PhoneNumber, order.Mode, order.Status,
                order.CostPrice, countryName = country.Name, order.ExpiresAt, order.PurchasedAt
            });
        });

        // 管理员手动续费
        app.MapPost("/api/admin/orders/{id}/prolong", async (long id, SupplierRouter router, IOrderService orders) =>
        {
            var order = await orders.GetByIdAsync(id);
            if (order == null || order.Mode != "rental") return Results.NotFound();

            var supplier = router.Get(order.Supplier!.Code);
            var balBefore = await supplier.GetBalanceAsync();
            await supplier.ProlongRentalAsync(order.SupplierOrderId);
            var balAfter = await supplier.GetBalanceAsync();
            var renewCost = balBefore - balAfter;

            var status = await supplier.GetRentalStatusAsync(order.SupplierOrderId);
            if (status != null)
                await orders.UpdateRentalInfoAsync(id, status.ExpiresAt, status.Status);
            if (renewCost > 0)
                await orders.AccumulateCostAsync(id, renewCost);

            return Results.Ok(new { success = true, renewCost });
        });

        // 管理员读取租赁短信
        app.MapGet("/api/admin/orders/{id}/sms", async (long id, SupplierRouter router, IOrderService orders) =>
        {
            var order = await orders.GetByIdAsync(id);
            if (order == null || order.Mode != "rental") return Results.NotFound();

            var supplier = router.Get(order.Supplier!.Code);
            try
            {
                var messages = await supplier.ReadRentalSmsAsync(order.SupplierOrderId);
                var smsList = messages.Select(m => new SmsBus.Web.Entities.OrderSms
                {
                    Text = m.Text, Code = m.Code, ReceivedAt = m.ReceivedAt
                }).ToList();
                await orders.UpdateRentalSmsAsync(id, smsList);

                var updated = await orders.GetByIdAsync(id);
                return Results.Ok(new
                {
                    messages = updated!.SmsList.OrderByDescending(s => s.ReceivedAt)
                        .Select(s => new { s.Text, s.Code, s.ReceivedAt })
                });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { messages = order.SmsList.Select(s => new { s.Text, s.Code, s.ReceivedAt }), error = ex.Message });
            }
        });

        // 管理员轮询订单
        app.MapGet("/api/admin/orders/{id}/poll", async (long id, SupplierRouter router, IOrderService orders) =>
        {
            var order = await orders.GetByIdAsync(id);
            if (order == null) return Results.NotFound();

            var supplier = router.Get(order.Supplier!.Code);

            if (order.Mode == "activation" && order.Status == "waiting")
            {
                try
                {
                    var sms = await supplier.GetSmsAsync(order.ServiceCode ?? "", order.Country!.Code, order.SupplierOrderId);
                    if (sms != null)
                        await orders.UpdateSmsAsync(id, sms.Text, sms.Code);
                }
                catch (Exception ex) when (ex.Message.Contains("expired") || ex.Message.Contains("cancel"))
                {
                    await orders.UpdateStatusAsync(id, "expired");
                }
                catch { }
            }

            if (order.Mode == "rental")
            {
                try
                {
                    var status = await supplier.GetRentalStatusAsync(order.SupplierOrderId);
                    if (status != null)
                        await orders.UpdateRentalInfoAsync(id, status.ExpiresAt, status.Status);
                }
                catch { }
            }

            var updated = await orders.GetByIdAsync(id);
            return Results.Ok(new
            {
                updated!.Id, updated.PhoneNumber, updated.Mode, updated.Status,
                updated.CostPrice, updated.UserPrice, updated.ExpiresAt,
                updated.SubscriptionMonths, updated.RenewedCount, updated.NextRenewalAt,
                smsList = updated.SmsList.OrderByDescending(s => s.ReceivedAt)
                    .Select(s => new { s.Text, s.Code, s.ReceivedAt })
            });
        });

        // 管理员取消订单
        app.MapPost("/api/admin/orders/{id}/cancel", async (long id, SupplierRouter router, IOrderService orders) =>
        {
            var order = await orders.GetByIdAsync(id);
            if (order == null) return Results.NotFound();

            var supplier = router.Get(order.Supplier!.Code);
            if (order.Mode == "activation")
            {
                try { await supplier.DenyNumberAsync(order.ServiceCode ?? "", order.Country!.Code, order.SupplierOrderId); }
                catch { }
            }
            if (order.Mode == "rental")
            {
                try { await supplier.DeleteRentalAsync(order.SupplierOrderId); }
                catch { }
            }

            await orders.UpdateStatusAsync(id, "cancelled");
            return Results.Ok(new { success = true });
        });

        // 管理员删除订单
        app.MapPost("/api/admin/orders/{id}/remove", async (long id, IOrderService orders) =>
        {
            await orders.DeleteOrderAsync(id);
            return Results.Ok(new { success = true });
        });
    }
}
