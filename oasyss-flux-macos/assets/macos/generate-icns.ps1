# Oasyss Flux — Divyesh Edition
# Generates native macOS AppIcon.icns from logo.png using high-quality bicubic resampling.

param(
    [string]$SourceImage = "logo.png",
    [string]$OutputFile = "assets\macos\AppIcon.icns"
)

Add-Type -AssemblyName System.Drawing

$sourcePath = Resolve-Path $SourceImage
$targetDir = [System.IO.Path]::GetDirectoryName((Resolve-Path -Path . -ErrorAction SilentlyContinue).Path + "\" + $OutputFile)
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$srcBmp = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-ToPngBytes($src, [int]$size) {
    $dest = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $dest.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    [byte[]]$res = $ms.ToArray()
    $ms.Dispose()
    return ,$res
}

# Mapping of Apple Icon Chunk Type to Size
$iconSpecs = @(
    @{ Tag = "icp4"; Size = 16 },
    @{ Tag = "icp5"; Size = 32 },
    @{ Tag = "icp6"; Size = 64 },
    @{ Tag = "ic07"; Size = 128 },
    @{ Tag = "ic08"; Size = 256 },
    @{ Tag = "ic09"; Size = 512 },
    @{ Tag = "ic10"; Size = 1024 },
    @{ Tag = "ic11"; Size = 32 },
    @{ Tag = "ic12"; Size = 64 },
    @{ Tag = "ic13"; Size = 256 },
    @{ Tag = "ic14"; Size = 512 }
)

$chunks = @()
$totalPayloadSize = 0

foreach ($spec in $iconSpecs) {
    [byte[]]$pngBytes = Resize-ToPngBytes $srcBmp $spec.Size
    [byte[]]$chunkHeader = [System.Text.Encoding]::ASCII.GetBytes($spec.Tag)
    $chunkLen = 8 + $pngBytes.Length
    [byte[]]$lenBytes = [System.BitConverter]::GetBytes([uint32]$chunkLen)
    if ([System.BitConverter]::IsLittleEndian) {
        [System.Array]::Reverse($lenBytes)
    }

    [byte[]]$chunkData = New-Object byte[] ($chunkLen)
    [System.Array]::Copy($chunkHeader, 0, $chunkData, 0, 4)
    [System.Array]::Copy($lenBytes, 0, $chunkData, 4, 4)
    [System.Array]::Copy($pngBytes, 0, $chunkData, 8, $pngBytes.Length)

    $chunks += ,$chunkData
    $totalPayloadSize += $chunkLen
}

$srcBmp.Dispose()

$totalFileSize = 8 + $totalPayloadSize
[byte[]]$fileBytes = New-Object byte[] ($totalFileSize)

# 'icns' magic header
[byte[]]$magic = [System.Text.Encoding]::ASCII.GetBytes("icns")
[System.Array]::Copy($magic, 0, $fileBytes, 0, 4)

[byte[]]$fileLenBytes = [System.BitConverter]::GetBytes([uint32]$totalFileSize)
if ([System.BitConverter]::IsLittleEndian) {
    [System.Array]::Reverse($fileLenBytes)
}
[System.Array]::Copy($fileLenBytes, 0, $fileBytes, 4, 4)

$offset = 8
foreach ($chunk in $chunks) {
    [System.Array]::Copy($chunk, 0, $fileBytes, $offset, $chunk.Length)
    $offset += $chunk.Length
}

[System.IO.File]::WriteAllBytes($OutputFile, $fileBytes)
Write-Output "Successfully generated native macOS icon at $OutputFile (Total size: $totalFileSize bytes)"
