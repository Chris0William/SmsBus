using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Data;
using SmsBus.Web.Services;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Endpoints;

public static class ServiceEndpoints
{
    public static void MapServiceEndpoints(this WebApplication app)
    {
        // 获取可用国家列表（按模式筛选）
        app.MapGet("/api/countries", async (string? mode, AppDbContext db) =>
        {
            var q = db.Countries.Include(c => c.Supplier).Where(c => c.IsActive);
            if (mode == "activation") q = q.Where(c => c.ActivationEnabled);
            if (mode == "rental") q = q.Where(c => c.RentalEnabled);

            var countries = await q.OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync();
            return Results.Ok(countries.Select(c => new
            {
                c.Id, c.Code, c.Name,
                c.ActivationEnabled, c.RentalEnabled,
                requiresService = c.Supplier!.RequiresService
            }));
        });

        // 获取国家可用服务列表（临时接码）
        app.MapGet("/api/countries/{code}/services/activation", async (string code, AppDbContext db, SupplierRouter router) =>
        {
            var country = await db.Countries.Include(c => c.Supplier).FirstOrDefaultAsync(c => c.Code == code && c.IsActive);
            if (country?.Supplier == null) return Results.NotFound();
            if (!country.Supplier.RequiresService) return Results.Ok(Array.Empty<object>());

            var supplier = router.Get(country.Supplier.Code);
            try
            {
                var services = await supplier.GetActivationServicesAsync();
                return Results.Ok(services.Select(s => new { s.Code, s.Name }));
            }
            catch { return Results.Ok(Array.Empty<object>()); }
        });

        // 获取国家可用服务列表（租赁）
        app.MapGet("/api/countries/{code}/services/rental", async (string code, AppDbContext db, SupplierRouter router) =>
        {
            var country = await db.Countries.Include(c => c.Supplier).FirstOrDefaultAsync(c => c.Code == code && c.IsActive);
            if (country?.Supplier == null) return Results.NotFound();
            if (!country.Supplier.RequiresService) return Results.Ok(Array.Empty<object>());

            var supplier = router.Get(country.Supplier.Code);
            try
            {
                var services = await supplier.GetRentalServicesAsync(code);
                return Results.Ok(services.Select(s => new { s.Code, s.Name, s.Price, s.Count }));
            }
            catch { return Results.Ok(Array.Empty<object>()); }
        });

        // 查询临时接码价格
        app.MapGet("/api/countries/{code}/activation/price", async (string code, string service,
            AppDbContext db, SupplierRouter router, IPricingService pricing) =>
        {
            var country = await db.Countries.Include(c => c.Supplier).FirstOrDefaultAsync(c => c.Code == code && c.IsActive);
            if (country?.Supplier == null) return Results.NotFound();

            var supplier = router.Get(country.Supplier.Code);
            var config = await pricing.GetConfigAsync();
            try
            {
                var (total, costPrice) = await supplier.GetActivationCountAsync(service, code);
                var userPrice = pricing.CalcUserPrice(costPrice, "activation", 1, country, config);
                return Results.Ok(new { total, userPrice, usdCnyRate = config.UsdCnyRate });
            }
            catch { return Results.Ok(new { total = 0, userPrice = 0m, usdCnyRate = config.UsdCnyRate }); }
        });

        // 查询租赁价格
        app.MapGet("/api/countries/{code}/rental/price", async (string code, string? service, int? months,
            AppDbContext db, SupplierRouter router, IPricingService pricing) =>
        {
            var country = await db.Countries.Include(c => c.Supplier).FirstOrDefaultAsync(c => c.Code == code && c.IsActive);
            if (country?.Supplier == null) return Results.NotFound();

            var supplier = router.Get(country.Supplier.Code);
            var config = await pricing.GetConfigAsync();
            var subMonths = months is > 0 ? months.Value : 1;
            try
            {
                var price = await supplier.GetRentalPriceAsync(code, service);
                var monthlyUserPrice = pricing.CalcUserPrice(price.MonthlyCostUsd, "rental", subMonths, country, config);
                var totalUserPrice = monthlyUserPrice * subMonths;
                return Results.Ok(new { monthlyUserPrice, totalUserPrice, usdCnyRate = config.UsdCnyRate });
            }
            catch { return Results.Json(new { error = "查询失败" }, statusCode: 500); }
        });
    }
}
