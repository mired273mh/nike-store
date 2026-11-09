$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'NikeStoreRuntime'
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
function Download-Official($url, $destination) {
    & curl.exe -fsSL --retry 2 --connect-timeout 30 -o $destination $url
    if ($LASTEXITCODE -ne 0 -and $url.StartsWith('https://downloads.php.net/')) {
        $dnsAnswer = Invoke-RestMethod 'https://dns.google/resolve?name=downloads.php.net&type=A'
        $address = ($dnsAnswer.Answer | Where-Object type -eq 1 | Select-Object -First 1).data
        if ($address) { & curl.exe -fsSL --resolve ('downloads.php.net:443:' + $address) -o $destination $url }
    }
    if ($LASTEXITCODE -ne 0) { throw ('Tai runtime that bai: ' + $url) }
}
if (!(Test-Path -LiteralPath (Join-Path $runtimeRoot 'php/php.exe'))) {
    Download-Official 'https://downloads.php.net/~windows/releases/php-8.4.27-1-nts-Win32-vs17-x64.zip' (Join-Path $runtimeRoot 'php.zip')
    Expand-Archive -LiteralPath (Join-Path $runtimeRoot 'php.zip') -DestinationPath (Join-Path $runtimeRoot 'php') -Force
}
if (!(Test-Path -LiteralPath (Join-Path $runtimeRoot 'mysql/mysql-8.4.13-winx64/bin/mysqld.exe'))) {
    Download-Official 'https://cdn.mysql.com/Downloads/MySQL-8.4/mysql-8.4.13-winx64.zip' (Join-Path $runtimeRoot 'mysql.zip')
    Expand-Archive -LiteralPath (Join-Path $runtimeRoot 'mysql.zip') -DestinationPath (Join-Path $runtimeRoot 'mysql') -Force
}
$phpBin = Join-Path $runtimeRoot 'php/php.exe'
$phpArgs = @('-c', (Join-Path $projectRoot 'backend/php.ini'), '-d', ('extension_dir=' + (Join-Path $runtimeRoot 'php/ext')))
$mysqlRoot = Join-Path $runtimeRoot 'mysql/mysql-8.4.13-winx64'
$dataRoot = Join-Path $runtimeRoot 'mysql-data'
$fresh = !(Test-Path -LiteralPath (Join-Path $dataRoot 'mysql'))
if ($fresh) {
    & (Join-Path $mysqlRoot 'bin/mysqld.exe') --no-defaults --initialize-insecure ('--basedir=' + $mysqlRoot) ('--datadir=' + $dataRoot) --console
    if ($LASTEXITCODE -ne 0) { throw 'Khoi tao MySQL that bai.' }
}
$backendEnv = Join-Path $projectRoot 'backend/.env'
if (!(Test-Path -LiteralPath $backendEnv)) {
    $appPassword = -join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Minimum 0 -Maximum 16) })
    (Get-Content -LiteralPath (Join-Path $projectRoot 'backend/.env.example') -Raw).Replace('CHANGE_ME', $appPassword) | Set-Content -LiteralPath $backendEnv -Encoding ASCII
}
& (Join-Path $PSScriptRoot 'start-db.ps1')
$rootSecret = Join-Path $runtimeRoot 'mysql-root.secret'
if (Test-Path -LiteralPath $rootSecret) { $env:MYSQL_ROOT_PASSWORD = (Get-Content -LiteralPath $rootSecret -Raw).Trim() }
if ($fresh) {
    $env:MYSQL_NEW_ROOT_PASSWORD = -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Minimum 0 -Maximum 16) })
    Set-Content -LiteralPath $rootSecret -Value $env:MYSQL_NEW_ROOT_PASSWORD -Encoding ASCII
}
try { & $phpBin @phpArgs (Join-Path $projectRoot 'backend/database/provision.php'); if ($LASTEXITCODE -ne 0) { throw 'Tao tai khoan database that bai.' } }
finally { Remove-Item Env:MYSQL_ROOT_PASSWORD,Env:MYSQL_NEW_ROOT_PASSWORD -ErrorAction SilentlyContinue }
& $phpBin @phpArgs (Join-Path $projectRoot 'backend/database/init.php')
if ($LASTEXITCODE -ne 0) { throw 'Nhap du lieu that bai.' }
& (Join-Path $PSScriptRoot 'install-mail.ps1')
Push-Location $projectRoot
try { npm.cmd install; if ($LASTEXITCODE -ne 0) { throw 'npm install that bai.' } } finally { Pop-Location }
Write-Output 'San sang. Chay powershell -ExecutionPolicy Bypass -File scripts/start.ps1'
