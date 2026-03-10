#!/usr/bin/env sh
set -eu

# If a host directory with fonts is mounted into the container, rebuild font cache
# so LibreOffice can see new fonts (e.g. Times New Roman).
CUSTOM_FONTS_DIR="${CUSTOM_FONTS_DIR:-/usr/local/share/fonts/custom}"
if [ -d "$CUSTOM_FONTS_DIR" ]; then
  fc-cache -f >/dev/null 2>&1 || true
fi

exec "$@"
