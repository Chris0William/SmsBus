using SmsBus.Web.Dto;
using SmsBus.Web.Services.Interfaces;
using StackExchange.Redis;

namespace SmsBus.Web.Endpoints;

public static class AuthEndpoints
{
    private const string CookieName = "_token";
    private const string AdminRoute = "/sms_admin";

    public static void MapAuthEndpoints(this WebApplication app)
    {
        app.MapPost("/api/auth/register", async (RegisterRequest req, HttpContext ctx, IAuthService auth, IConnectionMultiplexer redis) =>
        {
            var cdb = redis.GetDatabase(3);
            var cKey = $"captcha_ok:{req.CaptchaToken}";
            var cVal = await cdb.StringGetAsync(cKey);
            if (cVal.IsNullOrEmpty)
                return Results.Json(new { success = false, error = "请先完成人机验证" }, statusCode: 400);
            await cdb.KeyDeleteAsync(cKey);

            var (success, error, user) = await auth.RegisterAsync(req.Phone, req.Password);
            if (!success) return Results.Json(new { success = false, error }, statusCode: 400);

            var (_, _, _, token) = await auth.LoginAsync(req.Phone, req.Password);
            if (token != null)
            {
                ctx.Response.Cookies.Append(CookieName, token, new CookieOptions
                {
                    HttpOnly = true, SameSite = SameSiteMode.Lax, Path = "/"
                });
            }

            return Results.Ok(new { success = true, redirect = "/dashboard" });
        });

        app.MapPost("/api/auth/login", async (LoginRequest req, HttpContext ctx, IAuthService auth, IConnectionMultiplexer redis) =>
        {
            var cdb = redis.GetDatabase(3);
            var cKey = $"captcha_ok:{req.CaptchaToken}";
            var cVal = await cdb.StringGetAsync(cKey);
            if (cVal.IsNullOrEmpty)
                return Results.Json(new { success = false, error = "请先完成人机验证" }, statusCode: 400);
            await cdb.KeyDeleteAsync(cKey);

            var (success, error, user, token) = await auth.LoginAsync(req.Phone, req.Password, req.RememberMe);
            if (!success) return Results.Json(new { success = false, error }, statusCode: 401);

            var cookieOpts = new CookieOptions
            {
                HttpOnly = true, SameSite = SameSiteMode.Lax, Path = "/"
            };
            if (req.RememberMe) cookieOpts.MaxAge = TimeSpan.FromDays(30);

            ctx.Response.Cookies.Append(CookieName, token!, cookieOpts);

            var redirect = user!.IsAdmin ? AdminRoute : "/dashboard";
            return Results.Ok(new { success = true, redirect, isAdmin = user.IsAdmin });
        });

        app.MapPost("/api/auth/logout", async (HttpContext ctx, IAuthService auth) =>
        {
            if (ctx.Request.Cookies.TryGetValue(CookieName, out var token))
                await auth.LogoutAsync(token);
            ctx.Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/" });
            return Results.Ok(new { success = true });
        });
    }
}
