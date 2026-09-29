# refs\next.ps1 - drive the 21 reference images in AI Studio / ChatGPT.
#   .\refs\next.ps1        -> copies the next prompt to the clipboard, shows what to attach
#   .\refs\next.ps1 -Save  -> files the newest image in Downloads under the pending name
param([switch]$Save)

$ErrorActionPreference = 'Stop'
$refs  = $PSScriptRoot
$root  = Split-Path $refs -Parent
$shots = Get-Content (Join-Path $refs 'prompts.json') -Raw | ConvertFrom-Json

function Name-Of($s)  { Split-Path $s.file -Leaf }
function Pending      { @($shots | Where-Object { -not (Test-Path (Join-Path $refs (Name-Of $_))) }) }
function Show-Shot($shot, $left) {
  $n = $shots.Count - $left + 1
  Write-Host ''
  Write-Host "[$n/21]  refs\$(Name-Of $shot)" -ForegroundColor Cyan
  Write-Host "  used in: $($shot.scenes)"
  if ($shot.edit) { Write-Host '  MODE: edit the attached image - do not generate from scratch' -ForegroundColor Yellow }
  Write-Host '  attach:'
  $shot.attach | ForEach-Object { Write-Host "    $root\$_" }
  Set-Clipboard -Value $shot.prompt
  Write-Host '  prompt copied to clipboard' -ForegroundColor Green
  Write-Host "  $left left"
  Write-Host ''
}

$pending = Pending
if ($pending.Count -eq 0) {
  Write-Host 'All 21 refs are in place.' -ForegroundColor Green
  Write-Host "Write 'continue' in Claude Code to trace them into vector plates." -ForegroundColor Green
  return
}

if ($Save) {
  $dl  = Join-Path $env:USERPROFILE 'Downloads'
  $new = Get-ChildItem $dl -File |
         Where-Object { $_.Extension -in '.png', '.webp', '.jpg', '.jpeg', '.avif' } |
         Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $new) { throw "No image found in $dl" }
  $target = Join-Path $refs (Name-Of $pending[0])
  if ($new.Extension -ne '.png') { Write-Host "note: source is $($new.Extension), saving as .png - check it opens." -ForegroundColor Yellow }
  Move-Item -LiteralPath $new.FullName -Destination $target -Force
  Write-Host "saved  $($new.Name)  ->  refs\$(Name-Of $pending[0])" -ForegroundColor Green
  $pending = Pending
  if ($pending.Count -eq 0) {
    Write-Host 'All 21 refs are in place.' -ForegroundColor Green
    Write-Host "Write 'continue' in Claude Code to trace them into vector plates." -ForegroundColor Green
    return
  }
}

Show-Shot $pending[0] $pending.Count
