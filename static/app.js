/**
 * REUNITE AI — Humanitarian Family Reunification Desk
 * Preserves all IndexedDB structures, schema, APIs, and workflows
 * Adds: Tactical UI, Voice Input, Offline AI Normalization, Explainable Clue Breakdown,
 * Human Verification, Family Notification Dispatch, Live Instant Search, and Simulated SATCOM Logging.
 */

// ============================================================================
// 1. INDEXEDDB CORE (PRESERVED ARCHITECTURE)
// ============================================================================
const DB_NAME = 'reunite-demo';
const STORE = 'records';

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function all() {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => d.close();
  });
}

async function save(r) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(r);
    tx.oncomplete = () => {
      d.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// ============================================================================
// 2. TACTICAL AUDIO FEEDBACK SYNTHESIZER (WEB AUDIO API - ZERO EXTERNAL ASSETS)
// ============================================================================
let audioEnabled = true;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    } catch (e) {}
  }
}

function playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.08) {
  if (!audioEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function playSound(name) {
  if (!audioEnabled) return;
  if (name === 'save') {
    playTone(587.33, 'sine', 0.1, 0.07); // D5
    setTimeout(() => playTone(880, 'sine', 0.15, 0.07), 80); // A5
  } else if (name === 'sync') {
    playTone(440, 'triangle', 0.08, 0.06);
    setTimeout(() => playTone(659.25, 'triangle', 0.12, 0.06), 70);
  } else if (name === 'match') {
    playTone(523.25, 'sine', 0.1, 0.08); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.1, 0.08), 80); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.18, 0.08), 160); // G5
  } else if (name === 'verify') {
    playTone(523.25, 'sine', 0.08, 0.07);
    setTimeout(() => playTone(783.99, 'sine', 0.15, 0.08), 70);
  } else if (name === 'notify') {
    playTone(659.25, 'sine', 0.1, 0.09);
    setTimeout(() => playTone(880, 'sine', 0.12, 0.09), 90);
    setTimeout(() => playTone(1046.5, 'sine', 0.22, 0.1), 180);
  } else if (name === 'click') {
    playTone(320, 'sine', 0.04, 0.04);
  }
}

// Audio Toggle Button
const audioToggleBtn = document.getElementById('audioToggleBtn');
if (audioToggleBtn) {
  audioToggleBtn.onclick = () => {
    audioEnabled = !audioEnabled;
    document.getElementById('audioIcon').textContent = audioEnabled ? '🔊' : '🔇';
    document.getElementById('audioText').textContent = audioEnabled ? 'Audio' : 'Muted';
    showToast(audioEnabled ? 'Tactical audio enabled' : 'Tactical audio muted', 'info');
    if (audioEnabled) playSound('click');
  };
}

// ============================================================================
// 3. TOAST NOTIFICATION UTILITY
// ============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-weight:600;">${esc(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================================
// 4. NAVIGATION DECK TABS
// ============================================================================
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanes = document.querySelectorAll('.tab-pane');

navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.tab;
    navTabs.forEach(t => t.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const targetPane = document.getElementById(targetId);
    if (targetPane) targetPane.classList.add('active');
    playSound('click');
  });
});

function switchTab(tabId) {
  const tabBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (tabBtn) tabBtn.click();
}

// Secondary tab triggers
const btnRunMatchTab = document.getElementById('btnRunMatchTab');
if (btnRunMatchTab) btnRunMatchTab.onclick = () => document.getElementById('matches').click();

const btnSyncFromMatchTab = document.getElementById('btnSyncFromMatchTab');
if (btnSyncFromMatchTab) btnSyncFromMatchTab.onclick = () => document.getElementById('sync').click();

const btnDemoFromMatchTab = document.getElementById('btnDemoFromMatchTab');
if (btnDemoFromMatchTab) btnDemoFromMatchTab.onclick = () => document.getElementById('demo').click();

const btnSatcomTriggerSync = document.getElementById('btnSatcomTriggerSync');
if (btnSatcomTriggerSync) btnSatcomTriggerSync.onclick = () => document.getElementById('sync').click();

// ============================================================================
// 5. SATCOM CONSOLE LOGGER
// ============================================================================
function logSatcom(message, isAck = false) {
  const consoleEl = document.getElementById('satcomConsoleLog');
  if (!consoleEl) return;
  const entry = document.createElement('div');
  entry.className = 'console-entry';
  const now = new Date().toTimeString().split(' ')[0];
  entry.innerHTML = `<span class="timestamp">[${now}]</span> ${isAck ? '<span class="ack">' + esc(message) + '</span>' : esc(message)}`;
  consoleEl.appendChild(entry);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

// ============================================================================
// 6. RECORD CLASSIFICATION TOGGLES (SURVIVOR VS MISSING)
// ============================================================================
const kindCardSurvivor = document.getElementById('kindCardSurvivor');
const kindCardMissing = document.getElementById('kindCardMissing');
const kindSelect = document.getElementById('kindSelect');
const formModeTag = document.getElementById('formModeTag');

function setKindSelection(val) {
  if (val === 'missing') {
    kindCardMissing.classList.add('selected');
    kindCardSurvivor.classList.remove('selected');
    kindCardMissing.querySelector('input').checked = true;
    kindSelect.value = 'missing';
    if (formModeTag) formModeTag.textContent = 'Missing-Person Inquiry';
  } else {
    kindCardSurvivor.classList.add('selected');
    kindCardMissing.classList.remove('selected');
    kindCardSurvivor.querySelector('input').checked = true;
    kindSelect.value = 'survivor';
    if (formModeTag) formModeTag.textContent = 'Survivor Intake';
  }
}

if (kindCardSurvivor) {
  kindCardSurvivor.onclick = () => {
    setKindSelection('survivor');
    playSound('click');
  };
}
if (kindCardMissing) {
  kindCardMissing.onclick = () => {
    setKindSelection('missing');
    playSound('click');
  };
}

// ============================================================================
// 7. OFFLINE AI VOICE & INFORMATION NORMALIZATION ENGINE
// ============================================================================
const voiceRecordBtn = document.getElementById('voiceRecordBtn');
const voiceBtnText = document.getElementById('voiceBtnText');
const aiDispatchInput = document.getElementById('aiDispatchInput');
const aiExtractBtn = document.getElementById('aiExtractBtn');
const aiPreviewBox = document.getElementById('aiPreviewBox');
const aiPreviewTags = document.getElementById('aiPreviewTags');

let isRecording = false;
let recognition = null;

// Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    voiceRecordBtn.classList.add('recording');
    voiceBtnText.textContent = 'Listening to field dispatch…';
    playSound('click');
  };

  recognition.onresult = event => {
    const transcript = event.results[0][0].transcript;
    aiDispatchInput.value = transcript;
    showToast('Voice dispatch captured', 'success');
    runOfflineAiExtraction(transcript);
  };

  recognition.onerror = event => {
    showToast('Voice error: ' + (event.error || 'speech unavailable'), 'warning');
  };

  recognition.onend = () => {
    isRecording = false;
    voiceRecordBtn.classList.remove('recording');
    voiceBtnText.textContent = 'Record Voice Dispatch';
  };
}

if (voiceRecordBtn) {
  voiceRecordBtn.onclick = () => {
    if (!SpeechRecognition) {
      showToast('Web Speech API is not supported in this browser. Please type dispatch notes or select a sample below.', 'warning');
      return;
    }
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };
}

// Quick Sample Chips
document.querySelectorAll('.sample-chip').forEach(chip => {
  chip.onclick = () => {
    const sample = chip.dataset.sample;
    aiDispatchInput.value = sample;
    playSound('click');
    runOfflineAiExtraction(sample);
  };
});

/**
 * Offline AI Linguistic Normalization Engine
 * Extracts entity clues (Person name, age, relative, relationship, location, kind, notes)
 * entirely offline on-device using regex & contextual linguistic rules.
 */
function parseDispatchText(text) {
  const result = {
    kind: null,
    name: null,
    age: null,
    relative_name: null,
    relationship: '',
    location: null,
    notes: text.trim()
  };

  if (!text) return result;

  // 1. Detect Kind
  if (/(?:missing|search(?:ing)?|looking for|lost|disappeared|inquiry)/i.test(text)) {
    result.kind = 'missing';
  } else if (/(?:found|survivor|shelter(?:ed)?|located|admitted|safe)/i.test(text)) {
    result.kind = 'survivor';
  }

  // 2. Detect Age
  const ageMatch = text.match(/(?:age\s*:?\s*|aged\s*|(?:\b))(\d{1,3})\s*(?:yo|years?\s*old|yr|yrs|\s+years|\b)/i);
  if (ageMatch && ageMatch[1]) {
    const val = parseInt(ageMatch[1], 10);
    if (val >= 0 && val <= 120) result.age = val;
  }

  // 3. Detect Kinship Relationship
  const relPatterns = [
    { name: 'Father', re: /\bfather\b|\bdad\b/i },
    { name: 'Mother', re: /\bmother\b|\bmom\b/i },
    { name: 'Son', re: /\bson\b/i },
    { name: 'Daughter', re: /\bdaughter\b/i },
    { name: 'Sibling', re: /\bbrother\b|\bsister\b|\bsibling\b/i },
    { name: 'Spouse', re: /\bhusband\b|\bwife\b|\bspouse\b/i },
    { name: 'Grandparent', re: /\bgrandfather\b|\bgrandmother\b|\bgrandpa\b|\bgrandma\b/i },
    { name: 'Guardian', re: /\bguardian\b|\buncle\b|\baunt\b/i }
  ];
  for (const p of relPatterns) {
    if (p.re.test(text)) {
      result.relationship = p.name;
      break;
    }
  }

  // 4. Detect Relative Name
  const relativeMatch = text.match(/(?:father|mother|son|daughter|relative|parent|contact|wife|husband|uncle|brother|sister)(?:\s+is|\s*:)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (relativeMatch && relativeMatch[1]) {
    result.relative_name = relativeMatch[1].trim();
  }

  // 5. Detect Person Name
  // Heuristic patterns
  const namePatterns = [
    /(?:named|name is|boy|girl|child|person|survivor|patient|victim)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:looking for|missing)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /Found\s+(?:\d{1,3}yo\s+)?(?:boy|girl|child|man|woman)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  for (const re of namePatterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const candidate = m[1].trim();
      if (!/^(father|mother|bridge|sector|camp|doctor|hospital|river)$/i.test(candidate)) {
        result.name = candidate;
        break;
      }
    }
  }

  // 6. Detect Location
  const locMatch = text.match(/(?:at|near|around|from|in)\s+((?:River\s+Bridge|North\s+Temple|Railway\s+Station|Flood\s+Zone|Sector\s+\d+|Bridge|Camp\s+\d+|Shelter\s+\d+|Clinic|Hospital)[^,.]*)/i);
  if (locMatch && locMatch[1]) {
    result.location = locMatch[1].trim();
  }

  return result;
}

function runOfflineAiExtraction(text) {
  const parsed = parseDispatchText(text);

  // Render preview tags
  aiPreviewTags.innerHTML = `
    ${parsed.kind ? `<span class="ai-tag-chip">Kind: <b>${parsed.kind === 'survivor' ? 'Survivor' : 'Missing'}</b></span>` : ''}
    ${parsed.name ? `<span class="ai-tag-chip">Name: <b>${esc(parsed.name)}</b></span>` : ''}
    ${parsed.age !== null ? `<span class="ai-tag-chip">Age: <b>${parsed.age}</b></span>` : ''}
    ${parsed.relative_name ? `<span class="ai-tag-chip">Relative: <b>${esc(parsed.relative_name)}</b></span>` : ''}
    ${parsed.relationship ? `<span class="ai-tag-chip">Relation: <b>${esc(parsed.relationship)}</b></span>` : ''}
    ${parsed.location ? `<span class="ai-tag-chip">Location: <b>${esc(parsed.location)}</b></span>` : ''}
  `;
  aiPreviewBox.classList.add('active');

  // Auto-fill form fields
  if (parsed.kind) setKindSelection(parsed.kind);
  if (parsed.name) {
    const input = document.getElementById('nameInput');
    input.value = parsed.name;
    flashField(input);
  }
  if (parsed.age !== null) {
    const input = document.getElementById('ageInput');
    input.value = parsed.age;
    flashField(input);
  }
  if (parsed.relative_name) {
    const input = document.getElementById('relativeNameInput');
    input.value = parsed.relative_name;
    flashField(input);
  }
  if (parsed.relationship) {
    const select = document.getElementById('relationshipSelect');
    select.value = parsed.relationship;
    flashField(select);
  }
  if (parsed.location) {
    const input = document.getElementById('locationInput');
    input.value = parsed.location;
    flashField(input);
  }
  if (parsed.notes) {
    const notesInput = document.getElementById('notesInput');
    notesInput.value = parsed.notes;
    flashField(notesInput);
  }

  playSound('save');
  showToast('Offline AI normalized clues and populated registration form', 'success');
}

if (aiExtractBtn) {
  aiExtractBtn.onclick = () => {
    const text = aiDispatchInput.value.trim();
    if (!text) {
      showToast('Please type field notes or speak via microphone first', 'warning');
      return;
    }
    runOfflineAiExtraction(text);
  };
}

function flashField(el) {
  el.classList.add('field-highlight');
  setTimeout(() => el.classList.remove('field-highlight'), 1600);
}

// Reset button
const btnResetForm = document.getElementById('btnResetForm');
if (btnResetForm) {
  btnResetForm.onclick = () => {
    document.getElementById('form').reset();
    setKindSelection('survivor');
    aiDispatchInput.value = '';
    aiPreviewBox.classList.remove('active');
    document.getElementById('message').textContent = '';
    playSound('click');
  };
}

// ============================================================================
// 8. METRICS & TELEMETRY UPDATERS
// ============================================================================
async function updateMetrics(rows) {
  const total = rows.length;
  const missing = rows.filter(r => r.kind === 'missing').length;
  const survivors = rows.filter(r => r.kind === 'survivor').length;

  document.getElementById('metricTotal').textContent = total;
  document.getElementById('metricMissing').textContent = missing;
  document.getElementById('metricSurvivors').textContent = survivors;

  const vaultCount = document.getElementById('vaultRecordCount');
  if (vaultCount) vaultCount.textContent = total;

  const navLocal = document.getElementById('navLocalCount');
  if (navLocal) navLocal.textContent = total;
}

// ============================================================================
// 9. RENDER LOCAL DATABASE RECORDS (WITH REAL-TIME FILTERING)
// ============================================================================
let currentFilter = 'all';
let currentCampFilter = 'all';
let currentSearchTerm = '';

const localSearchInput = document.getElementById('localSearchInput');
if (localSearchInput) {
  localSearchInput.addEventListener('input', e => {
    currentSearchTerm = e.target.value.toLowerCase().trim();
    render();
  });
}

document.querySelectorAll('.filter-pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    playSound('click');
    render();
  });
});

const filterCampSelect = document.getElementById('filterCampSelect');
if (filterCampSelect) {
  filterCampSelect.addEventListener('change', e => {
    currentCampFilter = e.target.value;
    playSound('click');
    render();
  });
}

async function render() {
  const rows = await all();
  document.getElementById('count').textContent = rows.length;
  updateMetrics(rows);

  // Apply filters
  let filtered = rows.slice();

  if (currentFilter === 'missing') {
    filtered = filtered.filter(r => r.kind === 'missing');
  } else if (currentFilter === 'survivor') {
    filtered = filtered.filter(r => r.kind === 'survivor');
  }

  if (currentCampFilter !== 'all') {
    filtered = filtered.filter(r => (r.camp || '').includes(currentCampFilter));
  }

  if (currentSearchTerm) {
    filtered = filtered.filter(r => {
      const q = currentSearchTerm;
      return (
        (r.name || '').toLowerCase().includes(q) ||
        (r.relative_name || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q) ||
        (r.camp || '').toLowerCase().includes(q) ||
        (r.id || '').toLowerCase().includes(q)
      );
    });
  }

  const recordsEl = document.getElementById('records');
  if (!recordsEl) return;

  if (!filtered.length) {
    recordsEl.innerHTML = `
      <div style="text-align: center; padding: 36px 12px; color: var(--text-muted);">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom: 8px; opacity: 0.6;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <div style="font-weight: 700; font-size: 15px;">No records match your filter</div>
        <div style="font-size: 12.5px; margin-top: 4px;">Try searching with different terms or register a new record.</div>
      </div>
    `;
    return;
  }

  recordsEl.innerHTML = `
    <div class="records-grid">
      ${filtered.slice().reverse().map(r => `
        <div class="record-item-card kind-${r.kind === 'missing' ? 'missing' : 'survivor'}">
          <div>
            <div class="record-top-meta">
              <span class="record-badge ${r.kind === 'missing' ? 'badge-missing' : 'badge-survivor'}">
                ${r.kind === 'missing' ? '🟠 Missing Report' : '🟢 Survivor Found'}
              </span>
              <span class="record-camp-tag">📍 ${esc(r.camp)}</span>
            </div>

            <div class="record-person-name">${esc(r.name)}</div>

            <div class="record-details-list">
              <span><b>Age:</b> ${r.age !== null && r.age !== undefined ? esc(r.age) + ' yrs' : 'Unknown'}</span>
              <span><b>Relative:</b> ${esc(r.relative_name || 'Not provided')} ${r.relationship ? '(' + esc(r.relationship) + ')' : ''}</span>
              <span><b>Location:</b> ${esc(r.location || 'Not specified')}</span>
            </div>

            ${r.notes ? `<div class="record-notes-quote">“${esc(r.notes)}”</div>` : ''}
          </div>

          <div class="record-footer-meta">
            <span>ID: ${esc(r.id.slice(0, 8))}</span>
            <span>${r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Local'}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================================
// 10. NETWORK STATUS MONITORING
// ============================================================================
function network() {
  const isOnline = navigator.onLine;
  const statusEl = document.getElementById('status');
  const headerNetPill = document.getElementById('headerNetPill');
  const headerNetDot = document.getElementById('headerNetDot');
  const headerNetText = document.getElementById('headerNetText');

  if (isOnline) {
    statusEl.className = 'status-banner';
    statusEl.innerHTML = `
      <span>🟢 <b>Device network available:</b> Ready for SATCOM synchronization. Local IndexedDB remains primary authority.</span>
      <span style="font-size: 12px; font-weight: 600;">Status: Ready</span>
    `;
    if (headerNetPill) {
      headerNetPill.className = 'telemetry-pill online';
      headerNetDot.className = 'pulse-dot';
      headerNetText.textContent = 'Online / Local First';
    }
  } else {
    statusEl.className = 'status-banner offline';
    statusEl.innerHTML = `
      <span>🟠 <b>Air-gapped offline mode:</b> Registration &amp; local search operate seamlessly in IndexedDB. Queuing delta sync.</span>
      <span style="font-size: 12px; font-weight: 600;">Offline Vault Active</span>
    `;
    if (headerNetPill) {
      headerNetPill.className = 'telemetry-pill offline-mode';
      headerNetDot.className = 'pulse-dot amber';
      headerNetText.textContent = 'Offline (Air-Gapped)';
    }
  }
}
window.addEventListener('online', network);
window.addEventListener('offline', network);
network();

// ============================================================================
// 11. RECORD REGISTRATION SUBMISSION (PRESERVES #form & FIELD LOGIC)
// ============================================================================
document.getElementById('form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const r = Object.fromEntries(f.entries());

  // Ensure synchronized kind value from radio or select
  if (r.kindRadio) r.kind = r.kindRadio;
  delete r.kindRadio;

  r.id = crypto.randomUUID();
  r.age = r.age === '' || r.age === null ? null : Number(r.age);
  r.created_at = new Date().toISOString();

  await save(r);

  const msg = document.getElementById('message');
  msg.className = 'form-feedback success';
  msg.innerHTML = `✓ Saved offline in IndexedDB (ID: <code>${r.id.slice(0, 8)}</code> at ${esc(r.camp)})`;

  playSound('save');
  showToast(`Successfully registered ${r.name} into local vault`, 'success');

  // Log in SATCOM console
  logSatcom(`Local record saved: [${r.kind.toUpperCase()}] ${r.name} (${r.camp})`);

  e.target.reset();
  setKindSelection('survivor');
  aiDispatchInput.value = '';
  aiPreviewBox.classList.remove('active');
  render();
});

// ============================================================================
// 12. SATCOM SYNC (PRESERVES #sync & /api/sync CONTRACT)
// ============================================================================
document.getElementById('sync').onclick = async () => {
  const el = document.getElementById('syncMessage');
  el.textContent = 'Connecting to Simulated SATCOM Gateway…';
  logSatcom('Uplink started: Connecting to Geostationary Transponder at 35,786 km...');
  playSound('sync');

  try {
    const localRecords = await all();
    logSatcom(`Transmitting ${localRecords.length} local delta records to Remote Disaster Center...`);

    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: localRecords })
    });

    if (!response.ok) throw Error('Server rejected sync');
    const data = await response.json();

    for (const r of data.records) {
      await save(r);
    }

    el.textContent = `✓ Synchronized ${data.records.length} records across disaster relief centers`;
    logSatcom(`Synchronization complete. Remote delta acknowledged: ${data.records.length} records active across camps.`, true);
    playSound('save');
    showToast(`SATCOM sync complete: ${data.records.length} total records reconciled`, 'success');
    render();
  } catch (e) {
    el.textContent = 'Offline or server unavailable. Records are safe locally in IndexedDB; retry when link resumes.';
    logSatcom('SATCOM uplink unavailable or timeout. Preserving local IndexedDB records safely offline.');
    showToast('SATCOM uplink offline. All records safe locally.', 'warning');
  }
};

// ============================================================================
// 13. MATCHING ENGINE & EXPLAINABLE CLUE VERIFICATION (PRESERVES #matches & /api/matches)
// ============================================================================
let activeCandidateMatches = [];
let verifiedMatchesState = {}; // matchId -> { status: 'verified' | 'flagged', officer: '...', notes: '...' }

// Similarity string calculator for frontend explainability
function strSimilarity(a, b) {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().replace(/\s+/g, '');
  const s2 = b.toLowerCase().replace(/\s+/g, '');
  if (s1 === s2) return 1;
  let matches = 0;
  const maxLen = Math.max(s1.length, s2.length);
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) matches++;
  }
  return matches / maxLen;
}

document.getElementById('matches').onclick = async () => {
  const el = document.getElementById('matchList');
  const badge = document.getElementById('matchResultsBadge');
  el.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">Querying Multi-Factor Matching Engine…</div>';
  playSound('click');

  try {
    const response = await fetch('/api/matches');
    if (!response.ok) throw Error();
    const data = await response.json();
    activeCandidateMatches = data.matches || [];

    // Update count in badge and ribbon
    if (badge) badge.textContent = `${activeCandidateMatches.length} Candidates`;
    const metricMatches = document.getElementById('metricMatches');
    if (metricMatches) metricMatches.textContent = activeCandidateMatches.length;
    const navMatchCount = document.getElementById('navMatchCount');
    if (navMatchCount) navMatchCount.textContent = activeCandidateMatches.length;
    const heroStatMatches = document.getElementById('heroStatMatches');
    if (heroStatMatches) heroStatMatches.textContent = `${activeCandidateMatches.length} Active`;

    if (!activeCandidateMatches.length) {
      el.innerHTML = `
        <div style="text-align: center; padding: 36px 12px; color: var(--text-muted);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom: 8px; opacity: 0.6;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <div style="font-weight: 700; font-size: 15px;">No cross-center candidates found</div>
          <div style="font-size: 12.5px; margin-top: 4px;">Make sure both camps have synced with the central relief registry.</div>
        </div>
      `;
      return;
    }

    playSound('match');
    showToast(`Matching engine found ${activeCandidateMatches.length} potential candidates!`, 'success');
    renderMatchesList();

    // Trigger hero animation to Stage 4 (Match Found)
    if (typeof setAnimationStage === 'function') {
      stopAutoLoop();
      setAnimationStage(4);
    }

    // Auto-switch to Matches tab so responder sees results immediately
    switchTab('tab-matches');
  } catch (e) {
    el.textContent = 'Matching server unavailable. Locally stored registrations remain accessible.';
    showToast('Matching server unavailable while offline', 'warning');
  }
};

function renderMatchesList() {
  const el = document.getElementById('matchList');
  if (!activeCandidateMatches.length) return;

  el.innerHTML = activeCandidateMatches.map((m, idx) => {
    const matchId = `match_${m.missing.id}_${m.survivor.id}`;
    const vState = verifiedMatchesState[matchId] || { status: 'unverified' };
    const isVerified = vState.status === 'verified';
    const isFlagged = vState.status === 'flagged';

    // Factor Breakdown
    const nameSim = Math.round(strSimilarity(m.missing.name, m.survivor.name) * 100);
    const relSim = (m.missing.relative_name && m.survivor.relative_name)
      ? Math.round(strSimilarity(m.missing.relative_name, m.survivor.relative_name) * 100)
      : 0;
    const ageDiff = (m.missing.age !== null && m.survivor.age !== null)
      ? Math.abs(m.missing.age - m.survivor.age)
      : null;
    const ageScore = (ageDiff !== null && ageDiff <= 2) ? 100 : 0;

    let scoreClass = 'score-mid';
    if (m.score >= 80) scoreClass = 'score-high';
    else if (m.score < 65) scoreClass = 'score-low';

    return `
      <div class="match-card ${isVerified ? 'verified' : ''}" id="card_${matchId}">
        
        <!-- Mini Reunited Visualizer -->
        <div class="mini-reunite-visual">
          <div class="mini-figure-icon ${isVerified ? 'green' : ''}">👤</div>
          <div class="mini-connect-wire ${isVerified ? 'verified' : ''}">
            <span class="mini-satcom-pill">Simulated SATCOM</span>
          </div>
          ${isVerified ? '<span style="font-size:16px;">💚</span>' : '<span style="font-size:11px; font-weight:700; color:#0284c7;">✓ Candidate</span>'}
          <div class="mini-connect-wire ${isVerified ? 'verified' : ''}"></div>
          <div class="mini-figure-icon ${isVerified ? 'green' : ''}">👤</div>
        </div>

        <!-- Top Score Header -->
        <div class="match-card-top">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="match-score-badge ${scoreClass}">
              <span>⚡ ${m.score}% Confidence</span>
            </div>
            <span style="font-size: 12.5px; color: var(--text-muted); font-weight: 600;">
              Cross-Center Link: ${esc(m.missing.camp)} ↔ ${esc(m.survivor.camp)}
            </span>
          </div>

          <div>
            ${isVerified ? `
              <span class="match-status-pill status-verified">
                ✓ Verified by Authority (Officer SEC7)
              </span>
            ` : isFlagged ? `
              <span class="match-status-pill status-flagged">
                ⚠ Field Inspection Dispatched
              </span>
            ` : `
              <span class="match-status-pill status-unverified">
                ⏳ Unverified Candidate
              </span>
            `}
          </div>
        </div>

        <!-- Side-by-Side Identity Comparison Matrix -->
        <div class="comparison-grid">
          
          <!-- Left: Missing Person Report -->
          <div class="person-dossier missing">
            <span class="dossier-tag missing">Missing Inquiry</span>
            <div class="dossier-name">${esc(m.missing.name)}</div>
            <div class="dossier-row"><b>Location:</b> <span>${esc(m.missing.camp)} (Report Origin)</span></div>
            <div class="dossier-row"><b>Age:</b> <span>${m.missing.age !== null ? esc(m.missing.age) + ' yrs' : 'Unknown'}</span></div>
            <div class="dossier-row"><b>Relative:</b> <span>${esc(m.missing.relative_name || 'None')} ${m.missing.relationship ? '(' + esc(m.missing.relationship) + ')' : ''}</span></div>
            <div class="dossier-row"><b>Last Seen:</b> <span>${esc(m.missing.location || 'Not provided')}</span></div>
            ${m.missing.notes ? `<div style="font-size: 11.5px; color: var(--text-faint); margin-top: 6px; font-style: italic;">“${esc(m.missing.notes)}”</div>` : ''}
          </div>

          <!-- Middle: VS Divider -->
          <div class="comparison-vs">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4"/></svg>
          </div>

          <!-- Right: Survivor Located -->
          <div class="person-dossier survivor">
            <span class="dossier-tag survivor">Survivor Secured</span>
            <div class="dossier-name">${esc(m.survivor.name)}</div>
            <div class="dossier-row"><b>Location:</b> <span>${esc(m.survivor.camp)} (Safe Haven)</span></div>
            <div class="dossier-row"><b>Age:</b> <span>${m.survivor.age !== null ? esc(m.survivor.age) + ' yrs' : 'Unknown'}</span></div>
            <div class="dossier-row"><b>Relative:</b> <span>${esc(m.survivor.relative_name || 'None')} ${m.survivor.relationship ? '(' + esc(m.survivor.relationship) + ')' : ''}</span></div>
            <div class="dossier-row"><b>Found Near:</b> <span>${esc(m.survivor.location || 'Not provided')}</span></div>
            ${m.survivor.notes ? `<div style="font-size: 11.5px; color: var(--text-faint); margin-top: 6px; font-style: italic;">“${esc(m.survivor.notes)}”</div>` : ''}
          </div>

        </div>

        <!-- Explainable AI Score Factors -->
        <div class="explain-factors-panel">
          <div class="explain-title">
            <span>Explainable AI Clue Breakdown</span>
            <span>${esc(m.explanation)}</span>
          </div>

          <div class="factor-bars-grid">
            <div class="factor-item">
              <div class="factor-label-row">
                <span>Name Match (Weight: 65%)</span>
                <span>${nameSim}%</span>
              </div>
              <div class="factor-bar-bg">
                <div class="factor-bar-fill" style="width: ${nameSim}%;"></div>
              </div>
            </div>

            <div class="factor-item">
              <div class="factor-label-row">
                <span>Relative Kinship (Weight: 20%)</span>
                <span>${relSim}%</span>
              </div>
              <div class="factor-bar-bg">
                <div class="factor-bar-fill emerald" style="width: ${relSim}%;"></div>
              </div>
            </div>

            <div class="factor-item">
              <div class="factor-label-row">
                <span>Age Alignment (Weight: 15%)</span>
                <span>${ageDiff !== null ? `Δ = ${ageDiff} yr` : 'N/A'}</span>
              </div>
              <div class="factor-bar-bg">
                <div class="factor-bar-fill amber" style="width: ${ageScore}%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Human Authority Verification & Family Notification Actions -->
        <div class="card-action-bar">
          <div class="officer-verify-group">
            <button type="button" class="btn-verify" onclick="verifyMatch('${matchId}', 'verified')">
              ✓ Verify &amp; Confirm Identity
            </button>

            <button type="button" class="btn-flag" onclick="verifyMatch('${matchId}', 'flagged')">
              ⚠ Request Field Inspection
            </button>

            <button type="button" class="secondary-outline" style="font-size: 12px; padding: 7px 11px;" onclick="dismissCandidate('${matchId}')">
              Dismiss
            </button>
          </div>

          <div>
            <button type="button" class="btn-notify-family" onclick="openNotifyModal(${idx})">
              📢 Notify Family &amp; Issue Pass
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

// Verification Handlers
window.verifyMatch = function(matchId, status) {
  verifiedMatchesState[matchId] = {
    status: status,
    officer: 'OFFICER-SEC7-084',
    time: new Date().toISOString()
  };
  playSound(status === 'verified' ? 'verify' : 'click');
  showToast(status === 'verified' ? 'Match verified by authorized officer!' : 'Field inspection ticket issued', 'success');
  renderMatchesList();

  if (status === 'verified') {
    const verifiedCount = Object.values(verifiedMatchesState).filter(s => s.status === 'verified').length;
    const heroStatVerified = document.getElementById('heroStatVerified');
    if (heroStatVerified) heroStatVerified.textContent = `${verifiedCount} Confirmed`;

    // Advance hero animation: Stage 5 (Human Verification) -> Stage 6 (Reunited)
    if (typeof setAnimationStage === 'function') {
      stopAutoLoop();
      setAnimationStage(5);
      setTimeout(() => {
        setAnimationStage(6);
      }, 1400);
    }
  }
};

window.dismissCandidate = function(matchId) {
  activeCandidateMatches = activeCandidateMatches.filter(m => `match_${m.missing.id}_${m.survivor.id}` !== matchId);
  playSound('click');
  showToast('Candidate dismissed from active queue', 'info');
  renderMatchesList();
};

// ============================================================================
// 14. EMERGENCY FAMILY NOTIFICATION MODAL
// ============================================================================
const notifyModalBackdrop = document.getElementById('notifyModalBackdrop');
const notifyDispatchPreview = document.getElementById('notifyDispatchPreview');
let activeNotifyMatch = null;

window.openNotifyModal = function(idx) {
  const match = activeCandidateMatches[idx];
  if (!match) return;
  activeNotifyMatch = match;

  const ticketId = `REUNITE-${match.missing.id.slice(0, 4)}-${match.survivor.id.slice(0, 4)}`.toUpperCase();
  const dateStr = new Date().toLocaleString();

  notifyDispatchPreview.textContent = 
`============================================================
HUMANITARIAN RELIEF DISPATCH — FAMILY REUNIFICATION NOTICE
============================================================
DISPATCH ID : ${ticketId}
TIMESTAMP   : ${dateStr}
STATUS      : VERIFIED BY RELIEF AUTHORITY

ATTENTION   : ${match.missing.relative_name || 'Family Contact'} (${match.missing.relationship || 'Relative'})
RE          : ${match.missing.name} (Age: ${match.missing.age ?? 'N/A'})

STATUS CONFIRMATION:
We are pleased to report that ${match.survivor.name} has been SAFELY LOCATED and is currently under care.

LOCATION DETAILS:
- Current Safe Facility : ${match.survivor.camp}
- Holding Sector        : Tent Clinic / Sheltered Bay
- Physical Condition    : ${match.survivor.notes || 'Sheltered & in good care'}

COORDINATION ACTION:
Please proceed to the Relief Officer Desk at ${match.missing.camp} with Reference Token: [${ticketId}].
A coordinated transport escort will facilitate family reunion.
============================================================`;

  notifyModalBackdrop.classList.add('active');
  playSound('notify');
};

const notifyModalCloseBtn = document.getElementById('notifyModalCloseBtn');
const notifyModalCancelBtn = document.getElementById('notifyModalCancelBtn');
const notifyModalTransmitBtn = document.getElementById('notifyModalTransmitBtn');

function closeNotifyModal() {
  notifyModalBackdrop.classList.remove('active');
  playSound('click');
}

if (notifyModalCloseBtn) notifyModalCloseBtn.onclick = closeNotifyModal;
if (notifyModalCancelBtn) notifyModalCancelBtn.onclick = closeNotifyModal;

if (notifyModalTransmitBtn) {
  notifyModalTransmitBtn.onclick = () => {
    playSound('notify');
    showToast('Emergency Family Dispatch broadcast via SMS & Relief Channel!', 'success');
    logSatcom(`Family Notification dispatched for [${activeNotifyMatch?.missing.name} ↔ ${activeNotifyMatch?.survivor.name}]`);
    closeNotifyModal();
  };
}

// ============================================================================
// 15. LOAD FICTIONAL DEMO FAMILY (PRESERVES #demo & EXACT DATA SCHEMA)
// ============================================================================
document.getElementById('demo').onclick = async () => {
  const demoRecords = [
    {
      camp: 'Camp 1',
      kind: 'missing',
      name: 'Arun Kumar',
      age: 12,
      relative_name: 'Ravi Kumar',
      relationship: 'Father',
      location: 'Bridge',
      notes: 'Separated during flood'
    },
    {
      camp: 'Camp 2',
      kind: 'survivor',
      name: 'Arunkumar',
      age: 12,
      relative_name: 'Ravi Kumar',
      relationship: 'Father',
      location: 'Bridge',
      notes: 'Looking for father'
    }
  ];

  for (const r of demoRecords) {
    await save({
      ...r,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    });
  }

  document.getElementById('syncMessage').textContent = 'Fictional demo records added. Click Sync camps now, then Find possible matches.';
  logSatcom('Loaded fictional multi-camp demo scenario: Arun Kumar (Camp 1) & Arunkumar (Camp 2)');
  playSound('save');
  showToast('Fictional disaster scenario loaded into IndexedDB!', 'success');
  render();
};

// ============================================================================
// 17. MAIN ANIMATION — “REUNITING FAMILIES” (FATHER, MOTHER & CHILD)
// ============================================================================
let animStage = 1;
let animAutoPlay = true;
let animLoopTimer = null;
let particleProgress = 0;

function setAnimationStage(stage) {
  animStage = stage;

  // Update stage pills
  document.querySelectorAll('.stage-pill-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.stage, 10) === stage);
  });

  const figFather = document.getElementById('figureFather');
  const figMother = document.getElementById('figureMother');
  const figChild = document.getElementById('figureChild');
  const connPath = document.getElementById('reuniteConnectionPath');
  const particles = document.getElementById('dataParticlesGroup');
  const matchCard = document.getElementById('matchBadgeCard');
  const verifyCard = document.getElementById('verifyBadgeCard');
  const heartSymbol = document.getElementById('reunitedHeartSymbol');

  const figBodyFather = document.getElementById('figBodyFather');
  const figTorsoFather = document.getElementById('figTorsoFather');
  const figBodyMother = document.getElementById('figBodyMother');
  const figTorsoMother = document.getElementById('figTorsoMother');
  const figBodyChild = document.getElementById('figBodyChild');
  const figTorsoChild = document.getElementById('figTorsoChild');

  const satcomLeft = document.getElementById('satcomLineLeft');
  const satcomRight = document.getElementById('satcomLineRight');
  const satcomHub = document.getElementById('satcomHubNode');

  if (!figFather || !figMother || !figChild) return;

  // Reset fills
  if (figBodyFather) figBodyFather.setAttribute('fill', 'url(#personGradFather)');
  if (figTorsoFather) figTorsoFather.setAttribute('fill', 'url(#personGradFather)');
  if (figBodyMother) figBodyMother.setAttribute('fill', 'url(#personGradMother)');
  if (figTorsoMother) figTorsoMother.setAttribute('fill', 'url(#personGradMother)');
  if (figBodyChild) figBodyChild.setAttribute('fill', 'url(#personGradChild)');
  if (figTorsoChild) figTorsoChild.setAttribute('fill', 'url(#personGradChild)');

  // Stage 1: Separated (Parents at Camp 1, Child alone at Camp 2)
  if (stage === 1) {
    figFather.style.transform = 'translate(145px, 195px)';
    figMother.style.transform = 'translate(225px, 200px)';
    figChild.style.transform = 'translate(735px, 212px)';

    if (connPath) {
      connPath.style.opacity = '0.15';
      connPath.setAttribute('stroke', 'url(#linkGrad)');
      connPath.setAttribute('stroke-width', '2');
    }
    if (particles) particles.style.opacity = '0';
    if (satcomLeft) satcomLeft.style.opacity = '0.2';
    if (satcomRight) satcomRight.style.opacity = '0.2';
    if (matchCard) matchCard.style.opacity = '0';
    if (verifyCard) verifyCard.style.opacity = '0';
    if (heartSymbol) heartSymbol.style.opacity = '0';
  }
  // Stage 2: Missing Child Inquiry & Information Connection
  else if (stage === 2) {
    figFather.style.transform = 'translate(145px, 195px)';
    figMother.style.transform = 'translate(225px, 200px)';
    figChild.style.transform = 'translate(735px, 212px)';

    if (connPath) {
      connPath.style.opacity = '0.75';
      connPath.setAttribute('stroke', 'url(#linkGrad)');
      connPath.setAttribute('stroke-width', '2.5');
    }
    if (particles) particles.style.opacity = '1';
    if (satcomLeft) satcomLeft.style.opacity = '0.4';
    if (satcomRight) satcomRight.style.opacity = '0.4';
    if (matchCard) matchCard.style.opacity = '0';
    if (verifyCard) verifyCard.style.opacity = '0';
    if (heartSymbol) heartSymbol.style.opacity = '0';
  }
  // Stage 3: Simulated SATCOM Mesh Relay
  else if (stage === 3) {
    figFather.style.transform = 'translate(145px, 195px)';
    figMother.style.transform = 'translate(225px, 200px)';
    figChild.style.transform = 'translate(735px, 212px)';

    if (connPath) {
      connPath.style.opacity = '0.75';
      connPath.setAttribute('stroke', 'url(#linkGrad)');
      connPath.setAttribute('stroke-width', '2.5');
    }
    if (particles) particles.style.opacity = '1';
    if (satcomLeft) satcomLeft.style.opacity = '0.9';
    if (satcomRight) satcomRight.style.opacity = '0.9';
    if (matchCard) matchCard.style.opacity = '0';
    if (verifyCard) verifyCard.style.opacity = '0';
    if (heartSymbol) heartSymbol.style.opacity = '0';
  }
  // Stage 4: High-Confidence Candidate Match Found
  else if (stage === 4) {
    figFather.style.transform = 'translate(145px, 195px)';
    figMother.style.transform = 'translate(225px, 200px)';
    figChild.style.transform = 'translate(735px, 212px)';

    if (connPath) {
      connPath.style.opacity = '1';
      connPath.setAttribute('stroke', 'url(#linkGrad)');
      connPath.setAttribute('stroke-width', '3.5');
    }
    if (particles) particles.style.opacity = '1';
    if (satcomLeft) satcomLeft.style.opacity = '0.9';
    if (satcomRight) satcomRight.style.opacity = '0.9';
    if (matchCard) matchCard.style.opacity = '1';
    if (verifyCard) verifyCard.style.opacity = '0';
    if (heartSymbol) heartSymbol.style.opacity = '0';
  }
  // Stage 5: Authority Verification of Parental Relation
  else if (stage === 5) {
    figFather.style.transform = 'translate(145px, 195px)';
    figMother.style.transform = 'translate(225px, 200px)';
    figChild.style.transform = 'translate(735px, 212px)';

    if (connPath) {
      connPath.style.opacity = '1';
      connPath.setAttribute('stroke', 'url(#linkGradGreen)');
      connPath.setAttribute('stroke-width', '3.5');
    }
    if (particles) particles.style.opacity = '1';
    if (matchCard) matchCard.style.opacity = '0';
    if (verifyCard) verifyCard.style.opacity = '1';
    if (heartSymbol) heartSymbol.style.opacity = '0';
  }
  // Stage 6: Family Embraced & Reunited (Father, Mother & Child together)
  else if (stage === 6) {
    // Father moves to the left of child, Mother to the right, Child right into the middle!
    figFather.style.transform = 'translate(390px, 195px)';
    figChild.style.transform = 'translate(460px, 212px)';
    figMother.style.transform = 'translate(530px, 200px)';

    // All three figures glow in radiant safe emerald
    if (figBodyFather) figBodyFather.setAttribute('fill', 'url(#personReunitedGrad)');
    if (figTorsoFather) figTorsoFather.setAttribute('fill', 'url(#personReunitedGrad)');
    if (figBodyMother) figBodyMother.setAttribute('fill', 'url(#personReunitedGrad)');
    if (figTorsoMother) figTorsoMother.setAttribute('fill', 'url(#personReunitedGrad)');
    if (figBodyChild) figBodyChild.setAttribute('fill', 'url(#personReunitedGrad)');
    if (figTorsoChild) figTorsoChild.setAttribute('fill', 'url(#personReunitedGrad)');

    if (connPath) {
      connPath.style.opacity = '0.85';
      connPath.setAttribute('stroke', 'url(#linkGradGreen)');
      connPath.setAttribute('stroke-width', '2.5');
    }
    if (particles) particles.style.opacity = '0';
    if (matchCard) matchCard.style.opacity = '0';
    if (verifyCard) verifyCard.style.opacity = '0';
    if (heartSymbol) heartSymbol.style.opacity = '1';
  }
}

function startAutoLoop() {
  stopAutoLoop();
  animAutoPlay = true;
  updatePlayButtonUI();
  animLoopTimer = setInterval(() => {
    let next = animStage + 1;
    if (next > 6) next = 1;
    setAnimationStage(next);
  }, 2200);
}

function stopAutoLoop() {
  if (animLoopTimer) {
    clearInterval(animLoopTimer);
    animLoopTimer = null;
  }
  animAutoPlay = false;
  updatePlayButtonUI();
}

function updatePlayButtonUI() {
  const icon = document.getElementById('animPlayIcon');
  const text = document.getElementById('animPlayText');
  if (icon && text) {
    icon.textContent = animAutoPlay ? '⏸' : '▶';
    text.textContent = animAutoPlay ? 'Auto' : 'Play';
  }
}

function initHeroAnimation() {
  // Scrubber clicks
  document.querySelectorAll('.stage-pill-btn').forEach(btn => {
    btn.onclick = () => {
      const stage = parseInt(btn.dataset.stage, 10);
      stopAutoLoop();
      setAnimationStage(stage);
      playSound('click');
    };
  });

  // Play/pause button
  const toggleBtn = document.getElementById('btnToggleAnimPlay');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      if (animAutoPlay) {
        stopAutoLoop();
        showToast('Animation paused on current stage', 'info');
      } else {
        startAutoLoop();
        showToast('Animation auto-looping through 6 stages', 'info');
      }
      playSound('click');
    };
  }

  // Replay reunion button
  const replayBtn = document.getElementById('btnReplayAnim');
  if (replayBtn) {
    replayBtn.onclick = () => {
      stopAutoLoop();
      setAnimationStage(1);
      setTimeout(() => startAutoLoop(), 250);
      playSound('notify');
      showToast('Replaying full Family Reunion narrative', 'success');
    };
  }

  // Particle animation loop
  const pA = document.getElementById('particleA');
  const pB = document.getElementById('particleB');
  const pSat = document.getElementById('packetSatcom');
  const path = document.getElementById('reuniteConnectionPath');

  function animateParticles() {
    if (path && pA && pB) {
      const len = path.getTotalLength ? path.getTotalLength() : 600;
      particleProgress = (particleProgress + 1.8) % len;
      if (path.getPointAtLength) {
        const ptA = path.getPointAtLength(particleProgress);
        pA.setAttribute('cx', ptA.x);
        pA.setAttribute('cy', ptA.y);

        const progB = (particleProgress + len / 2) % len;
        const ptB = path.getPointAtLength(progB);
        pB.setAttribute('cx', ptB.x);
        pB.setAttribute('cy', ptB.y);
      }

      if (pSat) {
        const satT = ((particleProgress * 1.5) % 100) / 100;
        let sx, sy;
        if (satT < 0.5) {
          const t = satT * 2;
          sx = 190 + (460 - 190) * t;
          sy = 85 + (68 - 85) * t - Math.sin(t * Math.PI) * 15;
        } else {
          const t = (satT - 0.5) * 2;
          sx = 460 + (735 - 460) * t;
          sy = 68 + (85 - 68) * t - Math.sin(t * Math.PI) * 15;
        }
        pSat.setAttribute('cx', sx);
        pSat.setAttribute('cy', sy);
      }
    }
    requestAnimationFrame(animateParticles);
  }
  requestAnimationFrame(animateParticles);

  setAnimationStage(1);
  startAutoLoop();
}

// ============================================================================
// 18. SERVICE WORKER REGISTRATION & APP INITIALIZATION
// ============================================================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

render();
initHeroAnimation();

