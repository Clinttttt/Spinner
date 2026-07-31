<#
.SYNOPSIS
    One-time bootstrap for the staging API deployment pipeline.

.DESCRIPTION
    Creates everything the GitHub Actions workflow needs and nothing it does not:

      1. An Entra ID application + service principal used only by CI.
      2. Federated (OIDC) credentials, so GitHub authenticates without any
         long-lived Azure client secret.
      3. A Contributor role assignment scoped to the staging resource group.
      4. A Container Apps Job that applies EF Core migrations from inside the
         Container Apps environment, which keeps PostgreSQL closed to public IPs.
      5. The three GitHub repository secrets the workflow reads.

    Safe to re-run: every step checks for an existing resource first.

.PARAMETER WhatIf
    Report what would change without touching Azure or GitHub.

.EXAMPLE
    pwsh scripts/setup-cicd-azure.ps1 -WhatIf
    pwsh scripts/setup-cicd-azure.ps1
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$ResourceGroup = 'spinner-staging-rg',
    [string]$ContainerApp = 'spinner-api-stg',
    [string]$ContainerAppEnvironment = 'spinner-stg-env',
    [string]$MigrationJob = 'spinner-api-migrate',
    [string]$Registry = 'spinnerstga4d4bd',
    [string]$ImageRepository = 'spinner-api',
    [string]$GitHubRepository = 'Clinttttt/Spinner',
    [string]$DeployBranch = 'master',
    [string]$GitHubEnvironment = 'staging',
    [string]$AppRegistrationName = 'spinner-github-actions-staging'
)

$ErrorActionPreference = 'Stop'

function Write-Step { param([string]$Text) Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Ok { param([string]$Text) Write-Host "    $Text" -ForegroundColor Green }
function Write-Skip { param([string]$Text) Write-Host "    $Text" -ForegroundColor DarkGray }

function Assert-Tool {
    param([string]$Name, [string]$Hint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is required. $Hint"
    }
}

<#
    Runs az and returns trimmed stdout, or $null when the command fails.
    Existence probes are expected to fail for resources that do not exist yet,
    and native stderr would otherwise terminate the script.
#>
function Invoke-AzQuiet {
    param([Parameter(Mandatory)][string[]]$Arguments)

    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & az @Arguments 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }
        $text = ($output | Out-String).Trim()
        if ([string]::IsNullOrWhiteSpace($text)) { return $null }
        return $text
    }
    finally {
        $ErrorActionPreference = $previous
    }
}

Assert-Tool -Name az -Hint 'Install the Azure CLI.'
Assert-Tool -Name gh -Hint 'Install the GitHub CLI and run: gh auth login'

Write-Step 'Checking sign-in state'
$account = az account show -o json | ConvertFrom-Json
$subscriptionId = $account.id
$tenantId = $account.tenantId
Write-Ok "Azure subscription: $($account.name) ($subscriptionId)"

$previousPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
gh auth status 2>&1 | Out-Null
$ghAuthenticated = $LASTEXITCODE -eq 0
$ErrorActionPreference = $previousPreference
if (-not $ghAuthenticated) { throw 'GitHub CLI is not authenticated. Run: gh auth login' }
Write-Ok "GitHub repository: $GitHubRepository"

# ---------------------------------------------------------------------------
# 1. Entra ID application + service principal
# ---------------------------------------------------------------------------
Write-Step 'Entra ID application for GitHub Actions'
$appId = Invoke-AzQuiet @('ad', 'app', 'list', '--display-name', $AppRegistrationName, '--query', '[0].appId', '-o', 'tsv')

if ([string]::IsNullOrWhiteSpace($appId)) {
    if ($PSCmdlet.ShouldProcess($AppRegistrationName, 'Create Entra ID application')) {
        $appId = az ad app create --display-name $AppRegistrationName --query appId -o tsv
        Write-Ok "Created application $appId"
    }
    else {
        Write-Skip 'Would create the application.'
    }
}
else {
    Write-Skip "Application already exists: $appId"
}

if ($appId) {
    $spId = Invoke-AzQuiet @('ad', 'sp', 'list', '--filter', "appId eq '$appId'", '--query', '[0].id', '-o', 'tsv')
    if ([string]::IsNullOrWhiteSpace($spId)) {
        if ($PSCmdlet.ShouldProcess($appId, 'Create service principal')) {
            az ad sp create --id $appId --output none
            Write-Ok 'Created service principal.'
        }
    }
    else {
        Write-Skip 'Service principal already exists.'
    }
}

# ---------------------------------------------------------------------------
# 2. Federated credentials (no client secret ever stored)
# ---------------------------------------------------------------------------
Write-Step 'Federated credentials'
$credentials = @(
    @{
        name    = "github-$GitHubEnvironment"
        subject = "repo:${GitHubRepository}:environment:$GitHubEnvironment"
    },
    @{
        name    = "github-branch-$DeployBranch"
        subject = "repo:${GitHubRepository}:ref:refs/heads/$DeployBranch"
    }
)

if ($appId) {
    $existing = Invoke-AzQuiet @('ad', 'app', 'federated-credential', 'list', '--id', $appId, '--query', '[].name', '-o', 'tsv')
    # tsv output arrives with CRLF separators; trim each name before comparing.
    $existingNames = @()
    if ($existing) {
        $existingNames = $existing -split "`r?`n" | ForEach-Object { $_.Trim() } |
            Where-Object { $_ }
    }

    foreach ($credential in $credentials) {
        if ($existingNames -contains $credential.name) {
            Write-Skip "$($credential.name) already exists."
            continue
        }

        if ($PSCmdlet.ShouldProcess($credential.subject, 'Add federated credential')) {
            $parameters = @{
                name        = $credential.name
                issuer      = 'https://token.actions.githubusercontent.com'
                subject     = $credential.subject
                description = 'Spinner staging API deployment'
                audiences   = @('api://AzureADTokenExchange')
            } | ConvertTo-Json -Compress

            $temp = New-TemporaryFile
            try {
                Set-Content -Path $temp -Value $parameters -Encoding utf8
                az ad app federated-credential create --id $appId --parameters "@$temp" --output none
                Write-Ok "Added $($credential.name) for $($credential.subject)"
            }
            finally {
                Remove-Item $temp -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# ---------------------------------------------------------------------------
# 3. Role assignment, scoped to the staging resource group only
# ---------------------------------------------------------------------------
Write-Step 'Role assignment'
$scope = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup"

if ($appId) {
    $assigned = Invoke-AzQuiet @(
        'role', 'assignment', 'list', '--assignee', $appId, '--scope', $scope,
        '--query', "[?roleDefinitionName=='Contributor'] | length(@)", '-o', 'tsv')

    if ($assigned -ne '0' -and -not [string]::IsNullOrWhiteSpace($assigned)) {
        Write-Skip 'Contributor already assigned on the resource group.'
    }
    else {
        if ($PSCmdlet.ShouldProcess($scope, 'Assign Contributor')) {
            # Contributor is required because `az acr build` queues a registry
            # task and the workflow updates the container app and migration job.
            # The scope is a single-purpose resource group, not the subscription.
            az role assignment create --assignee $appId --role Contributor --scope $scope --output none
            Write-Ok "Granted Contributor on $ResourceGroup"
        }
    }
}

# ---------------------------------------------------------------------------
# 4. Migration job
# ---------------------------------------------------------------------------
Write-Step 'Database migration job'
$jobExists = Invoke-AzQuiet @(
    'containerapp', 'job', 'show', '--name', $MigrationJob,
    '--resource-group', $ResourceGroup, '--query', 'name', '-o', 'tsv')

if ([string]::IsNullOrWhiteSpace($jobExists)) {
    $currentImage = az containerapp show --name $ContainerApp --resource-group $ResourceGroup `
        --query "properties.template.containers[0].image" -o tsv

    if ($PSCmdlet.ShouldProcess($MigrationJob, 'Create Container Apps job')) {
        # A job's own system-assigned identity does not exist until the job is
        # created, so it cannot hold AcrPull at creation time and the first image
        # pull fails. A user-assigned identity breaks that circular dependency:
        # create it, grant AcrPull, then create a job that can already pull.
        $identityName = "$MigrationJob-id"
        $identityId = Invoke-AzQuiet @(
            'identity', 'show', '--name', $identityName,
            '--resource-group', $ResourceGroup, '--query', 'id', '-o', 'tsv')

        if ([string]::IsNullOrWhiteSpace($identityId)) {
            az identity create --name $identityName --resource-group $ResourceGroup --output none
            if ($LASTEXITCODE -ne 0) { throw "Failed to create managed identity $identityName." }
            Write-Ok "Created managed identity $identityName"
            $identityId = az identity show --name $identityName --resource-group $ResourceGroup `
                --query id -o tsv
        }
        else {
            Write-Skip "Managed identity already exists: $identityName"
        }

        $identityPrincipalId = az identity show --name $identityName `
            --resource-group $ResourceGroup --query principalId -o tsv
        $registryId = az acr show --name $Registry --resource-group $ResourceGroup --query id -o tsv

        $pullAssigned = Invoke-AzQuiet @(
            'role', 'assignment', 'list', '--assignee', $identityPrincipalId, '--scope', $registryId,
            '--query', "[?roleDefinitionName=='AcrPull'] | length(@)", '-o', 'tsv')

        if ($pullAssigned -eq '0' -or [string]::IsNullOrWhiteSpace($pullAssigned)) {
            az role assignment create --assignee-object-id $identityPrincipalId `
                --assignee-principal-type ServicePrincipal `
                --role AcrPull --scope $registryId --output none
            if ($LASTEXITCODE -ne 0) { throw 'Failed to grant AcrPull to the migration identity.' }
            Write-Ok 'Granted AcrPull on the registry.'
            Write-Host '    Waiting 45s for role propagation...' -ForegroundColor DarkGray
            Start-Sleep -Seconds 45
        }
        else {
            Write-Skip 'AcrPull already granted.'
        }

        # Reuse the API's own connection string. The job needs no other secret,
        # because migrations run before configuration validation.
        $connection = az containerapp secret show --name $ContainerApp `
            --resource-group $ResourceGroup --secret-name db-connection --query value -o tsv

        if ([string]::IsNullOrWhiteSpace($connection)) {
            throw "Could not read the db-connection secret from $ContainerApp."
        }

        # The image entrypoint is left alone. Migrations are triggered by
        # SPINNER_RUN_MIGRATIONS rather than a "--migrate" argument, because the
        # Azure CLI parses argument values beginning with "--" as flags.
        az containerapp job create `
            --name $MigrationJob `
            --resource-group $ResourceGroup `
            --environment $ContainerAppEnvironment `
            --trigger-type Manual `
            --replica-timeout 900 `
            --replica-retry-limit 0 `
            --parallelism 1 `
            --replica-completion-count 1 `
            --image $currentImage `
            --cpu 0.5 --memory 1Gi `
            --registry-server "$Registry.azurecr.io" `
            --registry-identity $identityId `
            --mi-user-assigned $identityId `
            --secrets "db-connection=$connection" `
            --env-vars "ConnectionStrings__DefaultConnection=secretref:db-connection" "SPINNER_RUN_MIGRATIONS=true" `
            --output none

        if ($LASTEXITCODE -ne 0) { throw "Failed to create the $MigrationJob job." }

        Write-Ok "Created job $MigrationJob"
    }
}
else {
    Write-Skip "Job already exists: $jobExists"
}

# ---------------------------------------------------------------------------
# 5. GitHub secrets
# ---------------------------------------------------------------------------
Write-Step 'GitHub repository secrets'
$secrets = @{
    AZURE_CLIENT_ID       = $appId
    AZURE_TENANT_ID       = $tenantId
    AZURE_SUBSCRIPTION_ID = $subscriptionId
}

foreach ($entry in $secrets.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace($entry.Value)) {
        Write-Skip "$($entry.Key) not available yet (dry run)."
        continue
    }

    if ($PSCmdlet.ShouldProcess($entry.Key, 'Set GitHub secret')) {
        # `--body -` does NOT read stdin; it stores the literal string "-".
        # The value must be passed directly.
        gh secret set $entry.Key --repo $GitHubRepository --body $entry.Value
        if ($LASTEXITCODE -ne 0) { throw "Failed to set GitHub secret $($entry.Key)." }
        Write-Ok "Set $($entry.Key)"
    }
}

Write-Step 'Done'
Write-Host @"
    Remaining manual step:
      Create the '$GitHubEnvironment' environment in GitHub
      (Settings -> Environments) if you want an approval gate before deploys.
      The federated credential already expects that environment name.

    Then push a backend change, or run the workflow manually:
      gh workflow run deploy-staging-api.yml --repo $GitHubRepository
"@ -ForegroundColor Green
