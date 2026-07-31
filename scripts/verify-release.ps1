[CmdletBinding()]
param(
    [switch]$SkipMobile,
    [switch]$SkipContainer
)

$ErrorActionPreference = "Stop"
$workspace = Split-Path -Parent $PSScriptRoot

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory)]
        [string]$Label,
        [Parameter(Mandatory)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory)]
        [string]$Command,
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    Write-Host "`n==> $Label" -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        & $Command @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Label failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

$backend = Join-Path $workspace "repo\backend\Spinner.Api"
$web = Join-Path $workspace "repo\frontend\spinner-web"
$mobile = Join-Path $workspace "repo\frontend\owner-mobile"

Invoke-CheckedCommand -Label "Restore backend" -WorkingDirectory $backend `
    -Command "dotnet" -Arguments @("restore", "Spinner.Api.slnx")
Invoke-CheckedCommand -Label "Build backend" -WorkingDirectory $backend `
    -Command "dotnet" -Arguments @(
        "build", "Spinner.Api.slnx", "--configuration", "Release", "--no-restore"
    )
Invoke-CheckedCommand -Label "Test backend" -WorkingDirectory $backend `
    -Command "dotnet" -Arguments @(
        "test", "Spinner.Api.slnx", "--configuration", "Release",
        "--no-build", "--no-restore"
    )

Invoke-CheckedCommand -Label "Build customer web" -WorkingDirectory $web `
    -Command "npm.cmd" -Arguments @("run", "build")
Invoke-CheckedCommand -Label "Test customer web" -WorkingDirectory $web `
    -Command "npm.cmd" -Arguments @("test", "--", "--watch=false")

if (-not $SkipMobile) {
    Invoke-CheckedCommand -Label "Type-check owner mobile" -WorkingDirectory $mobile `
        -Command "npm.cmd" -Arguments @("run", "typecheck")
    Invoke-CheckedCommand -Label "Lint owner mobile" -WorkingDirectory $mobile `
        -Command "npm.cmd" -Arguments @("run", "lint")
    Invoke-CheckedCommand -Label "Check owner mobile formatting" -WorkingDirectory $mobile `
        -Command "npm.cmd" -Arguments @("run", "format:check")
    Invoke-CheckedCommand -Label "Validate Expo dependencies" -WorkingDirectory $mobile `
        -Command "npx.cmd" -Arguments @("expo-doctor")
}

if (-not $SkipContainer) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker is required for the container release gate. Re-run with -SkipContainer only for a local code-only check."
    }

    Invoke-CheckedCommand -Label "Build production API container" -WorkingDirectory $backend `
        -Command "docker" -Arguments @(
            "build", "--file", "Spinner.Api/Dockerfile",
            "--tag", "spinner-api:release", "."
        )
}

Write-Host "`nRelease verification passed." -ForegroundColor Green
