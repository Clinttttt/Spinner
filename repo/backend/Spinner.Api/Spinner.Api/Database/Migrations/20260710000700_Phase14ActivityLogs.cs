using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Spinner.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class Phase14ActivityLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM "__EFMigrationsHistory"
                WHERE "MigrationId" = '20260709183142_Phase14ActivityLogs';

                CREATE TABLE IF NOT EXISTS "ActivityLogs" (
                    "Id" uuid NOT NULL,
                    "Actor" character varying(120) NOT NULL,
                    "Action" character varying(120) NOT NULL,
                    "EntityType" character varying(120) NOT NULL,
                    "EntityId" uuid NULL,
                    "Description" character varying(500) NOT NULL,
                    "CreatedAt" timestamp with time zone NOT NULL,
                    CONSTRAINT "PK_ActivityLogs" PRIMARY KEY ("Id")
                );

                CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_Action"
                    ON "ActivityLogs" ("Action");

                CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_CreatedAt"
                    ON "ActivityLogs" ("CreatedAt");

                CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_EntityId"
                    ON "ActivityLogs" ("EntityId");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityLogs");
        }
    }
}
