namespace SmsBus.Sdk.Models;

public class RentalArea
{
    public string AreaCode { get; set; } = string.Empty;
    public string AreaTitle { get; set; } = string.Empty;
    /// <summary>Monthly price in cents</summary>
    public int UnitPrice { get; set; }
    public int MinMonth { get; set; }
    public int Total { get; set; }

    /// <summary>Monthly price in USD</summary>
    public decimal UnitPriceUsd => UnitPrice / 100m;
}
