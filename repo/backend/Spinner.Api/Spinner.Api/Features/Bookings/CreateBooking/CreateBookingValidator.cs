using FluentValidation;

namespace Spinner.Api.Features.Bookings.CreateBooking;

public sealed class CreateBookingValidator : AbstractValidator<CreateBookingCommand>
{
    /// <summary>Loads allowed on a single service line.</summary>
    private const int MaxQuantityPerService = 50;

    public CreateBookingValidator()
    {
        RuleFor(command => command.FullName)
            .NotEmpty()
            .MaximumLength(160);

        RuleFor(command => command.MobileNumber)
            .NotEmpty()
            .MaximumLength(40);

        RuleFor(command => command.EmailAddress)
            .EmailAddress()
            .MaximumLength(254)
            .When(command => !string.IsNullOrWhiteSpace(command.EmailAddress));

        RuleFor(command => command.ServiceId)
            .NotEmpty()
            .When(command => command.Services is null or { Count: 0 });

        RuleForEach(command => command.Services!)
            .ChildRules(service =>
            {
                service.RuleFor(item => item.ServiceId).NotEmpty();

                // An upper bound keeps a malformed or hostile client from booking an
                // implausible job. Genuine bulk work is arranged with the shop.
                service.RuleFor(item => item.Quantity)
                    .InclusiveBetween(1, MaxQuantityPerService);
            })
            .When(command => command.Services is { Count: > 0 });

        RuleFor(command => command.Services!)
            .Must(services => services.Select(service => service.ServiceId).Distinct().Count()
                              == services.Count)
            .WithMessage("Each service may only be listed once.")
            .When(command => command.Services is { Count: > 0 });

        RuleFor(command => command.Address)
            .NotEmpty()
            .MaximumLength(500);

        RuleFor(command => command.PreferredDate)
            .NotEmpty();

        RuleFor(command => command.PreferredTimeWindow)
            .NotEmpty()
            .MaximumLength(120);

        RuleFor(command => command.LoadCount)
            .GreaterThan(0)
            .When(command => command.Services is null or { Count: 0 });

        RuleFor(command => command.AdditionalNotes)
            .MaximumLength(1000);

        When(command => command.PickupLocation is not null, () =>
        {
            RuleFor(command => command.PickupLocation!.FormattedAddress)
                .NotEmpty()
                .MaximumLength(500);
            RuleFor(command => command.PickupLocation!.Latitude)
                .InclusiveBetween(-90m, 90m);
            RuleFor(command => command.PickupLocation!.Longitude)
                .InclusiveBetween(-180m, 180m);
            RuleFor(command => command.PickupLocation!.LocationSource)
                .NotEmpty()
                .MaximumLength(80);
        });
    }
}
