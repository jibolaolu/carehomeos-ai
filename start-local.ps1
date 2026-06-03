param(
    [switch]$StartInfrastructure,
    [switch]$StartBackend,
    [switch]$StartDashboard,
    [switch]$StartMobile,
    [switch]$StartFamilyApp
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $root ".env"
$envExample = Join-Path $root ".env.example"
$backendPath = Join-Path $root "backend"
$dashboardPath = Join-Path $root "dashboard"
$dashboardCachePath = Join-Path $dashboardPath ".cache"
$dashboardSwcPath = Join-Path $dashboardCachePath "next-swc"
$mobilePath = Join-Path $root "mobile"
$familyAppPath = Join-Path $root "family-app"
$venvPath = Join-Path $backendPath "venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"
$requirementsPath = Join-Path $backendPath "requirements.txt"
$requirementsStamp = Join-Path $venvPath ".requirements.sha256"

if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
}

function Import-DotEnv {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $equalsIndex = $line.IndexOf("=")
        if ($equalsIndex -lt 1) {
            return
        }

        $name = $line.Substring(0, $equalsIndex).Trim()
        $value = $line.Substring($equalsIndex + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

Import-DotEnv -Path $envFile

$apiPort = if ($env:CAREHOMEOS_API_PORT) { $env:CAREHOMEOS_API_PORT } else { "8105" }
$dashboardPort = if ($env:CAREHOMEOS_DASHBOARD_PORT) { $env:CAREHOMEOS_DASHBOARD_PORT } else { "3105" }
$mobileWebPort = if ($env:CAREHOMEOS_MOBILE_WEB_PORT) { $env:CAREHOMEOS_MOBILE_WEB_PORT } else { "19015" }
$familyWebPort = if ($env:CAREHOMEOS_FAMILY_WEB_PORT) { $env:CAREHOMEOS_FAMILY_WEB_PORT } else { "19016" }
$dashboardApiUrl = if ($env:NEXT_PUBLIC_API_BASE_URL) { $env:NEXT_PUBLIC_API_BASE_URL } else { "https://carehomeos-api.localtest.me/api/v1" }
$expoApiUrl = if ($env:EXPO_PUBLIC_API_URL) { $env:EXPO_PUBLIC_API_URL } else { "https://carehomeos-api.localtest.me" }

if (-not ($StartInfrastructure -or $StartBackend -or $StartDashboard)) {
    $StartInfrastructure = $true
    $StartBackend = $true
    $StartDashboard = $true
}

function Get-RequirementsFingerprint {
    if (Get-Command Get-FileHash -ErrorAction SilentlyContinue) {
        return (Get-FileHash -LiteralPath $requirementsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    }

    return (Get-Item -LiteralPath $requirementsPath).Length.ToString()
}

function Ensure-BackendVenv {
    if (-not (Test-Path $venvPython)) {
        Write-Host "Creating backend virtual environment..."
        if (Test-Path $venvPath) {
            Remove-Item -LiteralPath $venvPath -Recurse -Force
        }
        & python -m venv $venvPath
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create backend virtual environment."
        }
    }

    $currentFingerprint = Get-RequirementsFingerprint
    $installedFingerprint = if (Test-Path $requirementsStamp) { Get-Content -LiteralPath $requirementsStamp -Raw } else { "" }
    if ($installedFingerprint.Trim() -eq $currentFingerprint) {
        Write-Host "Backend dependencies already installed."
        return
    }

    Write-Host "Installing backend dependencies..."
    & $venvPython -m pip install --upgrade pip --retries 2 --timeout 20
    if ($LASTEXITCODE -ne 0) {
        throw "pip could not reach PyPI. Check internet/DNS, then rerun start-local.ps1."
    }

    & $venvPython -m pip install -r $requirementsPath --prefer-binary --retries 2 --timeout 30
    if ($LASTEXITCODE -ne 0) {
        throw "Backend dependency install failed. If this mentions name resolution, fix internet/DNS and rerun start-local.ps1."
    }

    Set-Content -LiteralPath $requirementsStamp -Value $currentFingerprint
}

if ($StartInfrastructure) {
    Write-Host "Starting Docker infrastructure..."
    Push-Location $root
    try {
        & docker compose up -d
    }
    finally {
        Pop-Location
    }
}

if ($StartBackend) {
    Ensure-BackendVenv
    Write-Host "Starting backend in a new PowerShell window..."
    Start-Process powershell -ArgumentList @(
        '-NoExit',
        '-Command',
        "Set-Location '$backendPath'; `$env:APP_PORT='$apiPort'; & '$venvPython' -m uvicorn app.main:app --reload --host 0.0.0.0 --port $apiPort"
    )
}

if ($StartDashboard) {
    $packageJson = Join-Path $dashboardPath "package.json"
    if (-not (Test-Path $packageJson)) {
        Write-Host "Dashboard package.json not found."
    }
    else {
        if (-not (Test-Path $dashboardSwcPath)) {
            New-Item -ItemType Directory -Path $dashboardSwcPath -Force | Out-Null
        }
        $dashboardDevLock = Join-Path $dashboardPath ".next\dev\lock"
        if (Test-Path $dashboardDevLock) {
            Remove-Item -LiteralPath $dashboardDevLock -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Starting dashboard in a new PowerShell window..."
        Start-Process powershell -ArgumentList @(
            '-NoExit',
            '-Command',
            "Set-Location '$dashboardPath'; `$env:NEXT_DIST_DIR='.next-dev'; `$env:NEXT_SWC_PATH='$dashboardSwcPath'; `$env:XDG_CACHE_HOME='$dashboardCachePath'; `$env:PORT='$dashboardPort'; `$env:NEXT_PUBLIC_API_BASE_URL='$dashboardApiUrl'; `$env:PUBLIC_DASHBOARD_URL='https://carehomeos.localtest.me'; `$env:NEXT_PUBLIC_DASHBOARD_URL='https://carehomeos.localtest.me'; npm run dev -- --webpack -p $dashboardPort"
        )
    }
}

if ($StartMobile) {
    $packageJson = Join-Path $mobilePath "package.json"
    if (-not (Test-Path $packageJson)) {
        Write-Host "Mobile package.json not found."
    }
    else {
        Write-Host "Starting staff mobile web preview in a new PowerShell window..."
        Start-Process powershell -ArgumentList @(
            '-NoExit',
            '-Command',
            "Set-Location '$mobilePath'; `$env:EXPO_PUBLIC_API_URL='$expoApiUrl'; `$env:EXPO_PUBLIC_API_BASE_URL='$expoApiUrl/api/v1'; npx expo start --web --port $mobileWebPort"
        )
    }
}

if ($StartFamilyApp) {
    $packageJson = Join-Path $familyAppPath "package.json"
    if (-not (Test-Path $packageJson)) {
        Write-Host "Family app package.json not found."
    }
    else {
        Write-Host "Starting family app web preview in a new PowerShell window..."
        Start-Process powershell -ArgumentList @(
            '-NoExit',
            '-Command',
            "Set-Location '$familyAppPath'; `$env:EXPO_PUBLIC_API_URL='$expoApiUrl'; `$env:EXPO_PUBLIC_API_BASE_URL='$expoApiUrl/api/v1'; npx expo start --web --port $familyWebPort"
        )
    }
}

Write-Host "Done."
