#Requires -Version 7.0
$ErrorActionPreference = 'Stop'
$appUrl = 'http://127.0.0.1:8787'
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot '.local/service') | Out-Null
Set-Content -LiteralPath (Join-Path $PSScriptRoot '.local/service/watchdog-stop') -Value 'Stopped by owner'
try { $health = Invoke-RestMethod "$appUrl/healthz" -TimeoutSec 2 }
catch { Write-Host 'WABuddy is not running.'; return }
if ($health.service -ne 'wabuddy' -or $health.version -ne '0.2.0') {
    throw 'The application on port 8787 is not this WABuddy build.'
}
$bootstrap = Invoke-RestMethod "$appUrl/api/bootstrap" -SessionVariable browserSession
Invoke-RestMethod "$appUrl/api/shutdown" -Method Post -WebSession $browserSession `
    -Headers @{ 'X-CSRF-Token' = $bootstrap.csrf_token } | Out-Null
for ($attempt = 0; $attempt -lt 300; $attempt++) {
    try { $null = Invoke-RestMethod "$appUrl/healthz" -TimeoutSec 1 }
    catch { Write-Host 'WABuddy stopped; saved WhatsApp sessions are retained. Automatic recovery is paused until the next start.'; return }
    Start-Sleep -Seconds 1
}
throw 'WABuddy is still finishing active jobs. Wait before starting it again.'
