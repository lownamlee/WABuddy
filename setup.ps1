#Requires -Version 7.0
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 or newer is required.' }
    }
    & ./.venv/Scripts/python.exe -m pip install -r requirements.lock.txt --disable-pip-version-check
    if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
    & ./.venv/Scripts/python.exe -m pip install -e '.[dev]' --disable-pip-version-check
    if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
    npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
    Write-Host 'WABuddy is ready. Run ./start-wabuddy.ps1.'
} finally { Pop-Location }
