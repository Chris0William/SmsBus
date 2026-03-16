using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsBus.Web.Migrations
{
    /// <inheritdoc />
    public partial class SplitRequiresService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "RequiresService",
                table: "suppliers",
                newName: "RequiresServiceForRental");

            migrationBuilder.AddColumn<bool>(
                name: "RequiresServiceForActivation",
                table: "suppliers",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RequiresServiceForActivation",
                table: "suppliers");

            migrationBuilder.RenameColumn(
                name: "RequiresServiceForRental",
                table: "suppliers",
                newName: "RequiresService");
        }
    }
}
