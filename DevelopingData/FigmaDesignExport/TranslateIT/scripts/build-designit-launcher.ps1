$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Source = Join-Path $ScriptDir 'DesignIT-Launcher.cs'
$TargetRoot = Resolve-Path (Join-Path $ScriptDir '..\..\..\..')
$Out = Join-Path $TargetRoot 'DesignIT.exe'

if (-not (Test-Path $Source)) {
  throw "Launcher source not found: $Source"
}

$candidates = @(
  (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
  (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
)

$csc = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $csc) {
  throw 'C# compiler not found. Expected .NET Framework csc.exe under Windows Microsoft.NET Framework folders.'
}

Write-Host 'Building DesignIT.exe...' -ForegroundColor Cyan
Write-Host "Compiler:    $csc" -ForegroundColor Gray
Write-Host "Source:      $Source" -ForegroundColor Gray
Write-Host "Target root: $TargetRoot" -ForegroundColor Gray
Write-Host "Output:      $Out" -ForegroundColor Gray

& $csc /nologo /target:winexe /platform:anycpu /out:"$Out" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "$Source"

if ($LASTEXITCODE -ne 0) {
  throw "Launcher build failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path $Out)) {
  throw "Launcher build finished but output was not found: $Out"
}

Write-Host 'DesignIT.exe created successfully in target root:' -ForegroundColor Green
Write-Host $Out -ForegroundColor Green
