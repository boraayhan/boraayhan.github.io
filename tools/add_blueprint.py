#!/usr/bin/env python3
"""Ink a drawing into a transparent blueprint plate and register it.

    python3 tools/add_blueprint.py SOURCE [options]

SOURCE may be an image (png/jpg) or a PDF (use --page).
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

try:
    from PIL import Image, ImageChops
except ImportError:
    sys.exit("Pillow is required:  pip install --user Pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLATES = ROOT / "assets" / "blueprint"
MANIFEST = ROOT / "data" / "blueprint.json"


def render_pdf(src, page, dpi):
    tmp = pathlib.Path(tempfile.mkdtemp())
    if not shutil.which("pdftoppm"):
        sys.exit("pdftoppm not found. Install poppler-utils.")
    subprocess.run(
        ["pdftoppm", "-png", "-r", str(dpi), "-f", str(page), "-l", str(page),
         str(src), str(tmp / "page")],
        check=True,
    )
    pages = sorted(tmp.glob("page*.png"))
    if not pages:
        sys.exit(f"pdftoppm produced nothing for page {page}")
    return pages[0]


def ink(src, crop, threshold, pad):
    im = Image.open(src).convert("L")
    if crop:
        im = im.crop(tuple(crop))

    alpha = ImageChops.invert(im)
    if threshold > 0:
        alpha = alpha.point(lambda v: 0 if v < threshold else v)

    box = alpha.getbbox()
    if box:
        box = (max(0, box[0] - pad), max(0, box[1] - pad),
               min(im.width, box[2] + pad), min(im.height, box[3] + pad))
        alpha = alpha.crop(box)

    plate = Image.new("RGBA", alpha.size, (255, 255, 255, 255))
    plate.putalpha(alpha)
    return plate


def next_top(plates):
    tops = [float(p["top"].rstrip("vh")) for p in plates
            if isinstance(p.get("top"), str) and p["top"].endswith("vh")]
    return f"{(max(tops) + 60) if tops else 104:g}vh"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source")
    ap.add_argument("--name", help="plate filename stem (default: source stem)")
    ap.add_argument("--page", type=int, help="PDF page number")
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument("--crop", nargs=4, type=int, metavar=("L", "T", "R", "B"),
                    help="crop box in source pixels, applied before trimming")
    ap.add_argument("--threshold", type=int, default=24,
                    help="drop ink fainter than this (0-255) to kill scan grey")
    ap.add_argument("--pad", type=int, default=12)
    ap.add_argument("--top", help="scroll position, e.g. 180vh")
    ap.add_argument("--side", choices=["left", "right"], default=None)
    ap.add_argument("--offset", default=None, help="e.g. -6vw")
    ap.add_argument("--width", default="32vw")
    ap.add_argument("--drift", type=int, default=None, help="parallax px")
    ap.add_argument("--tilt", type=float, default=0)
    ap.add_argument("--opacity", type=float, default=0.07)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    src = pathlib.Path(args.source)
    if not src.exists():
        sys.exit(f"no such file: {src}")

    rendered = render_pdf(src, args.page, args.dpi) if src.suffix.lower() == ".pdf" else src
    if src.suffix.lower() == ".pdf" and not args.page:
        sys.exit("--page is required for PDF sources")

    plate = ink(rendered, args.crop, args.threshold, args.pad)

    stem = args.name or src.stem.replace(".pdf", "")
    out = PLATES / f"{stem}.png"

    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"plates": []}
    plates = manifest.setdefault("plates", [])

    side = args.side or ("right" if len(plates) % 2 else "left")
    entry = {
        "src": f"/assets/blueprint/{out.name}",
        "top": args.top or next_top(plates),
        "side": side,
        "offset": args.offset or ("-6vw" if side == "left" else "-4vw"),
        "width": args.width,
        "drift": args.drift if args.drift is not None else (-80 if side == "left" else 80),
        "tilt": args.tilt,
        "opacity": args.opacity,
    }

    print(f"plate   {out.relative_to(ROOT)}  {plate.width}x{plate.height}")
    print("entry   " + json.dumps(entry))

    if args.dry_run:
        print("dry run - nothing written")
        return

    PLATES.mkdir(parents=True, exist_ok=True)
    plate.save(out)

    plates[:] = [p for p in plates if p.get("src") != entry["src"]]
    plates.append(entry)
    plates.sort(key=lambda p: float(str(p.get("top", "0vh")).rstrip("vh")))
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote   {MANIFEST.relative_to(ROOT)}  ({len(plates)} plates)")


if __name__ == "__main__":
    main()
