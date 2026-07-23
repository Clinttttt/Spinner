using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Orders.UpdateOrderStatus;

public sealed record UpdateOrderStatusRequest(OrderStatus Status);
