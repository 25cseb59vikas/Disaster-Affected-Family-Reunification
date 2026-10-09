"""Server-owned physical site registry; inactive sites remain valid for old confirmations."""
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from . import store

router = APIRouter()
TYPES = {"camp", "hospital", "relief centre", "other"}
SEEDS = [("camp-a", "Camp A", "camp"), ("hospital-b", "Hospital B", "hospital")]

class SiteInput(BaseModel):
    name: str
    type: str = "other"

class SiteUpdate(BaseModel):
    name: str | None = None
    active: bool | None = None

def ensure_sites():
    c = store.conn()
    c.execute("CREATE TABLE IF NOT EXISTS sites (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1)")
    for sid, name, kind in SEEDS:
        c.execute("INSERT OR IGNORE INTO sites (id,name,type,active) VALUES (?,?,?,1)", (sid,name,kind))
    c.commit()

def list_sites():
    ensure_sites()
    return [dict(id=r['id'], name=r['name'], type=r['type'], active=bool(r['active'])) for r in store.conn().execute('SELECT * FROM sites ORDER BY rowid')]

def physical_site_ids():
    return {s['id'] for s in list_sites()}

@router.get('/sites')
def get_sites():
    return {'sites': list_sites()}

@router.post('/sites', status_code=201)
def add_site(body: SiteInput):
    name = body.name.strip()
    if not (2 <= len(name) <= 80) or body.type not in TYPES:
        raise HTTPException(422, 'Name must be 2-80 characters and type must be valid')
    ensure_sites()
    c = store.conn()
    existing = {s['id'] for s in list_sites()}
    base = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or 'site'
    sid = base
    n = 2
    while sid in existing:
        sid = f'{base}-{n}'
        n += 1
    c.execute('INSERT INTO sites (id,name,type,active) VALUES (?,?,?,1)', (sid,name,body.type))
    c.commit()
    return {'id':sid,'name':name,'type':body.type,'active':True}

@router.patch('/sites/{site_id}')
def update_site(site_id: str, body: SiteUpdate):
    ensure_sites()
    current = next((s for s in list_sites() if s['id'] == site_id), None)
    if current is None:
        raise HTTPException(404, 'Site not found')
    name = body.name.strip() if body.name is not None else current['name']
    if not (2 <= len(name) <= 80):
        raise HTTPException(422, 'Name must be 2-80 characters')
    active = current['active'] if body.active is None else body.active
    c = store.conn()
    c.execute('UPDATE sites SET name=?,active=? WHERE id=?', (name,int(active),site_id))
    c.commit()
    return {**current,'name':name,'active':active}
