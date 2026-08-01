# Prepares the owner app's branding assets from the supplied design files.
#
# Why this exists: the wordmark only arrived baked into the full loading-screen
# mock on an opaque background, and the login mascot was flattened to 24-bit with
# no alpha channel, which is why it rendered as a white rectangle once a patterned
# background was placed behind it. This script produces PNGs with a real alpha
# channel so the artwork composites cleanly over any background, and prints the
# resulting corner pixels so the transparency can be verified rather than assumed.
#
# Run from the repository root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-branding-assets.ps1

[CmdletBinding()]
param(
  [string] $SourceDir = "$env:USERPROFILE\Downloads",
  [string] $MascotSource,
  [string] $OutputDir
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# $PSScriptRoot is not bound while parameter defaults are evaluated on Windows
# PowerShell, so the repository-relative paths are resolved here instead.
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $MascotSource) { $MascotSource = Join-Path $repoRoot 'assets\login_welcome_mascot.png' }
if (-not $OutputDir) { $OutputDir = Join-Path $repoRoot 'repo\frontend\owner-mobile\assets' }

$referencePath = Join-Path $SourceDir 'spinner_loading_text_adjusted_v2 (1).png'
foreach ($required in @($referencePath, $MascotSource)) {
  if (-not (Test-Path $required)) { throw "Missing source asset: $required" }
}

New-Item -ItemType Directory -Force -Path (Join-Path $OutputDir 'loading') | Out-Null

function Save-Png([System.Drawing.Bitmap] $bitmap, [string] $path) {
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  "  wrote {0,-46} {1}x{2}  corner={3}" -f `
    (Split-Path $path -Leaf), $bitmap.Width, $bitmap.Height, $bitmap.GetPixel(0, 0).ToString()
}

# --- Mascot: crop the transparent original to its artwork -------------------
# The source is a tall canvas with the mascot floating in the middle. Trimming to
# the alpha bounding box means layout code can size it directly without guessing
# how much empty space to compensate for.
function Get-TrimmedMascot([string] $path) {
  $source = [System.Drawing.Bitmap]::new($path)
  try {
    $minX = $source.Width; $minY = $source.Height; $maxX = -1; $maxY = -1

    for ($y = 0; $y -lt $source.Height; $y++) {
      for ($x = 0; $x -lt $source.Width; $x++) {
        if ($source.GetPixel($x, $y).A -gt 8) {
          if ($x -lt $minX) { $minX = $x }
          if ($x -gt $maxX) { $maxX = $x }
          if ($y -lt $minY) { $minY = $y }
          if ($y -gt $maxY) { $maxY = $y }
        }
      }
    }

    if ($maxX -lt 0) { throw "$path has no opaque pixels; it is not a transparent asset." }

    $crop = New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1)
    $trimmed = New-Object System.Drawing.Bitmap $crop.Width, $crop.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($trimmed)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.InterpolationMode = 'HighQualityBicubic'
      $graphics.DrawImage($source, (New-Object System.Drawing.Rectangle 0, 0, $crop.Width, $crop.Height), $crop, 'Pixel')
    } finally { $graphics.Dispose() }

    return $trimmed
  } finally { $source.Dispose() }
}

# --- Wordmark: lift it off the mock's opaque background ---------------------
# Each row's own left edge supplies the local background colour, so the mock's
# vertical gradient does not leave a visible block behind the letters. A ramp
# rather than a hard cutoff keeps the type's antialiased edges smooth.
function Get-KeyedWordmark([string] $path, [int] $top, [int] $bottom) {
  $source = [System.Drawing.Bitmap]::new($path)
  try {
    $height = $bottom - $top + 1
    $keyed = New-Object System.Drawing.Bitmap $source.Width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    $minX = $source.Width; $maxX = -1
    for ($y = 0; $y -lt $height; $y++) {
      $sourceY = $top + $y
      $background = $source.GetPixel(4, $sourceY)

      for ($x = 0; $x -lt $source.Width; $x++) {
        $pixel = $source.GetPixel($x, $sourceY)
        $distance = [Math]::Max(
          [Math]::Abs([int] $pixel.R - [int] $background.R),
          [Math]::Max(
            [Math]::Abs([int] $pixel.G - [int] $background.G),
            [Math]::Abs([int] $pixel.B - [int] $background.B)))

        $alpha = if ($distance -le 8) { 0 } elseif ($distance -ge 30) { 255 }
                 else { [int](($distance - 8) * 255 / 22) }

        if ($alpha -gt 0) {
          $keyed.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B))
          if ($alpha -gt 40) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
          }
        }
      }
    }

    # Trim the empty margins so the wordmark can be laid out by width alone.
    $padding = 6
    $left = [Math]::Max(0, $minX - $padding)
    $width = [Math]::Min($source.Width - $left, $maxX - $left + 1 + $padding)

    $trimmed = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($trimmed)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.DrawImage($keyed, (New-Object System.Drawing.Rectangle 0, 0, $width, $height),
        (New-Object System.Drawing.Rectangle $left, 0, $width, $height), 'Pixel')
    } finally { $graphics.Dispose() }

    $keyed.Dispose()
    return $trimmed
  } finally { $source.Dispose() }
}

# --- Splash: one image the native launch screen can show -------------------
# The native splash can only place a single image on a flat colour, so the mascot
# and wordmark are combined at the same relative spacing the running app uses.
# Matching them means the handoff from the launch screen to the live screen does
# not visibly move the logo.
function New-SplashComposite(
  [System.Drawing.Bitmap] $mascot,
  [System.Drawing.Bitmap] $wordmark,
  [int] $width) {

  $mascotWidth = $width
  $mascotHeight = [int]($mascot.Height * ($mascotWidth / $mascot.Width))
  $wordmarkWidth = [int]($width * 0.86)
  $wordmarkHeight = [int]($wordmark.Height * ($wordmarkWidth / $wordmark.Width))
  $gap = [int]($width * 0.04)

  $canvas = New-Object System.Drawing.Bitmap $width, ($mascotHeight + $gap + $wordmarkHeight), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = 'HighQualityBicubic'
    $graphics.DrawImage($mascot, (New-Object System.Drawing.Rectangle 0, 0, $mascotWidth, $mascotHeight))
    $graphics.DrawImage($wordmark, (New-Object System.Drawing.Rectangle `
      ([int](($width - $wordmarkWidth) / 2)), ($mascotHeight + $gap), $wordmarkWidth, $wordmarkHeight))
  } finally { $graphics.Dispose() }

  return $canvas
}

Write-Output 'Mascot'
$mascot = Get-TrimmedMascot $MascotSource
# One canonical file: the login hero and the loading screen show the same artwork,
# and a second copy would add another megabyte to the bundle for no benefit.
Save-Png $mascot (Join-Path $OutputDir 'spinner-mascot.png')

Write-Output 'Wordmark'
# Band located by scanning the mock for its only dark ink below the mascot.
$wordmark = Get-KeyedWordmark $referencePath 1036 1196
Save-Png $wordmark (Join-Path $OutputDir 'loading\wordmark.png')

Write-Output 'Splash composite'
$splash = New-SplashComposite $mascot $wordmark 900
Save-Png $splash (Join-Path $OutputDir 'splash-spinner.png')

foreach ($bitmap in @($mascot, $wordmark, $splash)) { $bitmap.Dispose() }

# The webp originals stay as-is: they are opaque backgrounds and need no alpha.
Copy-Item (Join-Path $SourceDir 'spinner_loading_background.webp') `
  (Join-Path $OutputDir 'loading\background.webp') -Force
Copy-Item (Join-Path $SourceDir 'minimal_login_background.webp') `
  (Join-Path $OutputDir 'backgrounds\login-background.webp') -Force

Write-Output 'Done.'
