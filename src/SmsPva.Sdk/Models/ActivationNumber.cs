namespace SmsPva.Sdk.Models;

public class ActivationNumber
{
    public int Id { get; set; }
    public string Number { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty; // 电话区号，如 "+1"
}
