using SmsBus.Web.Entities;

namespace SmsBus.Web.Services.Interfaces;

public interface IOrderService
{
    Task<Order> CreateAsync(Order order);
    Task<Order?> GetByIdAsync(long id);
    Task<List<Order>> GetUserOrdersAsync(long userId);
    Task<List<Order>> GetAllOrdersAsync(long? userId = null, string? mode = null, string? status = null,
        DateTime? dateFrom = null, DateTime? dateTo = null, long? countryId = null);
    Task UpdateSmsAsync(long orderId, string text, string? code);
    Task UpdateStatusAsync(long orderId, string status);
    Task<bool> AssignToUserAsync(long orderId, long userId, long assignedBy);
    Task UpdateRentalSmsAsync(long orderId, List<OrderSms> smsList);
    Task UpdateRentalInfoAsync(long orderId, DateTime? expiresAt, string? status);
    Task AccumulateCostAsync(long orderId, decimal renewCost);
    Task<bool> DeleteOrderAsync(long orderId);
}
