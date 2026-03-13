using Microsoft.EntityFrameworkCore;
using SmsBus.Web.Entities;

namespace SmsBus.Web.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderSms> OrderSms => Set<OrderSms>();
    public DbSet<BalanceTransaction> BalanceTransactions => Set<BalanceTransaction>();
    public DbSet<PricingConfig> PricingConfigs => Set<PricingConfig>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Users
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.Property(u => u.Id).ValueGeneratedNever();
            e.Property(u => u.Balance).HasPrecision(18, 4);
            e.HasIndex(u => u.Phone).IsUnique();
            e.HasQueryFilter(u => !u.IsDeleted);
        });

        // Suppliers
        modelBuilder.Entity<Supplier>(e =>
        {
            e.ToTable("suppliers");
            e.Property(s => s.Id).ValueGeneratedNever();
            e.HasIndex(s => s.Code).IsUnique();
        });

        // Countries
        modelBuilder.Entity<Country>(e =>
        {
            e.ToTable("countries");
            e.Property(c => c.Id).ValueGeneratedNever();
            e.Property(c => c.ActivationMarkupPercent).HasPrecision(10, 2);
            e.Property(c => c.RentalMarkupPercent).HasPrecision(10, 2);
            e.HasIndex(c => c.Code).IsUnique();
            e.HasOne(c => c.Supplier)
                .WithMany()
                .HasForeignKey(c => c.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Orders
        modelBuilder.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.Property(o => o.Id).ValueGeneratedNever();
            e.Property(o => o.CostPrice).HasPrecision(18, 4);
            e.Property(o => o.UserPrice).HasPrecision(18, 4);

            e.HasOne(o => o.User)
                .WithMany()
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(o => o.Assigner)
                .WithMany()
                .HasForeignKey(o => o.AssignedBy)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(o => o.Supplier)
                .WithMany()
                .HasForeignKey(o => o.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.Country)
                .WithMany()
                .HasForeignKey(o => o.CountryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // OrderSms
        modelBuilder.Entity<OrderSms>(e =>
        {
            e.ToTable("order_sms");
            e.Property(s => s.Id).ValueGeneratedNever();
            e.HasOne(s => s.Order)
                .WithMany(o => o.SmsList)
                .HasForeignKey(s => s.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // BalanceTransactions
        modelBuilder.Entity<BalanceTransaction>(e =>
        {
            e.ToTable("balance_transactions");
            e.Property(t => t.Id).ValueGeneratedNever();
            e.Property(t => t.Amount).HasPrecision(18, 4);
            e.HasQueryFilter(t => !t.IsDeleted);
            e.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(t => t.RelatedOrder)
                .WithMany()
                .HasForeignKey(t => t.RelatedOrderId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.Operator)
                .WithMany()
                .HasForeignKey(t => t.OperatorId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // PricingConfig
        modelBuilder.Entity<PricingConfig>(e =>
        {
            e.ToTable("pricing_config");
            e.Property(p => p.Id).ValueGeneratedNever();
            e.Property(p => p.DefaultActivationMarkupPercent).HasPrecision(10, 2);
            e.Property(p => p.DefaultRentalMarkupPercent).HasPrecision(10, 2);
            e.Property(p => p.ServiceFee1m).HasPrecision(10, 2);
            e.Property(p => p.ServiceFee3m).HasPrecision(10, 2);
            e.Property(p => p.ServiceFee6m).HasPrecision(10, 2);
            e.Property(p => p.ServiceFee12m).HasPrecision(10, 2);
            e.Property(p => p.UsdCnyRate).HasPrecision(10, 4);
            e.HasData(new PricingConfig
            {
                Id = 1,
                DefaultActivationMarkupPercent = 0,
                DefaultRentalMarkupPercent = 0,
                ServiceFee1m = 0,
                ServiceFee3m = 0,
                ServiceFee6m = 0,
                ServiceFee12m = 0,
                UsdCnyRate = 7.25m,
                UpdatedAt = new DateTime(2024, 1, 1)
            });
        });
    }
}
