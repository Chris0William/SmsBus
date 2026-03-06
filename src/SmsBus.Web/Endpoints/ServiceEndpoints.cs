using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Endpoints;

public static class ServiceEndpoints
{
    public static void MapServiceEndpoints(this WebApplication app)
    {
        app.MapGet("/api/services/activation/services", async (ISupplierService supplier) =>
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

        app.MapGet("/api/services/activation/count", async (string service, string country, ISupplierService supplier, IPricingService pricing) =>
        {
            try
            {
                var (total, price) = await supplier.GetActivationCountAsync(service, country);
                var config = await pricing.GetConfigAsync();
                var userPrice = pricing.CalcUserPrice(config, price, "activation");
                return Results.Ok(new { total, userPrice });
            }
            catch
            {
                return Results.Ok(new { total = 0, userPrice = 0m });
            }
        });

        app.MapGet("/api/services/rental/countries", async (ISupplierService supplier) =>
        {
            var countries = await supplier.GetRentalCountriesAsync();
            return Results.Ok(countries);
        });

        app.MapGet("/api/services/rental/services", async (string country, string? dtype, int? dcount, int? months, ISupplierService supplier, IPricingService pricing) =>
        {
            var services = await supplier.GetRentalServicesAsync(country, dtype, dcount);
            var config = await pricing.GetConfigAsync();
            var subMonths = months is > 0 ? months.Value : 1;

            return Results.Ok(services.Select(s =>
            {
                // 月成本 = 日成本 × 30，月用户价 = 月成本 + CalcMarkup(月成本, rental, months)
                var monthlyCost = s.Price * 30;
                var monthlyUserPrice = pricing.CalcUserPrice(config, monthlyCost, "rental", subMonths);
                var totalUserPrice = monthlyUserPrice * subMonths;
                return new { s.Name, s.Code, userPrice = monthlyUserPrice, totalUserPrice, s.Count, months = subMonths };
            }));
        });
    }
}
