"""Prerender existing blueprint artwork; requires Pillow.

Run from any directory: python3 tools/render_blueprint_background.py
Edit tools/blueprint-layout.json to adjust the source composition, then rerun.
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "backgrounds"
BACKGROUND = (16, 20, 24)
PLATES = json.loads((ROOT / "tools" / "blueprint-layout.json").read_text())["plates"]


def number(value):
    return float(value.rstrip("vhwp%"))


def render(width, height, mobile=False):
    logical_width = 390 if mobile else 1920
    viewport_height = 844 if mobile else 900
    scale = width / logical_width
    canvas = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    grid_color = tuple(round(c + (238 - c) * 0.07) for c in BACKGROUND)
    step = 64 * scale
    for x in range(int(width / step) + 1):
        draw.line((round(x * step), 0, round(x * step), height),
                  fill=grid_color, width=max(1, round(scale)))
    for y in range(int(height / step) + 1):
        draw.line((0, round(y * step), width, round(y * step)),
                  fill=grid_color, width=max(1, round(scale)))

    for plate in PLATES:
        art = Image.open(ROOT / plate["src"].lstrip("/")).convert("RGBA")
        fraction = number(plate["width"]) / 100
        art_width = logical_width * fraction
        left = number(plate["left"]) / 100
        opacity = plate.get("opacity", 0.088)
        if mobile:
            art_width = max(220, min(420, art_width * 2.5))
            left = max(0.2, min(0.8, left))
            opacity = max(0.1, min(0.16, opacity * 1.8))
        target_width = round(art_width * scale)
        target_height = round(art.height * target_width / art.width)
        art = art.resize((target_width, target_height), Image.Resampling.LANCZOS)
        art.putalpha(art.getchannel("A").point(lambda alpha: round(alpha * opacity)))
        art = art.rotate(-plate.get("tilt", 0), Image.Resampling.BICUBIC, expand=True)
        top = number(plate["top"]) / 100 * viewport_height * scale
        # Match CSS rotation around the center of the original image.
        x = round(left * width - art.width / 2)
        y = round(top - (art.height - target_height) / 2)
        canvas.paste(art, (x, y), art)

    # Bake the fades into the pixels, rather than asking the browser to mask a layer.
    top_fade = viewport_height * 0.35 * scale
    bottom_fade = viewport_height * 0.6 * scale
    fade = Image.new("L", (1, height))
    fade.putdata([round(255 * min(1, y / top_fade, (height - 1 - y) / bottom_fade))
                  for y in range(height)])
    return Image.composite(canvas, Image.new("RGB", canvas.size, BACKGROUND),
                           fade.resize(canvas.size))


def save(image, name):
    path = OUTPUT / name
    image.save(path, "WEBP", quality=90, method=6)
    print(f"{path.relative_to(ROOT)}: {image.width} x {image.height}, "
          f"{path.stat().st_size / 1024:.0f} KiB")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    master = render(5120, 8192)
    save(master, "experience-blueprint-5k.webp")
    save(master.resize((2560, 4096), Image.Resampling.LANCZOS),
         "experience-blueprint.webp")
    save(render(640, 6144, mobile=True), "experience-blueprint-mobile.webp")
    save_bottom_fade()


def save_bottom_fade():
    # A bounded overlay follows the actual section end, even when details expand.
    fade = Image.new("RGBA", (16, 512))
    fade.putdata([(*BACKGROUND, round(255 * y / 511))
                  for y in range(512) for _ in range(16)])
    fade.save(OUTPUT / "experience-fade-bottom.webp", "WEBP", lossless=True)


if __name__ == "__main__":
    main()
