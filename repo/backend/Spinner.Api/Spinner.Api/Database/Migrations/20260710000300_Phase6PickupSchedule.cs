using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase6PickupSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PickupFailureReason",
                table: "LaundryOrders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PickupStatus",
                table: "LaundryOrders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PickupUpdatedAt",
                table: "LaundryOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LaundryOrders_PickupStatus",
                table: "LaundryOrders",
                column: "PickupStatus");

            migrationBuilder.CreateIndex(
                name: "IX_LaundryOrders_PreferredDate",
                table: "LaundryOrders",
                column: "PreferredDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LaundryOrders_PickupStatus",
                table: "LaundryOrders");

            migrationBuilder.DropIndex(
                name: "IX_LaundryOrders_PreferredDate",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupFailureReason",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupStatus",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupUpdatedAt",
                table: "LaundryOrders");
        }
    }
}
