[CmdletBinding()]
param(
    [string]$ApiOrigin =
        "https://spinner-api-stg.blueisland-43b2f2d0.southeastasia.azurecontainerapps.io",
    [string]$WebOrigin =
        "https://spinner-customer-staging.vercel.app"
)

$ErrorActionPreference = "Stop"

function Get-RequiredResponse {
    param(
        [Parameter(Mandatory)]
        [string]$Label,
        [Parameter(Mandatory)]
        [string]$Uri
    )

    Write-Host "Checking $Label..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -ne 200) {
        throw "$Label returned HTTP $($response.StatusCode)."
    }

    Write-Host "$Label is healthy." -ForegroundColor Green
    return $response
}

$api = $ApiOrigin.TrimEnd("/")
$web = $WebOrigin.TrimEnd("/")

Get-RequiredResponse -Label "API liveness" -Uri "$api/health" | Out-Null
Get-RequiredResponse -Label "API readiness" -Uri "$api/health/ready" | Out-Null
Get-RequiredResponse -Label "customer web" -Uri $web | Out-Null
$runtimeConfig = Get-RequiredResponse `
    -Label "customer web runtime configuration" `
    -Uri "$web/runtime-config.js"

if ($runtimeConfig.Content -notmatch [regex]::Escape($api)) {
    throw "The customer web runtime configuration does not target $api."
}

Write-Host "`nStaging public smoke verification passed." -ForegroundColor Green
