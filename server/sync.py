"""Sync routes between sites, plus a link simulator that only affects these routes."""
import asyncio
import json
import logging
import os
import time
import uuid

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from starlette.concurrency import run_in_threadpool

from . import matching, store
from .load_testdata import load

log = logging.getLogger("sync")

DEFAULT_DELAY_MS = int(os.getenv("LINK_DELAY_MS", "600"))

# Simulated link between the camp laptop and the other site. Voice, /health and /status ignore it.
# kbps limits throughput (None = unlimited).
link = {"up": True, "delay_ms": DEFAULT_DELAY_MS, "kbps": None}
PRESETS = {
    "good": {"up": True, "delay_ms": 50, "kbps": None},
    "satellite": {"up": True, "delay_ms": 600, "kbps": 64},
    "down": {"up": False},
}


def new_stats() -> dict:
    return {"bytes_up": 0, "bytes_down": 0, "records_up": 0, "records_down": 0, "events_up": 0,
            "syncs": 0, "last_sync": None}


stats = new_stats()


def demo_epoch() -> str:
    """Changes on every demo reset; apps that see a new value clear their local data."""
    epoch = store.get_meta("demo_epoch")
    if epoch is None:
        epoch = uuid.uuid4().hex
        store.set_meta("demo_epoch", epoch)
    return epoch


async def simulate(n_bytes: int) -> None:
    if not link["up"]:
        raise HTTPException(503, "Link down")
    seconds = link["delay_ms"] / 1000
    if link["kbps"]:
        seconds += n_bytes * 8 / (link["kbps"] * 1000)
    await asyncio.sleep(seconds)


router = APIRouter()


@router.post("/sync/push")
async def sync_push(request: Request):
    raw = await request.body()
    await simulate(len(raw))
    try:
        body = json.loads(raw)
    except ValueError:
        raise HTTPException(422, "Body must be JSON")
    site = body.get("site")
    if not isinstance(site, str) or not site:
        raise HTTPException(422, "site is required")
    records, events = body.get("records") or [], body.get("events") or []

    def apply() -> list[str]:
        accepted = store.add_records(records, origin=site) + store.add_events(events, origin=site)
        matching.update_suggestions()
        return accepted

    accepted = await run_in_threadpool(apply)
    stats["bytes_up"] += len(raw)
    stats["records_up"] += len(records)
    stats["events_up"] += len(events)
    log.info("push from %s: %d records, %d events, %d bytes", site, len(records), len(events), len(raw))
    return {"accepted": accepted}


@router.get("/sync/pull")
async def sync_pull(since: int = 0, site: str = ""):
    if not link["up"]:
        raise HTTPException(503, "Link down")
    data = await run_in_threadpool(store.pull, since, site)
    content = json.dumps(data).encode()
    await simulate(len(content))
    stats["bytes_down"] += len(content)
    stats["records_down"] += len(data["records"])
    stats["syncs"] += 1
    stats["last_sync"] = time.time()
    return Response(content=content, media_type="application/json")


@router.get("/sim/state")
def sim_state():
    return {**link, "stats": stats, "epoch": demo_epoch()}


@router.post("/sim/state")
async def sim_set(request: Request):
    body = await request.json()
    if body.get("preset") in PRESETS:
        link.update(PRESETS[body["preset"]])
    if "up" in body:
        link["up"] = bool(body["up"])
    if "delay_ms" in body:
        link["delay_ms"] = max(0, min(30000, int(body["delay_ms"])))
    log.info("link simulator: %s", link)
    return sim_state()


@router.post("/sim/reset")
def sim_reset():
    """Reloads the test data and tells every open app (via /health) to clear its local data."""
    loaded, suggestions = load(reset=True)
    store.set_meta("demo_epoch", uuid.uuid4().hex)
    stats.clear()
    stats.update(new_stats())
    link.update({"up": True, "delay_ms": DEFAULT_DELAY_MS, "kbps": None})
    log.info("demo reset: %d records, %d suggestions", loaded, suggestions)
    return {"loaded": loaded, "suggestions": suggestions, **sim_state()}


@router.get("/sim", response_class=HTMLResponse)
def sim_page():
    return SIM_PAGE


SIM_PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link panel</title>
<style>
  * { box-sizing: border-box; }
  body { font: 15px/1.4 system-ui, sans-serif; background: #F6F3EC; color: #0F1B2D; margin: 0; padding: 16px; }
  main { max-width: 430px; margin: 0 auto; }
  section { background: #fff; border: 1px solid #E4E7EB; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
  h2 { font-size: 14px; font-weight: 500; color: #5B6675; margin: 0 0 8px; }
  .state { font-size: 17px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .up { color: #2E7D5B; } .up .dot { background: #2E7D5B; }
  .down { color: #B3261E; } .down .dot { background: #B3261E; }
  .sub { color: #5B6675; font-size: 14px; margin: 4px 0 0; }
  .presets { display: grid; gap: 8px; }
  button { min-height: 48px; border-radius: 10px; font: 600 15px system-ui; padding: 0 16px; cursor: pointer;
           border: 1px solid #E4E7EB; background: #fff; color: #0F1B2D; width: 100%; text-align: left; }
  button.on { border-color: #0F1B2D; box-shadow: inset 0 0 0 1px #0F1B2D; }
  button.reset { background: #C2540F; color: #fff; border: 0; text-align: center; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; margin: 0; }
  dt { color: #5B6675; } dd { margin: 0; font-variant-numeric: tabular-nums; font-weight: 500; text-align: right; }
  p.note { color: #5B6675; font-size: 14px; margin: 8px 0 0; }
  #msg { min-height: 20px; }
</style></head>
<body><main>
  <h1>Link panel</h1>
  <section>
    <p class="state" id="state"><span class="dot"></span><span id="state-text">…</span></p>
    <p class="sub" id="state-sub"></p>
  </section>
  <section>
    <h2>Presets</h2>
    <div class="presets">
      <button data-preset="good">Good link</button>
      <button data-preset="satellite">Satellite (600 ms, slow)</button>
      <button data-preset="down">Link down</button>
    </div>
  </section>
  <section>
    <h2>Traffic since the last reset</h2>
    <dl>
      <dt>Sent by sites (pushes)</dt><dd id="bytes-up">–</dd>
      <dt>Received by sites (pulls)</dt><dd id="bytes-down">–</dd>
      <dt>Records sent</dt><dd id="records-up">–</dd>
      <dt>Records received</dt><dd id="records-down">–</dd>
      <dt>Decisions sent</dt><dd id="events-up">–</dd>
      <dt>Syncs</dt><dd id="syncs">–</dd>
      <dt>Last sync</dt><dd id="last-sync">–</dd>
    </dl>
    <p class="note">Only sync calls go over this link. Voice, health checks and family status keep working.</p>
  </section>
  <section>
    <button class="reset" id="reset">Reset demo</button>
    <p class="note" id="msg">Reloads the test people and clears both sites' local data in open apps.</p>
  </section>
</main>
<script>
  const base = location.pathname.replace(/\\/sim\\/?$/, '');
  const $ = id => document.getElementById(id);
  const kb = b => b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB';
  const ago = t => { if (!t) return 'never'; const s = Math.round(Date.now() / 1000 - t); return s < 2 ? 'just now' : s + ' s ago'; };
  const show = s => {
    const preset = !s.up ? 'down' : s.kbps ? 'satellite' : s.delay_ms <= 100 ? 'good' : null;
    $('state').className = 'state ' + (s.up ? 'up' : 'down');
    $('state-text').textContent = s.up ? 'Link up' : 'Link down';
    $('state-sub').textContent = s.up ? `Delay ${s.delay_ms} ms` + (s.kbps ? ` · ${s.kbps} kbit/s` : ' · no speed limit') : 'Sync calls fail; sites keep working offline';
    document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('on', b.dataset.preset === preset));
    const st = s.stats;
    $('bytes-up').textContent = kb(st.bytes_up); $('bytes-down').textContent = kb(st.bytes_down);
    $('records-up').textContent = st.records_up; $('records-down').textContent = st.records_down;
    $('events-up').textContent = st.events_up; $('syncs').textContent = st.syncs; $('last-sync').textContent = ago(st.last_sync);
  };
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}) }).then(r => r.json());
  document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => post('/sim/state', { preset: b.dataset.preset }).then(show));
  $('reset').onclick = async () => {
    $('reset').disabled = true; $('msg').textContent = 'Resetting…';
    const r = await post('/sim/reset');
    show(r);
    $('msg').textContent = `Demo reset: ${r.loaded} test people, ${r.suggestions} suggestions. Open apps clear their local data on their next check (within 15 s).`;
    $('reset').disabled = false;
  };
  const poll = () => fetch(base + '/sim/state').then(r => r.json()).then(show).catch(() => { $('state-text').textContent = 'Server not reachable'; });
  poll(); setInterval(poll, 1000);
</script>
</body></html>"""
