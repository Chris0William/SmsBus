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
        _log.LogInformation("订单创建: Id={Id}, Mode={Mode}, Source={Source}, UserId={UserId}",
            order.Id, order.Mode, order.Source, order.UserId);
        return order;
    }

    public async Task<Order?> GetByIdAsync(long id)
    {
        return await _db.Orders
            .Include(o => o.SmsList)
            .Include(o => o.Country)
            .Include(o => o.Supplier)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    public async Task<List<Order>> GetUserOrdersAsync(long userId)
    {
        return await _db.Orders
            .Where(o => o.UserId == userId)
            .Include(o => o.SmsList)
            .Include(o => o.Country)
            .Include(o => o.Supplier)
            .OrderByDescending(o => o.PurchasedAt)
            .ToListAsync();
    }

    public async Task<List<Order>> GetAllOrdersAsync(long? userId = null, string? mode = null,
        string? status = null, DateTime? dateFrom = null, DateTime? dateTo = null, long? countryId = null)
    {
        var q = _db.Orders
            .Include(o => o.User)
            .Include(o => o.SmsList)
            .Include(o => o.Country)
            .Include(o => o.Supplier)
            .AsQueryable();

        if (userId.HasValue) q = q.Where(o => o.UserId == userId);
        if (!string.IsNullOrEmpty(mode)) q = q.Where(o => o.Mode == mode);
        if (!string.IsNullOrEmpty(status)) q = q.Where(o => o.Status == status);
        if (dateFrom.HasValue) q = q.Where(o => o.PurchasedAt >= dateFrom);
        if (dateTo.HasValue) q = q.Where(o => o.PurchasedAt <= dateTo);
        if (countryId.HasValue) q = q.Where(o => o.CountryId == countryId);

        return await q.OrderByDescending(o => o.PurchasedAt).Take(200).ToListAsync();
    }

    public async Task UpdateSmsAsync(long orderId, string text, string? code)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return;

        order.Status = "received";
        order.CompletedAt = DateTime.Now;

        _db.OrderSms.Add(new OrderSms
        {
            Id = SnowflakeId.NextId(),
            OrderId = order.Id,
            Text = text,
            Code = code,
            ReceivedAt = DateTime.Now
        });

        await _db.SaveChangesAsync();
    }

    public async Task UpdateStatusAsync(long orderId, string status)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return;
        order.Status = status;
        if (status == "cancelled") order.CompletedAt = DateTime.Now;
        await _db.SaveChangesAsync();
        _log.LogInformation("订单状态更新: Id={Id}, Status={Status}", orderId, status);
    }

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

    public async Task UpdateRentalSmsAsync(long orderId, List<OrderSms> smsList)
    {
        var order = await _db.Orders.Include(o => o.SmsList)
            .FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return;

        var existingTimes = order.SmsList.Select(s => s.ReceivedAt).ToHashSet();
        var newMessages = smsList.Where(s => !existingTimes.Contains(s.ReceivedAt)).ToList();
        if (newMessages.Count == 0) return;

        foreach (var sms in newMessages)
        {
            sms.Id = SnowflakeId.NextId();
            sms.OrderId = order.Id;
            _db.OrderSms.Add(sms);
        }

        await _db.SaveChangesAsync();
    }

    public async Task UpdateRentalInfoAsync(long orderId, DateTime? expiresAt, string? status)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return;
        if (expiresAt != null) order.ExpiresAt = expiresAt;
        if (status != null) order.Status = status;
        await _db.SaveChangesAsync();
    }

    public async Task AccumulateCostAsync(long orderId, decimal renewCost)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return;
        order.CostPrice += renewCost;
        await _db.SaveChangesAsync();
        _log.LogInformation("续费成本累加: Id={Id}, RenewCost={Cost}, TotalCost={Total}",
            orderId, renewCost, order.CostPrice);
    }

    public async Task<bool> DeleteOrderAsync(long orderId)
    {
        var order = await _db.Orders.FindAsync(orderId);
        if (order == null) return false;
        _db.Orders.Remove(order);
        await _db.SaveChangesAsync();
        return true;
    }
}
