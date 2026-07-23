using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase9CodPaymentConfirmation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PaidAt",
                table: "LaundryOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptCode",
                table: "LaundryOrders",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LaundryOrders_PaymentStatus",
                table: "LaundryOrders",
                column: "PaymentStatus");

            migrationBuilder.CreateIndex(
                name: "IX_LaundryOrders_ReceiptCode",
                table: "LaundryOrders",
                column: "ReceiptCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LaundryOrders_PaymentStatus",
                table: "LaundryOrders");

            migrationBuilder.DropIndex(
                name: "IX_LaundryOrders_ReceiptCode",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PaidAt",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "ReceiptCode",
                table: "LaundryOrders");
        }
    }
}
