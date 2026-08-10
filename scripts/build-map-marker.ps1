# Builds the shop's pickup-map marker.
#
# Why this is its own script: the marker has been resized three times, and each attempt
# needs to be looked at before a six-minute Android build. Keeping it separate means it
# can be regenerated and inspected on its own.
#
# The design point. The marker used to be the whole logo shrunk to fit, and the logo is a
# coin: "ENGR. SPIN" arched over the top, "LAUNDRY" under, "EST. 2024", a hard hat and a
# washing machine either side of the centre. At 64dp that was already an unreadable
# smudge, and Google's own map labels sit at roughly 20dp, so matching them by shrinking
# the coin further would produce a gold dot. Instead the marker is cropped to the part of
# the logo that survives at that size: the gold gear with the blue swirl at its centre.
# That is the same approach Google takes with its own places, a single simple mark inside
# a circle, and it stays recognisable where the full lockup cannot.
#
# Emitted at 1x, 2x and 3x so React Native picks the right density and the mark is crisp
# rather than an upscaled 28-pixel bitmap.
#
# Run from the repository root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-map-marker.ps1

[CmdletBinding()]
param(
  # Footprint in density-independent pixels. React Native treats an asset with no @Nx
  # suffix as 1x, so the 1x file's pixel size is the dp size the map will draw at.
  [int] $MarkerDp = 28,

  # The square region of logo.jpg holding the gear and swirl, as a fraction of the
  # image's width, measured from its centre. Tight enough to exclude the black band the
  # hard hat and washing machine sit on, which runs straight through the gear's centre
  # line and otherwise leaves two dark wedges inside the disc.
  [double] $CropFraction = 0.30,

  [string] $LogoPath,
  [string] $OutputDir
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $LogoPath) {
  $LogoPath = Join-Path $repoRoot 'repo\frontend\owner-mobile\assets\branding\logo.jpg'
}
if (-not $OutputDir) {
  $OutputDir = Join-Path $repoRoot 'repo\frontend\owner-mobile\assets\branding'
}

if (-not (Test-Path $LogoPath)) { throw "Logo not found: $LogoPath" }

$logo = [System.Drawing.Bitmap]::FromFile($LogoPath)

# The gear sits slightly above the coin's centre, between the arched wordmarks.
$cropSide = [int]($logo.Width * $CropFraction)
$cropX = [int](($logo.Width - $cropSide) / 2)
$cropY = [int](($logo.Height - $cropSide) / 2) - [int]($logo.Height * 0.005)
$crop = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropSide, $cropSide

Write-Output ("logo {0}x{1}, cropping {2}x{2} at ({3},{4})" -f `
  $logo.Width, $logo.Height, $cropSide, $cropX, $cropY)

function Write-Marker([int] $side, [string] $path) {
  $marker = New-Object System.Drawing.Bitmap $side, $side, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($marker)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'

  # Scaled with the marker so the ring is proportional at every density rather than
  # hairline at 3x and heavy at 1x.
  $ringWidth = [Math]::Max(1.0, $side / 14.0)
  $inset = $ringWidth / 2.0

  $circle = New-Object System.Drawing.RectangleF $inset, $inset, ($side - ($inset * 2)), ($side - ($inset * 2))

  $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path2.AddEllipse($circle)

  # White behind the mark so it holds up over dark satellite imagery, which is what the
  # pickup map shows.
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $g.FillEllipse($white, $circle)

  # The gear is drawn inside the white disc with a margin, so the disc reads as a pin
  # rather than the artwork being clipped by its own edge.
  $g.SetClip($path2)
  $artMargin = $side * 0.13
  $art = New-Object System.Drawing.RectangleF ($inset + $artMargin), ($inset + $artMargin), `
    ($circle.Width - ($artMargin * 2)), ($circle.Height - ($artMargin * 2))
  $g.DrawImage($logo, $art, $crop, [System.Drawing.GraphicsUnit]::Pixel)
  $g.ResetClip()

  # A navy edge, matching the app's own outlines, so the marker has a defined boundary
  # against pale roofs and roads.
  $navy = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#0D2A52')), $ringWidth
  $g.DrawEllipse($navy, $circle)

  $marker.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output ("  wrote {0,-34} {1}x{1}" -f (Split-Path $path -Leaf), $side)

  foreach ($item in @($navy, $white, $path2, $g, $marker)) { $item.Dispose() }
}

Write-Marker $MarkerDp (Join-Path $OutputDir 'business-home-marker.png')
Write-Marker ($MarkerDp * 2) (Join-Path $OutputDir 'business-home-marker@2x.png')
Write-Marker ($MarkerDp * 3) (Join-Path $OutputDir 'business-home-marker@3x.png')

$logo.Dispose()

Write-Output ("Marker footprint: {0}dp" -f $MarkerDp)
