namespace Spinner.Api.Features.Receipts;

public sealed record PaymentInstructionResponse(
    Guid OrderId,
    string OrderCode,
    string Message,
    decimal AmountToPay);
