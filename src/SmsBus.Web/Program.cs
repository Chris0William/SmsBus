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

// SupplierRouter: 启动后从数据库读取 ApiKey，动态注册供应商服务
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
              ApiKey = "G3hyASdxv54VI50BivpFpZPLxk2Oji",
              SupportsActivation = true, SupportsRental = true,
              RequiresServiceForActivation = true, RequiresServiceForRental = true },
        new { Code = "smsbus", Name = "SMS-BUS", ApiBaseUrl = "https://sms-bus.com",
              ApiKey = "306560b27e3a4ba3b6587d9fa466d39e",
              SupportsActivation = true, SupportsRental = true,
              RequiresServiceForActivation = true, RequiresServiceForRental = false },
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
                ApiKey = seed.ApiKey,
                IsActive = true, SupportsActivation = seed.SupportsActivation,
                SupportsRental = seed.SupportsRental,
                RequiresServiceForActivation = seed.RequiresServiceForActivation,
                RequiresServiceForRental = seed.RequiresServiceForRental
            });
        }
        else
        {
            // ApiKey 不覆盖（管理端可能已修改）
            if (string.IsNullOrEmpty(existing.ApiKey))
                existing.ApiKey = seed.ApiKey;
            existing.SupportsActivation = seed.SupportsActivation;
            existing.SupportsRental = seed.SupportsRental;
            existing.RequiresServiceForActivation = seed.RequiresServiceForActivation;
            existing.RequiresServiceForRental = seed.RequiresServiceForRental;
        }
    }
    await db.SaveChangesAsync();

    // 从数据库读取 ApiKey，创建 SDK 客户端，注册到 SupplierRouter
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var router = scope.ServiceProvider.GetRequiredService<SupplierRouter>();
    var activeSuppliers = await db.Suppliers.Where(s => s.IsActive).ToListAsync();
    foreach (var s in activeSuppliers)
    {
        if (string.IsNullOrEmpty(s.ApiKey)) continue;
        switch (s.Code)
        {
            case "smspva":
                var smsPvaClient = new SmsPvaClient(s.ApiKey);
                router.Register(new SmsPvaSupplierService(smsPvaClient, config));
                break;
            case "smsbus":
                var smsBusClient = new SmsBusClient(s.ApiKey, s.ApiBaseUrl);
                router.Register(new SmsBusSupplierService(smsBusClient, config));
                break;
        }
    }
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
