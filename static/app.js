const DB_NAME='reunite-demo', STORE='records';
function db(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function all(){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readonly'),r=tx.objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>d.close()})}
async function save(r){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(r);tx.oncomplete=()=>{d.close();resolve()};tx.onerror=()=>reject(tx.error)})}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function render(){const rows=await all();document.getElementById('count').textContent=rows.length;document.getElementById('records').innerHTML=rows.length?rows.slice().reverse().map(r=>`<div class="record"><b>${esc(r.name)}</b> · ${esc(r.camp)} · ${esc(r.kind)}<div class="small">Age: ${esc(r.age??'Unknown')} · Relative: ${esc(r.relative_name||'Not provided')} · ID: ${esc(r.id.slice(0,8))}</div></div>`).join(''):'No records yet.'}
function network(){document.getElementById('status').textContent=navigator.onLine?'🟢 Device reports network available — server connectivity not guaranteed':'🟠 Offline mode — registration remains available'}window.addEventListener('online',network);window.addEventListener('offline',network);network();
document.getElementById('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const r=Object.fromEntries(f.entries());r.id=crypto.randomUUID();r.age=r.age===''?null:Number(r.age);r.created_at=new Date().toISOString();await save(r);document.getElementById('message').textContent='✓ Saved locally in IndexedDB';e.target.reset();render()});
document.getElementById('sync').onclick=async()=>{const el=document.getElementById('syncMessage');el.textContent='Synchronizing…';try{const response=await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({records:await all()})});if(!response.ok)throw Error('Server rejected sync');const data=await response.json();for(const r of data.records)await save(r);el.textContent=`✓ Synchronized ${data.records.length} records across camps`;render()}catch(e){el.textContent='Offline or server unavailable. Records are safe locally; retry later.'}};
document.getElementById('matches').onclick=async()=>{const el=document.getElementById('matchList');try{const response=await fetch('/api/matches');if(!response.ok)throw Error();const data=await response.json();el.innerHTML=data.matches.length?data.matches.map(m=>`<div class="record"><b>${esc(m.missing.name)}</b> ↔ <b>${esc(m.survivor.name)}</b><div>${esc(m.missing.camp)} → ${esc(m.survivor.camp)} · Ranking score: ${m.score}/100</div><div>Needs human verification</div></div>`).join(''):'No candidates found. Try synchronizing first.'}catch(e){el.textContent='Matching server unavailable. Locally stored registrations are still accessible.'}};
document.getElementById('demo').onclick=async()=>{for(const r of [{camp:'Camp 1',kind:'missing',name:'Arun Kumar',age:12,relative_name:'Ravi Kumar',relationship:'Father',location:'Bridge',notes:'Separated during flood'},{camp:'Camp 2',kind:'survivor',name:'Arunkumar',age:12,relative_name:'Ravi Kumar',relationship:'Father',location:'Bridge',notes:'Looking for father'}])await save({...r,id:crypto.randomUUID(),created_at:new Date().toISOString()});document.getElementById('syncMessage').textContent='Fictional records added. Click Sync camps now, then Find possible matches.';render()};
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});render();

document.getElementById('loadFamilies').onclick = async () => {
    const familyList = document.getElementById('familyList');

    familyList.textContent = 'Loading families...';

    try {
        const response = await fetch('/api/families');

        if (!response.ok) {
            throw new Error('Unable to load families');
        }

        const data = await response.json();

        familyList.innerHTML = data.families.map(family => `
            <div class="record">
                <h3>${esc(family.household_name)}</h3>
                <p>Location: ${esc(family.home_location)}</p>
                <p>Family ID: ${esc(family.family_id)}</p>

                <h4>Family Members</h4>

                ${family.members.map(member => `
                    <div class="record">
                        <b>${esc(member.name)}</b>
                        <p>Age: ${esc(member.age ?? 'Unknown')}</p>
                        <p>Relationship: ${esc(member.relationship)}</p>
                    </div>
                `).join('')}
            </div>
        `).join('') || 'No families registered.';

    } catch (error) {
        familyList.textContent =
            'Family database unavailable. Connect to the server.';
    }
};

document.getElementById('findFamilyConnections').onclick = async () => {
    const box = document.getElementById('familyConnections');
    box.textContent = 'Searching family connections...';

    try {
        const response = await fetch('/api/family-connections');

        if (!response.ok) {
            throw new Error('Server unavailable');
        }

        const data = await response.json();

        box.innerHTML = data.connections.length
            ? data.connections.map(c => `
                <div class="record">
                    <h3>Potential Family Connection</h3>

                    <p><b>Survivor:</b> ${esc(c.survivor)}</p>
                    <p><b>Camp:</b> ${esc(c.camp)}</p>
                    <p><b>Possible family:</b> ${esc(c.household_name)}</p>
                    <p><b>Possible member:</b> ${esc(c.possible_member)}</p>
                    <p><b>Similarity ranking:</b> ${esc(c.score)}/100</p>
                    
<p>
    <b>Officer review:</b>
    <span
        class="verification-status"
        data-status-record="${esc(c.record_id)}"
        data-status-family="${esc(c.family_id)}">
        Pending review
    </span>
</p>

<div style="display:flex;gap:10px;margin-top:12px;">
    <button
        data-verify="verified"
        data-record-id="${esc(c.record_id)}"
        data-family-id="${esc(c.family_id)}">
        ✓ Verify
    </button>

    <button
        data-verify="rejected"
        data-record-id="${esc(c.record_id)}"
        data-family-id="${esc(c.family_id)}">
        ✕ Reject
    </button>
</div>


                    <p class="small">
                        ⚠ Human verification required before
                        confirming identity or sharing family details.
                    </p>
                </div>
            `).join('')
            : 'No potential family connections found.';
await loadVerificationStatuses();

    } catch (error) {
        box.textContent =
            'Unable to search family connections. Check the server.';
    }
};

document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-verify]");
    if (!button) return;

    const recordId = button.dataset.recordId;
    const familyId = button.dataset.familyId;
    const status = button.dataset.verify;

    if (!["verified", "rejected"].includes(status)) return;

    const confirmed = confirm(
        `Record this match as ${status}? Only do this after officer review.`
    );
    if (!confirmed) return;

    try {
        const response = await fetch("/api/verify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                record_id: recordId,
                family_id: familyId,
                status: status
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Verification failed");
        }

        alert(`Decision saved: ${result.status}`);
         await loadVerificationStatuses();
         await refreshOfficerDashboard();
    } catch (error) {
        alert(error.message);
    }
});


async function loadVerificationStatuses() {
    try {
        const response = await fetch("/api/verifications", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Unable to fetch verification status");
        }

        const data = await response.json();

        document.querySelectorAll(".verification-status").forEach(el => {
            const recordId = el.dataset.statusRecord;
            const familyId = el.dataset.statusFamily;

            const decision = data.verifications.find(v =>
                v.record_id === recordId &&
                v.family_id === familyId
            );

            const status = decision ? decision.status : "pending";

            if (status === "verified") {
                el.textContent = "✓ Verified (demo)";
            } else if (status === "rejected") {
                el.textContent = "✕ Rejected";
            } else {
                el.textContent = "⏳ Pending review";
            }
        });

    } catch (error) {
        console.error("Verification status error:", error);
    }
}
async function refreshOfficerDashboard() {
    try {
        const [matchesResponse, reviewsResponse] = await Promise.all([
            fetch("/api/family-connections", { cache: "no-store" }),
            fetch("/api/verifications", { cache: "no-store" })
        ]);

        if (!matchesResponse.ok || !reviewsResponse.ok) {
            throw new Error("Dashboard data unavailable");
        }

        const matchesData = await matchesResponse.json();
        const reviewsData = await reviewsResponse.json();

        const matches = matchesData.connections || [];
        const reviews = reviewsData.verifications || [];

        let pending = 0;
        let verified = 0;
        let rejected = 0;

        for (const match of matches) {
            const review = reviews.find(r =>
                r.record_id === match.record_id &&
                r.family_id === match.family_id
            );

            if (review?.status === "verified") {
                verified++;
            } else if (review?.status === "rejected") {
                rejected++;
            } else {
                pending++;
            }

        }

        document.getElementById("pendingCount").textContent = pending;
        document.getElementById("verifiedCount").textContent = verified;
        document.getElementById("rejectedCount").textContent = rejected;

    } catch (error) {
        console.error("Dashboard error:", error);
        alert("Unable to load officer dashboard.");
    }
    await loadOfficerDescriptions();
}

document.getElementById("refreshDashboard")
    ?.addEventListener("click", refreshOfficerDashboard);



document.addEventListener("click", async (event) => {
    if (!event.target.closest("#clearDemoRecords")) return;
    const confirmed = confirm(
        "Delete ALL fictional demo registrations and officer decisions? This cannot be undone."
    );

    if (!confirmed) return;

    const button = document.getElementById("clearDemoRecords");
    button.disabled = true;

    try {
        // First clear the server records.
        const response = await fetch("/api/reset-demo", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Server reset failed");
        }

        // Clear locally saved registrations.
        await new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction(STORE, "readwrite");

                tx.objectStore(STORE).clear();

                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };

                tx.onerror = () => {
                    db.close();
                    reject(tx.error);
                };
            };
        });

        alert("Demo registrations cleared successfully!");
        location.reload();

    } catch (error) {
        alert("Reset incomplete: " + error.message);
    } finally {
        button.disabled = false;
    }
});

document.addEventListener("click", async (event) => {
    if (event.target.id !== "analyzePhoto") return;

    const photo = document.getElementById("survivorPhoto").files[0];
    const status = document.getElementById("photoStatus");
    const description = document.getElementById("photoDescription");

    if (!photo) {
        status.textContent = "Please select a photo first.";
        return;
    }

    status.textContent = "🔍 AI is analyzing the photo...";
    description.value = "";

    const formData = new FormData();
    formData.append("photo", photo);

    try {
        const response = await fetch("/api/analyze-photo", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Analysis failed");
        }

        description.value = result.description;
        status.textContent = "✓ Analysis complete — officer review required";

    } catch (error) {
        status.textContent = "❌ " + error.message;
    }
});async function loadOfficerDescriptions() {
    const container = document.getElementById('officerDescriptions');
    if (!container) return;

    container.textContent = 'Loading AI descriptions...';

    try {
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({records: []})
        });

        if (!response.ok) throw new Error('Unable to load records');

        const data = await response.json();
        const records = data.records.filter(r => r.ai_description?.trim());

        container.replaceChildren();

        if (records.length === 0) {
            container.textContent = 'No AI descriptions available yet.';
            return;
        }

        for (const record of records) {
            const card = document.createElement('div');
            card.style.cssText =
                'padding:15px;margin:10px 0;border:1px solid #ccc;border-radius:8px;';

            const name = document.createElement('h4');
            name.textContent = record.name + ' — ' + record.camp;

            const description = document.createElement('p');
            description.textContent = record.ai_description;

            const warning = document.createElement('small');
            warning.textContent = 'AI-generated description — verify manually.';

            card.append(name, description, warning);
            container.appendChild(card);
        }
    } catch (error) {
        container.textContent = 'Could not load AI descriptions.';
        console.error(error);
    }
}
let cameraStream = null;

const openCamera = document.getElementById("openCamera");
const capturePhoto = document.getElementById("capturePhoto");
const closeCamera = document.getElementById("closeCamera");
const cameraPreview = document.getElementById("cameraPreview");
const cameraCanvas = document.getElementById("cameraCanvas");
const survivorPhoto = document.getElementById("survivorPhoto");
const cameraStatus = document.getElementById("cameraStatus");

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    cameraPreview.srcObject = null;
    cameraPreview.style.display = "none";
    capturePhoto.style.display = "none";
    closeCamera.style.display = "none";
}

openCamera.addEventListener("click", async () => {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });

        cameraPreview.srcObject = cameraStream;
        cameraPreview.style.display = "block";
        capturePhoto.style.display = "inline-block";
        closeCamera.style.display = "inline-block";

        cameraStatus.textContent = "Camera is ready.";
    } catch (error) {
        cameraStatus.textContent =
            "Camera unavailable. Please allow camera access or upload a photo.";
        console.error(error);
    }
});

capturePhoto.addEventListener("click", () => {
    if (!cameraStream || !cameraPreview.videoWidth) {
        cameraStatus.textContent = "Camera is not ready yet.";
        return;
    }

    cameraCanvas.width = cameraPreview.videoWidth;
    cameraCanvas.height = cameraPreview.videoHeight;

    const context = cameraCanvas.getContext("2d");
    context.drawImage(cameraPreview, 0, 0);

    cameraCanvas.toBlob(blob => {
        if (!blob) {
            cameraStatus.textContent = "Could not capture photo.";
            return;
        }

        const file = new File(
            [blob],
            "camera-capture.jpg",
            { type: "image/jpeg" }
        );

        const transfer = new DataTransfer();
        transfer.items.add(file);
        survivorPhoto.files = transfer.files;

        cameraStatus.textContent =
            "Photo captured! Click Analyze Photo to generate its description.";

        stopCamera();
    }, "image/jpeg", 0.85);
});

closeCamera.addEventListener("click", () => {
    stopCamera();
    cameraStatus.textContent = "Camera closed.";
});

window.addEventListener("pagehide", stopCamera);