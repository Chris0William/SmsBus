namespace SmsBus.Sdk.Models;

public class RentalNumber
{
    public string AreaCode { get; set; } = string.Empty;
    public string AreaName { get; set; } = string.Empty;
    public string DialingCode { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public DateTime FirstSeenAt { get; set; }
    public DateTime ExpireAt { get; set; }
    public DateTime KeepAt { get; set; }
    public bool AutoRenew { get; set; }
}
