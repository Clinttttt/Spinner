using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase19PickupServiceArea : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PickupOriginLatitude",
                table: "BusinessSettings",
                type: "numeric(10,7)",
                precision: 10,
                scale: 7,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PickupOriginLongitude",
                table: "BusinessSettings",
                type: "numeric(10,7)",
                precision: 10,
                scale: 7,
                nullable: true);

            // Seeded to the 15 km starting default rather than 0, so an existing
            // business row is left with a usable radius. The effective value is
            // always read from this column, never from code.
            migrationBuilder.AddColumn<decimal>(
                name: "PickupServiceRadiusKm",
                table: "BusinessSettings",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: false,
                defaultValue: 15m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PickupOriginLatitude",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "PickupOriginLongitude",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "PickupServiceRadiusKm",
                table: "BusinessSettings");
        }
    }
}
