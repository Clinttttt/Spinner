namespace Spinner.Api.Domain.Customers;

public sealed class Customer
{
    private Customer()
    {
    }

    public Customer(
        string fullName,
        string mobileNumber,
        string? emailAddress,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        FullName = fullName.Trim();
        MobileNumber = mobileNumber.Trim();
        EmailAddress = NormalizeEmail(emailAddress);
        CreatedAt = now;
        UpdatedAt = now;
    }

    public Guid Id { get; private set; }
    public string FullName { get; private set; } = string.Empty;
    public string MobileNumber { get; private set; } = string.Empty;
    public string? EmailAddress { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void UpdateFromBooking(
        string fullName,
        string? emailAddress,
        DateTimeOffset now)
    {
        FullName = fullName.Trim();
        EmailAddress = NormalizeEmail(emailAddress);
        UpdatedAt = now;
    }

    private static string? NormalizeEmail(string? emailAddress) =>
        string.IsNullOrWhiteSpace(emailAddress) ? null : emailAddress.Trim();
}
