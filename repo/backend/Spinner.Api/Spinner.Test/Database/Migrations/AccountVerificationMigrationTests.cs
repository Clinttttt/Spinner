using System.Reflection;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Spinner.Api.Database.Migrations;

namespace Spinner.Test.Database.Migrations;

public sealed class AccountVerificationMigrationTests
{
    [Fact]
    public void Up_Should_Create_The_Schema_Required_By_Registration()
    {
        var operations = BuildUpOperations();

        Assert.Contains(
            operations.OfType<CreateTableOperation>(),
            operation => operation.Name == "AccountActionCodes");
        Assert.Contains(
            operations.OfType<AddColumnOperation>(),
            operation =>
                operation.Table == "StaffUsers"
                && operation.Name == "IsEmailVerified"
                && operation.ClrType == typeof(bool)
                && !operation.IsNullable);
        Assert.Contains(
            operations.OfType<AddColumnOperation>(),
            operation =>
                operation.Table == "StaffUsers"
                && operation.Name == "EmailVerifiedAt"
                && operation.IsNullable);
        Assert.Contains(
            operations.OfType<AlterColumnOperation>(),
            operation =>
                operation.Table == "NotificationOutbox"
                && operation.Name == "OrderId"
                && operation.IsNullable);
    }

    [Fact]
    public void Up_Should_Add_Registration_Lookup_Indexes()
    {
        var indexes = BuildUpOperations()
            .OfType<CreateIndexOperation>()
            .ToList();

        Assert.Contains(
            indexes,
            operation =>
                operation.Table == "StaffUsers"
                && operation.Name == "IX_StaffUsers_IsEmailVerified");
        Assert.Contains(
            indexes,
            operation =>
                operation.Table == "AccountActionCodes"
                && operation.Name
                    == "IX_AccountActionCodes_UserId_Purpose_ConsumedAt");
    }

    private static IReadOnlyList<MigrationOperation> BuildUpOperations()
    {
        var migration = new Phase17AccountVerificationAndRecovery();
        var builder = new MigrationBuilder(
            "Npgsql.EntityFrameworkCore.PostgreSQL");
        var upMethod = typeof(Phase17AccountVerificationAndRecovery)
            .GetMethod("Up", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException(
                "The account verification migration has no Up method.");

        upMethod.Invoke(migration, [builder]);
        return builder.Operations;
    }
}
