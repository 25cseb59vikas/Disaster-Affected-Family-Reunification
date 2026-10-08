# REUNITE AI — offline-first hackathon MVP

**Demo only. Fictional data only.** This is not suitable for production disaster response: no staff authentication, encryption-at-rest, audited consent, or robust conflict handling yet.

## Run

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open **http://localhost:5000** in Chrome/Edge. The service worker is supported on localhost. Visit once while connected to the local server so the PWA caches its files. Register people even if the server is stopped, then restart the server and click **Sync camps now**.

## Demo
1. Click **Load fictional demo family**.
2. Click **Sync camps now**.
3. Click **Find possible matches**.
4. Stop the server; reload the cached page and register a new fictional person.
5. Restart the server; sync again.

## Important limits
- The browser stores records in IndexedDB, separately for each browser profile/device. To simulate two distinct camp devices, open the app in two different browser profiles and sync both.
- Camp-to-camp transfers require the Flask server to be reachable. Satellite is not implemented; it is a possible transport for the same HTTPS API.
- The ranking score is **not a verified identity probability**. Human review is mandatory.
- The initial matching uses Python's standard-library similarity function, not RapidFuzz or MiniLM. Add those after the offline-to-sync flow works.
- On a remote phone, a production PWA requires HTTPS. `localhost` works for local laptop testing.
