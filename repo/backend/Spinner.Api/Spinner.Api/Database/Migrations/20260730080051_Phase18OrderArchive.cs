using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase18OrderArchive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ArchivedAt",
                table: "LaundryOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LaundryOrders_ArchivedAt",
                table: "LaundryOrders",
                column: "ArchivedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LaundryOrders_ArchivedAt",
                table: "LaundryOrders");

            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                table: "LaundryOrders");
        }
    }
}
