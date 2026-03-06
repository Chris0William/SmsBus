using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SmsBus.Web.Entities;

namespace SmsBus.Web.Infrastructure.Persistence;

/// <summary>
/// EF Core SaveChanges 拦截器：自动将硬删除转为软删除。
/// 所有实现 ISoftDelete 的实体在 Remove() 时会被拦截，
/// 改为设置 IsDeleted=true + DeletedAt，而不是真正从数据库中删除。
/// </summary>
public class SoftDeleteInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        ConvertToSoftDelete(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        ConvertToSoftDelete(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void ConvertToSoftDelete(DbContext? context)
    {
        if (context == null) return;

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Deleted && e.Entity is ISoftDelete)
            .ToList();

        foreach (var entry in entries)
        {
            entry.State = EntityState.Modified;

            var entity = (ISoftDelete)entry.Entity;
            entity.IsDeleted = true;
            entity.DeletedAt = DateTime.Now;

            // 级联软删除：Order 被软删除时，同时软删除关联的 OrderSms
            if (entry.Entity is Order order)
            {
                foreach (var sms in order.SmsList)
                {
                    sms.IsDeleted = true;
                    sms.DeletedAt = DateTime.Now;
                }
            }
        }
    }
}
