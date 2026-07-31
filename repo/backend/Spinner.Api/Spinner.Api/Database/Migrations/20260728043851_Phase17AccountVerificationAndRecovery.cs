using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase17AccountVerificationAndRecovery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NotificationOutbox_LaundryOrders_OrderId",
                table: "NotificationOutbox");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "EmailVerifiedAt",
                table: "StaffUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsEmailVerified",
                table: "StaffUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Accounts created before email verification shipped were already trusted
            // through the previous owner-only authentication flow.
            migrationBuilder.Sql(
                """
                UPDATE "StaffUsers"
                SET "IsEmailVerified" = TRUE,
                    "EmailVerifiedAt" = "UpdatedAt";
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "OrderId",
                table: "NotificationOutbox",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateTable(
                name: "AccountActionCodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Purpose = table.Column<int>(type: "integer", nullable: false),
                    CodeHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FailedAttemptCount = table.Column<int>(type: "integer", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConsumedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountActionCodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccountActionCodes_StaffUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "StaffUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StaffUsers_IsEmailVerified",
                table: "StaffUsers",
                column: "IsEmailVerified");

            migrationBuilder.CreateIndex(
                name: "IX_AccountActionCodes_ExpiresAt",
                table: "AccountActionCodes",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_AccountActionCodes_UserId",
                table: "AccountActionCodes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountActionCodes_UserId_Purpose_ConsumedAt",
                table: "AccountActionCodes",
                columns: new[] { "UserId", "Purpose", "ConsumedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_NotificationOutbox_LaundryOrders_OrderId",
                table: "NotificationOutbox",
                column: "OrderId",
                principalTable: "LaundryOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NotificationOutbox_LaundryOrders_OrderId",
                table: "NotificationOutbox");

            migrationBuilder.DropTable(
                name: "AccountActionCodes");

            migrationBuilder.DropIndex(
                name: "IX_StaffUsers_IsEmailVerified",
                table: "StaffUsers");

            migrationBuilder.DropColumn(
                name: "EmailVerifiedAt",
                table: "StaffUsers");

            migrationBuilder.DropColumn(
                name: "IsEmailVerified",
                table: "StaffUsers");

            migrationBuilder.Sql(
                """DELETE FROM "NotificationOutbox" WHERE "OrderId" IS NULL;""");

            migrationBuilder.AlterColumn<Guid>(
                name: "OrderId",
                table: "NotificationOutbox",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_NotificationOutbox_LaundryOrders_OrderId",
                table: "NotificationOutbox",
                column: "OrderId",
                principalTable: "LaundryOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
