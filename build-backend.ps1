[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$serverRoot = Join-Path $PSScriptRoot 'shixun-server'
$mavenExe = 'C:\Program Files\JetBrains\IntelliJ IDEA 2021.1.3\plugins\maven\lib\maven3\bin\mvn.cmd'
$jdkRoot = 'C:\Program Files\Java\jdk-21'

if (-not (Test-Path -LiteralPath $mavenExe -PathType Leaf)) {
    throw "Maven not found: $mavenExe"
}
if (-not (Test-Path -LiteralPath (Join-Path $jdkRoot 'bin\java.exe') -PathType Leaf)) {
    throw "JDK not found: $jdkRoot"
}

$previousJavaHome = $env:JAVA_HOME
$previousPath = $env:Path
$env:JAVA_HOME = $jdkRoot
$env:Path = (Join-Path $jdkRoot 'bin') + ';' + $env:Path

try {
    Push-Location $serverRoot
    try {
        & $mavenExe -pl ruoyi-admin -am clean package -DskipTests
        if ($LASTEXITCODE -ne 0) {
            throw "Maven build failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }
} finally {
    $env:JAVA_HOME = $previousJavaHome
    $env:Path = $previousPath
}

Write-Host 'Backend build completed: shixun-server\ruoyi-admin\target\xuhui_travel.jar' -ForegroundColor Green
