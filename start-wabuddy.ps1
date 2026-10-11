#Requires -Version 7.0
param([switch]$NoBrowser, [switch]$NoSupervisor)
$ErrorActionPreference = 'Stop'
$appUrl = 'http://127.0.0.1:8787'
$startMutex = [System.Threading.Mutex]::new($false, 'Local\WABuddyServerStart')
$startOwned = $false
try { $startOwned = $startMutex.WaitOne(30000) } catch [System.Threading.AbandonedMutexException] { $startOwned = $true }
if (-not $startOwned) { $startMutex.Dispose(); throw 'Another WABuddy start is still in progress.' }
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Force '.local/service' | Out-Null
    if (-not $NoSupervisor) {
        Remove-Item -LiteralPath '.local/service/watchdog-stop' -Force -ErrorAction SilentlyContinue
    }
    if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe') -or
        -not (Test-Path -LiteralPath 'frontend/dist/phone-animation.html')) {
        & ./setup.ps1
    }
    $health = $null
    try { $health = Invoke-RestMethod "$appUrl/healthz" -TimeoutSec 2 } catch {}
    if ($health -and ($health.service -ne 'wabuddy' -or $health.version -ne '0.2.0')) {
        throw 'Port 8787 is in use by another application. Stop it before starting WABuddy.'
    }
    if (-not $health) {
        # A slow startup must not launch a second connector over the same session.
        $recorded = Get-Content -LiteralPath '.local/service/pid' -ErrorAction SilentlyContinue
        $existing = if ($recorded) { Get-Process -Id ([int]$recorded) -ErrorAction SilentlyContinue }
        if ($existing -and $existing.Path -eq (Resolve-Path '.venv/Scripts/python.exe').Path) {
            throw 'WABuddy is still starting or shutting down. The watchdog will check again.'
        }
        New-Item -ItemType Directory -Force '.local/service' | Out-Null
        $pythonPath = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
        $appProcess = Start-Process -FilePath $pythonPath -ArgumentList '-m', 'wabuddy' `
            -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $PSScriptRoot '.local/service/stdout.log') `
            -RedirectStandardError (Join-Path $PSScriptRoot '.local/service/stderr.log')
        Set-Content -LiteralPath '.local/service/pid' -Value $appProcess.Id
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            Start-Sleep -Milliseconds 250
            try { $health = Invoke-RestMethod "$appUrl/healthz" -TimeoutSec 1; break } catch {}
            $appProcess.Refresh()
            if ($appProcess.HasExited) { throw 'WABuddy stopped during startup. See .local/service/stderr.log.' }
        }
        if (-not $health -or $health.service -ne 'wabuddy' -or $health.version -ne '0.2.0') {
            throw 'WABuddy did not start. See .local/service/stderr.log.'
        }
    }
    if (-not $NoSupervisor) {
        Start-Process -FilePath (Get-Command pwsh).Source -WindowStyle Hidden -ArgumentList @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + (Join-Path $PSScriptRoot 'watch-wabuddy.ps1') + '"')
        ) | Out-Null
    }
    if (-not $NoBrowser) { Start-Process $appUrl }
    Write-Host "WABuddy is running at $appUrl"
} finally { Pop-Location; $startMutex.ReleaseMutex(); $startMutex.Dispose() }
