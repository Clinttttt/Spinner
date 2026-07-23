using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase8DeliverySchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeliveryFailureReason",
                table: "LaundryOrders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeliveryStatus",
                table: "LaundryOrders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeliveryUpdatedAt",
                table: "LaundryOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LaundryOrders_DeliveryStatus",
                table: "LaundryOrders",
                column: "DeliveryStatus");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LaundryOrders_DeliveryStatus",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "DeliveryFailureReason",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "DeliveryStatus",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "DeliveryUpdatedAt",
                table: "LaundryOrders");
        }
    }
}
