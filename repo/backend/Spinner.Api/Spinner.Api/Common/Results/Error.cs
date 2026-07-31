namespace Spinner.Api.Common.Results;

public sealed record Error(string Code, string Title, string Message, string Type)
{
    public static readonly Error None = new("", "", "", "");

    public static Error Validation(string message) =>
        new("validation.error", "Validation failed", message, "https://httpstatuses.com/400");

    public static Error Failure(string message) =>
        new("request.failed", "Request failed", message, "https://httpstatuses.com/400");

    public static Error NotFound(string message) =>
        new("resource.not_found", "Resource not found", message, "https://httpstatuses.com/404");

    public static Error Conflict(string message) =>
        new("resource.conflict", "Conflict", message, "https://httpstatuses.com/409");

    /// <summary>
    /// A near-identical order already exists. Clients may offer an explicit
    /// "create anyway" override instead of failing outright.
    /// </summary>
    public static Error PossibleDuplicateOrder(string message) =>
        new("order.possible_duplicate", "Possible duplicate order", message, "https://httpstatuses.com/409");

    public static Error Unauthorized(string message) =>
        new("auth.unauthorized", "Unauthorized", message, "https://httpstatuses.com/401");

    public static Error Forbidden(string message) =>
        new("auth.forbidden", "Forbidden", message, "https://httpstatuses.com/403");
}
