"""Sync routes between sites, plus a link simulator that only affects these routes."""
import asyncio
import logging
import os

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import HTMLResponse

from . import matching, store

log = logging.getLogger("sync")

# Simulated link between the camp laptop and the other site. Voice and /health ignore it.
link = {"up": True, "delay_ms": int(os.getenv("LINK_DELAY_MS", "600"))}


async def simulated_link() -> None:
    if not link["up"]:
        raise HTTPException(503, "Link down")
    await asyncio.sleep(link["delay_ms"] / 1000)


router = APIRouter()


@router.post("/sync/push", dependencies=[Depends(simulated_link)])
def sync_push(body: dict = Body(...)):
    site = body.get("site")
    if not isinstance(site, str) or not site:
        raise HTTPException(422, "site is required")
    accepted = store.add_records(body.get("records") or [], origin=site)
    accepted += store.add_events(body.get("events") or [], origin=site)
    changed = matching.update_suggestions()
    log.info("push from %s: %d accepted, %d suggestions changed", site, len(accepted), changed)
    return {"accepted": accepted}


@router.get("/sync/pull", dependencies=[Depends(simulated_link)])
def sync_pull(since: int = 0, site: str = ""):
    return store.pull(since, site)


@router.get("/sim/state")
def sim_state():
    return link


@router.post("/sim/state")
def sim_set(body: dict = Body(...)):
    if "up" in body:
        link["up"] = bool(body["up"])
    if "delay_ms" in body:
        link["delay_ms"] = max(0, min(30000, int(body["delay_ms"])))
    log.info("link simulator: %s", link)
    return link


@router.get("/sim", response_class=HTMLResponse)
def sim_page():
    return SIM_PAGE


SIM_PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link simulator</title>
<style>
  body { font: 15px/1.4 system-ui, sans-serif; background: #F6F3EC; color: #0F1B2D; margin: 0; padding: 16px; }
  main { max-width: 400px; margin: 0 auto; background: #fff; border: 1px solid #E4E7EB; border-radius: 12px; padding: 16px; }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
  .state { font-size: 17px; font-weight: 600; margin: 0 0 12px; }
  .up { color: #2E7D5B; } .down { color: #B3261E; }
  button { height: 48px; border-radius: 10px; border: 0; font: 600 15px system-ui; padding: 0 16px; cursor: pointer; }
  .primary { background: #C2540F; color: #fff; width: 100%; margin-bottom: 16px; }
  label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
  input { height: 44px; width: 120px; font: 15px system-ui; padding: 0 10px; border: 1px solid #E4E7EB; border-radius: 10px; }
  .row { display: flex; gap: 8px; align-items: center; }
  p.note { color: #5B6675; font-size: 14px; margin: 16px 0 0; }
</style></head>
<body><main>
  <h1>Link simulator</h1>
  <p class="state" id="state">…</p>
  <button class="primary" id="toggle">…</button>
  <label for="delay">Delay on sync calls (ms)</label>
  <div class="row"><input id="delay" type="number" min="0" max="30000" step="100"><button id="save">Set delay</button></div>
  <p class="note">Only sync calls are affected. Voice and health checks keep working.</p>
</main>
<script>
  const base = location.pathname.replace(/\\/sim\\/?$/, '');
  let link = {};
  const show = s => {
    link = s;
    const el = document.getElementById('state');
    el.textContent = s.up ? 'Link is up' : 'Link is down';
    el.className = 'state ' + (s.up ? 'up' : 'down');
    document.getElementById('toggle').textContent = s.up ? 'Take link down' : 'Bring link up';
    document.getElementById('delay').value = s.delay_ms;
  };
  const send = body => fetch(base + '/sim/state', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body) }).then(r => r.json()).then(show);
  document.getElementById('toggle').onclick = () => send({ up: !link.up });
  document.getElementById('save').onclick = () => send({ delay_ms: Number(document.getElementById('delay').value) });
  fetch(base + '/sim/state').then(r => r.json()).then(show);
</script>
</body></html>"""
