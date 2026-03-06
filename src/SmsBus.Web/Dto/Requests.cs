namespace SmsBus.Web.Dto;

public record LoginRequest(string Phone, string Password, string? CaptchaToken, bool RememberMe = false);

public record RegisterRequest(string Phone, string Password, string? CaptchaToken);

public record CaptchaVerifyRequest(string Token, int X);

public record ActivationPurchaseRequest(string ServiceCode, string CountryCode, string? CountryName, string? ServiceName, decimal Price, decimal HiddenPrice);

public record RentalPurchaseRequest(string ServiceCode, string CountryCode, string? CountryName, string? ServiceName, string Dtype, int Dcount, decimal Price, decimal HiddenPrice);

public record ProlongRequest(string Dtype, int Dcount);

public record UserActivationRequest(string ServiceCode, string CountryCode, string? CountryName, string? ServiceName);

public record UserRentalRequest(string ServiceCode, string CountryCode, string? CountryName, string? ServiceName, string Dtype, int Dcount, int SubscriptionMonths = 1);

public record RechargeRequest(decimal Amount, string? Description);

public record AssignRequest(long UserId);

public record AdminUserPatch(bool? IsActive, string? DisplayName);

public record RenewRequest(int Months);

public record PricingConfigRequest(
    decimal RentalProfitPercent, decimal ActivationProfitPercent,
    decimal ServiceFee1m, decimal ServiceFee3m, decimal ServiceFee6m, decimal ServiceFee12m,
    bool MarkupEnabled, decimal UsdCnyRate);
