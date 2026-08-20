#!/usr/bin/env python3
"""Build lightweight website derivatives from the owner-supplied RAW/COLOR archive.

The archive stays read-only. This script only writes curated WebP derivatives into
public/v3-assets/production so a future asset refresh is repeatable.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


ASSETS = {
    "grk-feature": "GRK/color/Still 2026-08-07 200944_1.29.1.png",
    "grk-performance": "GRK/color/Still 2026-08-07 200944_1.39.1.png",
    "grk-crowd": "GRK/color/Still 2026-08-07 200944_1.57.1.png",
    "sibur-raw": "sibur/raw/Still 2026-08-07 201039_1.65.1.png",
    "sibur-color": "sibur/color/Still 2026-08-07 200944_1.65.1.png",
    "sibur-bts": "sibur/color/Still 2026-08-07 200944_1.64.1.png",
    "sibur-portrait": "sibur/color/Still 2026-08-07 200944_1.68.1.png",
    "sber-architecture": "sber_u/color/Still 2026-08-07 200944_1.10.1.png",
    "sber-interview": "sber_u/color/Still 2026-08-07 200944_1.7.1.png",
    "caprigo-presenter": "caprigo/color/Still 2026-08-07 200944_1.20.1.png",
    "caprigo-product": "caprigo/color/Still 2026-08-07 200944_1.45.1.png",
    "hoff-product": "Hoff/color/Still 2026-08-07 200944_1.1.1.png",
    "korona-factory": "Korona/color/Still 2026-08-07 200944_1.31.1.png",
}


def save_webp(source: Path, destination: Path, width: int, quality: int) -> None:
    with Image.open(source) as image:
        image = image.convert("RGB")
        if image.width > width:
            height = round(image.height * width / image.width)
            image = image.resize((width, height), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "WEBP", quality=quality, method=6)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_root", type=Path)
    parser.add_argument("output_root", type=Path)
    args = parser.parse_args()

    for name, relative in ASSETS.items():
        source = args.source_root / relative
        if not source.is_file():
            raise FileNotFoundError(source)
        save_webp(source, args.output_root / f"{name}.webp", 1600, 82)
        save_webp(source, args.output_root / f"{name}-sm.webp", 800, 78)
        print(f"{name}: {source.name}")


if __name__ == "__main__":
    main()
