using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase23ConcurrencyAndOutboxClaim : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClaimId",
                table: "NotificationOutbox",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ConcurrencyStamp",
                table: "NotificationOutbox",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LockedUntil",
                table: "NotificationOutbox",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PaymentConcurrencyStamp",
                table: "LaundryOrders",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_NotificationOutbox_Status_LockedUntil",
                table: "NotificationOutbox",
                columns: new[] { "Status", "LockedUntil" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NotificationOutbox_Status_LockedUntil",
                table: "NotificationOutbox");

            migrationBuilder.DropColumn(
                name: "ClaimId",
                table: "NotificationOutbox");

            migrationBuilder.DropColumn(
                name: "ConcurrencyStamp",
                table: "NotificationOutbox");

            migrationBuilder.DropColumn(
                name: "LockedUntil",
                table: "NotificationOutbox");

            migrationBuilder.DropColumn(
                name: "PaymentConcurrencyStamp",
                table: "LaundryOrders");
        }
    }
}
