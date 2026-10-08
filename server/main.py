"""Local voice intake: speech to text (faster-whisper) then text to fields (Ollama).

Run from the project root:
    .venv\\Scripts\\python -m uvicorn server.main:app --port 8000
"""
import json
import logging
import os
import re
import tempfile
import threading
import time
from contextlib import asynccontextmanager
from difflib import SequenceMatcher
from pathlib import Path

import httpx
import numpy as np


def _add_cuda_dll_dirs() -> None:
    """On Windows, make the pip-installed cuBLAS/cuDNN DLLs findable before CTranslate2 loads."""
    import site
    for sp in site.getsitepackages():
        for sub in ("cublas", "cudnn"):
            d = Path(sp) / "nvidia" / sub / "bin"
            if d.is_dir():
                os.add_dll_directory(str(d))
                os.environ["PATH"] = str(d) + os.pathsep + os.environ["PATH"]


if os.name == "nt":
    _add_cuda_dll_dirs()

from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from .status import router as status_router
from .sync import demo_epoch, router as sync_router

log = logging.getLogger("voice")
logging.basicConfig(level=logging.INFO)

WHISPER_GPU_MODEL = os.getenv("WHISPER_GPU_MODEL", "large-v3-turbo")
WHISPER_GPU_COMPUTE = os.getenv("WHISPER_GPU_COMPUTE", "float16")  # or int8_float16 if memory is tight
WHISPER_CPU_MODEL = os.getenv("WHISPER_CPU_MODEL", "small")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "auto")  # auto | cuda | cpu
# Volunteers speak English with Tamil names; "auto" lets Whisper detect the language instead.
WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE", "en")
WHISPER_PROMPT = os.getenv(
    "WHISPER_PROMPT",
    # Village names only: personal names here would pull spelling variants towards one form.
    "Relief camp intake. Villages: Meppadi, Velankanni, Nagapattinam, Kilvelur, Thirukkuvalai, "
    "Nagore, Sirkazhi, Vedaranyam, Keezhaiyur, Thalainayar, Kodiyakkarai, Tharangambadi, Poompuhar, Karaikal.")
MODELS_DIR = Path(__file__).parent / "models"
# 127.0.0.1, not localhost: on Windows "localhost" tries IPv6 first and adds ~2 s per call.
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT_S = float(os.getenv("OLLAMA_TIMEOUT", "15"))
OLLAMA_KEEP_ALIVE = os.getenv("OLLAMA_KEEP_ALIVE", "60m")  # keep the model in memory between notes
# Vision model for describing clothing from a photo (ported from the teammate's backup branch).
VISION_MODEL = os.getenv("VISION_MODEL", "qwen2.5vl:3b")
VISION_TIMEOUT_S = float(os.getenv("VISION_TIMEOUT", "120"))
VISION_PROMPT = ("Describe only clearly visible clothing, colors, bags, and accessories. Do not guess identity, "
                 "age, gender, health, or other personal attributes. If a detail is unclear, say so. "
                 "Return a short factual description in one or two sentences.")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "https://localhost:3000,https://127.0.0.1:3000").split(",")

AGE_BANDS = ["Under 12", "12–18", "19–59", "60+"]
GENDERS = ["male", "female", "unknown"]
TEXT_FIELDS = ["name", "village", "relative_name", "relative_relation", "clothing_or_marks", "found_where"]

FIELDS_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": ["string", "null"]},
        "gender": {"type": "string", "enum": GENDERS},
        "age_band": {"type": ["string", "null"], "enum": AGE_BANDS + [None]},
        "village": {"type": ["string", "null"]},
        "relative_name": {"type": ["string", "null"]},
        "relative_relation": {"type": ["string", "null"]},
        "clothing_or_marks": {"type": ["string", "null"]},
        "found_where": {"type": ["string", "null"]},
        "looking_for": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"relation": {"type": "string"}, "name": {"type": ["string", "null"]}},
                "required": ["relation", "name"],
            },
        },
    },
    "required": ["name", "gender", "age_band", "village", "relative_name", "relative_relation",
                 "clothing_or_marks", "found_where", "looking_for"],
}

SYSTEM_PROMPT = (
    "Extract these fields from a relief volunteer's spoken note. Use null for anything not "
    "clearly stated. Do not guess or invent. Convert a stated age into the correct age band."
)

# Context sent with each note (the system prompt above stays as specified).
RECORD_CONTEXT = {
    "found": "Record type: a person found at this site. The fields describe that person.",
    "seeking": ("Record type: a family member is searching. name, gender, age_band and clothing_or_marks "
                "describe the missing person being searched for; relative_name is the person searching "
                "and relative_relation is how they are related to the missing person."),
}
AGE_BAND_HINT = "Age bands: 0 to 11 is \"Under 12\", 12 to 18 is \"12–18\", 19 to 59 is \"19–59\", 60 and over is \"60+\"."

whisper: dict = {}


def load_whisper() -> None:
    """Load once at startup. 'auto' tries the GPU model and falls back to the CPU model."""
    MODELS_DIR.mkdir(exist_ok=True)
    gpu = ("cuda", WHISPER_GPU_MODEL, WHISPER_GPU_COMPUTE)
    cpu = ("cpu", WHISPER_CPU_MODEL, "int8")
    attempts = {"cuda": [gpu], "cpu": [cpu]}.get(WHISPER_DEVICE, [gpu, cpu])
    for device, name, compute_type in attempts:
        try:
            model = WhisperModel(name, device=device, compute_type=compute_type,
                                 download_root=str(MODELS_DIR))
            # Warm up: CUDA libraries only load on first use, so failures show up here.
            list(model.transcribe(np.zeros(16000, dtype=np.float32))[0])
            whisper.update(model=model, name=name, device=device, compute_type=compute_type)
            log.info("Whisper '%s' loaded on %s (%s)", name, device, compute_type)
            return
        except Exception as e:  # noqa: BLE001 - any failure means try the next device
            log.warning("Whisper on %s failed: %s", device, e)
    raise RuntimeError("Could not load the speech model on any device")


def warm_up_ollama() -> None:
    """Load the model and run one structured request; the first one is much slower than the rest."""
    try:
        httpx.post(f"{OLLAMA_URL}/api/generate",
                   json={"model": OLLAMA_MODEL, "keep_alive": OLLAMA_KEEP_ALIVE}, timeout=120)
        extract_fields("Found a man named Ravi, about 30, from Nagapattinam.", "found", timeout=120)
        log.info("Ollama model '%s' loaded", OLLAMA_MODEL)
    except httpx.HTTPError as e:
        log.warning("Ollama not reachable at startup: %s", e)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_whisper()
    # Load the language model now (in the background) so the first note is not slow.
    threading.Thread(target=warm_up_ollama, daemon=True).start()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])
app.include_router(sync_router)
app.include_router(status_router)


def empty_fields() -> dict:
    return {**{f: None for f in TEXT_FIELDS}, "gender": "unknown", "age_band": None, "looking_for": []}


def clean_fields(raw) -> dict:
    """Keep only values that fit the schema; anything else becomes null."""
    out = empty_fields()
    if not isinstance(raw, dict):
        return out
    for f in TEXT_FIELDS:
        v = raw.get(f)
        if isinstance(v, str) and v.strip() and v.strip().lower() not in ("null", "none", "unknown"):
            out[f] = v.strip()
    if raw.get("gender") in GENDERS:
        out["gender"] = raw["gender"]
    if raw.get("age_band") in AGE_BANDS:
        out["age_band"] = raw["age_band"]
    for item in raw.get("looking_for") or []:
        if isinstance(item, dict) and isinstance(item.get("relation"), str) and item["relation"].strip():
            name = item.get("name")
            out["looking_for"].append({
                "relation": item["relation"].strip(),
                "name": name.strip() if isinstance(name, str) and name.strip() else None,
            })
    return out


def words(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def appears_in(value: str, transcript_words: list[str]) -> bool:
    """Roughly: every word of the value (3+ letters) is close to some transcript word."""
    value_words = [w for w in words(value) if len(w) >= 3] or words(value)
    return bool(value_words) and all(
        any(SequenceMatcher(None, v, t).ratio() >= 0.8 for t in transcript_words) for v in value_words)


def band_for_age(age: int) -> str:
    return "Under 12" if age < 12 else "12–18" if age <= 18 else "19–59" if age <= 59 else "60+"


NUMBER_WORDS = {w: i for i, w in enumerate(
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen "
    "sixteen seventeen eighteen nineteen".split())}
NUMBER_WORDS.update({w: 10 * i for i, w in enumerate("twenty thirty forty fifty sixty seventy eighty ninety".split(), 2)})
AGE_BEFORE = {"about", "around", "maybe", "aged", "age", "approximately", "roughly", "nearly"}
AGE_AFTER = {"year", "years", "yrs", "yr", "old"}


def stated_ages(transcript: str) -> set[int]:
    """Numbers (digits or words) spoken as an age: 'about 42', 'eight years old', 'maybe seventy'."""
    tokens = re.findall(r"[a-z]+|\d+", transcript.lower().replace("-", " "))
    ages, i = set(), 0
    while i < len(tokens):
        t, n, j = tokens[i], None, i + 1
        if t.isdigit():
            n = int(t)
        elif t in NUMBER_WORDS:
            n = NUMBER_WORDS[t]
            if n >= 20 and j < len(tokens) and NUMBER_WORDS.get(tokens[j], 99) < 10:
                n, j = n + NUMBER_WORDS[tokens[j]], j + 1
        if n is not None and n <= 110:
            before = i > 0 and tokens[i - 1] in AGE_BEFORE
            after = any(w in AGE_AFTER for w in tokens[j:j + 2])
            if before or after:
                ages.add(n)
        i = j
    return ages


GENDER_WORDS = {
    "male": {"male", "man", "boy", "he", "his", "him", "son", "father", "husband", "brother", "grandfather"},
    "female": {"female", "woman", "girl", "she", "her", "daughter", "mother", "wife", "sister", "grandmother", "lady"},
}


def unsure_fields(fields: dict, transcript: str) -> list[str]:
    tw = words(transcript)
    unsure = []
    for f in TEXT_FIELDS:
        if fields[f] is None or not appears_in(fields[f], tw):
            unsure.append(f)
    if fields["gender"] == "unknown" or not GENDER_WORDS[fields["gender"]] & set(tw):
        unsure.append("gender")
    if fields["age_band"] is None or fields["age_band"] not in {band_for_age(a) for a in stated_ages(transcript)}:
        unsure.append("age_band")
    if not fields["looking_for"] or any(
            p["name"] and not appears_in(p["name"], tw) for p in fields["looking_for"]):
        unsure.append("looking_for")
    return unsure


def extract_fields(transcript: str, record_type: str, timeout: float = OLLAMA_TIMEOUT_S) -> dict | None:
    """Returns cleaned fields, or None if Ollama is unavailable or too slow."""
    kind = RECORD_CONTEXT[record_type]
    body = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "keep_alive": OLLAMA_KEEP_ALIVE,
        "format": FIELDS_SCHEMA,
        "options": {"temperature": 0},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"{kind}\n{AGE_BAND_HINT}\nNote: {transcript}"},
        ],
    }
    try:
        r = httpx.post(f"{OLLAMA_URL}/api/chat", json=body, timeout=timeout)
        r.raise_for_status()
        return clean_fields(json.loads(r.json()["message"]["content"]))
    except (httpx.HTTPError, KeyError, ValueError) as e:
        log.warning("Field extraction failed: %s", e)
        return None


@app.get("/health")
def health():
    try:
        ollama_ok = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=2).status_code == 200
    except httpx.HTTPError:
        ollama_ok = False
    return {"status": "ok", "whisper_model": whisper.get("name"), "device": whisper.get("device"),
            "compute_type": whisper.get("compute_type"), "language": WHISPER_LANGUAGE,
            "ollama": ollama_ok, "ollama_model": OLLAMA_MODEL, "demo_epoch": demo_epoch()}


@app.post("/voice/extract")
def voice_extract(audio: UploadFile = File(...), record_type: str = Form(...)):
    if record_type not in ("found", "seeking"):
        raise HTTPException(422, "record_type must be 'found' or 'seeking'")

    t0 = time.perf_counter()
    try:
        suffix = Path(audio.filename or "clip.webm").suffix or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio.file.read())
        try:
            segments, info = whisper["model"].transcribe(
                tmp.name, vad_filter=True, initial_prompt=WHISPER_PROMPT,
                language=None if WHISPER_LANGUAGE == "auto" else WHISPER_LANGUAGE)
            transcript = " ".join(s.text.strip() for s in segments).strip()
        finally:
            os.unlink(tmp.name)
    except Exception as e:  # noqa: BLE001 - bad audio or decoder failure
        log.exception("Speech to text failed")
        raise HTTPException(500, f"Speech to text failed: {e}") from e
    stt_ms = round((time.perf_counter() - t0) * 1000)

    t1 = time.perf_counter()
    fields = extract_fields(transcript, record_type) if transcript else None
    llm_ms = round((time.perf_counter() - t1) * 1000)

    llm_ok = fields is not None
    if fields is None:
        fields = empty_fields()
    # The small model often picks the wrong band, so a single clearly stated age decides it.
    ages = stated_ages(transcript)
    if len(ages) == 1:
        fields["age_band"] = band_for_age(ages.pop())
    return {
        "transcript": transcript,
        "language": info.language,
        "fields": fields,
        "unsure": unsure_fields(fields, transcript),
        "llm_ok": llm_ok,
        "timings": {"stt_ms": stt_ms, "llm_ms": llm_ms},
    }


@app.post("/voice/extract_text")
def voice_extract_text(body: dict = Body(...)):
    """Same field extraction as /voice/extract, for text already transcribed (e.g. the phone line's answers)."""
    transcript = str(body.get("text") or "").strip()
    record_type = body.get("record_type", "seeking")
    if record_type not in ("found", "seeking"):
        raise HTTPException(422, "record_type must be 'found' or 'seeking'")
    t1 = time.perf_counter()
    fields = extract_fields(transcript, record_type) if transcript else None
    llm_ms = round((time.perf_counter() - t1) * 1000)
    llm_ok = fields is not None
    fields = fields or empty_fields()
    ages = stated_ages(transcript)
    if len(ages) == 1:
        fields["age_band"] = band_for_age(ages.pop())
    return {"transcript": transcript, "fields": fields, "unsure": unsure_fields(fields, transcript),
            "llm_ok": llm_ok, "timings": {"stt_ms": 0, "llm_ms": llm_ms}}


@app.post("/photo/describe")
def photo_describe(body: dict = Body(...)):
    """Clothing and belongings visible in a photo, for the volunteer to check. The photo is not stored."""
    image = str(body.get("image") or "")
    if image.startswith("data:"):
        image = image.split(",", 1)[-1]
    if not image or len(image) > 7_000_000:  # about 5 MB of JPEG as base64
        raise HTTPException(422, "Send one JPEG image under 5 MB as base64")
    try:
        r = httpx.post(f"{OLLAMA_URL}/api/chat", timeout=VISION_TIMEOUT_S, json={
            "model": VISION_MODEL, "stream": False, "keep_alive": OLLAMA_KEEP_ALIVE,
            "options": {"temperature": 0},
            "messages": [{"role": "user", "content": VISION_PROMPT, "images": [image]}],
        })
        r.raise_for_status()
        description = r.json()["message"]["content"].strip()
    except (httpx.HTTPError, KeyError, ValueError) as e:
        log.warning("Photo description failed (%s): %s", VISION_MODEL, e)
        raise HTTPException(503, f"Photo description unavailable. Is the '{VISION_MODEL}' model pulled in Ollama?") from e
    return {"description": description, "model": VISION_MODEL}
