# SmsBus - SMS 接码平台

SMS 虚拟号码接码平台，对接上游供应商 (SmsPva) 提供临时接码和号码租赁服务。支持用户自助注册、余额管理、在线接码，管理员后台管理订单和用户。

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | .NET 8 (ASP.NET Core Minimal API) |
| ORM | EF Core + Pomelo.EntityFrameworkCore.MySql |
| 缓存 | StackExchange.Redis |
| 日志 | Serilog (Console + File) |
| ID 生成 | Yitter.IdGenerator (雪花ID, long 类型) |
| 密码 | BCrypt.Net-Next |
| 上游 SDK | SmsPva.Sdk (自封装) |
| 前端 | Vue 3 + Element Plus + Tailwind CSS (SPA, 无构建工具) |

## 解决方案结构

```
SmsBus.sln
├── src/
│   ├── SmsBus.Web/          # 主项目 (ASP.NET Core Web)
│   ├── SmsBus.Sdk/          # 平台对外 SDK
│   └── SmsPva.Sdk/          # 上游 SmsPva API 客户端封装
```

## SmsBus.Web 项目结构

```
src/SmsBus.Web/
├── Program.cs                          # 入口: DI注册、中间件、端点映射
├── Common/
│   ├── ApiResponse.cs                  # 统一响应信封 ApiResponse<T>
│   ├── SnowflakeId.cs                  # Yitter 雪花ID包装
│   ├── Constants.cs                    # 全局常量
│   └── LongJsonConverter.cs            # long→string JSON转换(防前端精度丢失)
├── Infrastructure/
│   ├── Auth/
│   │   ├── AuthMiddleware.cs           # Session认证 + 静态文件保护
│   │   └── SessionData.cs             # 会话数据模型
│   ├── Logging/
│   │   └── SerilogSetup.cs            # Serilog 配置
│   ├── Persistence/
│   │   ├── SnowflakeIdInterceptor.cs  # SaveChanges拦截器: 自动分配雪花ID
│   │   └── SoftDeleteInterceptor.cs   # SaveChanges拦截器: 自动软删除
│   └── ExceptionHandlerMiddleware.cs  # 全局异常处理
├── Entities/                           # 实体定义 (ID 均为 long 雪花ID)
│   ├── ISoftDelete.cs                 # 软删除接口
│   ├── User.cs                        # 用户
│   ├── Order.cs                       # 订单
│   ├── OrderSms.cs                    # 订单短信记录
│   ├── BalanceTransaction.cs          # 余额流水
│   └── PricingConfig.cs              # 定价配置
├── Data/
│   └── AppDbContext.cs                # EF Core 上下文 (含全局查询过滤器)
├── Services/
│   ├── Interfaces/                    # 服务接口
│   │   ├── IAuthService.cs
│   │   ├── IOrderService.cs
│   │   ├── IBalanceService.cs
│   │   ├── IPricingService.cs
│   │   └── ISupplierService.cs
│   ├── AuthService.cs                 # 认证: 登录/注册/Session管理
│   ├── OrderService.cs                # 订单: CRUD/状态流转
│   ├── BalanceService.cs              # 余额: 充值/扣减/流水
│   ├── PricingService.cs              # 定价: 加价规则计算
│   ├── SupplierService.cs             # 上游供应商API封装
│   ├── RenewalBackgroundService.cs    # 后台: 租赁自动续费
│   └── ExchangeRateBackgroundService.cs # 后台: 汇率更新
├── Endpoints/                          # Minimal API 端点 (按功能拆分)
│   ├── AuthEndpoints.cs               # 登录/注册/登出
│   ├── CaptchaEndpoints.cs            # 滑动验证码
│   ├── UserEndpoints.cs               # 用户信息/修改密码
│   ├── ServiceEndpoints.cs            # 服务查询(国家/项目/价格)
│   ├── PurchaseEndpoints.cs           # 用户购买/取消/轮询短信
│   ├── AdminEndpoints.cs              # 管理端: 用户管理/充值/定价
│   ├── AdminPurchaseEndpoints.cs      # 管理端: 订单管理/购买/分配
│   ├── ShareEndpoints.cs              # 号码共享页面
│   └── SpaEndpoints.cs               # SPA 静态文件路由
├── Dto/
│   └── Requests.cs                    # 请求 DTO (record 类型)
├── Migrations/                         # EF Core 数据库迁移
└── wwwroot/                            # 前端静态资源
    ├── index.html                     # SPA 入口
    ├── js/
    │   ├── app.js                     # Vue Router + 全局配置
    │   ├── shared-data.js             # 共享数据(国家/服务代码映射)
    │   └── views/
    │       ├── LoginView.js           # 登录页组件
    │       ├── UserView.js            # 用户面板组件
    │       └── AdminView.js           # 管理员面板组件
    └── lib/                           # 前端依赖 (Vue/ElementPlus/图标)
```

## 数据库

### 数据库配置
- MySQL 8.x, 连接字符串在 `appsettings.json` 的 `ConnectionStrings:MySQL`
- 启动时自动执行 EF Core 迁移 (`db.Database.Migrate()`)

### 实体关系

```
User (用户)
 ├── Order[] (订单, 1:N)
 │    └── OrderSms[] (短信记录, 1:N)
 └── BalanceTransaction[] (余额流水, 1:N)

PricingConfig (定价规则, 独立表)
```

### 软删除机制
- 所有实体实现 `ISoftDelete` 接口 (`IsDeleted`, `DeletedAt`)
- `SoftDeleteInterceptor` 拦截 `EntityState.Deleted`，自动转为 `Modified` + 设置软删除字段
- `AppDbContext` 对所有实体配置全局查询过滤器 `HasQueryFilter(e => !e.IsDeleted)`
- 需要查询已删除记录时使用 `.IgnoreQueryFilters()`

### ID 策略
- 所有实体 ID 为 `long` 类型 (Yitter 雪花ID)
- `SnowflakeIdInterceptor` 在 SaveChanges 时自动为新实体分配 ID
- EF Core 配置 `ValueGeneratedNever()`
- JSON 序列化时 long 自动转为 string (防前端精度丢失)

## API 路由

| 前缀 | 说明 | 认证 |
|------|------|------|
| `POST /api/login` | 登录 | 无 |
| `POST /api/register` | 注册 | 无 |
| `/api/user/*` | 用户端接口 | 需登录 |
| `/api/admin/*` | 管理端接口 | 需管理员 |
| `/api/services/*` | 服务查询 | 需登录 |
| `/api/purchase/*` | 购买/订单操作 | 需登录 |
| `/api/captcha/*` | 验证码 | 无 |
| `/api/share/*` | 号码共享 | Token 验证 |

### 认证机制
- 基于 Redis Session 的 Cookie 认证
- `AuthMiddleware` 检查请求路径，保护 API 和特定页面
- Session 数据存储在 Redis 中

## 业务流程

### 临时接码 (Activation)
1. 用户查询可用国家/服务/价格
2. 系统根据定价规则计算用户价格 (上游价 + 加价)
3. 扣减用户余额，调用上游 API 获取号码
4. 用户轮询等待短信
5. 支持取消退款

### 号码租赁 (Rental)
1. 用户选择国家/服务/时长
2. 支付后获取号码，可持续接收短信
3. 支持手动续费和自动续费
4. `RenewalBackgroundService` 定时检查到期订单并自动续费

### 成本追踪
- 采用 balance-diff 模式: 调用上游 API 前后查询供应商余额差值，记录实际成本
- `Order.CostPrice` 记录上游实际扣款 (USD)
- `Order.ListPrice` 记录上游查询商品价
- 续费时通过 `AccumulateCostAsync` 累加成本

### 定价规则
- 用户价格 = 上游原价 + 每日加价 * 天数
- `PricingConfig` 表配置各服务的加价规则
- 管理员购买不走余额，直接调用上游 API

## 配置说明

`appsettings.json`:
```json
{
  "ConnectionStrings": {
    "MySQL": "Server=localhost;Port=3306;Database=smsbus;User=root;Password=YOUR_PASSWORD;",
    "Redis": "localhost:6379,defaultDatabase=0,abortConnect=false"
  },
  "SmsPva": {
    "ApiKey": "YOUR_API_KEY",
    "MockMode": false
  }
}
```

- `MockMode`: 设为 `true` 时不调用真实上游 API，用于测试

## 开发指南

### 环境准备
1. .NET 8 SDK
2. MySQL 8.x
3. Redis

### 启动
```bash
cd src/SmsBus.Web
dotnet run
# 默认监听 http://localhost:5014
```

### 数据库迁移
```bash
cd src/SmsBus.Web
dotnet ef migrations add <MigrationName>
dotnet ef database update
```
启动时会自动执行迁移，一般不需要手动 `database update`。

### 代码规范
1. **接口注入**: 所有服务通过 `IXxxService` 接口注入，禁止直接注入具体类
2. **端点拆分**: 新端点放在 `Endpoints/` 目录对应文件，使用 `Map*Endpoints` 扩展方法
3. **请求 DTO**: 放在 `Dto/Requests.cs`，使用 record 类型
4. **日志**: 使用 Serilog 结构化日志，关键操作用 `LogInformation`，异常用 `LogError`
5. **新实体**: 必须在 `AppDbContext.OnModelCreating` 配置 `ValueGeneratedNever()` + 实现 `ISoftDelete`

### 默认管理员
- 手机号: `13800000000`
- 密码: `Sms@2024!`
- 管理端入口: `/sms_admin`
