using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using SmsPva.Sdk;
using SmsBus.Sdk;
using SmsBus.Web.Data;
using SmsBus.Web.Services;
using SmsBus.Web.Services.Interfaces;
using SmsBus.Web.Common;
using SmsBus.Web.Infrastructure;
using SmsBus.Web.Infrastructure.Auth;
using SmsBus.Web.Infrastructure.Logging;
using SmsBus.Web.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Serilog 日志
builder.AddSerilog();

// 雪花 ID 初始化
SnowflakeId.Init(workerId: 1);

// MySQL (EF Core) + 雪花ID拦截器
var mysqlConn = builder.Configuration.GetConnectionString("MySQL") ?? "";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(mysqlConn, ServerVersion.AutoDetect(mysqlConn))
           .AddInterceptors(
               new SmsBus.Web.Infrastructure.Persistence.SnowflakeIdInterceptor(),
               new SmsBus.Web.Infrastructure.Persistence.SoftDeleteInterceptor()));

// Redis
var redisConn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(redisConn));

// SmsPva SDK（供 SmsPvaSupplierService 使用）
var apiKey = builder.Configuration["SmsPva:ApiKey"] ?? "";
builder.Services.AddSingleton(new SmsPvaClient(apiKey));

// SmsBus SDK
var smsBusToken = builder.Configuration["SmsBus:ApiToken"] ?? "";
var smsBusBaseUrl = builder.Configuration["SmsBus:ApiBaseUrl"];
if (!string.IsNullOrEmpty(smsBusToken))
    builder.Services.AddSingleton(new SmsBusClient(smsBusToken, smsBusBaseUrl));

// 供应商服务（多供应商支持）
builder.Services.AddSingleton<ISupplierService>(sp =>
    new SmsPvaSupplierService(sp.GetRequiredService<SmsPvaClient>(),
        sp.GetRequiredService<IConfiguration>()));
if (!string.IsNullOrEmpty(smsBusToken))
    builder.Services.AddSingleton<ISupplierService>(sp =>
        new SmsBusSupplierService(sp.GetRequiredService<SmsBusClient>(),
            sp.GetRequiredService<IConfiguration>()));
builder.Services.AddSingleton<SupplierRouter>();

// 业务服务（接口注入）
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IBalanceService, BalanceService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddHostedService<RenewalBackgroundService>();
builder.Services.AddHostedService<ExchangeRateBackgroundService>();

// JSON 序列化：long → string（防前端精度丢失）
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new LongJsonConverter());
    options.SerializerOptions.Converters.Add(new NullableLongJsonConverter());
});

var app = builder.Build();

// 自动迁移数据库 + 创建管理员账号
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
    await auth.EnsureAdminExistsAsync("13800000000", "Sms@2024!");

    // 种子数据：供应商（不存在则创建，存在则同步能力字段）
    var supplierSeeds = new[]
    {
        new { Code = "smspva", Name = "SmsPva", ApiBaseUrl = "https://smspva.com",
              SupportsActivation = true, SupportsRental = true, RequiresService = true },
        new { Code = "smsbus", Name = "SMS-BUS", ApiBaseUrl = "https://sms-bus.com",
              SupportsActivation = true, SupportsRental = true, RequiresService = false },
    };
    foreach (var seed in supplierSeeds)
    {
        var existing = await db.Suppliers.FirstOrDefaultAsync(s => s.Code == seed.Code);
        if (existing == null)
        {
            db.Suppliers.Add(new SmsBus.Web.Entities.Supplier
            {
                Id = SnowflakeId.NextId(),
                Code = seed.Code, Name = seed.Name, ApiBaseUrl = seed.ApiBaseUrl,
                IsActive = true, SupportsActivation = seed.SupportsActivation,
                SupportsRental = seed.SupportsRental, RequiresService = seed.RequiresService
            });
        }
        else
        {
            existing.SupportsActivation = seed.SupportsActivation;
            existing.SupportsRental = seed.SupportsRental;
            existing.RequiresService = seed.RequiresService;
        }
    }
    await db.SaveChangesAsync();
}

// 中间件
app.UseGlobalExceptionHandler();
app.UseAuthMiddleware();

// 端点映射
app.MapSpaEndpoints();
app.MapCaptchaEndpoints();
app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapServiceEndpoints();
app.MapPurchaseEndpoints();
app.MapAdminEndpoints();
app.MapAdminPurchaseEndpoints();
app.MapShareEndpoints();

app.Run();
