using System.Text.Json;
using SmsBus.Web.Common;

namespace SmsBus.Web.Infrastructure;

public static class ExceptionHandlerMiddleware
{
    public static void UseGlobalExceptionHandler(this WebApplication app)
    {
        app.Use(async (ctx, next) =>
        {
            try
            {
                await next();
            }
            catch (Exception ex)
            {
                var logger = ctx.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "未处理异常: {Path}", ctx.Request.Path);

                ctx.Response.StatusCode = 500;
                ctx.Response.ContentType = "application/json";
                var response = ApiResponse.Fail("服务器内部错误");
                await ctx.Response.WriteAsync(JsonSerializer.Serialize(response));
            }
        });
    }
}

public partial class Program { }
