namespace SmsPva.Sdk.Models;

public class RentalOrder
{
    public int Id { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int State { get; set; }              // 0=not active, 1=active, 2=activating, -1=not in system
    public string PhoneNumber { get; set; } = string.Empty;
    public string CountryDigitCode { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public bool HasNewSms { get; set; }
    public long Until { get; set; }             // UNIX timestamp
    public bool CanProlong { get; set; }
    public int CanProlongMax { get; set; }
    public long CanProlongUntil { get; set; }
    public long LastOnline { get; set; }

    public DateTime ExpiresAt => DateTimeOffset.FromUnixTimeSeconds(Until).LocalDateTime;
    public string StateText => State switch
    {
        0 => "not_active",
        1 => "active",
        2 => "activating",
        -1 => "not_in_system",
        _ => "unknown"
    };
}
