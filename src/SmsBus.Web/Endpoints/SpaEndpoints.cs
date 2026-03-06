namespace SmsBus.Web.Endpoints;

public static class SpaEndpoints
{
    private const string AdminRoute = "/sms_admin";

    public static void MapSpaEndpoints(this WebApplication app)
    {
        string ServeIndex(IWebHostEnvironment env) => File.ReadAllText(Path.Combine(env.WebRootPath, "index.html"));

        app.MapGet("/", (IWebHostEnvironment env) => Results.Content(ServeIndex(env), "text/html"));
        app.MapGet("/login", (IWebHostEnvironment env) => Results.Content(ServeIndex(env), "text/html"));
        app.MapGet("/dashboard", (IWebHostEnvironment env) => Results.Content(ServeIndex(env), "text/html"));
        app.MapGet($"{AdminRoute}/login", (IWebHostEnvironment env) => Results.Content(ServeIndex(env), "text/html"));
        app.MapGet(AdminRoute, (IWebHostEnvironment env) => Results.Content(ServeIndex(env), "text/html"));
    }
}
