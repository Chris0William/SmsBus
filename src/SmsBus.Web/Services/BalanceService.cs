using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Data;
using SmsBus.Web.Entities;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

public class BalanceService : IBalanceService
{
    private readonly AppDbContext _db;
    private readonly ILogger<BalanceService> _log;

    public BalanceService(AppDbContext db, ILogger<BalanceService> log) { _db = db; _log = log; }

    /// <summary>检查余额是否足够</summary>
    public async Task<bool> HasSufficientBalanceAsync(long userId, decimal amount)
    {
        var user = await _db.Users.FindAsync(userId);
        return user != null && user.Balance >= amount;
    }

    /// <summary>扣减余额（购买时）</summary>
    public async Task<bool> DeductAsync(long userId, decimal amount, string description, long? relatedOrderId = null)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.Balance < amount) return false;

        user.Balance -= amount;
        user.UpdatedAt = DateTime.Now;

        _db.BalanceTransactions.Add(new BalanceTransaction
        {
            UserId = userId,
            Amount = -amount,
            Type = "purchase",
            Description = description,
            RelatedOrderId = relatedOrderId,
            CreatedAt = DateTime.Now
        });

        await _db.SaveChangesAsync();
        _log.LogInformation("余额扣减: UserId={UserId}, Amount={Amount}, Description={Description}", userId, amount, description);
        return true;
    }

    /// <summary>退款（取消订单时）</summary>
    public async Task RefundAsync(long userId, decimal amount, string description, long? relatedOrderId = null)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return;

        user.Balance += amount;
        user.UpdatedAt = DateTime.Now;

        _db.BalanceTransactions.Add(new BalanceTransaction
        {
            UserId = userId,
            Amount = amount,
            Type = "refund",
            Description = description,
            RelatedOrderId = relatedOrderId,
            CreatedAt = DateTime.Now
        });

        await _db.SaveChangesAsync();
        _log.LogInformation("余额退款: UserId={UserId}, Amount={Amount}, Description={Description}", userId, amount, description);
    }

    /// <summary>管理员充值</summary>
    public async Task<bool> RechargeAsync(long userId, decimal amount, string? description, long operatorId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return false;

        user.Balance += amount;
        user.UpdatedAt = DateTime.Now;

        _db.BalanceTransactions.Add(new BalanceTransaction
        {
            UserId = userId,
            Amount = amount,
            Type = "recharge",
            Description = description ?? $"管理员充值 ${amount:F2}",
            OperatorId = operatorId,
            CreatedAt = DateTime.Now
        });

        await _db.SaveChangesAsync();
        _log.LogInformation("管理员充值: UserId={UserId}, Amount={Amount}, OperatorId={OperatorId}", userId, amount, operatorId);
        return true;
    }

    /// <summary>获取用户交易记录</summary>
    public async Task<List<BalanceTransaction>> GetTransactionsAsync(long userId, int limit = 50)
    {
        return await _db.BalanceTransactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    /// <summary>获取所有交易记录（管理端）</summary>
    public async Task<List<BalanceTransaction>> GetAllTransactionsAsync(int limit = 100)
    {
        return await _db.BalanceTransactions
            .Include(t => t.User)
            .OrderByDescending(t => t.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }
}
