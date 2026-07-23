using Microsoft.Extensions.Options;

namespace Spinner.Api.Features.Notifications.ProcessNotificationOutbox;

public sealed class NotificationOutboxWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptions<NotificationOutboxOptions> _options;
    private readonly ILogger<NotificationOutboxWorker> _logger;

    public NotificationOutboxWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<NotificationOutboxOptions> options,
        ILogger<NotificationOutboxWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            if (_options.Value.Enabled)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var processor = scope.ServiceProvider.GetRequiredService<NotificationOutboxProcessor>();
                    await processor.ProcessPendingAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Notification outbox worker failed.");
                }
            }

            var interval = TimeSpan.FromSeconds(Math.Max(5, _options.Value.PollIntervalSeconds));
            await Task.Delay(interval, stoppingToken);
        }
    }
}
