# Reunite

Offline-first family reunification after a disaster. React, TypeScript, Tailwind and Dexie (IndexedDB) in the
browser; a local FastAPI server for voice intake, sync between sites, matching and the family status page.

**Demo only. Use fictional information.** There is no staff login, and device storage is not encrypted.

## One app, three ways in

The first screen asks **"How are you using Reunite?"** and the device remembers the answer
("Change how you use Reunite" goes back to it).

| Who | Where | What |
|---|---|---|
| Camp or hospital volunteer | `/` | Choose the site (Camp A or Hospital B), register people by voice or typing with a photo, review suggested matches (evidence For / Against / Unknown / Ask next), confirm at both sites, then the family check. Search, Priority and notifications. |
| Authority console | `/console` | All sites at once, desktop first: overview per site with link status, match queue with evidence beside it and **Accept** / **Reject** (reason required), priority cases, searchable records, registration at the authority desk, and a "Load fictional demo family" helper. |
| Family member | `/family` | Report a missing person (phone and relationship required), check status by reference code, get help, or call the voice line instead (`/phone`). Sends reports only; never downloads anyone else's records. |

Other pages: `/status?code=…` (public status by code) and `/phone` (simulated phone line, demo).

How a match is verified: officers at **both** sites confirm, then the family answers a question about a private
detail recorded with the found person. The authority console can accept a match and run the family check, but its
acceptance never replaces either site's confirmation. Every decision is an event that syncs like a record.

From 1024 px wide the field app uses a side navigation, grids for lists and two columns for Verify and the
evidence screen; on phones it is a single column with bottom navigation. "Add photo" uses the rear camera on phones
and offers the webcam or a file upload on desktops. "Describe clothing from the photo" asks a local vision model
(see below) and marks the result "Please check".

## Running

```bash
npm install
npm run dev          # https://localhost:3000 (self-signed certificate; needed for the microphone on phones)
npm run dev:http     # http://localhost:3001 (for testing offline use and installing; see below)
npm run build        # production build into dist/
npm run preview:http # serve the build at http://localhost:4174
```

The front end reaches the server through `/api` on the same address (Vite proxy to `http://127.0.0.1:8000`).

## Install as an app, and offline use

The app is a PWA: `public/manifest.json` (name Reunite, standalone, icons in `public/icons/`) and `public/sw.js`,
which caches the app shell, scripts, styles and fonts so it opens with no network after the first visit. API calls
(`/api/…`: sync, voice, status) are never cached. Chrome only runs service workers on a trusted origin, so the
self-signed HTTPS dev server shows the app but does not work offline; use plain HTTP on localhost for that.

Check it on a laptop:

1. `npm run build` then `npm run preview:http`, and open http://localhost:4174 in Chrome or Edge.
2. DevTools → Application → **Manifest**: no installability errors. **Service workers**: `sw.js` activated.
3. Click **Install app** on the first screen (or the install icon in the address bar).
4. Stop the preview server and reload: the app still opens.

On Android Chrome: connect the phone by USB, open `chrome://inspect` → Port forwarding, forward `4174` to
`localhost:4174`, open http://localhost:4174 on the phone, then menu → **Install app**. (Alternatively add
`http://<laptop-ip>:4174` under `chrome://flags/#unsafely-treat-insecure-origin-as-secure` on the phone.)

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

Photo descriptions use a local vision model: `ollama pull qwen2.5vl:3b` (about 3 GB; `VISION_MODEL` to change it).
Without it, "Describe clothing from the photo" says it is not available and the field is typed instead.

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
| `VISION_MODEL` | `qwen2.5vl:3b` | Ollama model for "Describe clothing from the photo" |
| `VISION_TIMEOUT` | `120` | Seconds |

The front end reaches the server through the Vite proxy at `/api`.

Test with sample clips (server must be running): `.venv\Scripts\python server\test_voice.py`

## Sync, test data and matching

- One dev server: `npm run dev` → https://localhost:3000 (first screen and volunteer app), `/console`, `/family`,
  `/status`. It uses a self-signed certificate: accept the browser warning once.
- Link panel for sync between sites: http://localhost:8000/sim (also https://localhost:3000/api/sim): presets, live
  traffic counters, and **Reset demo**, which reloads the test data and makes open apps clear both sites' local data.
- Test data: `.venv\Scripts\python -m server.testdata` (writes `server/testdata/`), then
  `.venv\Scripts\python -m server.load_testdata --reset` to load it; each site receives it on its next sync.
- Matching quality: `.venv\Scripts\python -m server.evaluate`. Weights are in `server/match_config.py`.
- Server data lives in `server/data/reunite.db` (not in git). After `load_testdata --reset` from the command line,
  clear site data in the browser (DevTools → Application → Storage); the Reset demo button does this for you.

## On a phone (same Wi-Fi)

1. Start the voice server and `npm run dev` on the laptop. Vite prints the network URL, e.g. `https://192.168.23.155:3000`.
2. Open that URL on the phone and accept the certificate warning (self-signed). HTTPS is what allows the microphone.
3. Everything goes through `/api` on the same address: voice, sync, family status and `/api/sim`.

If the phone cannot connect, allow the port in Windows Firewall (in an administrator terminal):

```
netsh advfirewall firewall add rule name="Reunite dev server 3000" dir=in action=allow protocol=TCP localport=3000 profile=any
```
