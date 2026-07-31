using System.Reflection;
using Microsoft.EntityFrameworkCore.Migrations;
using Spinner.Api.Database.Migrations;

namespace Spinner.Test.Database.Migrations;

public sealed class MigrationOrderingTests
{
    [Fact]
    public void OrderDependentMigrations_Should_Run_After_OrderCreation()
    {
        var orderCreationId = GetMigrationId<Phase2CustomerBookingFlow>();
        var onlinePaymentId = GetMigrationId<Phase13OnlinePayment>();
        var activityLogId = GetMigrationId<Phase14ActivityLogs>();
        var accountVerificationId =
            GetMigrationId<Phase17AccountVerificationAndRecovery>();

        Assert.True(
            string.CompareOrdinal(orderCreationId, onlinePaymentId) < 0,
            $"{onlinePaymentId} must run after {orderCreationId}.");

        Assert.True(
            string.CompareOrdinal(onlinePaymentId, activityLogId) < 0,
            $"{activityLogId} must run after {onlinePaymentId}.");

        Assert.True(
            string.CompareOrdinal(activityLogId, accountVerificationId) < 0,
            $"{accountVerificationId} must run after {activityLogId}.");
    }

    private static string GetMigrationId<TMigration>()
        where TMigration : Migration
    {
        return typeof(TMigration)
            .GetCustomAttribute<MigrationAttribute>()
            ?.Id
            ?? throw new InvalidOperationException(
                $"{typeof(TMigration).Name} is missing its migration identifier.");
    }
}
