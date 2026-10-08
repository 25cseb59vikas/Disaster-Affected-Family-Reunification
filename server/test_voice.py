"""Send sample clips to a running voice server and print what comes back.

    .venv\\Scripts\\python server\\test_voice.py                 # all clips in server/samples
    .venv\\Scripts\\python server\\test_voice.py my.webm found   # one clip, record type
"""
import json
import sys
from pathlib import Path

import av
import httpx

URL = "http://localhost:8000/voice/extract"
SAMPLES = Path(__file__).parent / "samples"


def duration_s(path: Path) -> float:
    with av.open(str(path)) as f:
        return sum(fr.samples / fr.sample_rate for fr in f.decode(audio=0))


def run(path: Path, record_type: str) -> None:
    with open(path, "rb") as fh:
        r = httpx.post(URL, files={"audio": (path.name, fh)}, data={"record_type": record_type}, timeout=120)
    print(f"\n=== {path.name} ({duration_s(path):.1f}s audio, {record_type}) -> HTTP {r.status_code}")
    if r.status_code != 200:
        print(r.text)
        return
    d = r.json()
    t = d["timings"]
    print("transcript:", d["transcript"])
    print("language:  ", d["language"], "| llm_ok:", d["llm_ok"])
    print("fields:    ", json.dumps(d["fields"], ensure_ascii=False, indent=2))
    print("unsure:    ", d["unsure"])
    print(f"timings:    stt {t['stt_ms']} ms + llm {t['llm_ms']} ms = {t['stt_ms'] + t['llm_ms']} ms")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        run(Path(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else "found")
    else:
        for clip in sorted(SAMPLES.glob("*.*")):
            run(clip, "seeking" if clip.name.startswith("seeking") else "found")
