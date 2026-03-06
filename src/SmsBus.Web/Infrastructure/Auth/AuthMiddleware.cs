using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Infrastructure.Auth;

public static class AuthMiddleware
{
    private const string CookieName = "_token";

    public static async Task<SessionData?> GetSession(HttpContext ctx)
    {
        if (!ctx.Request.Cookies.TryGetValue(CookieName, out var token)) return null;
        if (ctx.Items.TryGetValue("_session", out var cached)) return cached as SessionData;

        var auth = ctx.RequestServices.GetRequiredService<IAuthService>();
        var session = await auth.GetSessionAsync(token);
        if (session != null) ctx.Items["_session"] = session;
        return session;
    }

    public static void UseAuthMiddleware(this WebApplication app)
    {
        // 拦截受保护的静态文件
        app.Use(async (ctx, next) =>
        {
            var path = ctx.Request.Path.Value?.ToLowerInvariant() ?? "";
            if (path == "/_admin.html" || path == "/js/admin.js" ||
                path == "/js/user.js" || path == "/user.html")
            {
                ctx.Response.StatusCode = 404;
                return;
            }
            await next();
        });

        app.UseStaticFiles();

        // API 认证中间件
        app.Use(async (ctx, next) =>
        {
            var path = ctx.Request.Path.Value ?? "";

            if (path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            {
                // 白名单：公开接口
                if (path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase) ||
                    path.Equals("/api/auth/register", StringComparison.OrdinalIgnoreCase) ||
                    path.Equals("/api/captcha", StringComparison.OrdinalIgnoreCase) ||
                    path.Equals("/api/captcha/verify", StringComparison.OrdinalIgnoreCase))
                {
                    await next(); return;
                }

                // 白名单：分享页 GET /api/orders/{id}
                if (ctx.Request.Method == "GET" && path.StartsWith("/api/orders/", StringComparison.OrdinalIgnoreCase))
                {
                    await next(); return;
                }

                var session = await GetSession(ctx);

                // 管理 API 需要管理员权限
                if (path.StartsWith("/api/admin/", StringComparison.OrdinalIgnoreCase))
                {
                    if (session == null || !session.IsAdmin)
                    {
                        ctx.Response.StatusCode = 401;
                        ctx.Response.ContentType = "application/json";
                        await ctx.Response.WriteAsync("{\"error\":\"需要管理员权限\"}");
                        return;
                    }
                    await next(); return;
                }

                // 用户/服务 API 需要登录
                if (path.StartsWith("/api/user/", StringComparison.OrdinalIgnoreCase) ||
                    path.StartsWith("/api/services/", StringComparison.OrdinalIgnoreCase))
                {
                    if (session == null)
                    {
                        ctx.Response.StatusCode = 401;
                        ctx.Response.ContentType = "application/json";
                        await ctx.Response.WriteAsync("{\"error\":\"未登录\"}");
                        return;
                    }
                    await next(); return;
                }

                // 原有管理 API 需要管理员
                if (session == null || !session.IsAdmin)
                {
                    ctx.Response.StatusCode = 401;
                    ctx.Response.ContentType = "application/json";
                    await ctx.Response.WriteAsync("{\"error\":\"未登录\"}");
                    return;
                }
            }

            await next();
        });
    }
}
