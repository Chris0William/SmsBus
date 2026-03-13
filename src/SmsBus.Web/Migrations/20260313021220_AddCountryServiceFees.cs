using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsBus.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddCountryServiceFees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ServiceFee12m",
                table: "countries",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceFee1m",
                table: "countries",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceFee3m",
                table: "countries",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceFee6m",
                table: "countries",
                type: "decimal(65,30)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ServiceFee12m",
                table: "countries");

            migrationBuilder.DropColumn(
                name: "ServiceFee1m",
                table: "countries");

            migrationBuilder.DropColumn(
                name: "ServiceFee3m",
                table: "countries");

            migrationBuilder.DropColumn(
                name: "ServiceFee6m",
                table: "countries");
        }
    }
}
