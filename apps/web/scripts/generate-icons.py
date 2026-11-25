#!/usr/bin/env python3
"""Regenerate the Purple Foods PWA icons into public/.

Binary icons are not committed to git; run this once after cloning.
Requires Pillow:  pip install Pillow

Brand marks: deep-plum rounded square, saffron bowl, lilac rim + steam.
"""
import os

from PIL import Image, ImageDraw

PLUM = (46, 16, 101, 255)        # #2E1065
PLUM_DEEP = (29, 10, 66, 255)    # #1D0A42
SAFFRON = (245, 158, 11, 255)    # #F59E0B
LILAC = (245, 243, 255, 255)     # #F5F3FF

OUT = os.path.join(os.path.dirname(__file__), "..", "public")


def draw_icon(size: int) -> Image.Image:
    s = size * 4  # supersample for smooth edges
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # plum rounded-square tile
    d.rounded_rectangle([0, 0, s, s], radius=int(s * 0.22), fill=PLUM)
    # subtle deep-plum inner shadow ring
    d.rounded_rectangle(
        [int(s * 0.03), int(s * 0.03), s - int(s * 0.03), s - int(s * 0.03)],
        radius=int(s * 0.19),
        outline=PLUM_DEEP,
        width=max(2, int(s * 0.012)),
    )

    cx, cy = s / 2, s * 0.56
    r = s * 0.26

    # saffron bowl
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SAFFRON)
    # lilac rim arc across the bowl
    d.arc([cx - r, cy - r, cx + r, cy + r], start=200, end=340, fill=LILAC, width=int(s * 0.045))
    # inner rim accent
    r2 = r * 0.62
    d.arc([cx - r2, cy - r2, cx + r2, cy + r2], start=200, end=340, fill=LILAC, width=int(s * 0.028))

    # steam strokes above the bowl
    for i, xoff in enumerate((-0.10, 0.02, 0.14)):
        x = cx + s * xoff
        top = s * (0.16 + 0.02 * (i % 2))
        bot = cy - r - s * 0.05
        w = max(2, int(s * 0.028))
        d.arc([x - s * 0.045, top, x + s * 0.045, bot], start=250, end=70, fill=LILAC, width=w)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    targets = {
        "icon-512.png": 512,
        "icon-192.png": 192,
        "apple-touch-icon.png": 180,
        "favicon.png": 64,
    }
    for name, size in targets.items():
        path = os.path.join(OUT, name)
        draw_icon(size).save(path)
        print("wrote", os.path.relpath(path))


if __name__ == "__main__":
    main()
