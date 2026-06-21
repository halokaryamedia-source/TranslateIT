$ErrorActionPreference = 'Stop'
$BridgeRoot = $PSScriptRoot
$Reports = Join-Path $BridgeRoot 'reports'
$mivubiJson = Join-Path $Reports 'translateit-regression-site-mivubi-sample.json'
$mivubiHtml = Join-Path $Reports 'translateit-regression-site-mivubi-sample.html'
$mivubiPng = Join-Path $Reports 'translateit-regression-site-mivubi-sample.png'
$mivubiDiffHtml = Join-Path $Reports 'translateit-regression-site-mivubi-sample-diff.html'
$mivubiDiffPng = Join-Path $Reports 'translateit-regression-site-mivubi-sample-diff.png'
$reg = Join-Path $Reports 'translateit-regression-latest.json'
$clean = Join-Path $Reports 'translateit-clean-latest.json'

Write-Host "TranslateIT latest report opener"
Write-Host "Reports: $Reports"

if (Test-Path $mivubiJson) {
  Get-Content $mivubiJson -Raw | Set-Clipboard
  notepad $mivubiJson
  Write-Host "Copied Mivubi site report JSON to clipboard."
} else {
  Write-Host "Missing Mivubi report: $mivubiJson"
}

foreach ($file in @($mivubiHtml, $mivubiPng, $mivubiDiffHtml, $mivubiDiffPng, $reg, $clean)) {
  if (Test-Path $file) {
    Invoke-Item $file
    Write-Host "Opened: $file"
  } else {
    Write-Host "Missing: $file"
  }
}
