using System.Text.Json;
using System.Text.Json.Serialization;

namespace SmsBus.Web.Common;

/// <summary>
/// 将 long 类型序列化为 JSON string，防止前端 JavaScript 精度丢失。
/// JS Number.MAX_SAFE_INTEGER = 2^53 - 1 = 9007199254740991，雪花 ID 可能超出此范围。
/// </summary>
public class LongJsonConverter : JsonConverter<long>
{
    public override long Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return 0;
        return reader.TokenType == JsonTokenType.String
            ? long.Parse(reader.GetString()!)
            : reader.GetInt64();
    }

    public override void Write(Utf8JsonWriter writer, long value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString());
    }
}

/// <summary>可空 long 类型的 JSON 转换器</summary>
public class NullableLongJsonConverter : JsonConverter<long?>
{
    public override long? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        return reader.TokenType == JsonTokenType.String
            ? long.Parse(reader.GetString()!)
            : reader.GetInt64();
    }

    public override void Write(Utf8JsonWriter writer, long? value, JsonSerializerOptions options)
    {
        if (value == null)
            writer.WriteNullValue();
        else
            writer.WriteStringValue(value.Value.ToString());
    }
}
