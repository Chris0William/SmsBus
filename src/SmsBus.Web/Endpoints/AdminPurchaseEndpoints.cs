using SmsBus.Web.Dto;
using SmsBus.Web.Services.Interfaces;
using SmsPva.Sdk;

using Order = SmsBus.Web.Entities.Order;

namespace SmsBus.Web.Endpoints;

public static class AdminPurchaseEndpoints
{
    public static void MapAdminPurchaseEndpoints(this WebApplication app)
    {
        // --- 供应商信息 ---
        app.MapGet("/api/userinfo", async (ISupplierService supplier) =>
        {
            var (bal, karma, name) = await supplier.GetUserInfoAsync();
            return Results.Ok(new { Balance = bal, Karma = karma, Name = name });
        });

        // --- 一次性接码 ---
        app.MapGet("/api/activation/services", async (ISupplierService supplier) =>
        {
            try
            {
                var services = await supplier.GetActivationServicesAsync();
                return Results.Ok(services.Select(s => new { s.Name, s.Code }));
            }
            catch
            {
                return Results.Ok(Array.Empty<object>());
            }
        });

        app.MapGet("/api/activation/count", async (string service, string country, ISupplierService supplier) =>
        {
            try
            {
                var (total, price) = await supplier.GetActivationCountAsync(service, country);
                return Results.Ok(new { total, price });
            }
            catch
            {
                return Results.Ok(new { total = 0, price = 0m });
            }
        });

        app.MapPost("/api/activation/purchase", async (ActivationPurchaseRequest req, ISupplierService supplier, IOrderService orders) =>
        {
            var balBefore = (await supplier.GetUserInfoAsync()).Balance;
            var number = await supplier.GetNumberAsync(req.ServiceCode, req.CountryCode);
            var balAfter = (await supplier.GetUserInfoAsync()).Balance;
            var actualCost = balBefore - balAfter;

            var order = new Order
            {
                OrderId = $"act_{number.Id}",
                Number = number.Number,
                CountryName = req.CountryName ?? req.CountryCode,
                CountryCode = req.CountryCode,
                ServiceName = req.ServiceName ?? req.ServiceCode,
                ServiceCode = req.ServiceCode,
                CostPrice = actualCost > 0 ? actualCost : req.Price,
                ListPrice = req.Price,
                MarkupAmount = req.HiddenPrice,
                TotalPrice = req.Price + req.HiddenPrice,
                PurchasedAt = DateTime.Now,
                Status = "waiting",
                Mode = "activation",
                Source = "admin",
                ActivationNumberId = number.Id
            };

            await orders.CreateAsync(order);
            return Results.Ok(new
            {
                order.OrderId, order.Number, order.Mode, order.Status,
                order.CostPrice, order.ListPrice, order.TotalPrice,
                order.CountryName, order.ServiceName, order.PurchasedAt, order.ActivationNumberId
            });
        });

        // --- 租赁 ---
        app.MapGet("/api/rental/countries", async (ISupplierService supplier) =>
            Results.Ok(await supplier.GetRentalCountriesAsync()));

        app.MapGet("/api/rental/services", async (string country, string? dtype, int? dcount, ISupplierService supplier) =>
            Results.Ok(await supplier.GetRentalServicesAsync(country, dtype, dcount)));

        app.MapPost("/api/rental/purchase", async (RentalPurchaseRequest req, ISupplierService supplier, IOrderService orders) =>
        {
            var balBefore = (await supplier.GetUserInfoAsync()).Balance;
            var rental = await supplier.CreateRentalAsync(req.CountryCode, req.ServiceCode, req.Dtype, req.Dcount);
            var balAfter = (await supplier.GetUserInfoAsync()).Balance;
            var actualCost = balBefore - balAfter;

            var order = new Order
            {
                OrderId = $"rent_{rental.Id}",
                Number = "+" + rental.CountryDigitCode + rental.PhoneNumber,
                CountryName = req.CountryName ?? req.CountryCode,
                CountryCode = req.CountryCode,
                ServiceName = req.ServiceName ?? rental.ServiceName,
                ServiceCode = req.ServiceCode,
                CostPrice = actualCost > 0 ? actualCost : req.Price,
                ListPrice = req.Price,
                MarkupAmount = req.HiddenPrice,
                TotalPrice = req.Price + req.HiddenPrice,
                PurchasedAt = DateTime.Now,
                Status = rental.StateText,
                Mode = "rental",
                Source = "admin",
                RentalOrderId = rental.Id,
                RentalDtype = req.Dtype,
                RentalDcount = req.Dcount,
                ExpiresAt = rental.ExpiresAt
            };

            await orders.CreateAsync(order);
            return Results.Ok(new
            {
                order.OrderId, order.Number, order.Mode, order.Status,
                order.CostPrice, order.ListPrice, order.TotalPrice,
                order.CountryName, order.ServiceName, order.PurchasedAt, order.ExpiresAt, order.RentalOrderId
            });
        });

        app.MapPost("/api/rental/activate/{orderId}", async (string orderId, SmsPvaClient client, IOrderService orders) =>
        {
            var order = await orders.GetByOrderIdAsync(orderId);
            if (order?.RentalOrderId == null) return Results.NotFound();
            await client.ActivateRentalAsync(order.RentalOrderId.Value);
            await orders.UpdateStatusAsync(orderId, "activating");
            return Results.Ok(new { status = "activating" });
        });

        app.MapGet("/api/rental/sms/{orderId}", async (string orderId, SmsPvaClient client, IOrderService orders) =>
        {
            var order = await orders.GetByOrderIdAsync(orderId);
            if (order?.RentalOrderId == null) return Results.NotFound();
            // sms 方法只需 orderId
            var messages = await client.ReadRentalSmsAsync(order.RentalOrderId.Value);
            var smsList = messages.Select(m => new SmsBus.Web.Entities.OrderSms
            {
                Text = m.Text,
                Code = SmsPvaClient.ExtractVerificationCode(m.Text),
                ReceivedAt = m.ReceivedAt
            }).ToList();
            await orders.UpdateRentalSmsAsync(orderId, smsList);
            return Results.Ok(new { messages = smsList.Select(s => new { s.Text, s.Code, s.ReceivedAt }) });
        });

        app.MapPost("/api/rental/prolong/{orderId}", async (string orderId, ProlongRequest req, SmsPvaClient client, ISupplierService supplier, IOrderService orders) =>
        {
            var order = await orders.GetByOrderIdAsync(orderId);
            if (order?.RentalOrderId == null) return Results.NotFound();

            var balBefore = (await supplier.GetUserInfoAsync()).Balance;
            await client.ProlongRentalAsync(order.RentalOrderId.Value, req.Dtype, req.Dcount);
            var balAfter = (await supplier.GetUserInfoAsync()).Balance;
            var renewCost = balBefore - balAfter;

            var allOrders = await client.GetRentalOrdersAsync();
            var updated = allOrders.FirstOrDefault(o => o.Id == order.RentalOrderId.Value);
            if (updated != null) await orders.UpdateRentalInfoAsync(orderId, updated.ExpiresAt, updated.StateText);

            if (renewCost > 0)
                await orders.AccumulateCostAsync(orderId, renewCost);

            return Results.Ok(new { success = true, renewCost });
        });

        app.MapPost("/api/rental/delete/{orderId}", async (string orderId, SmsPvaClient client, IOrderService orders) =>
        {
            var order = await orders.GetByOrderIdAsync(orderId);
            if (order?.RentalOrderId == null) return Results.NotFound();
            await client.DeleteRentalAsync(order.RentalOrderId.Value);
            await orders.UpdateStatusAsync(orderId, "cancelled");
            return Results.Ok(new { success = true });
        });

        // --- 订单管理 ---
        app.MapGet("/api/orders", async (IOrderService orders) =>
        {
            var list = await orders.GetAllOrdersAsync();
            return Results.Ok(list.Select(o => new
            {
                o.Id, o.OrderId, o.Number, o.CountryName, o.CountryCode, o.ServiceName, o.ServiceCode,
                o.Mode, o.Status, o.CostPrice, o.ListPrice, o.MarkupAmount, o.TotalPrice,
                o.SmsContent, o.VerificationCode, o.PurchasedAt, o.ExpiresAt, o.Source, o.UserId,
                o.RentalOrderId, o.ActivationNumberId, o.RentalDtype, o.RentalDcount,
                o.SubscriptionMonths, o.SubscriptionRenewedCount, o.AutoSubscribe, o.NextRenewalAt, o.RenewalFailedAt,
                userName = o.User?.Phone,
                smsList = o.SmsList.Select(s => new { s.Text, s.Code, s.ReceivedAt })
            }));
        });

        app.MapGet("/api/orders/{id}", async (string id, IOrderService orders) =>
        {
            var order = await orders.GetByOrderIdAsync(id);
            if (order == null) return Results.NotFound();
            return Results.Ok(new
            {
                order.Id, order.OrderId, order.Number, order.CountryName, order.CountryCode,
                order.ServiceName, order.ServiceCode, order.Mode, order.Status,
                order.CostPrice, order.ListPrice, order.MarkupAmount, order.TotalPrice,
                order.SmsContent, order.VerificationCode, order.PurchasedAt, order.ExpiresAt,
                order.Source, order.UserId, order.RentalOrderId, order.ActivationNumberId,
                order.RentalDtype, order.RentalDcount,
                order.SubscriptionMonths, order.SubscriptionRenewedCount, order.AutoSubscribe, order.NextRenewalAt, order.RenewalFailedAt,
                smsList = order.SmsList.Select(s => new { s.Text, s.Code, s.ReceivedAt })
            });
        });

        app.MapGet("/api/orders/{id}/poll", async (string id, SmsPvaClient client, IOrderService orders) =>
        {
            var order = await orders.GetByOrderIdAsync(id);
            if (order == null) return Results.NotFound();

            if (order.Mode == "activation" && order.Status == "waiting" && order.ActivationNumberId != null)
            {
                try
                {
                    var sms = await client.GetSmsAsync(order.ServiceCode!, order.CountryCode!, order.ActivationNumberId.Value);
                    if (sms != null)
                        await orders.UpdateSmsAsync(id, sms.Text, sms.Code ?? SmsPvaClient.ExtractVerificationCode(sms.Text));
                }
                catch (SmsPva.Sdk.Exceptions.SmsPvaException ex) when (ex.Message.Contains("expired") || ex.Message.Contains("cancel"))
                {
                    await orders.UpdateStatusAsync(id, "expired");
                }
                catch { }
            }

            if (order.Mode == "rental" && order.RentalOrderId != null)
            {
                try
                {
                    var allOrders = await client.GetRentalOrdersAsync();
                    var ro = allOrders.FirstOrDefault(o => o.Id == order.RentalOrderId.Value);
                    if (ro != null) await orders.UpdateRentalInfoAsync(id, ro.ExpiresAt, ro.StateText);
                }
                catch { }
            }

            var updated = await orders.GetByOrderIdAsync(id);
            return Results.Ok(new
            {
                updated!.Id, updated.OrderId, updated.Number, updated.CountryName, updated.CountryCode,
                updated.ServiceName, updated.ServiceCode, updated.Mode, updated.Status,
                updated.CostPrice, updated.ListPrice, updated.MarkupAmount, updated.TotalPrice,
                updated.SmsContent, updated.VerificationCode, updated.PurchasedAt, updated.ExpiresAt,
                updated.Source, updated.UserId, updated.RentalOrderId, updated.ActivationNumberId,
                updated.RentalDtype, updated.RentalDcount,
                updated.SubscriptionMonths, updated.SubscriptionRenewedCount, updated.AutoSubscribe, updated.NextRenewalAt, updated.RenewalFailedAt,
                smsList = updated.SmsList.Select(s => new { s.Text, s.Code, s.ReceivedAt })
            });
        });

        app.MapPost("/api/orders/{id}/cancel", async (string id, SmsPvaClient client, IOrderService orders) =>
        {
            var order = await orders.GetByOrderIdAsync(id);
            if (order == null) return Results.NotFound();
            if (order.Mode == "activation" && order.ActivationNumberId != null)
            {
                try { await client.DenyNumberAsync(order.ServiceCode!, order.CountryCode!, order.ActivationNumberId.Value); }
                catch { }
            }
            await orders.UpdateStatusAsync(id, "cancelled");
            return Results.Ok(new { success = true });
        });

        app.MapPost("/api/orders/{id}/remove", async (string id, IOrderService orders) =>
        {
            await orders.DeleteOrderAsync(id);
            return Results.Ok(new { success = true });
        });
    }
}
