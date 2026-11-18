"""Build browser-ready hero videos and posters from the original clips.

Requires FFmpeg with libx264 and libwebp. Run from any directory:
    python tools/optimize_media.py
    python tools/optimize_media.py --ffmpeg /path/to/ffmpeg

Originals remain untouched. Desktop videos fit within 1280x720 without
upscaling. Mobile videos use the same centered framing as object-fit: cover,
cropped to 9:16 and encoded at 432x768. Both retain the full source duration,
with bitrate caps to keep visually noisy clips within a useful download size.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import shutil
import subprocess


ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "assets" / "cover_video"
SOURCES = (
    "tar_drone_flight.mov",
    "shooting_targeting_algorithm.MOV",
    "grace_lidar.mp4",
    "flight_controls_demo.mov",
    "ARIA_goofing_off.MOV",
    "uav_cad.mp4",
)
DESKTOP_FILTER = (
    "scale=w='min(1280,iw)':h='min(720,ih)':"
    "force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos"
)
MOBILE_FILTER = (
    "crop=w='min(iw,ih*9/16)':h='min(ih,iw*16/9)',"
    "scale=432:768:flags=lanczos"
)


def run(command):
    result = subprocess.run(command, text=True, capture_output=True, check=False)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "FFmpeg command failed")
    return result.stdout


def describe(ffprobe, path):
    metadata = json.loads(run([
        ffprobe, "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height:format=duration,size",
        "-of", "json", str(path),
    ]))
    stream = metadata["streams"][0]
    return {
        "file": path.relative_to(ROOT).as_posix(),
        "codec": stream["codec_name"],
        "width": stream["width"],
        "height": stream["height"],
        "duration": round(float(metadata["format"]["duration"]), 3),
        "bytes": path.stat().st_size,
    }


def optimize(ffmpeg, ffprobe, filename):
    source = MEDIA / filename
    outputs = []
    for suffix, video_filter, quality, maxrate, bufsize in (
        ("", DESKTOP_FILTER, "26", "1800k", "3600k"),
        ("-mobile", MOBILE_FILTER, "28", "650k", "1300k"),
    ):
        destination = MEDIA / "optimized" / f"{source.stem.lower()}{suffix}.mp4"
        run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-filter_threads", "1", "-i", str(source),
            "-map", "0:v:0", "-map_metadata", "-1", "-an", "-sn", "-dn",
            "-vf", f"{video_filter},fps=24,setsar=1",
            "-c:v", "libx264", "-preset", "medium", "-crf", quality,
            "-maxrate", maxrate, "-bufsize", bufsize,
            "-pix_fmt", "yuv420p", "-g", "48", "-threads", "2",
            "-movflags", "+faststart", str(destination),
        ])
        outputs.append(describe(ffprobe, destination))
    return {"source": describe(ffprobe, source), "outputs": outputs}


def poster(ffmpeg, suffix, video_filter, timestamp):
    destination = MEDIA / f"hero-poster{suffix}.webp"
    run([
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-filter_threads", "1", "-ss", str(timestamp), "-i", str(MEDIA / SOURCES[0]),
        "-frames:v", "1", "-vf", f"{video_filter},setsar=1",
        "-c:v", "libwebp", "-quality", "75", "-compression_level", "6",
        str(destination),
    ])
    return {"file": destination.relative_to(ROOT).as_posix(),
            "bytes": destination.stat().st_size}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"),
                        help="Path to FFmpeg; ffprobe must be beside it or on PATH")
    parser.add_argument("--poster-time", type=float, default=2.5,
                        help="Seconds into the drone-flight clip for the posters")
    arguments = parser.parse_args()
    if not arguments.ffmpeg:
        parser.error("Install FFmpeg or specify --ffmpeg /path/to/ffmpeg")
    ffmpeg = str(Path(arguments.ffmpeg).resolve())
    sibling = Path(ffmpeg).with_name("ffprobe" + Path(ffmpeg).suffix)
    ffprobe = str(sibling) if sibling.is_file() else shutil.which("ffprobe")
    if not ffprobe:
        parser.error("ffprobe must be installed alongside FFmpeg or on PATH")

    (MEDIA / "optimized").mkdir(exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        videos = list(pool.map(lambda name: optimize(ffmpeg, ffprobe, name), SOURCES))
    posters = [poster(ffmpeg, "", DESKTOP_FILTER, arguments.poster_time),
               poster(ffmpeg, "-mobile", MOBILE_FILTER, arguments.poster_time)]
    print(json.dumps({"videos": videos, "posters": posters}, indent=2))


if __name__ == "__main__":
    main()
