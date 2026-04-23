param(
    [ValidateSet("web", "android", "ios", "start")]
    [string]$Target = "web",
    [int]$Port = 19015,
    [string]$ApiUrl = "https://carehomeos-api.localtest.me",
    [switch]$Install
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $root ".env"
$mobilePath = Join-Path $root "mobile"
$packageJson = Join-Path $mobilePath "package.json"
$nodeModules = Join-Path $mobilePath "node_modules"

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

if ($PSBoundParameters.ContainsKey("ApiUrl") -eq $false -and $env:EXPO_PUBLIC_API_URL) {
    $ApiUrl = $env:EXPO_PUBLIC_API_URL
}

if ($PSBoundParameters.ContainsKey("Port") -eq $false -and $env:CAREHOMEOS_MOBILE_WEB_PORT) {
    $Port = [int]$env:CAREHOMEOS_MOBILE_WEB_PORT
}

if (-not (Test-Path -LiteralPath $packageJson)) {
    throw "Mobile package.json not found at $packageJson"
}

if ($Install -or -not (Test-Path -LiteralPath $nodeModules)) {
    Write-Host "[mobile] Installing npm dependencies..."
    Push-Location $mobilePath
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed for the staff mobile app."
        }
    }
    finally {
        Pop-Location
    }
}

$expoCommand = switch ($Target) {
    "web" { "npx expo start --web --port $Port" }
    "android" { "npx expo start --android --port $Port" }
    "ios" { "npx expo start --ios --port $Port" }
    default { "npx expo start --port $Port" }
}

Write-Host "[mobile] Starting CareHomeOS staff mobile app ($Target) on port $Port..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$mobilePath'; `$env:EXPO_PUBLIC_API_URL='$ApiUrl'; `$env:EXPO_PUBLIC_API_BASE_URL='$ApiUrl/api/v1'; $expoCommand"
)

Write-Host "[mobile] Done. API URL: $ApiUrl"
