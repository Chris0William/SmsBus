using SmsBus.Web.Entities;

namespace SmsBus.Web.Services.Interfaces;

public interface IBalanceService
{
    Task<bool> HasSufficientBalanceAsync(long userId, decimal amount);
    Task<bool> DeductAsync(long userId, decimal amount, string description, long? relatedOrderId = null);
    Task RefundAsync(long userId, decimal amount, string description, long? relatedOrderId = null);
    Task<bool> RechargeAsync(long userId, decimal amount, string? description, long operatorId);
    Task<List<BalanceTransaction>> GetTransactionsAsync(long userId, int limit = 50);
    Task<List<BalanceTransaction>> GetAllTransactionsAsync(int limit = 100);
}
