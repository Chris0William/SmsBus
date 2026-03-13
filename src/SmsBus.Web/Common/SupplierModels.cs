namespace SmsBus.Web.Common;

// 供应商无关的通用模型
public record ServiceInfo(string Code, string Name, decimal Price = 0, int Count = 0);
public record NumberResult(string Id, string FullNumber);
public record SmsResult(string Text, string? Code, DateTime ReceivedAt);
/// <summary>租赁月价格查询结果（统一为 USD/月）</summary>
public record RentalPriceResult(decimal MonthlyCostUsd, int Available, string ServiceCode, string ServiceName);
public record RentalResult(string Id, string PhoneNumber, string CountryDigitCode, DateTime ExpiresAt, string Status);
public record RentalStatusResult(DateTime ExpiresAt, string Status);
