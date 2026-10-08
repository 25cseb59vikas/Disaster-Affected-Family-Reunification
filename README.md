# Reunite Relief — Disaster Family Reunification App

An offline-first, Progressive Web Application (PWA) built with **Dexie.js (IndexedDB)**, **React**, **TypeScript**, and **Tailwind CSS**, faithfully reproducing the **Disaster Family Reunification App** prototype from Stitch (`projects/13183460208011111487`).

---

## 🏛️ Design Philosophy: Institutional Humanism

Engineered for crisis response, disaster relief, and civil protection contexts where users experience high stress, adverse field weather, power outages, and fragmented attention.

- **Arm's Length Readability**: Minimum text floor of 18px, body copy at 20px, titles at 28px bold.
- **Color Tokens**:
  - **Base Canvas**: `#F6F3EC` (Warm off-white, low-glare under harsh field sunlight)
  - **Surface Cards**: `#FFFDF8` (Soft parchment white with 1px `#D9DEE4` border and 12px radius)
  - **Primary Ink**: `#0F1B2D` (Deep navy ink tone providing WCAG AAA contrast)
  - **Primary Action**: `#C2540F` (Warm terracotta orange)
  - **Operational Status Tokens**:
    - **Verified / Safe**: Text `#2E7D5B`, Background `#E8F5E9`, Border `#A3D9C0`
    - **Pending / Possible Match**: Text `#B7791F`, Background `#FEF3C7`, Border `#FCD34D`
    - **Urgent / High Priority**: Text `#B3261E`, Background `#FEE2E2`, Border `#FCA5A5`
- **Strict Touch Target**: Minimum 48px to 56px interactive target zones.
- **Strict Left Alignment**: Predictable eye travel without decorative visual noise.

---

## 📱 Complete 9-Screen Workflow

1. **Screen 1: Choose Site (`choose_site`)**
   - Field site & organization selection ("Organization A" vs "Organization B").
   - Volunteer name entry (`Sundaram`).
   - Clean 56px primary "Continue" button.

2. **Screen 2: Register – Choose Type (`register_choose_type`)**
   - Persistent top bar showing active camp, volunteer name, and offline sync strip (`Offline · 12 waiting to sync`).
   - Two large tappable cards: **"Person found here"** vs **"Looking for someone"**.
   - Bottom navigation (Register, Search, Matches, Priority).

3. **Screen 3: Register – Speak (`register_speak`)**
   - 160px round microphone action button with recording pulse animation and live timer (`0:08 · Tap to stop`).
   - Contextual voice prompt guide: *"Say: name, age, village, father's name, what they are wearing"*.
   - Alternative *"Type instead"* direct link.

4. **Screen 4: Verify Details (`verify_details`)**
   - Grey box showing spoken transcript extraction.
   - Large editable single-column form fields:
     - Name, Gender chips (`[Male]`, `[Female]`, `[Other]`), Age band chips (`[Under 12]`, `[12–18]`, `[19–59]`, `[60+]`).
     - Village, Father's/spouse's name with system unsure indicator (amber border and `"Please check"` tag).
     - Clothing & marks description, Add photo button.
     - Family missing check toggle (`[Yes]`, `[No]`).
   - "Save" button committing directly to Dexie.js IndexedDB and updating the offline sync queue.

5. **Screen 5: Suggested Matches (`suggested_matches`)**
   - Side-by-side found person and searched person photo cards.
   - Match confidence score badge (e.g. `87% Strong match`, `72% Possible match`).
   - Phonetic and location similarity breakdown with tick marks.
   - "Review" button and "Not the same person" dismissal link.

6. **Screen 6: Match Review (`match_review`)**
   - Detailed comparison card.
   - 3-Step Verification Stepper:
     1. *Officer here confirms* (Done)
     2. *Officer at other site confirms* (Current)
     3. *Family answers a question* (Locked)
   - "Confirm Officer Check" primary action button.
   - "Flag an issue" secondary action.
   - Privacy guarantee: *"Location is shown after all three steps."*

7. **Screen 7: Family Status Portal (`family_status_portal`)**
   - Public-facing QR portal screen for anxious family members.
   - English & Tamil language toggle (`English | தமிழ்`).
   - Large bilingual status sentence:
     *"A possible match is being checked."* / *"சாத்தியமான பொருத்தம் சரிபார்க்கப்படுகிறது."*
   - Person being searched for (`Selvi Rajesh (~28 yrs)`).
   - Emergency hotline button: **"Call Helpline: 1077"**.
   - Nearest Help Desk card (`Desk 3, Camp A – Govt. High School`, `Open 24 hours`).

8. **Screen 8: Search Records (`search_records`)**
   - Real-time Dexie.js search across names, villages, and relative names.
   - Result cards displaying thumbnail, Age, Village, Camp, and status badge (`Possible match`, `Registered`, `Reunited`).
   - Direct tap navigates into Match Review.

9. **Screen 9: Priority Cases (`priority_cases`)**
   - Top triage counter: **312 Registered**, **48 Searching**, **186 Reunited**.
   - High-priority case list with bold reasons:
     - *Aravind* (`Child alone` in bold red)
     - *Unknown Male* (`Not identified` in bold amber)
     - *Lakshmi Narayanan* (`No match after 24 hours` in bold navy)
   - 56px "Open" button for instant case triage.

---

## ⚡ Offline-First Architecture (Dexie.js & PWA)

- **Dexie.js (IndexedDB)**:
  - Local database `ReuniteReliefDB` stores `records`, `matches`, and `sites`.
  - Full CRUD operations run without network connectivity.
  - Automatic offline queue counter (`offlineCount`) with simulated multi-site cloud synchronization.
- **Service Worker (`public/sw.js`)**:
  - Pre-caches core app shell and assets for 100% offline access in disaster zones.
- **Web App Manifest (`public/manifest.json`)**:
  - Fullscreen standalone PWA support on iOS and Android.

---

## 🚀 Running the Application

### Development Server
```bash
cmd /c npm run dev
```

### Production Build
```bash
cmd /c npm run build
```

### Preview Production Build
```bash
cmd /c npm run preview
```

---

## Local voice intake server

Runs entirely on this laptop: faster-whisper for speech to text, Ollama (llama3.2:3b) for text to fields.

```bash
# one-time
.venv\Scripts\pip install -r server/requirements.txt
.venv\Scripts\pip install -r server/requirements-gpu.txt   # NVIDIA GPU only (~1.2 GB download)
ollama pull llama3.2:3b

# run (from the project root), then start the front end with `npm run dev`
.venv\Scripts\python -m uvicorn server.main:app --port 8000
```

On first start the speech model downloads into `server/models/` (large-v3-turbo ~1.6 GB for GPU,
small ~480 MB for CPU). If Hugging Face downloads stall, set `HF_HUB_DISABLE_XET=1`.
With both models loaded the GPU uses about 4.9 GB.

Settings (environment variables):

| Variable | Default | |
|---|---|---|
| `WHISPER_GPU_MODEL` | `large-v3-turbo` | Model used on the GPU |
| `WHISPER_GPU_COMPUTE` | `float16` | `int8_float16` if GPU memory is tight |
| `WHISPER_CPU_MODEL` | `small` | Fallback model (int8) when the GPU is not usable |
| `WHISPER_DEVICE` | `auto` | `auto`, `cuda` or `cpu` |
| `WHISPER_LANGUAGE` | `en` | `auto` to let Whisper detect the language |
| `WHISPER_PROMPT` | camp names list | Biases spelling of names and villages |
| `OLLAMA_MODEL` | `llama3.2:3b` | |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | |
| `OLLAMA_TIMEOUT` | `15` | Seconds; on timeout the transcript is returned with empty fields |
| `OLLAMA_KEEP_ALIVE` | `60m` | How long Ollama keeps the model loaded |

The front end reaches the server through the Vite proxy at `/api`.

Test with sample clips (server must be running): `.venvScriptspython server	est_voice.py`
