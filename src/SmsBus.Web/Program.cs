using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using SmsPva.Sdk;
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

// 注册服务
var apiKey = builder.Configuration["SmsPva:ApiKey"] ?? "";
builder.Services.AddSingleton(new SmsPvaClient(apiKey));

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

// 业务服务（接口注入）
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IBalanceService, BalanceService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddSingleton<ISupplierService, SupplierService>();
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
