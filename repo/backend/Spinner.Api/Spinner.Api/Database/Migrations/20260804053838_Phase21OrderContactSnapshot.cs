using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase21OrderContactSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactName",
                table: "LaundryOrders",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "");

            // Existing orders would otherwise show a blank name. The customer record
            // is the only name history available for them, so it is the best
            // available value; from here on each order keeps its own.
            migrationBuilder.Sql("""
                UPDATE "LaundryOrders" AS o
                SET "ContactName" = c."FullName"
                FROM "Customers" AS c
                WHERE o."CustomerId" = c."Id" AND o."ContactName" = '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactName",
                table: "LaundryOrders");
        }
    }
}
