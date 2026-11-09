$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'NikeStoreRuntime'
$mysqlRoot = (Get-ChildItem -LiteralPath (Join-Path $runtimeRoot 'mysql') -Directory | Select-Object -First 1).FullName
$dataRoot = Join-Path $runtimeRoot 'mysql-data'
if (!(Test-Path -LiteralPath (Join-Path $dataRoot 'mysql'))) { throw 'Chay scripts/setup.ps1 truoc.' }
if (!(Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue)) {
    $argsList = @('--no-defaults', ('--basedir="' + $mysqlRoot + '"'), ('--datadir="' + $dataRoot + '"'), '--port=3307', '--bind-address=127.0.0.1', '--mysqlx=OFF', '--console')
    $dbProcess = Start-Process -FilePath (Join-Path $mysqlRoot 'bin/mysqld.exe') -ArgumentList $argsList -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeRoot 'mysql.log') -RedirectStandardError (Join-Path $runtimeRoot 'mysql-errors.log')
    Set-Content -LiteralPath (Join-Path $runtimeRoot 'mysql.pid') -Value $dbProcess.Id
    for ($attempt=0; $attempt -lt 60; $attempt++) {
        if (Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue) { break }
        if ($dbProcess.HasExited) { throw 'MySQL khong khoi dong. Xem mysql-errors.log.' }
        Start-Sleep -Milliseconds 500
    }
}
