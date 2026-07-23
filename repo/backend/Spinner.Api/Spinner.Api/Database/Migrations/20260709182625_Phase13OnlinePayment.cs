using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase13OnlinePayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OnlinePaymentCheckoutUrl",
                table: "LaundryOrders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OnlinePaymentReference",
                table: "LaundryOrders",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LaundryOrders_OnlinePaymentReference",
                table: "LaundryOrders",
                column: "OnlinePaymentReference",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LaundryOrders_OnlinePaymentReference",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "OnlinePaymentCheckoutUrl",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "OnlinePaymentReference",
                table: "LaundryOrders");
        }
    }
}
