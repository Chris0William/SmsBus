# 解码平台 - 项目规范

## 系统配置

- MySQL: `localhost:3306`, user=`root`, password=`root`, database=`smsbus`
- Redis: `localhost:6379`, db2 不可用，其他 db 均可
- 管理端路由: `/sms_admin`, 凭据: `admin`/`Sms@2024!`
- 服务地址: `http://localhost:5014`
- 上游供应商:
  - SmsPva: ApiKey=`G3hyASdxv54VI50BivpFpZPLxk2Oji`, 按服务接码（RequiresService=true）
  - SMS-BUS: ApiToken=`306560b27e3a4ba3b6587d9fa466d39e`, 全服务接码（RequiresService=false）

## 技术栈

- .NET 8 (ASP.NET Core Minimal API + Clean Architecture)
- EF Core + Pomelo.EntityFrameworkCore.MySql
- StackExchange.Redis
- Serilog（结构化日志，Console + File）
- Yitter.IdGenerator（雪花ID）
- BCrypt.Net-Next（密码哈希）
- SmsPva.Sdk（SmsPva 上游 API 封装）
- SmsBus.Sdk（SMS-BUS 上游 API 封装）
- 前端: Vue 3 + Element Plus (CDN) SPA，原生 JS

## 多供应商架构

### 核心设计
- 用户选国家 → 系统自动路由到对应供应商（用户无感知）
- 一个国家绑定一个供应商（`Country.SupplierId` FK）
- 供应商能力由 `Supplier.RequiresService` 控制前端是否显示"选择服务"
- 供应商为种子数据，启动时自动创建/同步能力字段，管理端只读

### 供应商抽象层
- `ISupplierService` 接口：供应商无关，返回通用模型（`SupplierModels.cs`）
- `SupplierRouter`：按供应商 Code 路由，`router.Get("smspva")` / `router.Get("smsbus")`
- 新增供应商：实现 `ISupplierService`，在 Program.cs 注册 DI + 添加种子数据

### 价格体系
- 用户价 = 上游成本 × (1 + 加价%) × (1 + 服务费%)
- 加价%：优先用 `Country.XxxMarkupPercent`，null 时用 `PricingConfig.DefaultXxxMarkupPercent`
- 服务费%：优先用 `Country.ServiceFeeXm`，null 时用 `PricingConfig.ServiceFeeXm`（按月数分档 1/3/6/12）
- 临时接码价格：`ISupplierService.GetActivationCountAsync()` 返回成本价
- 租赁月价格：`ISupplierService.GetRentalPriceAsync()` 返回 `RentalPriceResult(MonthlyCostUsd, ...)`，各供应商内部处理单位换算

### 租赁订阅模型
- 用户选 N 个月 → 一次性扣用户余额（N × 月价）
- 系统每月向上游续费1个月（`RenewalBackgroundService` 每5分钟检查）
- `SupplierOrderId` 存储上游ID，SMS-BUS 编码为 `"orderId|areaCode|mobileNumber"`

## 项目结构

```
src/SmsBus.Web/
  Program.cs                        # DI注册、种子数据、中间件、端点映射
  Common/
    SupplierModels.cs               # 供应商无关通用模型（ServiceInfo, NumberResult, RentalPriceResult 等）
    CountryPresets.cs               # 80+ 预定义国家（管理端下拉用）
    SnowflakeId.cs                  # Yitter 雪花ID包装
    LongJsonConverter.cs            # long→string JSON转换（防前端精度丢失，处理 null token）
  Infrastructure/
    Auth/
      AuthMiddleware.cs             # API 认证中间件（白名单: auth/captcha/orders, 需登录: user/countries/purchase/services, 需管理员: admin）
      SessionData.cs                # 会话数据模型
    Logging/
      SerilogSetup.cs               # Serilog 配置
    Persistence/
      SnowflakeIdInterceptor.cs     # SaveChanges 拦截器，自动分配雪花ID
      SoftDeleteInterceptor.cs      # 软删除拦截器
    ExceptionHandlerMiddleware.cs   # 全局异常处理
  Entities/
    User.cs / Supplier.cs / Country.cs / Order.cs / OrderSms.cs / BalanceTransaction.cs / PricingConfig.cs
  Data/
    AppDbContext.cs                 # EF Core 上下文，ValueGeneratedNever
  Services/
    Interfaces/
      ISupplierService.cs           # 供应商无关接口（临时接码 + 租赁 + 账户）
      IAuthService.cs / IOrderService.cs / IBalanceService.cs / IPricingService.cs
    SmsPvaSupplierService.cs        # SmsPva 供应商实现
    SmsBusSupplierService.cs        # SMS-BUS 供应商实现
    SupplierRouter.cs               # 供应商路由器
    OrderService.cs / PricingService.cs / BalanceService.cs / AuthService.cs
    RenewalBackgroundService.cs     # 自动续费后台服务
    ExchangeRateBackgroundService.cs
  Endpoints/
    AuthEndpoints.cs / CaptchaEndpoints.cs / UserEndpoints.cs
    ServiceEndpoints.cs             # 国家列表、服务列表、价格查询
    PurchaseEndpoints.cs            # 用户购买、轮询、续订
    AdminEndpoints.cs               # 用户管理、供应商管理(只读)、国家CRUD、订单管理、定价
    AdminPurchaseEndpoints.cs       # 管理员直接购买
    ShareEndpoints.cs / SpaEndpoints.cs
  Dto/
    Requests.cs                     # 所有请求 record 类型
  wwwroot/
    js/views/AdminView.js           # 管理端 SPA（Vue 3 + Element Plus）
    js/views/UserView.js            # 用户端 SPA
    js/shared-data.js               # 共享数据层
src/SmsBus.Sdk/                     # SMS-BUS API SDK
  SmsBusClient.cs                   # 临时接码(/api/control) + 租赁(/v1/rent) 双基础URL
  Models/                           # NumberResult, RentalArea, RentalOrder, RentalSms 等
```

## 开发规范

### 架构规范
1. **接口注入**: 所有服务必须通过接口注入（`IXxxService`），禁止直接注入具体类
2. **ID 类型**: 所有实体 ID 使用 `long`（雪花ID），不使用 `int` 自增
3. **新实体**: 必须在 `AppDbContext.OnModelCreating` 中配置 `ValueGeneratedNever()`
4. **端点拆分**: 新增端点必须放在 `Endpoints/` 目录对应文件中，禁止写入 Program.cs
5. **供应商抽象**: 端点层不直接调用具体供应商SDK，必须通过 `ISupplierService` 接口
6. **价格单位**: `ISupplierService` 返回的价格统一为 USD，各供应商内部做单位换算

### 端点规范
1. 端点文件使用静态扩展方法 `Map*Endpoints(this WebApplication app)`
2. 请求 DTO 放在 `Dto/Requests.cs`，使用 record 类型
3. API 路由前缀：用户端 `/api/user/`，管理端 `/api/admin/`，公共 `/api/`
4. 认证中间件白名单需在 `AuthMiddleware.cs` 中维护

### 日志规范
1. 服务构造函数注入 `ILogger<TService>`
2. 关键业务操作（购买/退款/充值/状态变更）使用 `LogInformation` 记录
3. 异常使用 `LogError` 记录
4. 使用结构化日志模板：`_log.LogInformation("操作: Key={Key}", value)`

### JSON 序列化
1. `long` 类型自动序列化为字符串（`LongJsonConverter`），防止前端精度丢失
2. `LongJsonConverter.Read` 处理 null token 返回 0（前端可能发 null）
3. 前端接收到的 ID 字段为 string 类型

### 数据库
1. 使用 EF Core Code-First + 迁移
2. 新增迁移：`dotnet ef migrations add <Name>`
3. 应用迁移：`dotnet ef database update`（启动时也会自动迁移）
4. MySQL 外键变更需先 DROP FK 再 ALTER COLUMN 再 ADD FK

## 测试规范

- 每个阶段编码完成后，使用 Playwright 进行自动化测试验证
- Playwright 运行方式: `NODE_PATH="D:/Program/nodejs/node_global/node_modules" node test_file.js`
- 涉及下单调用供应商 API 的功能，测试时通过配置 `MockMode=true` 禁用真实下单，避免产生费用
- MockMode 配置在 `appsettings.Development.json` 的 `SmsPva:MockMode` 和 `SmsBus:MockMode`
- Mock 模式下仍需验证金额计算逻辑正确性

## 业务规则

1. 开放注册: 任何人可自行注册账号
2. 管理员购买不走余额: 管理员直接调用供应商 API，不扣余额
3. 管理员可分配订单给用户: 管理员购买的号码可分配给指定用户，用户在自己面板可见
4. 用户购买走余额: 普通用户购买需有足够余额，系统自动扣减
5. 定价: 用户价 = 上游成本 × (1 + 加价%) × (1 + 服务费%)，支持全局和按国家配置
6. 供应商管理: 种子数据初始化，管理端只读，不提供增删改接口
7. 国家管理: 管理端可 CRUD，每个国家绑定一个供应商，通过预定义国家列表下拉选择
