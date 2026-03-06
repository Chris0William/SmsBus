using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsBus.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoSubscribe",
                table: "orders",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextRenewalAt",
                table: "orders",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SubscriptionMonths",
                table: "orders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SubscriptionRenewedCount",
                table: "orders",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoSubscribe",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "NextRenewalAt",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "SubscriptionMonths",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "SubscriptionRenewedCount",
                table: "orders");
        }
    }
}
