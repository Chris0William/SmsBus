namespace SmsBus.Web.Entities;

public class User : ISoftDelete
{
    public long Id { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public decimal Balance { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;

    // 软删除
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}
