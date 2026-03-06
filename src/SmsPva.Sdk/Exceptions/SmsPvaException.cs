namespace SmsPva.Sdk.Exceptions;

public class SmsPvaException : Exception
{
    public int Status { get; }

    public SmsPvaException(string message, int status = 0)
        : base(message)
    {
        Status = status;
    }

    public override string ToString() =>
        $"SmsPvaException [{Status}]: {Message}";
}
