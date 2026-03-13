namespace SmsBus.Sdk.Models;

public class RentalOrder
{
    public string OrderId { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string DialingCode { get; set; } = string.Empty;
    public string AreaCode { get; set; } = string.Empty;
    public DateTime ExpireAt { get; set; }
    public DateTime KeepAt { get; set; }
}
