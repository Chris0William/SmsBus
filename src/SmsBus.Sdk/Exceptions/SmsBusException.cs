namespace SmsBus.Sdk.Exceptions;

public class SmsBusException : Exception
{
    public string? ErrorCode { get; }

    public SmsBusException(string message, string? errorCode = null)
        : base(message)
    {
        ErrorCode = errorCode;
    }

    public override string ToString() =>
        ErrorCode != null
            ? $"SmsBusException [{ErrorCode}]: {Message}"
            : $"SmsBusException: {Message}";
}
