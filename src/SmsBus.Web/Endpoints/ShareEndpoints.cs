using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Endpoints;

public static class ShareEndpoints
{
    public static void MapShareEndpoints(this WebApplication app)
    {
        app.MapGet("/share/{id:long}", async (long id, IWebHostEnvironment env, IOrderService orders) =>
        {
            var order = await orders.GetByIdAsync(id);
            if (order == null) return Results.NotFound("订单不存在");
            var filePath = Path.Combine(env.WebRootPath, "share.html");
            if (!File.Exists(filePath)) return Results.NotFound();
            return Results.File(filePath, "text/html");
        });
    }
}
