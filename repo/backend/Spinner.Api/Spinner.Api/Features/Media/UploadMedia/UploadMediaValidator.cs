using FluentValidation;
using Microsoft.Extensions.Options;
using Spinner.Api.Integrations.Media;

namespace Spinner.Api.Features.Media.UploadMedia;

/// <summary>
/// Refuses an upload before it reaches storage.
/// </summary>
/// <remarks>
/// The size cap is read from configuration rather than written here so the shop's limit and
/// the request body limit cannot drift apart into a state where a request is accepted by the
/// server and then rejected by this.
/// </remarks>
public sealed class UploadMediaValidator : AbstractValidator<UploadMediaCommand>
{
    public UploadMediaValidator(IOptions<MediaStorageOptions> options)
    {
        var maximumBytes = options.Value.MaxUploadBytes;

        RuleFor(command => command.Purpose)
            .IsInEnum()
            .WithMessage("Choose what the image is for.");

        RuleFor(command => command.ContentType)
            .Must(ImageUploadRules.IsAccepted)
            .WithMessage($"The image must be one of: {ImageUploadRules.Describe()}.");

        RuleFor(command => command.Content)
            .NotNull()
            .WithMessage("Choose an image to upload.");

        RuleFor(command => command.Content.Length)
            .GreaterThanOrEqualTo(ImageUploadRules.MinimumByteSize)
            .WithMessage("That file is too small to be an image.")
            .LessThanOrEqualTo(maximumBytes)
            .WithMessage($"The image must be {maximumBytes / (1024 * 1024)} MB or smaller.")
            .When(command => command.Content is not null);
    }
}
