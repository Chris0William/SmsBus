namespace SmsBus.Web.Infrastructure.Auth;

public class SessionData
{
    public long UserId { get; set; }
    public string Phone { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
}
