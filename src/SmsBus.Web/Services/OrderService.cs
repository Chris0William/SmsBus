using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Common;
using SmsBus.Web.Data;
using SmsBus.Web.Entities;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

public class OrderService : IOrderService
{
    private readonly AppDbContext _db;
    private readonly ILogger<OrderService> _log;

    public OrderService(AppDbContext db, ILogger<OrderService> log) { _db = db; _log = log; }

    public async Task<Order> CreateAsync(Order order)
    {
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        _log.LogInformation("订单创建: OrderId={OrderId}, Mode={Mode}, Source={Source}, UserId={UserId}",
            order.OrderId, order.Mode, order.Source, order.UserId);
        return order;
    }

    public async Task<Order?> GetByOrderIdAsync(string orderId)
    {
        return await _db.Orders
            .Include(o => o.SmsList)
            .FirstOrDefaultAsync(o => o.OrderId == orderId);
    }

    public async Task<Order?> GetByIdAsync(long id)
    {
        return await _db.Orders
            .Include(o => o.SmsList)
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    /// <summary>用户自己的订单</summary>
    public async Task<List<Order>> GetUserOrdersAsync(long userId)
    {
        return await _db.Orders
            .Where(o => o.UserId == userId)
            .Include(o => o.SmsList)
            .OrderByDescending(o => o.PurchasedAt)
            .ToListAsync();
    }

    /// <summary>所有订单（管理端，可按用户筛选）</summary>
    public async Task<List<Order>> GetAllOrdersAsync(long? userId = null)
    {
        var q = _db.Orders.Include(o => o.User).Include(o => o.SmsList).AsQueryable();
        if (userId.HasValue) q = q.Where(o => o.UserId == userId);
        return await q.OrderByDescending(o => o.PurchasedAt).Take(200).ToListAsync();
    }

    /// <summary>更新短信内容</summary>
    public async Task UpdateSmsAsync(string orderId, string text, string? code)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order == null) return;

        order.SmsContent = text;
        order.VerificationCode = code;
        order.Status = "received";
        order.CompletedAt = DateTime.Now;

        _db.OrderSms.Add(new OrderSms
        {
            OrderId = order.Id,
            Text = text,
            Code = code,
            ReceivedAt = DateTime.Now
        });

        await _db.SaveChangesAsync();
    }

    /// <summary>更新状态</summary>
    public async Task UpdateStatusAsync(string orderId, string status)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order == null) return;
        order.Status = status;
        if (status == "cancelled") order.CompletedAt = DateTime.Now;
        await _db.SaveChangesAsync();
        _log.LogInformation("订单状态更新: OrderId={OrderId}, Status={Status}", orderId, status);
    }

    /// <summary>分配订单给用户</summary>
    public async Task<bool> AssignToUserAsync(long orderId, long userId, long assignedBy)
    {
        var order = await _db.Orders.FindAsync(orderId);
        if (order == null) return false;
        order.UserId = userId;
        order.AssignedBy = assignedBy;
        order.Source = "admin";
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>批量更新租赁短信（替换全部）</summary>
    public async Task UpdateRentalSmsAsync(string orderId, List<OrderSms> smsList)
    {
        var order = await _db.Orders.Include(o => o.SmsList)
            .FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order == null) return;

        // 按 ReceivedAt 去重，只插入 DB 中不存在的短信
        var existingTimes = order.SmsList.Select(s => s.ReceivedAt).ToHashSet();
        var newMessages = smsList.Where(s => !existingTimes.Contains(s.ReceivedAt)).ToList();
        if (newMessages.Count == 0) return;

        foreach (var sms in newMessages)
        {
            sms.Id = SnowflakeId.NextId();
            sms.OrderId = order.Id;
            _db.OrderSms.Add(sms);
        }

        // 更新最新一条到主记录（按 ReceivedAt 取最新）
        if (smsList.Count > 0)
        {
            var latest = smsList.OrderByDescending(s => s.ReceivedAt).First();
            order.SmsContent = latest.Text;
            order.VerificationCode = latest.Code;
        }

        await _db.SaveChangesAsync();
    }

    /// <summary>更新租赁信息（过期时间、状态）</summary>
    public async Task UpdateRentalInfoAsync(string orderId, DateTime? expiresAt, string? status)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order == null) return;
        if (expiresAt != null) order.ExpiresAt = expiresAt;
        if (status != null) order.Status = status;
        await _db.SaveChangesAsync();
    }

    /// <summary>续费时累加实际成本</summary>
    public async Task AccumulateCostAsync(string orderId, decimal renewCost)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order == null) return;
        order.CostPrice += renewCost;
        await _db.SaveChangesAsync();
        _log.LogInformation("续费成本累加: OrderId={OrderId}, RenewCost={Cost}, TotalCost={Total}",
            orderId, renewCost, order.CostPrice);
    }

    /// <summary>删除订单</summary>
    public async Task<bool> DeleteOrderAsync(string orderId)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order == null) return false;
        _db.Orders.Remove(order);
        await _db.SaveChangesAsync();
        return true;
    }
}
