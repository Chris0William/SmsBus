using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsBus.Web.Migrations
{
    /// <inheritdoc />
    public partial class RenameToProfitPercent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActivationMarkup",
                table: "pricing_config");

            migrationBuilder.DropColumn(
                name: "MarkupPerDay",
                table: "pricing_config");

            migrationBuilder.AddColumn<decimal>(
                name: "ActivationProfitPercent",
                table: "pricing_config",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RentalProfitPercent",
                table: "pricing_config",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.UpdateData(
                table: "pricing_config",
                keyColumn: "Id",
                keyValue: 1L,
                columns: new[] { "ActivationProfitPercent", "RentalProfitPercent" },
                values: new object[] { 0m, 0m });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActivationProfitPercent",
                table: "pricing_config");

            migrationBuilder.DropColumn(
                name: "RentalProfitPercent",
                table: "pricing_config");

            migrationBuilder.AddColumn<decimal>(
                name: "ActivationMarkup",
                table: "pricing_config",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MarkupPerDay",
                table: "pricing_config",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.UpdateData(
                table: "pricing_config",
                keyColumn: "Id",
                keyValue: 1L,
                columns: new[] { "ActivationMarkup", "MarkupPerDay" },
                values: new object[] { 0m, 0m });
        }
    }
}
