using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Spinner.Api.Common.Configuration;
using Spinner.Api.Common.Middleware;
using Spinner.Api.Common.Security;
using Spinner.Api.Common.Validation;
using Spinner.Api.Database;
using Spinner.Api.Database.Seeders;
using Spinner.Api.Features.Notifications.ProcessNotificationOutbox;
using Spinner.Api.Integrations.Notifications;
using Spinner.Api.Integrations.OnlinePayments;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

StartupConfigurationValidator.Validate(builder.Configuration, builder.Environment);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy
            .WithOrigins(
                "http://localhost:4200",
                "https://localhost:4200",
                "http://127.0.0.1:4200",
                "https://127.0.0.1:4200")
            .AllowAnyHeader()
            .AllowAnyMethod());
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
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IRefreshTokenService, RefreshTokenService>();
builder.Services.AddScoped<OwnerAccountSeeder>();
builder.Services.AddScoped<LaundryServiceSeeder>();
builder.Services.Configure<NotificationOutboxOptions>(
    builder.Configuration.GetSection(NotificationOutboxOptions.SectionName));
builder.Services.AddScoped<NotificationOutboxProcessor>();
builder.Services.AddScoped<INotificationSender, LoggingNotificationSender>();
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
app.MapGet("/health/ready", async (AppDbContext dbContext, CancellationToken ct) =>
{
    var canConnect = await dbContext.Database.CanConnectAsync(ct);

    return canConnect
        ? Results.Ok(new { status = "ready" })
        : Results.Problem(
            title: "Database is not reachable.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
})
.AllowAnonymous();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<OwnerAccountSeeder>().SeedAsync();
    await scope.ServiceProvider.GetRequiredService<LaundryServiceSeeder>().SeedAsync();
}

app.Run();

public partial class Program;
