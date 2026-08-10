# Builds the shop's pickup-map marker from the shop's own logo.
#
# Why this is its own script: the marker has needed resizing several times, and each
# attempt has to be looked at before a six-minute Android build. Pass -PreviewDir to also
# write nearest-neighbour blow-ups, which show the actual pixels the phone is given rather
# than a smoothed impression of them.
#
# Sizing is the whole problem here, and it is a trade-off between two real constraints.
#
# Too large and it dwarfs Google's own place icons, which sit at roughly 20-24dp, and
# covers the roofs the rider is trying to see. It started at 96dp, then 64dp.
#
# Too small and the logo stops being legible. It is a photographic coin: bevelled gold,
# arched wordmarks, a gear with teeth, a multi-tone vortex. Detail like that needs pixels,
# and an attempt at 28dp came out as a blur.
#
# 44dp is the settled compromise: noticeably smaller than the original, still enough
# resolution for the coin to read as the shop's logo rather than a smudge. The artwork is
# used as drawn, not reinterpreted.
#
# Emitted at 1x, 2x and 3x so React Native can pick the density it needs.
#
# Run from the repository root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-map-marker.ps1

[CmdletBinding()]
param(
  # Footprint in density-independent pixels. React Native treats an asset with no @Nx
  # suffix as 1x, so the 1x file's pixel size is the dp size the map draws at.
  [int] $MarkerDp = 44,

  [string] $LogoPath,
  [string] $OutputDir,
  [string] $PreviewDir
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $LogoPath) { $LogoPath = Join-Path $repoRoot 'assets\logo.jpg' }
if (-not $OutputDir) {
  $OutputDir = Join-Path $repoRoot 'repo\frontend\owner-mobile\assets\branding'
}

if (-not (Test-Path $LogoPath)) { throw "Logo not found: $LogoPath" }

$logo = [System.Drawing.Bitmap]::FromFile($LogoPath)
Write-Host ("logo {0}: {1}x{2}" -f (Split-Path $LogoPath -Leaf), $logo.Width, $logo.Height)

# The coin is drawn inside a square canvas with white margins of its own, so the artwork
# is trimmed to the coin before it is scaled. Without this the logo lands smaller than the
# marker it sits in and the ring appears to float away from it.
$trim = [int]($logo.Width * 0.035)
$source = New-Object System.Drawing.Rectangle $trim, $trim, ($logo.Width - $trim * 2), ($logo.Height - $trim * 2)

function New-Marker([int] $side) {
  $marker = New-Object System.Drawing.Bitmap $side, $side, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($marker)
  $g.SmoothingMode = 'AntiAlias'
  # The logo is being reduced by a factor of twenty or more, so the resampling quality
  # is what decides whether the gear reads or turns to mush.
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.CompositingQuality = 'HighQuality'

  # Proportional to the side so the ring is identical at every density rather than
  # hairline at 3x and heavy at 1x.
  $ringWidth = [Math]::Max(1.0, $side / 22.0)
  $inset = $ringWidth / 2.0
  $disc = New-Object System.Drawing.RectangleF $inset, $inset, ($side - $inset * 2), ($side - $inset * 2)

  # White behind the coin. The logo's own background is white but its corners are not,
  # and the pickup map is satellite imagery, so a bare square of photograph would sit on
  # dark foliage with no edge at all.
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $g.FillEllipse($white, $disc)

  $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
  $clip.AddEllipse($disc)
  $g.SetClip($clip)
  $g.DrawImage($logo, $disc, $source, [System.Drawing.GraphicsUnit]::Pixel)
  $g.ResetClip()

  # A navy edge, matching the app's own outlines, so the marker keeps a defined boundary
  # over pale roofs and dirt roads where the logo's gold rim alone would disappear.
  $navy = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#0D2A52')), $ringWidth
  $g.DrawEllipse($navy, $disc)

  foreach ($item in @($navy, $clip, $white, $g)) { $item.Dispose() }

  return $marker
}

function Save-Marker([int] $side, [string] $name) {
  $marker = New-Marker $side
  $marker.Save((Join-Path $OutputDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host ("  wrote {0,-34} {1}x{1}" -f $name, $side)
  return $marker
}

$one = Save-Marker $MarkerDp 'business-home-marker.png'
$two = Save-Marker ($MarkerDp * 2) 'business-home-marker@2x.png'
$three = Save-Marker ($MarkerDp * 3) 'business-home-marker@3x.png'

if ($PreviewDir) {
  New-Item -ItemType Directory -Force -Path $PreviewDir | Out-Null

  foreach ($pair in @(
      @{ Bitmap = $one; Name = 'preview-1x-zoom.png' },
      @{ Bitmap = $two; Name = 'preview-2x-zoom.png' })) {
    $src = $pair.Bitmap
    $zoom = [Math]::Max(1, [int](352 / $src.Width))
    $big = New-Object System.Drawing.Bitmap ($src.Width * $zoom), ($src.Height * $zoom)
    $bg = [System.Drawing.Graphics]::FromImage($big)
    # Nearest neighbour on purpose: this shows the pixels as they are, not smoothed.
    $bg.InterpolationMode = 'NearestNeighbor'
    $bg.PixelOffsetMode = 'Half'
    $bg.DrawImage($src, 0, 0, $big.Width, $big.Height)
    $big.Save((Join-Path $PreviewDir $pair.Name), [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host ("  preview {0,-32} {1}x{1}" -f $pair.Name, $big.Width)
    $bg.Dispose(); $big.Dispose()
  }
}

foreach ($bitmap in @($one, $two, $three)) { $bitmap.Dispose() }
$logo.Dispose()

Write-Host ("Marker footprint: {0}dp" -f $MarkerDp)
