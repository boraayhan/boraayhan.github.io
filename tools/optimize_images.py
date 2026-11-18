"""Generate small website images from retained originals; requires Pillow.

Run from any directory: python tools/optimize_images.py
The original headshot remains available for the full-size image preview.
"""

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
LOGO_SOURCES = (
    "arapahoe-rocketry.png",
    "aria-lab.png",
    "boettcher.webp",
    "first-robotics.webp",
    "gamma-lab.png",
    "longhorn-racing.png",
    "mines-hspc.png",
    "national-merit.jpeg",
    "presidential-scholars.png",
    "texas-aerial-robotics.jpg",
    "texas-guadaloop.png",
)


def variant(source, destination, size, *, crop=False, quality=86):
    source = ROOT / source
    destination = ROOT / destination
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGBA")
        if crop:
            image = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS)
        else:
            image.thumbnail(size, Image.Resampling.LANCZOS)
        if destination.suffix == ".webp":
            image.save(destination, quality=quality, method=6)
        else:
            image.save(destination, optimize=True)
    print(f"{destination.relative_to(ROOT)}: {source.stat().st_size:,} -> "
          f"{destination.stat().st_size:,} bytes ({image.width} x {image.height})")


def main():
    variant("assets/icons/headshot.png", "assets/icons/headshot-small.webp",
            (192, 192), crop=True, quality=82)
    variant("assets/icons/headshot.png", "assets/icons/favicon.png",
            (48, 48), crop=True)
    variant("assets/project_images/LongRangeUAVPhoto.png",
            "assets/project_images/LongRangeUAVPhoto.webp", (1600, 1600))

    replacements = {}
    for filename in LOGO_SOURCES:
        source = f"assets/icons/logos/{filename}"
        destination = f"assets/icons/logos/{Path(filename).stem}-small.webp"
        variant(source, destination, (144, 144))
        replacements[f"/{source}"] = f"/{destination}"

    experience_path = ROOT / "data/experience.json"
    experience = json.loads(experience_path.read_text(encoding="utf-8"))
    for section in experience["sections"]:
        for entry in section["entries"]:
            entry["logo"] = replacements.get(entry["logo"], entry["logo"])
    experience_path.write_text(
        json.dumps(experience, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
