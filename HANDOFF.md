# 交接文档 — 多供应商架构重构

> 生成时间: 2026-03-13
> 分支: `feature/multi-supplier`（最新提交 `0d65008`）

---

## 一、已完成

### 阶段 1：数据库 + 供应商抽象 ✅
- [x] 新建实体 `Supplier.cs`, `Country.cs`（含 ServiceFee1m/3m/6m/12m 字段）
- [x] 重构 `Order.cs`（去 SmsPva 专有字段，统一 `SupplierOrderId`）
- [x] 重建 `AppDbContext` + 迁移（清库重建）
- [x] `Common/SupplierModels.cs` — 通用模型
- [x] `ISupplierService` — 供应商无关接口（含 `GetRentalPriceAsync`）
- [x] `SmsPvaSupplierService` — 完整实现（临时接码 + 租赁）
- [x] `SmsBusSupplierService` — 完整实现（临时接码 + 租赁，双基础URL）
- [x] `SmsBus.Sdk` — SMS-BUS API SDK（Models: RentalArea/RentalOrder/RentalSms/RentalNumber）
- [x] `SupplierRouter` — 按供应商 Code 路由
- [x] `Program.cs` DI 注册 + 种子数据（upsert 模式）

### 阶段 2：端点 + 服务层重写 ✅
- [x] `PurchaseEndpoints.cs` — 用户购买临时接码/租赁、轮询、取消、续订
- [x] `ServiceEndpoints.cs` — 国家列表、服务列表、价格查询（通过 `GetRentalPriceAsync` 抽象）
- [x] `AdminEndpoints.cs` — 供应商只读管理、国家 CRUD、订单管理、定价管理
- [x] `AdminPurchaseEndpoints.cs` — 管理员购买（通过 SupplierRouter，不直接注入 SDK）
- [x] `PricingService.cs` — 支持按国家定价 + 服务费分档
- [x] `OrderService.cs` — 适配新 Order 结构
- [x] `BalanceService.cs` — 描述"管理员充值"→"系统充值"
- [x] `RenewalBackgroundService.cs` — 使用 SupplierRouter 自动续费
- [x] `AuthMiddleware.cs` — `/api/countries` 和 `/api/purchase/` 加入登录保护

### 已修复的 Bug
- EF Core 实体跟踪冲突（种子数据 SnowflakeId 需在 Add 前赋值）
- `LongJsonConverter` 不处理 null token → 反序列化崩溃
- 空迁移（ServiceFee 列）→ 删除重建
- 租赁价格 $60 错误（SMS-BUS 已是月价，不应 ×30）→ 抽象为 `GetRentalPriceAsync`
- SMS-BUS RequiresService 应为 false → upsert 种子同步

---

## 二、待完成

### 阶段 3：前端适配 ❌ 未开始
1. **用户端** (`wwwroot/js/views/UserView.js`)
   - 订单列表：区分临时接码/租赁，租赁显示到期时间、续订按钮
   - 租赁订单短信轮询（每30秒 `/api/user/orders/{id}/sms`）
   - 临时接码轮询（每10秒 `/api/user/orders/{id}/poll`）
   
2. **管理端** (`wwwroot/js/views/AdminView.js`)
   - 供应商管理页面（只读展示）
   - 国家管理页面（CRUD，预定义国家下拉 `CountryPresets.cs`）
   - 定价管理页面（全局 + 按国家覆盖）
   - 订单列表增强（显示供应商、国家名称）

### 阶段 4：SMS-BUS 深度测试 ⚠️ SDK 已完成，需集成测试
1. SMS-BUS 临时接码流程端到端测试
2. SMS-BUS 租赁流程端到端测试（购买 → 收短信 → 续费）
3. MockMode 下两个供应商的行为验证

### 其他待办
- [ ] 汇率自动更新 `ExchangeRateBackgroundService` 是否正常工作需验证
- [ ] 过期订单自动退款逻辑（临时接码超时）在轮询端点已有，但无后台定时清理
- [ ] 管理员分配订单给用户的前端入口
- [ ] 用户端余额充值入口（目前只有管理员充值）

---

## 三、关键技术要点

### SMS-BUS 双基础 URL
- 临时接码: `https://sms-bus.com/api/control/...`
- 租赁: `https://api.sms-bus.com/v1/rent/...`
- SDK 中 `GetJsonAsync` vs `GetRentJsonAsync` 分别用不同 base URL

### SMS-BUS 租赁 SupplierOrderId 编码
```
"orderId|areaCode|mobileNumber"
```
后续操作（续费、取短信、查状态）需解析出 areaCode 和 mobileNumber。

### 供应商价格单位差异
| 供应商 | 临时接码 | 租赁 |
|--------|----------|------|
| SmsPva | USD | 日租价(USD) × 30 = 月价 |
| SMS-BUS | USD | 月价(cents) ÷ 100 = USD |

各供应商在 `GetRentalPriceAsync` 内部完成换算，端点层统一用 `MonthlyCostUsd`。

### 种子数据 upsert
`Program.cs` 启动时对 suppliers 表执行 upsert：
- 不存在 → 创建（分配 SnowflakeId）
- 已存在 → 同步 `SupportsActivation/SupportsRental/RequiresService`

---

## 四、API 端点一览

### 公共
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/countries?mode=` | 可用国家列表 |
| GET | `/api/countries/{code}/services/activation` | 临时接码服务列表 |
| GET | `/api/countries/{code}/services/rental` | 租赁服务列表 |
| GET | `/api/countries/{code}/activation/price?service=` | 临时接码价格 |
| GET | `/api/countries/{code}/rental/price?service=&months=` | 租赁价格 |

### 用户端 (需登录)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/purchase/activation` | 购买临时接码 |
| POST | `/api/user/purchase/rental` | 购买租赁 |
| GET | `/api/user/orders/{id}/poll` | 轮询临时接码状态 |
| GET | `/api/user/orders/{id}/sms` | 获取租赁短信 |
| POST | `/api/user/orders/{id}/cancel` | 取消订单 |
| POST | `/api/user/orders/{id}/renew` | 续订租赁 |
| GET | `/api/user/orders/{id}/renew-price?months=` | 查询续订价格 |

### 管理端 (需管理员)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/suppliers` | 供应商列表(只读) |
| GET/POST/PUT/DELETE | `/api/admin/countries` | 国家 CRUD |
| POST | `/api/admin/purchase/activation` | 管理员购买临时接码 |
| POST | `/api/admin/purchase/rental` | 管理员购买租赁 |
| GET/PUT | `/api/admin/pricing` | 定价配置 |
| GET | `/api/admin/orders` | 订单列表 |
| POST | `/api/admin/orders/{id}/assign` | 分配订单给用户 |
| POST | `/api/admin/users/{id}/recharge` | 充值 |

---

## 五、启动方式

```bash
cd src/SmsBus.Web
dotnet run
# 访问 http://localhost:5014
# 管理端 http://localhost:5014/sms_admin
```

首次启动自动执行迁移 + 创建种子数据（suppliers + admin 用户）。
