using SmsBus.Web.Data;
using SmsBus.Web.Infrastructure.Auth;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        app.MapGet("/api/user/info", async (HttpContext ctx, AppDbContext db, IPricingService pricing) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var user = await db.Users.FindAsync(session.UserId);
            if (user == null) return Results.NotFound();
            var config = await pricing.GetConfigAsync();

            return Results.Ok(new
            {
                user.Phone, user.DisplayName, user.Balance, user.IsAdmin,
                usdCnyRate = config.UsdCnyRate
            });
        });

        app.MapGet("/api/user/orders", async (HttpContext ctx, IOrderService orders) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var list = await orders.GetUserOrdersAsync(session.UserId);
            return Results.Ok(list.Select(o => new
            {
                o.Id, o.OrderId, o.Number, o.CountryName, o.ServiceName, o.Mode, o.Status,
                o.TotalPrice, o.SmsContent, o.VerificationCode, o.PurchasedAt, o.ExpiresAt, o.Source,
                o.SubscriptionMonths, o.SubscriptionRenewedCount, o.AutoSubscribe, o.NextRenewalAt,
                smsList = o.SmsList.Select(s => new { s.Text, s.Code, s.ReceivedAt })
            }));
        });

        app.MapGet("/api/user/transactions", async (HttpContext ctx, IBalanceService balance) =>
        {
            var session = (SessionData)ctx.Items["_session"]!;
            var list = await balance.GetTransactionsAsync(session.UserId);
            return Results.Ok(list.Select(t => new
            {
                t.Amount, t.Type, t.Description, t.CreatedAt
            }));
        });
    }
}
