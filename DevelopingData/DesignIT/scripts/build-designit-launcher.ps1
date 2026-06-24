$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DesignItRoot = Resolve-Path (Join-Path $ScriptDir "..")
$Source = Join-Path $ScriptDir "DesignIT-Launcher.cs"
$Out = Join-Path $DesignItRoot "DesignIT.exe"

if (!(Test-Path -LiteralPath $Source)) {
  throw "Launcher source not found: $Source"
}

$candidates = @(
  (Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
  (Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe")
)

$csc = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (!$csc) {
  throw "C# compiler not found. Expected .NET Framework csc.exe."
}

Write-Host "Building DesignIT.exe..." -ForegroundColor Cyan
Write-Host "Source: $Source" -ForegroundColor Gray
Write-Host "Output: $Out" -ForegroundColor Green

& $csc /nologo /target:winexe /platform:anycpu /out:"$Out" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "$Source"

if ($LASTEXITCODE -ne 0) {
  throw "Launcher build failed with exit code $LASTEXITCODE"
}

if (!(Test-Path -LiteralPath $Out)) {
  throw "Build finished but exe not found: $Out"
}

Write-Host ""
Write-Host "DesignIT.exe created successfully:" -ForegroundColor Green
Write-Host $Out -ForegroundColor Green
