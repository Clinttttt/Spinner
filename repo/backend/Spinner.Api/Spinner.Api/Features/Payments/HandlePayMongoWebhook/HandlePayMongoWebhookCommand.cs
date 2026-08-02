using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Payments.HandlePayMongoWebhook;

/// <summary>
/// Carries the untouched request so the signature can be checked against the exact
/// bytes PayMongo signed.
/// </summary>
public sealed record HandlePayMongoWebhookCommand(string RawBody, string? Signature)
    : IRequest<Result<PayMongoWebhookResponse>>;

public sealed record PayMongoWebhookResponse(string Outcome, string? OrderCode);
