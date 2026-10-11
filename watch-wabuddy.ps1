#Requires -Version 7.0
$ErrorActionPreference = 'Stop'
$mutex = [System.Threading.Mutex]::new($false, 'Local\WABuddyServerWatchdog')
$owned = $false
try {
    try { $owned = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $owned = $true }
    if (-not $owned) { return }
    $stopFile = Join-Path $PSScriptRoot '.local/service/watchdog-stop'
    while (-not (Test-Path -LiteralPath $stopFile)) {
        try { & "$PSScriptRoot/start-wabuddy.ps1" -NoBrowser -NoSupervisor | Out-Null }
        catch { # Keep private application output out of the watchdog log.
            Add-Content -LiteralPath (Join-Path $PSScriptRoot '.local/service/watchdog.log') -Value "$(Get-Date -Format o) Start unsuccessful; retrying in 10 seconds."
        }
        if (Test-Path -LiteralPath (Join-Path $PSScriptRoot '.local/service/tunnel-enabled')) {
            try {
                $tunnelPidFile = Join-Path $PSScriptRoot '.local/service/tunnel-pid'
                $tunnelPid = Get-Content -LiteralPath $tunnelPidFile -ErrorAction SilentlyContinue
                $tunnelProcess = if ($tunnelPid) { Get-Process -Id ([int]$tunnelPid) -ErrorAction SilentlyContinue }
                if (-not $tunnelProcess -or $tunnelProcess.ProcessName -ne 'cloudflared') {
                    $configPath = Join-Path $PSScriptRoot '.local/service/tunnel.yml'
                    $tunnelProcess = Start-Process -FilePath (Get-Command cloudflared).Source -WindowStyle Hidden -PassThru -ArgumentList @('tunnel','--config',('"'+$configPath+'"'),'run') -RedirectStandardOutput (Join-Path $PSScriptRoot '.local/service/tunnel-stdout.log') -RedirectStandardError (Join-Path $PSScriptRoot '.local/service/tunnel-stderr.log')
                    Set-Content -LiteralPath $tunnelPidFile -Value $tunnelProcess.Id
                }
            } catch { Add-Content -LiteralPath (Join-Path $PSScriptRoot '.local/service/watchdog.log') -Value "$(Get-Date -Format o) Tunnel start unsuccessful; retrying." }
        }
        Start-Sleep -Seconds 10
    }
} finally {
    if ($owned) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
