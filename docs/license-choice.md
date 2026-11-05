# License choice

Status: chosen. The repo uses Apache License 2.0.

## Options considered

- **MIT:** simplest and shortest, but has no patent grant.
- **Apache 2.0 (the pick):** permissive, with an explicit patent grant and a patent-retaliation clause. That matters with many agent contributors. It also does not grant trademark rights, which protects the NT name and logo.
- **BSD-2:** similar to MIT.

## How it fits bundled parts

- The LGPL FFmpeg build and libvips are kept as separate modules.
- MPL Mediabunny is fine under this setup.
- GPL pandoc stays a separate optional module. It needs approval and review by a lawyer before it is shipped.

## Contributions

Inbound equals outbound: contributions are under Apache License 2.0 unless a different license is stated in writing and accepted by a human maintainer.
