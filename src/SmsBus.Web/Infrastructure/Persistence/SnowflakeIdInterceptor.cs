using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SmsBus.Web.Common;

namespace SmsBus.Web.Infrastructure.Persistence;

/// <summary>
/// EF Core SaveChanges 拦截器：自动为新增实体分配雪花 ID。
/// 所有 long Id 为 0 的新增实体会在保存前获得雪花 ID。
/// </summary>
public class SnowflakeIdInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        AssignIds(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        AssignIds(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void AssignIds(DbContext? context)
    {
        if (context == null) return;

        foreach (var entry in context.ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added))
        {
            var idProp = entry.Property("Id");
            if (idProp.Metadata.ClrType == typeof(long) && (long)idProp.CurrentValue! == 0L)
            {
                idProp.CurrentValue = SnowflakeId.NextId();
            }
        }
    }
}
