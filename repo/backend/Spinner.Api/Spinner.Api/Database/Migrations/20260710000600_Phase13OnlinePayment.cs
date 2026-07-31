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
            migrationBuilder.Sql(
                """
                DELETE FROM "__EFMigrationsHistory"
                WHERE "MigrationId" = '20260709182625_Phase13OnlinePayment';

                ALTER TABLE "LaundryOrders"
                    ADD COLUMN IF NOT EXISTS "OnlinePaymentCheckoutUrl" character varying(500);

                ALTER TABLE "LaundryOrders"
                    ADD COLUMN IF NOT EXISTS "OnlinePaymentReference" character varying(120);

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_LaundryOrders_OnlinePaymentReference"
                    ON "LaundryOrders" ("OnlinePaymentReference");
                """);
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
