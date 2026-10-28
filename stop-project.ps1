[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$runRoot = Join-Path $PSScriptRoot '.local\run'
$serviceNames = @('frontend', 'backend', 'redis', 'mysql')
$servicePorts = @{ frontend = 80; backend = 8020; redis = 6380; mysql = 3307 }
$mysqlAdminExe = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqladmin.exe'
$redisCliExe = Join-Path $PSScriptRoot '.local\memurai\Memurai\memurai-cli.exe'

foreach ($serviceName in $serviceNames) {
    $pidFile = Join-Path $runRoot "$serviceName.pid"
    if (-not (Test-Path -LiteralPath $pidFile)) {
        Write-Host "${serviceName}: no recorded process."
        continue
    }

    $recordedPid = [int](Get-Content -LiteralPath $pidFile -Raw)
    $process = Get-Process -Id $recordedPid -ErrorAction SilentlyContinue
    $portOwner = Get-NetTCPConnection -State Listen -LocalPort $servicePorts[$serviceName] -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty OwningProcess
    if ($process -and $portOwner -eq $recordedPid) {
        if ($serviceName -eq 'mysql' -and (Test-Path -LiteralPath $mysqlAdminExe)) {
            & $mysqlAdminExe '--host=127.0.0.1' '--port=3307' '--user=root' '--password=root' shutdown 2>$null
        } elseif ($serviceName -eq 'redis' -and (Test-Path -LiteralPath $redisCliExe)) {
            & $redisCliExe -p 6380 shutdown nosave 2>$null
        } else {
            Stop-Process -Id $recordedPid -Force
        }
        Write-Host "$serviceName stopped (PID $recordedPid)."
    } else {
        Write-Host "$serviceName was already stopped or its PID record was stale."
    }
    Remove-Item -LiteralPath $pidFile -Force
}
