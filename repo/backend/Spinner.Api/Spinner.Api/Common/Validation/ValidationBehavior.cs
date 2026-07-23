using FluentValidation;
using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Common.Validation;

public sealed class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
    where TResponse : ResultBase
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var validators = _validators.ToArray();

        if (validators.Length == 0)
            return await next(cancellationToken);

        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(
            validators.Select(validator => validator.ValidateAsync(context, cancellationToken)));

        var errors = validationResults
            .SelectMany(result => result.Errors)
            .Where(failure => failure is not null)
            .Select(failure => Error.Validation(failure.ErrorMessage))
            .ToArray();

        if (errors.Length == 0)
            return await next(cancellationToken);

        var validationFactory = typeof(TResponse).GetMethod(
            nameof(Result.Validation),
            [typeof(IReadOnlyList<Error>)]);

        if (validationFactory is null)
            throw new InvalidOperationException($"Response type {typeof(TResponse).Name} does not support validation results.");

        return (TResponse)validationFactory.Invoke(null, [errors])!;
    }
}
