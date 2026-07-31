using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Spinner.Api.Common.Configuration;
using Spinner.Api.Common.Health;
using Spinner.Api.Common.Middleware;
using Spinner.Api.Common.Security;
using Spinner.Api.Common.Time;
using Spinner.Api.Common.Validation;
using Spinner.Api.Database;
using Spinner.Api.Database.Seeders;
using Spinner.Api.Features.Notifications.ProcessNotificationOutbox;
using Spinner.Api.Features.ServiceArea;
using Spinner.Api.Integrations.Notifications;
using Spinner.Api.Integrations.OnlinePayments;
using System.Text;
using System.Text.Json.Serialization;

// A migration run must not require the API's runtime secrets, so it happens
// before the web host (and its configuration validation) is built.
if (DatabaseMigrationRunner.IsRequested(args))
{
    await DatabaseMigrationRunner.RunAsync(args);
    return;
}

var builder = WebApplication.CreateBuilder(args);

StartupConfigurationValidator.Validate(builder.Configuration, builder.Environment);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var configuredOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];
var developmentOrigins = new[]
{
    "http://localhost:4200",
    "https://localhost:4200",
    "http://127.0.0.1:4200",
    "https://127.0.0.1:4200"
};
var allowedOrigins = (builder.Environment.IsDevelopment()
        ? configuredOrigins.Concat(developmentOrigins)
        : configuredOrigins)
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        if (allowedOrigins.Length > 0)
            policy.WithOrigins(allowedOrigins);

        policy.AllowAnyHeader().AllowAnyMethod();
    });
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing.")))
        };
    });
builder.Services.AddMediatR(configuration =>
    configuration.RegisterServicesFromAssembly(typeof(Program).Assembly));
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();
builder.Services.Configure<BusinessTimeOptions>(
    builder.Configuration.GetSection(BusinessTimeOptions.SectionName));
builder.Services.AddSingleton<IBusinessClock, BusinessClock>();
builder.Services.AddScoped<IServiceAreaPolicyProvider, BusinessSettingsServiceAreaPolicyProvider>();
builder.Services.AddSingleton<IAccountCodeGenerator, AccountCodeGenerator>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IRefreshTokenService, RefreshTokenService>();
builder.Services.AddScoped<OwnerAccountSeeder>();
builder.Services.AddScoped<LaundryServiceSeeder>();
builder.Services.AddScoped<IDatabaseReadinessProbe, DatabaseReadinessProbe>();
builder.Services.Configure<NotificationOutboxOptions>(
    builder.Configuration.GetSection(NotificationOutboxOptions.SectionName));
builder.Services.Configure<NotificationDeliveryOptions>(
    builder.Configuration.GetSection(NotificationDeliveryOptions.SectionName));
builder.Services.Configure<ResendOptions>(
    builder.Configuration.GetSection(ResendOptions.SectionName));
builder.Services.Configure<AccountSecurityOptions>(
    builder.Configuration.GetSection(AccountSecurityOptions.SectionName));
builder.Services.AddScoped<NotificationOutboxProcessor>();
builder.Services.AddScoped<LoggingNotificationSender>();
builder.Services.AddHttpClient<IEmailNotificationSender, ResendNotificationSender>(
    (serviceProvider, httpClient) =>
    {
        var options = serviceProvider.GetRequiredService<
            Microsoft.Extensions.Options.IOptions<ResendOptions>>().Value;
        httpClient.BaseAddress = new Uri(options.BaseUrl);
        httpClient.Timeout = TimeSpan.FromSeconds(15);
    });
builder.Services.AddScoped<INotificationSender, NotificationSenderRouter>();
builder.Services.AddHostedService<NotificationOutboxWorker>();
builder.Services.Configure<OnlinePaymentOptions>(
    builder.Configuration.GetSection(OnlinePaymentOptions.SectionName));
builder.Services.AddScoped<OnlinePaymentSignatureVerifier>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");
app.MapGet("/health/ready", async (
    IDatabaseReadinessProbe readinessProbe,
    CancellationToken ct) =>
{
    var readiness = await readinessProbe.CheckAsync(ct);

    return readiness.IsReady
        ? Results.Ok(new { status = "ready" })
        : Results.Problem(
            title: readiness.CanConnect
                ? "Database migrations are pending."
                : "Database is not reachable.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
})
.AllowAnonymous();

if (builder.Configuration.GetValue<bool>("SeedData:EnableDevelopmentDefaults"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<OwnerAccountSeeder>().SeedAsync();
    await scope.ServiceProvider.GetRequiredService<LaundryServiceSeeder>().SeedAsync();
}

app.Run();

public partial class Program;
