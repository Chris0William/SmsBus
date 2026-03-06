using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using SmsBus.Web.Data;
using SmsBus.Web.Entities;
using SmsBus.Web.Infrastructure.Auth;
using SmsBus.Web.Services.Interfaces;

namespace SmsBus.Web.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IDatabase _redis;
    private const string SessionPrefix = "session:";
    private static readonly TimeSpan ShortExpiry = TimeSpan.FromHours(24);
    private static readonly TimeSpan LongExpiry = TimeSpan.FromDays(30);

    public AuthService(AppDbContext db, IConnectionMultiplexer redis)
    {
        _db = db;
        _redis = redis.GetDatabase(1);
    }

    /// <summary>注册新用户（手机号）</summary>
    public async Task<(bool Success, string? Error, User? User)> RegisterAsync(string phone, string password)
    {
        if (string.IsNullOrWhiteSpace(phone) || !IsValidPhone(phone))
            return (false, "请输入有效的手机号", null);
        if (string.IsNullOrWhiteSpace(password) || password.Length < 6)
            return (false, "密码至少 6 个字符", null);

        if (await _db.Users.AnyAsync(u => u.Phone == phone))
            return (false, "该手机号已注册", null);

        var user = new User
        {
            Phone = phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            DisplayName = phone.Length > 4 ? phone[..3] + "****" + phone[^4..] : phone,
            IsAdmin = false,
            IsActive = true,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return (true, null, user);
    }

    /// <summary>用户登录</summary>
    public async Task<(bool Success, string? Error, User? User, string? Token)> LoginAsync(
        string phone, string password, bool rememberMe = false)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Phone == phone);
        if (user == null)
            return (false, "手机号或密码错误", null, null);

        if (!user.IsActive)
            return (false, "账号已被禁用", null, null);

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return (false, "手机号或密码错误", null, null);

        var token = Guid.NewGuid().ToString("N");
        var sessionKey = SessionPrefix + token;
        var expiry = rememberMe ? LongExpiry : ShortExpiry;

        await _redis.StringSetAsync(sessionKey,
            System.Text.Json.JsonSerializer.Serialize(new SessionData
            {
                UserId = user.Id,
                Phone = user.Phone,
                IsAdmin = user.IsAdmin
            }),
            expiry);

        return (true, null, user, token);
    }

    /// <summary>从 token 获取 session 数据</summary>
    public async Task<SessionData?> GetSessionAsync(string token)
    {
        var sessionKey = SessionPrefix + token;
        var data = await _redis.StringGetAsync(sessionKey);
        if (data.IsNullOrEmpty) return null;

        return System.Text.Json.JsonSerializer.Deserialize<SessionData>(data!);
    }

    /// <summary>登出</summary>
    public async Task LogoutAsync(string token)
    {
        await _redis.KeyDeleteAsync(SessionPrefix + token);
    }

    /// <summary>确保管理员账号存在</summary>
    public async Task EnsureAdminExistsAsync(string phone, string password)
    {
        if (await _db.Users.AnyAsync(u => u.Phone == phone)) return;

        var admin = new User
        {
            Phone = phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            DisplayName = "管理员",
            IsAdmin = true,
            IsActive = true,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        _db.Users.Add(admin);
        await _db.SaveChangesAsync();
    }

    private static bool IsValidPhone(string phone)
    {
        if (phone.Length < 5 || phone.Length > 20) return false;
        foreach (var c in phone)
        {
            if (c != '+' && !char.IsDigit(c)) return false;
        }
        return true;
    }
}
