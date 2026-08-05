using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase24StaffDevicesAndPushChannel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StaffDevices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RegistrationToken = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    Platform = table.Column<int>(type: "integer", nullable: false),
                    DeviceName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RetiredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffDevices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StaffDevices_StaffUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "StaffUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StaffDevices_RegistrationToken",
                table: "StaffDevices",
                column: "RegistrationToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StaffDevices_UserId_IsActive",
                table: "StaffDevices",
                columns: new[] { "UserId", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StaffDevices");
        }
    }
}
