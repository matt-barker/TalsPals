#!/usr/bin/env bash
#
# Generates the responsive image variants served by the site.
#
# Sources live in img/photos/masters/ (already cropped to their final aspect
# ratio). This script writes AVIF / WebP / JPEG variants at each width the
# layout can ask for into img/photos/.
#
# Requires ImageMagick 7 (`magick`) with AVIF + WebP delegates.
# Run from the repo root:  ./tools/generate-images.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

MASTERS="img/photos/masters"
OUT="img/photos"

# name:widths — widths are the intrinsic pixel widths of the generated files.
# Hero is full-bleed (sizes=100vw) so it needs to reach retina desktop widths.
# The services/about images are capped at 600 CSS px, so 1200 covers 2x.
IMAGES=(
  "hero:640,960,1280,1600,1920,2560"
  "services:400,600,800,1200,1600"
  "about:400,600,800,1200,1600"
)

for entry in "${IMAGES[@]}"; do
  name="${entry%%:*}"
  widths="${entry##*:}"
  src="$MASTERS/$name.jpg"

  [ -f "$src" ] || { echo "missing master: $src" >&2; exit 1; }

  IFS=',' read -ra WIDTHS <<< "$widths"
  for w in "${WIDTHS[@]}"; do
    echo "  $name @ ${w}w"
    magick "$src" -resize "${w}x" -strip -quality 82 -sampling-factor 4:2:0 \
      -interlace JPEG "$OUT/$name-${w}.jpg"
    magick "$src" -resize "${w}x" -strip -quality 78 "$OUT/$name-${w}.webp"
    magick "$src" -resize "${w}x" -strip -quality 55 "$OUT/$name-${w}.avif"
  done
done

echo
echo "Done. Generated files:"
ls -lh "$OUT"/*.avif "$OUT"/*.webp "$OUT"/*.jpg 2>/dev/null | awk '{print $5, $9}'
