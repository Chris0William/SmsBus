using Yitter.IdGenerator;

namespace SmsBus.Web.Common;

/// <summary>雪花 ID 生成器包装</summary>
public static class SnowflakeId
{
    /// <summary>初始化雪花 ID 生成器（应用启动时调用一次）</summary>
    public static void Init(ushort workerId = 1)
    {
        YitIdHelper.SetIdGenerator(new IdGeneratorOptions(workerId));
    }

    /// <summary>生成一个新的雪花 ID</summary>
    public static long NextId() => YitIdHelper.NextId();
}
