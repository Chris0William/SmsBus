using SmsBus.Web.Entities;

namespace SmsBus.Web.Services.Interfaces;

public interface IOrderService
{
    Task<Order> CreateAsync(Order order);
    Task<Order?> GetByOrderIdAsync(string orderId);
    Task<Order?> GetByIdAsync(long id);
    Task<List<Order>> GetUserOrdersAsync(long userId);
    Task<List<Order>> GetAllOrdersAsync(long? userId = null);
    Task UpdateSmsAsync(string orderId, string text, string? code);
    Task UpdateStatusAsync(string orderId, string status);
    Task<bool> AssignToUserAsync(long orderId, long userId, long assignedBy);
    Task UpdateRentalSmsAsync(string orderId, List<OrderSms> smsList);
    Task UpdateRentalInfoAsync(string orderId, DateTime? expiresAt, string? status);
    Task AccumulateCostAsync(string orderId, decimal renewCost);
    Task<bool> DeleteOrderAsync(string orderId);
}
