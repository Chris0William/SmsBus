using SmsBus.Web.Entities;
using SmsBus.Web.Infrastructure.Auth;

namespace SmsBus.Web.Services.Interfaces;

public interface IAuthService
{
    Task<(bool Success, string? Error, User? User)> RegisterAsync(string phone, string password);
    Task<(bool Success, string? Error, User? User, string? Token)> LoginAsync(string phone, string password, bool rememberMe = false);
    Task<SessionData?> GetSessionAsync(string token);
    Task LogoutAsync(string token);
    Task EnsureAdminExistsAsync(string phone, string password);
}
