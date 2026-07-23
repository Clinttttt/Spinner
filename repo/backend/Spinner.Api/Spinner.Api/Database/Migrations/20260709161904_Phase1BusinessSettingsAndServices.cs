using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase1BusinessSettingsAndServices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BusinessSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BusinessName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    LogoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PhoneNumber = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    OperatingHours = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    PickupTimeWindows = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IsCashOnDeliveryEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsQrCodeOnlinePaymentEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsSmsBookingReceivedEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsSmsBookingConfirmedEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsSmsPickedUpEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsSmsReadyForDeliveryEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsSmsCompletedEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsEmailBookingConfirmedEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsEmailReceiptEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsEmailCompletedEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LaundryServices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UnitLabel = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    BasePrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    SupportsPickupAndDelivery = table.Column<bool>(type: "boolean", nullable: false),
                    DeliveryFee = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LaundryServices", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LaundryServices_IsActive",
                table: "LaundryServices",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_LaundryServices_Name",
                table: "LaundryServices",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BusinessSettings");

            migrationBuilder.DropTable(
                name: "LaundryServices");
        }
    }
}
