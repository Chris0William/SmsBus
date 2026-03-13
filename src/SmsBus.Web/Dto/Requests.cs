namespace SmsBus.Web.Dto;

// Auth
public record LoginRequest(string Phone, string Password, string? CaptchaToken, bool RememberMe = false);
public record RegisterRequest(string Phone, string Password, string? CaptchaToken);
public record CaptchaVerifyRequest(string Token, int X);

// Admin 购买（管理员直接调上游）
public record AdminActivationRequest(string CountryCode, string? ServiceCode);
public record AdminRentalRequest(string CountryCode, string? ServiceCode);
public record AdminProlongRequest(long OrderId);

// 用户购买
public record UserActivationRequest(string CountryCode, string? ServiceCode);
public record UserRentalRequest(string CountryCode, string? ServiceCode, int Months = 1);
public record RenewRequest(int Months);

// 管理
public record RechargeRequest(decimal Amount, string? Description);
public record AssignRequest(long UserId);
public record AdminUserPatch(bool? IsActive, string? DisplayName);

// 定价
public record PricingConfigRequest(
    decimal DefaultActivationMarkupPercent, decimal DefaultRentalMarkupPercent,
    decimal ServiceFee1m, decimal ServiceFee3m, decimal ServiceFee6m, decimal ServiceFee12m,
    decimal UsdCnyRate);

// 供应商
public record SupplierRequest(string Code, string Name, string? ApiKey, string? ApiBaseUrl,
    bool IsActive, bool SupportsActivation, bool SupportsRental, bool RequiresService);

// 国家
public record CountryRequest(string Code, string Name, long SupplierId, bool IsActive,
    bool ActivationEnabled, bool RentalEnabled,
    decimal? ActivationMarkupPercent, decimal? RentalMarkupPercent,
    decimal? ServiceFee1m, decimal? ServiceFee3m, decimal? ServiceFee6m, decimal? ServiceFee12m,
    int SortOrder);
