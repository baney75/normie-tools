#!/usr/bin/env bash
# Run Playwright WebKit on a host that lacks the Ubuntu system libraries
# (libicu74, libxml2, libflite1). No sudo. CI does not use this script.
#
# One-time setup (see docs/decisions.md): extract the noble .deb files for
# libicu74, libxml2 and libflite1 into $PW_UBUNTU_LIBS (default below).
# The WebKit build from Playwright already bundles libjxl and libbacktrace.
#
# Usage: scripts/e2e-webkit-local.sh [playwright args]   (default: --project=webkit)
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
libs="${PW_UBUNTU_LIBS:-$HOME/.local/share/pw-ubuntu-libs}/usr/lib/x86_64-linux-gnu"
if [ -d "$libs" ]; then
  export LD_LIBRARY_PATH="$libs${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  # Playwright's WebKit wrapper (minibrowser-wpe/MiniBrowser) overwrites LD_LIBRARY_PATH,
  # so also preload the libraries by full path. Order matters: icudata first.
  pre=""
  for name in libicudata.so.74 libicuuc.so.74 libicui18n.so.74 libxml2.so.2 libflite.so.1 \
    libflite_cmulex.so.1 libflite_usenglish.so.1 libflite_cmu_grapheme_lang.so.1 \
    libflite_cmu_grapheme_lex.so.1 libflite_cmu_indic_lang.so.1 libflite_cmu_indic_lex.so.1 \
    libflite_cmu_time_awb.so.1 libflite_cmu_us_awb.so.1 libflite_cmu_us_kal.so.1 \
    libflite_cmu_us_kal16.so.1 libflite_cmu_us_rms.so.1 libflite_cmu_us_slt.so.1; do
    [ -e "$libs/$name" ] && pre="$pre:$libs/$name"
  done
  export LD_PRELOAD="${pre#:}${LD_PRELOAD:+:$LD_PRELOAD}"
fi
export NT_E2E_SKIP="${NT_E2E_SKIP:-chromium,firefox}"
cd "$here/site"
if [ "$#" -eq 0 ]; then set -- --project=webkit; fi
exec npx playwright test "$@"
