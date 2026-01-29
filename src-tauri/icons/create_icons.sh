#!/bin/bash
# Create minimal valid PNG files using ImageMagick or sips (macOS)

# Try ImageMagick first
if command -v convert &> /dev/null; then
    convert -size 32x32 xc:'#1e293b' 32x32.png
    convert -size 128x128 xc:'#1e293b' 128x128.png
    convert -size 256x256 xc:'#1e293b' 128x128@2x.png
    echo "Created icons using ImageMagick"
# Try sips (macOS)
elif command -v sips &> /dev/null; then
    # Create a 1x1 PNG first, then resize
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > temp.png
    sips -z 32 32 temp.png --out 32x32.png &> /dev/null
    sips -z 128 128 temp.png --out 128x128.png &> /dev/null
    sips -z 256 256 temp.png --out 128x128@2x.png &> /dev/null
    rm temp.png
    echo "Created icons using sips"
else
    echo "Neither ImageMagick nor sips found. Please install one or create icons manually."
    exit 1
fi
