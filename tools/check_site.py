"""Validate local links, asset references, and the background's build inputs."""

import ast
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
errors = []
referenced_assets = set()
RETIRED_CLASSES = {
    "panel", "panels", "panel-track", "panel-scroll", "project-arrow",
    "project-link", "attachment-placeholder", "entry-assoc", "entry-tags",
    "blueprint", "blueprint-grid", "blueprint-plate", "social-row", "social-badge",
}


def check_reference(value, source):
    url = urlsplit(value)
    if url.scheme or url.netloc or not url.path:
        return
    path = unquote(url.path)
    target = (ROOT / path.lstrip("/")) if path.startswith("/") else source.parent / path
    if target.is_dir():
        target /= "index.html"
    if not target.is_file():
        errors.append(f"{source.relative_to(ROOT)}: missing {value}")
    if target.is_relative_to(ROOT / "assets"):
        referenced_assets.add(target)


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids = set()
        self.fragments = []

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        retired = RETIRED_CLASSES.intersection(attributes.get("class", "").split())
        if retired:
            errors.append(f"{self.path.relative_to(ROOT)}: retired markup {sorted(retired)}")
        if "id" in attributes:
            if attributes["id"] in self.ids:
                errors.append(f"{self.path.relative_to(ROOT)}: duplicate ID {attributes['id']}")
            self.ids.add(attributes["id"])
        for key in ("src", "href", "data-preview-src", "poster"):
            value = attributes.get(key)
            if value is None:
                continue
            if not value:
                errors.append(f"{self.path.relative_to(ROOT)}: empty {key}")
            elif value.startswith("#"):
                self.fragments.append(value[1:])
            else:
                check_reference(value, self.path)
        for candidate in attributes.get("srcset", "").split(","):
            if candidate.strip():
                check_reference(candidate.strip().split()[0], self.path)
        if tag == "meta" and attributes.get("http-equiv", "").lower() == "refresh":
            check_reference(attributes["content"].split("url=", 1)[1], self.path)


def main():
    for path in ROOT.rglob("*.html"):
        if ".git" in path.parts:
            continue
        page = Page(path)
        page.feed(path.read_text(encoding="utf-8"))
        for fragment in page.fragments:
            if fragment not in page.ids:
                errors.append(f"{path.relative_to(ROOT)}: missing anchor #{fragment}")

    for value in re.findall(r"url\(['\"]?([^)'\"]+)", (ROOT / "style.css").read_text(encoding="utf-8")):
        check_reference(value, ROOT / "style.css")

    experience = ROOT / "data" / "experience.json"
    for section in json.loads(experience.read_text(encoding="utf-8"))["sections"]:
        for entry in section["entries"]:
            for field in ("title", "logo", "href"):
                if not entry.get(field):
                    errors.append(f"{experience.name}: missing {field} in {entry}")
            check_reference(entry["logo"], experience)

    script = ROOT / "script.js"
    text = script.read_text(encoding="utf-8")
    if re.search(r"addEventListener\(\s*['\"](?:scroll|wheel|touchmove)['\"]", text):
        errors.append("script.js: page scrolling must remain native")
    for filename in re.findall(r"\['([^']+\.(?:mov|mp4))',", text, re.IGNORECASE):
        check_reference("/assets/cover_video/" + filename, script)
        stem = Path(filename).stem.lower()
        for suffix in ("", "-mobile"):
            check_reference(f"/assets/cover_video/optimized/{stem}{suffix}.mp4", script)

    # Retained full-size logos are the reproducible optimizer's build inputs.
    optimizer = ROOT / "tools" / "optimize_images.py"
    for node in ast.parse(optimizer.read_text(encoding="utf-8")).body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "LOGO_SOURCES"
            for target in node.targets
        ):
            for filename in ast.literal_eval(node.value):
                check_reference("/assets/icons/logos/" + filename, optimizer)

    layout = ROOT / "tools" / "blueprint-layout.json"
    for plate in json.loads(layout.read_text(encoding="utf-8"))["plates"]:
        source = ROOT / plate["src"]
        if not source.is_file():
            errors.append(f"{layout.name}: missing build input {plate['src']}")

    for path in (ROOT / "assets").rglob("*"):
        if not path.is_file() or path.suffix in {".md", ".txt"}:
            continue
        if path not in referenced_assets:
            errors.append(f"Unreferenced asset: {path.relative_to(ROOT)}")
        if path.suffix == ".svg":
            ET.parse(path)

    if errors:
        raise SystemExit("\n".join(errors))
    print("Local links, anchors, runtime assets, SVG XML, and background inputs verified.")


if __name__ == "__main__":
    main()
