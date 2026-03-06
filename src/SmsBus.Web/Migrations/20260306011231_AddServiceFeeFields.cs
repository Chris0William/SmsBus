using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsBus.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceFeeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ServiceFee12m",
                table: "pricing_config",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceFee1m",
                table: "pricing_config",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceFee3m",
                table: "pricing_config",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceFee6m",
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
                columns: new[] { "ServiceFee12m", "ServiceFee1m", "ServiceFee3m", "ServiceFee6m" },
                values: new object[] { 0m, 0m, 0m, 0m });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ServiceFee12m",
                table: "pricing_config");

            migrationBuilder.DropColumn(
                name: "ServiceFee1m",
                table: "pricing_config");

            migrationBuilder.DropColumn(
                name: "ServiceFee3m",
                table: "pricing_config");

            migrationBuilder.DropColumn(
                name: "ServiceFee6m",
                table: "pricing_config");
        }
    }
}
