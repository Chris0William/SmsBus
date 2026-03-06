using System.Text.Json.Serialization;

namespace SmsBus.Web.Common;

/// <summary>统一 API 响应信封</summary>
public class ApiResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }

    /// <summary>向后兼容：前端检查 error 字段</summary>
    [JsonPropertyName("error")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Error => Success ? null : Message;

    public static ApiResponse Ok(string? message = null) => new() { Success = true, Message = message };
    public static ApiResponse Fail(string message) => new() { Success = false, Message = message };
    public static ApiResponse<T> Ok<T>(T data, string? message = null) => new() { Success = true, Data = data, Message = message };
}

/// <summary>带数据的统一 API 响应信封</summary>
public class ApiResponse<T> : ApiResponse
{
    public T? Data { get; set; }
}
