using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Common;
using SmsBus.Web.Data;
using SmsBus.Web.Dto;
using SmsBus.Web.Infrastructure.Auth;
using SmsBus.Web.Services;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        // --- 用户管理 ---
        app.MapGet("/api/admin/users", async (AppDbContext db) =>
        {
            var users = await db.Users.OrderBy(u => u.Id).ToListAsync();
            return Results.Ok(users.Select(u => new
            {
                u.Id, u.Phone, u.DisplayName, u.Balance, u.IsAdmin, u.IsActive, u.CreatedAt
            }));
        });

        app.MapPatch("/api/admin/users/{id}", async (long id, AdminUserPatch patch, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user == null) return Results.NotFound();
            if (patch.IsActive.HasValue) user.IsActive = patch.IsActive.Value;
            if (patch.DisplayName != null) user.DisplayName = patch.DisplayName;
            user.UpdatedAt = DateTime.Now;
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true });
        });

        app.MapPost("/api/admin/users/{id}/recharge", async (long id, RechargeRequest req, HttpContext ctx, IBalanceService balance) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var ok = await balance.RechargeAsync(id, req.Amount, req.Description, session.UserId);
            if (!ok) return Results.NotFound();
            return Results.Ok(new { success = true });
        });

        // --- 供应商管理 ---
        app.MapGet("/api/admin/suppliers", async (AppDbContext db) =>
        {
            var list = await db.Suppliers.OrderBy(s => s.Id).ToListAsync();
            return Results.Ok(list.Select(s => new
            {
                s.Id, s.Code, s.Name, s.ApiKey, s.ApiBaseUrl,
                s.IsActive, s.SupportsActivation, s.SupportsRental,
                s.RequiresServiceForActivation, s.RequiresServiceForRental, s.CreatedAt
            }));
        });

        // --- 预定义国家列表（前端下拉用）---
        app.MapGet("/api/admin/country-presets", () => Results.Ok(CountryPresets.All));

        // --- 国家管理 ---
        app.MapGet("/api/admin/countries", async (AppDbContext db) =>
        {
            var list = await db.Countries.Include(c => c.Supplier).OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync();
            return Results.Ok(list.Select(c => new
            {
                c.Id, c.Code, c.Name, c.SupplierId, supplierName = c.Supplier?.Name,
                c.IsActive, c.ActivationEnabled, c.RentalEnabled,
                c.ActivationMarkupPercent, c.RentalMarkupPercent,
                c.ServiceFee1m, c.ServiceFee3m, c.ServiceFee6m, c.ServiceFee12m,
                c.SortOrder
            }));
        });

        app.MapPost("/api/admin/countries", async (CountryRequest req, AppDbContext db) =>
        {
            var country = new SmsBus.Web.Entities.Country
            {
                Code = req.Code, Name = req.Name, SupplierId = req.SupplierId,
                IsActive = req.IsActive, ActivationEnabled = req.ActivationEnabled,
                RentalEnabled = req.RentalEnabled, ActivationMarkupPercent = req.ActivationMarkupPercent,
                RentalMarkupPercent = req.RentalMarkupPercent,
                ServiceFee1m = req.ServiceFee1m, ServiceFee3m = req.ServiceFee3m,
                ServiceFee6m = req.ServiceFee6m, ServiceFee12m = req.ServiceFee12m,
                SortOrder = req.SortOrder
            };
            db.Countries.Add(country);
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true, id = country.Id });
        });

        app.MapPut("/api/admin/countries/{id}", async (long id, CountryRequest req, AppDbContext db) =>
        {
            var country = await db.Countries.FindAsync(id);
            if (country == null) return Results.NotFound();
            country.Code = req.Code; country.Name = req.Name; country.SupplierId = req.SupplierId;
            country.IsActive = req.IsActive; country.ActivationEnabled = req.ActivationEnabled;
            country.RentalEnabled = req.RentalEnabled; country.ActivationMarkupPercent = req.ActivationMarkupPercent;
            country.RentalMarkupPercent = req.RentalMarkupPercent;
            country.ServiceFee1m = req.ServiceFee1m; country.ServiceFee3m = req.ServiceFee3m;
            country.ServiceFee6m = req.ServiceFee6m; country.ServiceFee12m = req.ServiceFee12m;
            country.SortOrder = req.SortOrder;
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true });
        });

        app.MapDelete("/api/admin/countries/{id}", async (long id, AppDbContext db) =>
        {
            var country = await db.Countries.FindAsync(id);
            if (country == null) return Results.NotFound();
            db.Countries.Remove(country);
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true });
        });

        // --- 订单管理 ---
        app.MapGet("/api/admin/orders", async (long? userId, string? mode, string? status,
            DateTime? dateFrom, DateTime? dateTo, long? countryId, IOrderService orders) =>
        {
            var list = await orders.GetAllOrdersAsync(userId, mode, status, dateFrom, dateTo, countryId);
            return Results.Ok(list.Select(o => new
            {
                o.Id, o.PhoneNumber,
                countryCode = o.Country?.Code, countryName = o.Country?.Name,
                supplierName = o.Supplier?.Name,
                o.ServiceCode, o.ServiceName, o.Mode, o.Status,
                o.CostPrice, o.UserPrice, o.PurchasedAt, o.ExpiresAt, o.Source, o.UserId,
                o.SubscriptionMonths, o.RenewedCount, o.NextRenewalAt, o.RenewalFailedAt,
                userName = o.User?.Phone,
                smsList = o.SmsList.OrderByDescending(s => s.ReceivedAt)
                    .Select(s => new { s.Text, s.Code, s.ReceivedAt })
            }));
        });

        app.MapPost("/api/admin/orders/{id}/assign", async (long id, AssignRequest req, HttpContext ctx, IOrderService orders) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var ok = await orders.AssignToUserAsync(id, req.UserId, session.UserId);
            if (!ok) return Results.NotFound();
            return Results.Ok(new { success = true });
        });

        // --- 定价配置 ---
        app.MapGet("/api/admin/pricing", async (IPricingService pricing) =>
        {
            var config = await pricing.GetConfigAsync();
            return Results.Ok(new
            {
                config.DefaultActivationMarkupPercent, config.DefaultRentalMarkupPercent,
                config.ServiceFee1m, config.ServiceFee3m, config.ServiceFee6m, config.ServiceFee12m,
                config.UsdCnyRate
            });
        });

        app.MapPut("/api/admin/pricing", async (PricingConfigRequest req, IPricingService pricing) =>
        {
            await pricing.UpdateConfigAsync(new SmsBus.Web.Entities.PricingConfig
            {
                DefaultActivationMarkupPercent = req.DefaultActivationMarkupPercent,
                DefaultRentalMarkupPercent = req.DefaultRentalMarkupPercent,
                ServiceFee1m = req.ServiceFee1m, ServiceFee3m = req.ServiceFee3m,
                ServiceFee6m = req.ServiceFee6m, ServiceFee12m = req.ServiceFee12m,
                UsdCnyRate = req.UsdCnyRate
            });
            return Results.Ok(new { success = true });
        });

        // --- 供应商余额 ---
        app.MapGet("/api/admin/supplier/balance", async (SupplierRouter router) =>
        {
            var results = new List<object>();
            foreach (var s in router.All)
            {
                try
                {
                    var bal = await s.GetBalanceAsync();
                    results.Add(new { code = s.Code, balance = bal });
                }
                catch (Exception ex)
                {
                    results.Add(new { code = s.Code, balance = -1m, error = ex.Message });
                }
            }
            return Results.Ok(results);
        });

        // --- 交易流水 ---
        app.MapGet("/api/admin/transactions", async (IBalanceService balance) =>
        {
            var list = await balance.GetAllTransactionsAsync();
            return Results.Ok(list.Select(t => new
            {
                t.Amount, t.Type, t.Description, t.CreatedAt,
                userName = t.User?.Phone
            }));
        });
    }
}
