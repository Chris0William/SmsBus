using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Data;
using SmsBus.Web.Dto;
using SmsBus.Web.Infrastructure.Auth;
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

        // --- 订单管理 ---
        app.MapGet("/api/admin/orders", async (long? userId, IOrderService orders) =>
        {
            var list = await orders.GetAllOrdersAsync(userId);
            return Results.Ok(list.Select(o => new
            {
                o.Id, o.OrderId, o.Number, o.CountryName, o.ServiceName, o.Mode, o.Status,
                o.CostPrice, o.ListPrice, o.MarkupAmount, o.TotalPrice, o.SmsContent, o.VerificationCode,
                o.PurchasedAt, o.ExpiresAt, o.Source, o.UserId,
                userName = o.User?.Phone
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
                config.RentalProfitPercent, config.ActivationProfitPercent,
                config.ServiceFee1m, config.ServiceFee3m, config.ServiceFee6m, config.ServiceFee12m,
                config.MarkupEnabled, config.UsdCnyRate
            });
        });

        app.MapPut("/api/admin/pricing", async (PricingConfigRequest req, IPricingService pricing) =>
        {
            await pricing.UpdateConfigAsync(new SmsBus.Web.Entities.PricingConfig
            {
                RentalProfitPercent = req.RentalProfitPercent,
                ActivationProfitPercent = req.ActivationProfitPercent,
                ServiceFee1m = req.ServiceFee1m,
                ServiceFee3m = req.ServiceFee3m,
                ServiceFee6m = req.ServiceFee6m,
                ServiceFee12m = req.ServiceFee12m,
                MarkupEnabled = req.MarkupEnabled,
                UsdCnyRate = req.UsdCnyRate
            });
            return Results.Ok(new { success = true });
        });

        // --- 供应商余额 ---
        app.MapGet("/api/admin/supplier/balance", async (ISupplierService supplier) =>
        {
            var (bal, karma, name) = await supplier.GetUserInfoAsync();
            return Results.Ok(new { balance = bal, karma, name });
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
