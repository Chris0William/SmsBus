namespace SmsPva.Sdk.Models;

public class SmsMessage
{
    public string Text { get; set; } = string.Empty;
    public string Sender { get; set; } = string.Empty;
    public long Date { get; set; }              // UNIX timestamp

    public DateTime ReceivedAt => DateTimeOffset.FromUnixTimeSeconds(Date).LocalDateTime;
}
