# Spinner Project Agent Instructions

Before making changes, read:

1. README.md
2. agents/CODEX_AGENT_ROLE.md or agents/FRONTEND_AGENT_ROLE.md
3. docs/DEVELOPMENT_RULES.md
4. docs/ROADMAP_PHASES_UPDATED.md
5. docs/BACKEND_ARCHITECTURE_GUIDE.md for backend work
6. docs/API_RESPONSE_HANDLING_GUIDE.md for controller/API work
7. docs/TESTING_STRATEGY.md for backend tests
8. docs/FULL_DOCS.md for product flow and UI intent

## Architecture

Use:

```text
Single .NET 10 Web API backend
Controller-based API
Vertical Slice Architecture
Light DDD
Result Pattern
ApiControllerBase.HandleResponse
Global Exception Middleware
EF Core + PostgreSQL
Notification Outbox
QR online payment webhook/callback
React Web customer app
React Native Expo owner/staff app
xUnit test project
```

## Controller Rule

Controllers must stay thin:

```csharp
var result = await Sender.Send(command, ct);
return HandleResponse(result);
```

Do not put business logic inside controllers.

## Test Rule

The backend solution includes:

```text
Spinner.Test
```

Add or update tests when changing:

```text
Order status transitions
Payment rules
Receipt generation
Notification outbox
Daily reports
Result Pattern
HandleResponse mapping
```

Do not skip tests for payment and order status behavior.

## Product Rules

Use the simplified order status flow:

```text
Booking Received → Confirmed → Picked Up → Being Processed → Ready for Delivery → Completed
```

Do not force Washing/Drying/Folding as required MVP statuses.

## Payment Rules

COD / Pay on Claim can be manually marked paid.

QR Code Online Payment must be marked paid only through verified webhook/callback, not manual staff action.

## Do Not Build First

Do not build microservices, full customer mobile app, dedicated rider app, marketplace, AI chatbot, route optimization, inventory, machine IoT, loyalty, multi-branch, or full Messenger automation unless explicitly requested.

## After Every Task

Report:

```text
What changed
Files changed
How to test
Known limitations
Next recommended step
```


UI reference images are located in:

assets/ui-reference

These images are design references only. The current implemented UI is the source of truth for colors,
spacing, typography, and cross-screen consistency. Use `docs/FULL_DOCS.md` for product intent and the
reference images for layout intent without replacing established UI conventions.
