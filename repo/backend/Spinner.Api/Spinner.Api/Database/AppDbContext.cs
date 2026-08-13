using Microsoft.EntityFrameworkCore;
using Spinner.Api.Domain.ActivityLogs;
using Spinner.Api.Domain.Business;
using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Payments;
using Spinner.Api.Domain.Services;
using Spinner.Api.Domain.Transactions;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Database;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<BusinessSettings> BusinessSettings => Set<BusinessSettings>();

    public DbSet<LaundryService> LaundryServices => Set<LaundryService>();

    public DbSet<Customer> Customers => Set<Customer>();

    public DbSet<LaundryOrder> LaundryOrders => Set<LaundryOrder>();

    public DbSet<OrderServiceItem> OrderServiceItems => Set<OrderServiceItem>();

    public DbSet<FinancialTransaction> FinancialTransactions => Set<FinancialTransaction>();

    public DbSet<NotificationOutboxMessage> NotificationOutboxMessages => Set<NotificationOutboxMessage>();

    public DbSet<StaffUser> StaffUsers => Set<StaffUser>();

    public DbSet<RefreshTokenSession> RefreshTokenSessions => Set<RefreshTokenSession>();

    public DbSet<AccountActionCode> AccountActionCodes => Set<AccountActionCode>();

    public DbSet<StaffInvitation> StaffInvitations => Set<StaffInvitation>();

    public DbSet<StaffDevice> StaffDevices => Set<StaffDevice>();

    public DbSet<ActivityLogEntry> ActivityLogEntries => Set<ActivityLogEntry>();
    public DbSet<PendingBooking> PendingBookings => Set<PendingBooking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BusinessSettings>(entity =>
        {
            entity.ToTable("BusinessSettings");
            entity.HasKey(settings => settings.Id);

            entity.Property(settings => settings.BusinessName).HasMaxLength(160).IsRequired();
            entity.Property(settings => settings.LogoUrl).HasMaxLength(500);
            entity.Property(settings => settings.PhoneNumber).HasMaxLength(40).IsRequired();
            entity.Property(settings => settings.Address).HasMaxLength(500).IsRequired();
            entity.Property(settings => settings.OperatingHours).HasMaxLength(1000).IsRequired();
            entity.Property(settings => settings.PickupTimeWindows).HasMaxLength(1000).IsRequired();
            entity.Property(settings => settings.PickupOriginLatitude).HasPrecision(10, 7);
            entity.Property(settings => settings.PickupOriginLongitude).HasPrecision(10, 7);
            entity.Property(settings => settings.PickupServiceRadiusKm).HasPrecision(8, 2).IsRequired();
            entity.Property(settings => settings.CreatedAt).IsRequired();
            entity.Property(settings => settings.UpdatedAt).IsRequired();
        });

        modelBuilder.Entity<LaundryService>(entity =>
        {
            entity.ToTable("LaundryServices");
            entity.HasKey(service => service.Id);

            entity.Property(service => service.Name).HasMaxLength(160).IsRequired();
            entity.Property(service => service.Description).HasMaxLength(500);
            entity.Property(service => service.UnitLabel).HasMaxLength(80).IsRequired();
            entity.Property(service => service.BasePrice).HasPrecision(12, 2).IsRequired();
            entity.Property(service => service.DeliveryFee).HasPrecision(12, 2);
            entity.Property(service => service.CreatedAt).IsRequired();
            entity.Property(service => service.UpdatedAt).IsRequired();

            entity.HasIndex(service => service.Name).IsUnique();
            entity.HasIndex(service => service.IsActive);
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("Customers");
            entity.HasKey(customer => customer.Id);

            entity.Property(customer => customer.FullName).HasMaxLength(160).IsRequired();
            entity.Property(customer => customer.MobileNumber).HasMaxLength(40).IsRequired();
            entity.Property(customer => customer.EmailAddress).HasMaxLength(254);
            entity.Property(customer => customer.CreatedAt).IsRequired();
            entity.Property(customer => customer.UpdatedAt).IsRequired();

            entity.HasIndex(customer => customer.MobileNumber).IsUnique();
        });

        modelBuilder.Entity<LaundryOrder>(entity =>
        {
            entity.ToTable("LaundryOrders");
            entity.HasKey(order => order.Id);

            // Guards settlement: two people confirming the same payment at once can no
            // longer both succeed and both send the customer a receipt.
            entity.Property(order => order.PaymentConcurrencyStamp).IsConcurrencyToken();

            entity.Property(order => order.OrderCode).HasMaxLength(40).IsRequired();
            entity.Property(order => order.TrackingCode).HasMaxLength(80).IsRequired();
            entity.Property(order => order.ReceiptCode).HasMaxLength(80);
            entity.Property(order => order.OnlinePaymentReference).HasMaxLength(120);
            entity.Property(order => order.OnlinePaymentCheckoutUrl).HasMaxLength(500);
            entity.Property(order => order.ServiceName).HasMaxLength(160).IsRequired();
            entity.Property(order => order.UnitLabel).HasMaxLength(80).IsRequired();
            entity.Property(order => order.ContactName).HasMaxLength(160).IsRequired();
            entity.Property(order => order.Address).HasMaxLength(500).IsRequired();
            entity.Property(order => order.PreferredTimeWindow).HasMaxLength(120).IsRequired();
            entity.Property(order => order.AdditionalNotes).HasMaxLength(1000);
            entity.Property(order => order.AdditionalChargeReason).HasMaxLength(500);
            entity.Property(order => order.DiscountReason).HasMaxLength(500);
            entity.Property(order => order.SpecialInstructions).HasMaxLength(1000);
            entity.Property(order => order.PickupFailureReason).HasMaxLength(500);
            entity.Property(order => order.DeliveryFailureReason).HasMaxLength(500);
            entity.Property(order => order.EstimatedServiceAmount).HasPrecision(12, 2).IsRequired();
            entity.Property(order => order.EstimatedDeliveryFee).HasPrecision(12, 2).IsRequired();
            entity.Property(order => order.EstimatedTotalAmount).HasPrecision(12, 2).IsRequired();
            entity.Property(order => order.AdditionalCharge).HasPrecision(12, 2).IsRequired();
            entity.Property(order => order.Discount).HasPrecision(12, 2).IsRequired();
            entity.Property(order => order.CreatedAt).IsRequired();
            entity.Property(order => order.UpdatedAt).IsRequired();

            entity.HasIndex(order => order.OrderCode).IsUnique();
            entity.HasIndex(order => order.TrackingCode).IsUnique();
            entity.HasIndex(order => order.ReceiptCode).IsUnique();
            entity.HasIndex(order => order.OnlinePaymentReference).IsUnique();
            entity.HasIndex(order => order.PaymentStatus);
            entity.HasIndex(order => order.Source);
            entity.HasIndex(order => order.Status);
            entity.HasIndex(order => order.PickupStatus);
            entity.HasIndex(order => order.DeliveryStatus);
            entity.HasIndex(order => order.PreferredDate);
            entity.HasIndex(order => order.CreatedAt);
            entity.HasIndex(order => order.ArchivedAt);

            entity.HasOne(order => order.Customer)
                .WithMany()
                .HasForeignKey(order => order.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(order => order.Service)
                .WithMany()
                .HasForeignKey(order => order.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(order => order.ServiceItems)
                .WithOne(item => item.Order)
                .HasForeignKey(item => item.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Navigation(order => order.ServiceItems)
                .UsePropertyAccessMode(PropertyAccessMode.Field);

            entity.OwnsOne(order => order.PickupLocation, location =>
            {
                location.Property(value => value.FormattedAddress)
                    .HasColumnName("PickupFormattedAddress")
                    .HasMaxLength(500);
                location.Property(value => value.Latitude)
                    .HasColumnName("PickupLatitude")
                    .HasPrecision(10, 7);
                location.Property(value => value.Longitude)
                    .HasColumnName("PickupLongitude")
                    .HasPrecision(10, 7);
                location.Property(value => value.PlaceId)
                    .HasColumnName("PickupPlaceId")
                    .HasMaxLength(200);
                location.Property(value => value.PlusCode)
                    .HasColumnName("PickupPlusCode")
                    .HasMaxLength(100);
                location.Property(value => value.Barangay)
                    .HasColumnName("PickupBarangay")
                    .HasMaxLength(160);
                location.Property(value => value.CityOrMunicipality)
                    .HasColumnName("PickupCityOrMunicipality")
                    .HasMaxLength(160);
                location.Property(value => value.Landmark)
                    .HasColumnName("PickupLandmark")
                    .HasMaxLength(300);
                location.Property(value => value.PickupInstructions)
                    .HasColumnName("PickupInstructions")
                    .HasMaxLength(500);
                location.Property(value => value.LocationSource)
                    .HasColumnName("PickupLocationSource")
                    .HasMaxLength(80);
                location.Property(value => value.LocationConfirmed)
                    .HasColumnName("PickupLocationConfirmed");
                location.Property(value => value.ConfirmedAt)
                    .HasColumnName("PickupLocationConfirmedAt");
            });
        });

        modelBuilder.Entity<OrderServiceItem>(entity =>
        {
            entity.ToTable("OrderServiceItems");
            entity.HasKey(item => item.Id);

            entity.Property(item => item.ServiceName).HasMaxLength(160).IsRequired();
            entity.Property(item => item.UnitLabel).HasMaxLength(80).IsRequired();
            entity.Property(item => item.UnitPrice).HasPrecision(12, 2).IsRequired();
            entity.Property(item => item.Subtotal).HasPrecision(12, 2).IsRequired();

            entity.HasIndex(item => item.OrderId);
            entity.HasIndex(item => item.ServiceId);

            entity.HasOne(item => item.Service)
                .WithMany()
                .HasForeignKey(item => item.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<FinancialTransaction>(entity =>
        {
            entity.ToTable("FinancialTransactions");
            entity.HasKey(transaction => transaction.Id);

            entity.Property(transaction => transaction.Amount).HasPrecision(12, 2).IsRequired();
            entity.Property(transaction => transaction.Note).HasMaxLength(500);
            entity.Property(transaction => transaction.OccurredAt).IsRequired();
            entity.Property(transaction => transaction.CreatedAt).IsRequired();

            entity.HasIndex(transaction => transaction.Kind);
            entity.HasIndex(transaction => transaction.OccurredAt);
        });

        modelBuilder.Entity<NotificationOutboxMessage>(entity =>
        {
            entity.ToTable("NotificationOutbox");
            entity.HasKey(message => message.Id);

            // Guards the claim: two workers reading the same waiting message cannot
            // both save it as theirs, so a customer cannot be sent the same message
            // twice.
            entity.Property(message => message.ConcurrencyStamp).IsConcurrencyToken();

            entity.HasIndex(message => new { message.Status, message.LockedUntil });

            entity.Property(message => message.Recipient).HasMaxLength(254).IsRequired();
            entity.Property(message => message.Subject).HasMaxLength(200);
            entity.Property(message => message.Message).HasMaxLength(1000).IsRequired();
            entity.Property(message => message.LastError).HasMaxLength(1000);
            entity.Property(message => message.CreatedAt).IsRequired();

            entity.HasIndex(message => message.Status);
            entity.HasIndex(message => message.CreatedAt);

            entity.HasOne(message => message.Order)
                .WithMany()
                .HasForeignKey(message => message.OrderId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<StaffUser>(entity =>
        {
            entity.ToTable("StaffUsers");
            entity.HasKey(user => user.Id);

            entity.Property(user => user.FullName).HasMaxLength(160).IsRequired();
            entity.Property(user => user.EmailAddress).HasMaxLength(254).IsRequired();
            entity.Property(user => user.MobileNumber).HasMaxLength(40);
            // Same ceiling as the business logo URL, since both hold an address produced by
            // the media endpoint or pasted in by hand.
            entity.Property(user => user.PhotoUrl).HasMaxLength(500);
            entity.Property(user => user.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(user => user.CreatedAt).IsRequired();
            entity.Property(user => user.UpdatedAt).IsRequired();

            entity.HasIndex(user => user.EmailAddress).IsUnique();
            entity.HasIndex(user => user.MobileNumber).IsUnique();
            entity.HasIndex(user => user.IsActive);
            entity.HasIndex(user => user.IsEmailVerified);
        });

        modelBuilder.Entity<RefreshTokenSession>(entity =>
        {
            entity.ToTable("RefreshTokenSessions");
            entity.HasKey(session => session.Id);

            entity.Property(session => session.TokenHash).HasMaxLength(64).IsRequired();
            entity.Property(session => session.ExpiresAt).IsRequired();
            entity.Property(session => session.CreatedAt).IsRequired();

            entity.HasIndex(session => session.TokenHash).IsUnique();
            entity.HasIndex(session => session.UserId);
            entity.HasIndex(session => session.FamilyId)
                .HasFilter("\"RevokedAt\" IS NULL")
                .IsUnique();
            entity.HasIndex(session => session.ExpiresAt);

            entity.HasOne(session => session.User)
                .WithMany()
                .HasForeignKey(session => session.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AccountActionCode>(entity =>
        {
            entity.ToTable("AccountActionCodes");
            entity.HasKey(code => code.Id);

            entity.Property(code => code.CodeHash).HasMaxLength(500).IsRequired();
            entity.Property(code => code.ExpiresAt).IsRequired();
            entity.Property(code => code.CreatedAt).IsRequired();

            entity.HasIndex(code => code.UserId);
            entity.HasIndex(code => new { code.UserId, code.Purpose, code.ConsumedAt });
            entity.HasIndex(code => code.ExpiresAt);

            entity.HasOne(code => code.User)
                .WithMany()
                .HasForeignKey(code => code.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StaffDevice>(entity =>
        {
            entity.ToTable("StaffDevices");
            entity.HasKey(device => device.Id);

            entity.Property(device => device.RegistrationToken).HasMaxLength(512).IsRequired();
            entity.Property(device => device.DeviceName).HasMaxLength(160);
            entity.Property(device => device.Platform).IsRequired();
            entity.Property(device => device.CreatedAt).IsRequired();
            entity.Property(device => device.LastSeenAt).IsRequired();

            // One row per token. A shared phone signed into by someone else reassigns
            // the existing row, so the shop cannot end up sending two notifications to
            // the same handset.
            entity.HasIndex(device => device.RegistrationToken).IsUnique();
            entity.HasIndex(device => new { device.UserId, device.IsActive });

            entity.HasOne(device => device.User)
                .WithMany()
                .HasForeignKey(device => device.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<StaffInvitation>(entity =>
        {
            entity.ToTable("StaffInvitations");
            entity.HasKey(invitation => invitation.Id);

            entity.Property(invitation => invitation.EmailAddress).HasMaxLength(256).IsRequired();
            entity.Property(invitation => invitation.CodeHash).HasMaxLength(500).IsRequired();
            entity.Property(invitation => invitation.Role).IsRequired();
            entity.Property(invitation => invitation.ExpiresAt).IsRequired();
            entity.Property(invitation => invitation.CreatedAt).IsRequired();

            entity.HasIndex(invitation => invitation.EmailAddress);
            entity.HasIndex(invitation => invitation.ExpiresAt);

            entity.HasOne<StaffUser>()
                .WithMany()
                .HasForeignKey(invitation => invitation.InvitedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ActivityLogEntry>(entity =>
        {
            entity.ToTable("ActivityLogs");
            entity.HasKey(entry => entry.Id);

            entity.Property(entry => entry.Actor).HasMaxLength(120).IsRequired();
            entity.Property(entry => entry.Action).HasMaxLength(120).IsRequired();
            entity.Property(entry => entry.EntityType).HasMaxLength(120).IsRequired();
            entity.Property(entry => entry.Description).HasMaxLength(500).IsRequired();
            entity.Property(entry => entry.CreatedAt).IsRequired();

            entity.HasIndex(entry => entry.Action);
            entity.HasIndex(entry => entry.EntityId);
            entity.HasIndex(entry => entry.CreatedAt);
        });

        modelBuilder.Entity<PendingBooking>(entity =>
        {
            entity.ToTable("PendingBookings");
            entity.HasKey(booking => booking.Id);

            entity.Property(booking => booking.Reference).HasMaxLength(64).IsRequired();
            entity.Property(booking => booking.CheckoutSessionId).HasMaxLength(128);
            entity.Property(booking => booking.CheckoutUrl).HasMaxLength(2048);
            entity.Property(booking => booking.PayloadJson).IsRequired();
            entity.Property(booking => booking.PayloadFingerprint).HasMaxLength(64);
            entity.Property(booking => booking.Amount).HasPrecision(18, 2).IsRequired();
            entity.Property(booking => booking.Currency).HasMaxLength(3).IsRequired();
            entity.Property(booking => booking.PaymentReference).HasMaxLength(128);
            entity.Property(booking => booking.FailureReason).HasMaxLength(500);
            entity.Property(booking => booking.Status)
                .HasConversion<string>()
                .HasMaxLength(32)
                .IsRequired();

            // The reference is public, and the session id is how a provider event
            // finds its booking; both must resolve to exactly one row. The order id
            // is unique so a booking can never be charged into two orders.
            entity.HasIndex(booking => booking.Reference).IsUnique();
            entity.HasIndex(booking => booking.CheckoutSessionId)
                .IsUnique()
                .HasFilter("\"CheckoutSessionId\" IS NOT NULL");
            entity.HasIndex(booking => booking.OrderId)
                .IsUnique()
                .HasFilter("\"OrderId\" IS NOT NULL");
            entity.HasIndex(booking => booking.Status);
            entity.HasIndex(booking => booking.ExpiresAt);
        });
    }
}
