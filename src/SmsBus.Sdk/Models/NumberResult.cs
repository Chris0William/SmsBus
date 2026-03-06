namespace SmsBus.Sdk.Models;

public class NumberResult
{
    public string RequestId { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string? Country { get; set; }
}
