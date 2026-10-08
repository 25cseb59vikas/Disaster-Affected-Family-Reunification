"""Local voice intake: speech to text (faster-whisper) then text to fields (Ollama).

Run from the project root:
    .venv\\Scripts\\python -m uvicorn server.main:app --port 8000
"""
import json
import logging
import os
import re
import tempfile
import time
from contextlib import asynccontextmanager
from difflib import SequenceMatcher
from pathlib import Path

import httpx
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

log = logging.getLogger("voice")
logging.basicConfig(level=logging.INFO)

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "auto")  # auto | cuda | cpu
MODELS_DIR = Path(__file__).parent / "models"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT_S = float(os.getenv("OLLAMA_TIMEOUT", "15"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

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

whisper: dict = {}


def load_whisper() -> None:
    """Load once at startup. 'auto' tries the GPU and falls back to CPU int8."""
    MODELS_DIR.mkdir(exist_ok=True)
    attempts = {"cuda": [("cuda", "float16")], "cpu": [("cpu", "int8")]}.get(
        WHISPER_DEVICE, [("cuda", "float16"), ("cpu", "int8")])
    for device, compute_type in attempts:
        try:
            model = WhisperModel(WHISPER_MODEL, device=device, compute_type=compute_type,
                                 download_root=str(MODELS_DIR))
            # Warm up: CUDA libraries only load on first use, so failures show up here.
            list(model.transcribe(np.zeros(16000, dtype=np.float32))[0])
            whisper.update(model=model, device=device, compute_type=compute_type)
            log.info("Whisper '%s' loaded on %s (%s)", WHISPER_MODEL, device, compute_type)
            return
        except Exception as e:  # noqa: BLE001 - any failure means try the next device
            log.warning("Whisper on %s failed: %s", device, e)
    raise RuntimeError("Could not load the speech model on any device")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_whisper()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


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
    ages = [int(n) for n in re.findall(r"\b\d{1,3}\b", transcript) if int(n) <= 110]
    if fields["age_band"] is None or fields["age_band"] not in {band_for_age(a) for a in ages}:
        unsure.append("age_band")
    if not fields["looking_for"] or any(
            p["name"] and not appears_in(p["name"], tw) for p in fields["looking_for"]):
        unsure.append("looking_for")
    return unsure


def extract_fields(transcript: str, record_type: str) -> dict | None:
    """Returns cleaned fields, or None if Ollama is unavailable or too slow."""
    kind = "a person found at this site" if record_type == "found" else "a family member searching for someone"
    body = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "format": FIELDS_SCHEMA,
        "options": {"temperature": 0},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Record type: {kind}.\nNote: {transcript}"},
        ],
    }
    try:
        r = httpx.post(f"{OLLAMA_URL}/api/chat", json=body, timeout=OLLAMA_TIMEOUT_S)
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
    return {"status": "ok", "whisper_model": WHISPER_MODEL, "device": whisper.get("device"),
            "ollama": ollama_ok, "ollama_model": OLLAMA_MODEL}


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
            segments, info = whisper["model"].transcribe(tmp.name, vad_filter=True)
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
    return {
        "transcript": transcript,
        "language": info.language,
        "fields": fields,
        "unsure": unsure_fields(fields, transcript),
        "llm_ok": llm_ok,
        "timings": {"stt_ms": stt_ms, "llm_ms": llm_ms},
    }
