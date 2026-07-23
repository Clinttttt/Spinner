using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase15ManualOrdersTransactionsAndLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AdditionalCharge",
                table: "LaundryOrders",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "AdditionalChargeReason",
                table: "LaundryOrders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Discount",
                table: "LaundryOrders",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "DiscountReason",
                table: "LaundryOrders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PickupBarangay",
                table: "LaundryOrders",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PickupCityOrMunicipality",
                table: "LaundryOrders",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PickupFormattedAddress",
                table: "LaundryOrders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PickupInstructions",
                table: "LaundryOrders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PickupLandmark",
                table: "LaundryOrders",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PickupLatitude",
                table: "LaundryOrders",
                type: "numeric(10,7)",
                precision: 10,
                scale: 7,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PickupLocationConfirmed",
                table: "LaundryOrders",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PickupLocationConfirmedAt",
                table: "LaundryOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PickupLocationSource",
                table: "LaundryOrders",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PickupLongitude",
                table: "LaundryOrders",
                type: "numeric(10,7)",
                precision: 10,
                scale: 7,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PickupPlaceId",
                table: "LaundryOrders",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PickupPlusCode",
                table: "LaundryOrders",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PreferredNotificationChannel",
                table: "LaundryOrders",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "LaundryOrders",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SpecialInstructions",
                table: "LaundryOrders",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FinancialTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinancialTransactions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OrderServiceItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    UnitLabel = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderServiceItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderServiceItems_LaundryOrders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "LaundryOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderServiceItems_LaundryServices_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "LaundryServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LaundryOrders_Source",
                table: "LaundryOrders",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "IX_FinancialTransactions_Kind",
                table: "FinancialTransactions",
                column: "Kind");

            migrationBuilder.CreateIndex(
                name: "IX_FinancialTransactions_OccurredAt",
                table: "FinancialTransactions",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_OrderServiceItems_OrderId",
                table: "OrderServiceItems",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderServiceItems_ServiceId",
                table: "OrderServiceItems",
                column: "ServiceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FinancialTransactions");

            migrationBuilder.DropTable(
                name: "OrderServiceItems");

            migrationBuilder.DropIndex(
                name: "IX_LaundryOrders_Source",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "AdditionalCharge",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "AdditionalChargeReason",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "Discount",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "DiscountReason",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupBarangay",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupCityOrMunicipality",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupFormattedAddress",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupInstructions",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupLandmark",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupLatitude",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupLocationConfirmed",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupLocationConfirmedAt",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupLocationSource",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupLongitude",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupPlaceId",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PickupPlusCode",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "PreferredNotificationChannel",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "SpecialInstructions",
                table: "LaundryOrders");
        }
    }
}
