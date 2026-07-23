using Spinner.Api.Domain.Services;

namespace Spinner.Api.Domain.Orders;

public sealed class OrderServiceItem
{
    private OrderServiceItem()
    {
    }

    public OrderServiceItem(LaundryService service, int quantity)
    {
        Id = Guid.NewGuid();
        ServiceId = service.Id;
        ServiceName = service.Name;
        UnitLabel = service.UnitLabel;
        UnitPrice = service.BasePrice;
        Quantity = quantity;
        Subtotal = service.BasePrice * quantity;
    }

    public Guid Id { get; private set; }
    public Guid OrderId { get; private set; }
    public LaundryOrder Order { get; private set; } = null!;
    public Guid ServiceId { get; private set; }
    public LaundryService Service { get; private set; } = null!;
    public string ServiceName { get; private set; } = string.Empty;
    public string UnitLabel { get; private set; } = string.Empty;
    public decimal UnitPrice { get; private set; }
    public int Quantity { get; private set; }
    public decimal Subtotal { get; private set; }
}
