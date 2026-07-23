# Spinner Laundry App — Agent and Documentation Pack v2

This folder contains working rules for AI/Codex agents and project documentation.

## Files

```text
agents/CODEX_AGENT_ROLE.md
docs/BACKEND_ARCHITECTURE_GUIDE.md
docs/API_RESPONSE_HANDLING_GUIDE.md
docs/DEVELOPMENT_RULES.md
docs/ROADMAP_PHASES_UPDATED.md
docs/TESTING_STRATEGY.md
templates/ApiControllerBase_Template.cs
```

## Recommended Local Placement

Copy these into your local project:

```text
C:\dev\Spinner\agents
C:\dev\Spinner\docs
C:\dev\Spinner\templates
```

## Purpose

These files help keep the project consistent while using Codex/agents.

They define:

```text
Architecture direction
Controller + HandleResponse pattern
Backend rules
Frontend/UI theme
Result pattern usage
DDD rules
Payment rules
Notification rules
Do-not-do rules
Implementation roadmap
```

## Current Architecture Decision

```text
Single .NET 10 Web API backend
Controller-based API
Vertical Slice Architecture
Light DDD
MediatR/Sender
Result Pattern
ApiControllerBase.HandleResponse
Global Exception Middleware
EF Core + PostgreSQL
Notification Outbox
QR Code Online Payment webhook/callback
React Web customer app
React Native Expo owner/staff app
```

## Current Product Rule

The app should avoid double work for the owner.

Customers submit booking data once. Owner/staff only confirms and updates important statuses.


---

## `docs/TESTING_STRATEGY.md`

### Purpose

Defines how the `Spinner.Test` xUnit project should be organized and what kinds of tests matter most.

### Current test project

```text
Spinner.Test
```

### Use this when

The agent is adding backend features, business rules, payment logic, receipt logic, status transitions, reports, or API response handling.

### Covers

```text
xUnit test project structure
Domain unit tests
Feature/handler tests
API response handling tests
Integration tests later
High-priority test cases
Testing roadmap
Agent rules for adding tests
```

### Important instruction

Any feature that changes order status, payment, receipt, notification, or report behavior should include or update tests.
