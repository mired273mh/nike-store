$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'NikeStoreRuntime'
$phpBin = Join-Path $runtimeRoot 'php/php.exe'
$phpArgs = @('-c', (Join-Path $projectRoot 'backend/php.ini'), '-d', ('extension_dir=' + (Join-Path $runtimeRoot 'php/ext')))
$env:DB_DATABASE = 'nike_store_test'
$env:MYSQL_ROOT_PASSWORD = (Get-Content -LiteralPath (Join-Path $runtimeRoot 'mysql-root.secret') -Raw).Trim()
try { & $phpBin @phpArgs (Join-Path $projectRoot 'backend/database/provision.php'); if ($LASTEXITCODE -ne 0) { throw 'Tao test database that bai.' } }
finally { Remove-Item Env:MYSQL_ROOT_PASSWORD -ErrorAction SilentlyContinue }
& $phpBin @phpArgs (Join-Path $projectRoot 'tests/database.php') reset
if ($LASTEXITCODE -ne 0) { throw 'Reset test database that bai.' }
& $phpBin @phpArgs (Join-Path $projectRoot 'backend/database/init.php')
if ($LASTEXITCODE -ne 0) { throw 'Seed test database that bai.' }
Write-Output 'Test database ready: nike_store_test'
