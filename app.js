// app.js - Versão Universal (Funciona com qualquer formato de data.js)

// 1. DADOS & BACKUP
const BACKUP_DATA = [
    {id:1,name:"bulbasaur",types:["grass","poison"],stats:{hp:45,atk:49,def:49,spa:65,spd:65,spe:45},evo:16,moves:[{name:"tackle",method:"level-up",level:1},{name:"vine-whip",method:"level-up",level:7}]},
    {id:4,name:"charmander",types:["fire"],stats:{hp:39,atk:52,def:43,spa:60,spd:50,spe:65},evo:16,moves:[{name:"scratch",method:"level-up",level:1},{name:"ember",method:"level-up",level:7},{name:"flamethrower",method:"level-up",level:31}]},
    {id:7,name:"squirtle",types:["water"],stats:{hp:44,atk:48,def:65,spa:50,spd:64,spe:43},evo:16,moves:[{name:"tackle",method:"level-up",level:1},{name:"water-gun",method:"level-up",level:7}]}
];

let dataSource = [];
// Tenta carregar data.js (prioridade), depois db.js, senão usa backup
if (typeof POKEMON_DATA !== 'undefined' && Array.isArray(POKEMON_DATA)) {
    dataSource = POKEMON_DATA;
    console.log("✅ Usando data.js");
} else if (typeof POKEMON_DB !== 'undefined' && Array.isArray(POKEMON_DB)) {
    dataSource = POKEMON_DB;
    console.log("✅ Usando db.js");
} else {
    console.warn("⚠️ Usando Backup de Emergência");
    dataSource = BACKUP_DATA;
}

// 2. ESTADO
let db = JSON.parse(localStorage.getItem('poke_db_ultimate')) || { captured: {}, customMaps: {}, drawings: {}, notes: {}, teleports: {} };
if (!db.teleports) db.teleports = {};

let currentRegId = 'kanto_rb';
let currentSubMapName = '00. Mapa Geral';

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let mapImg = new Image();
let view = { x: 0, y: 0, scale: 1 };
let isDrag = false, isDraw = false, tool = 'move';
let lastPos = { x: 0, y: 0 };
let currentPath = [];

// INICIALIZAÇÃO
window.onload = () => {
    populateRegionSelect('dex');
    const lastReg = localStorage.getItem('last_reg');
    if (lastReg && typeof REGIONS_DB !== 'undefined' && REGIONS_DB.some(r => r.id === lastReg)) {
        currentRegId = lastReg;
        // Verifica se o valor existe no select atual
        const sel = document.getElementById('region-select');
        if(sel.querySelector(`option[value="${lastReg}"]`)) sel.value = lastReg;
    }
    initCanvas();
    changeRegion();
};

function populateRegionSelect(mode) {
    const sel = document.getElementById('region-select');
    const prev = sel.value;
    sel.innerHTML = '';
    if (typeof REGIONS_DB !== 'undefined') {
        REGIONS_DB.forEach(r => {
            if (mode === 'map' && r.id.startsWith('nat_')) return;
            const opt = document.createElement('option');
            opt.value = r.id; opt.innerText = r.name;
            sel.appendChild(opt);
        });
    }
    if (prev && sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
    else if (sel.options.length > 0) sel.selectedIndex = 0;
}

function changeRegion() {
    const sel = document.getElementById('region-select');
    if(!sel.value) return;
    currentRegId = sel.value;
    localStorage.setItem('last_reg', currentRegId);
    if (!db.captured[currentRegId]) db.captured[currentRegId] = [];
    
    if(document.getElementById('view-dex').classList.contains('active')) renderDex();
    else { updateMapSelect(); changeSubMap(); }
}

function setTab(mode) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${mode}`).classList.add('active');
    event.target.classList.add('active');
    document.getElementById('map-controls').style.display = (mode === 'map') ? 'flex' : 'none';
    
    populateRegionSelect(mode);
    if (mode === 'map') { resizeCanvas(); updateMapSelect(); changeSubMap(); }
    else { renderDex(); }
}

// RENDER DEX
function renderDex() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    if (typeof REGIONS_DB === 'undefined') return;
    const config = REGIONS_DB.find(r => r.id === currentRegId);
    if (!config) return;

    const fragment = document.createDocumentFragment();
    for (let i = config.start; i <= config.end; i++) {
        const d = document.createElement('div');
        const isCaptured = db.captured[currentRegId]?.includes(i);
        d.className = 'card ' + (isCaptured ? 'captured' : '');
        
        const localData = dataSource.find(p => p.id === i);
        const name = localData ? localData.name : `Pokémon #${i}`;
        const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${i}.png`;

        d.innerHTML = `
            <div class="info-btn" title="Info">i</div>
            <img src="${imgUrl}" loading="lazy" onerror="this.style.opacity=0.3">
            <div class="card-num">#${i}</div>
            <div class="card-name">${name}</div>
        `;
        d.onclick = () => toggleCapture(i, d);
        d.querySelector('.info-btn').onclick = (e) => { e.stopPropagation(); openDetails(i); };
        fragment.appendChild(d);
    }
    grid.appendChild(fragment);
    updateStats();
}

function toggleCapture(id, el) {
    const list = db.captured[currentRegId];
    const idx = list.indexOf(id);
    if (idx > -1) { list.splice(idx, 1); el.classList.remove('captured'); } 
    else { list.push(id); el.classList.add('captured'); }
    save(); updateStats();
}

function updateStats() {
    const config = REGIONS_DB.find(r => r.id === currentRegId);
    if(!config) return;
    const total = config.end - config.start + 1;
    const c = db.captured[currentRegId]?.length || 0;
    const p = Math.floor((c / total) * 100);
    document.getElementById('stats').innerText = `${c} / ${total} (${p}%)`;
}

// --- FUNÇÃO DE AJUDA PARA LER STATS DE QUALQUER JEITO ---
function getStatValue(stats, keyName, index) {
    if (!stats) return 0;
    // Se for Array (ex: [45, 60, ...])
    if (Array.isArray(stats)) {
        let val = stats[index];
        // Se for array de objetos (ex: PokeAPI raw)
        if (typeof val === 'object' && val !== null) return val.base_stat || 0;
        return val || 0;
    }
    // Se for Objeto (ex: {hp: 45, atk: 60...})
    return stats[keyName] || 0;
}

// MODAL DETALHES BLINDADO
function openDetails(id) {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    modal.style.display = 'flex';
    
    try {
        const data = dataSource.find(p => p.id === id);
        if (!data) throw new Error("Pokémon não encontrado no data.js");

        const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
        const typeColors = (typeof TYPE_COLORS !== 'undefined') ? TYPE_COLORS : {};
        const typesHtml = (data.types || []).map(t => `<span class="type-badge" style="background:${typeColors[t]||'#555'}">${t}</span>`).join('');
        const evoText = data.evo && data.evo < 100 ? `(Evolui no lvl ${data.evo})` : "(Forma Final)";

        // Stats Universal
        const labels = ['HP', 'ATK', 'DEF', 'SP.A', 'SP.D', 'SPD'];
        const keys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
        let statsHtml = "";
        
        // Pega valores usando a função auxiliar que não falha
        let s = data.stats;
        let hp = getStatValue(s, 'hp', 0);
        let atk = getStatValue(s, 'atk', 1);
        let def = getStatValue(s, 'def', 2);
        let spa = getStatValue(s, 'spa', 3);
        let spd = getStatValue(s, 'spd', 4);
        let spe = getStatValue(s, 'spe', 5);
        
        const statValues = [hp, atk, def, spa, spd, spe];

        statValues.forEach((val, i) => {
            const w = Math.min(100, (val/255)*100);
            statsHtml += `<div class="stat-row"><span class="stat-label">${labels[i]}</span><span class="stat-val">${val}</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${w}%"></div></div></div>`;
        });

        // Treino
        let isPhysical = atk >= spa;
        let isFast = spe >= 100;
        let isTank = def > 90 || spd > 90;
        let natureText = "Neutro";
        
        if (isFast) natureText = isPhysical ? "Jolly (+Spd -SpA)" : "Timid (+Spd -Atk)";
        else if (isTank && spe < 60) natureText = (def >= spd) ? (isPhysical ? "Impish (+Def -SpA)" : "Bold (+Def -Atk)") : (isPhysical ? "Careful (+SpD -SpA)" : "Calm (+SpD -Atk)");
        else natureText = isPhysical ? "Adamant (+Atk -SpA)" : "Modest (+SpA -Atk)";
        let focusText = isFast ? `Speed + ${isPhysical?'Atk':'Sp.Atk'}` : `HP + ${isPhysical?'Atk':'Sp.Atk'}`;

        // Moves
        const evoCap = data.evo || 100;
        let naturalMoves = [], tmMoves = [];
        if(data.moves && Array.isArray(data.moves)) {
            naturalMoves = data.moves.filter(m => m.method === 'level-up' && m.level <= evoCap && m.level > 1).sort((a,b)=>a.level-b.level).slice(-6);
            tmMoves = data.moves.filter(m => m.method === 'machine').slice(0, 10);
        }

        const naturalHtml = naturalMoves.length ? naturalMoves.map(m => `<span class="move-tag natural">${m.name} <span class="level-info">Lv.${m.level}</span></span>`).join('') : '<span style="color:#777">Nenhum</span>';
        const tmHtml = tmMoves.length ? tmMoves.map(m => `<span class="move-tag tm">${m.name} <span class="level-info">TM</span></span>`).join('') : '<span style="color:#777">Nenhum</span>';

        // Build
        let build = [];
        let allMoves = [...naturalMoves, ...tmMoves]; 
        const bestMoves = ['flamethrower','fire-blast','surf','hydro-pump','thunderbolt','ice-beam','earthquake','psychic','shadow-ball','dragon-claw','crunch','sludge-bomb','leaf-blade','energy-ball','moonblast','close-combat','return','body-slam','fly','strength','slash','bite','ember','water-gun','thundershock','vinewhip','confusion','rock-slide','brick-break','dig','aerial-ace'];

        (data.types || []).forEach(t => {
            let found = allMoves.find(m => bestMoves.includes(m.name) && !build.some(b=>b.name===m.name));
            if(found) build.push({...found, type:'stab'});
        });
        if(build.length < 4) {
            let covers = allMoves.filter(m => bestMoves.includes(m.name) && !build.some(b=>b.name===m.name));
            for(let c of covers) { if(build.length >= 4) break; build.push({...c, type:'cover'}); }
        }
        if(build.length < 4) {
            let fillers = naturalMoves.slice().reverse().filter(m => !build.some(b=>b.name===m.name));
            for(let f of fillers) { if(build.length >= 4) break; build.push({...f, type:'stab'}); }
        }

        const buildHtml = build.map(m => `<div class="build-slot ${m.type}">${m.name}</div>`).join('');
        const notes = db.notes[id] || "";

        body.innerHTML = `
            <div class="modal-header">
                <img src="${imgUrl}" class="modal-img">
                <div class="modal-title">
                    <h2>${data.name}</h2>
                    <div class="modal-types">${typesHtml} <span style="font-size:0.8rem; color:#aaa; margin-left:10px;">${evoText}</span></div>
                </div>
            </div>
            <div style="margin-bottom:15px;">${statsHtml}</div>
            <div class="specs-box" style="margin-top:0;"><span class="specs-title">🏆 Build Recomendada</span><div class="build-grid">${buildHtml}</div></div>
            <div class="specs-box"><span class="specs-title">🍃 Naturais (Recentes)</span><div class="move-grid">${naturalHtml}</div><div style="height:12px"></div><span class="specs-title" style="color:var(--tm-color)">💿 TMs Disponíveis</span><div class="move-grid">${tmHtml}</div></div>
            <div class="specs-box"><span class="specs-title">⚡ Sugestão de Treino</span><p style="margin:5px 0; font-size:0.9rem;"><strong>Natureza:</strong> ${natureText}</p><p style="margin:5px 0; font-size:0.9rem;"><strong>Foco:</strong> ${focusText}</p></div>
            <div class="specs-box"><span class="specs-title">📝 Notas</span><textarea class="user-notes" id="notes-${id}">${notes}</textarea><button class="btn" style="width:100%; margin-top:5px; background:var(--accent);" onclick="saveNote(${id})">Salvar</button></div>
        `;
    } catch (err) {
        console.error(err);
        body.innerHTML = `<div style="padding:30px;text-align:center;color:#ef4444">Erro: ${err.message}<br><br><small>Tente limpar o cache (Ctrl + F5)</small><br><br><button class="btn" onclick="closeModal()">Fechar</button></div>`;
    }
}

function saveNote(id) { db.notes[id] = document.getElementById(`notes-${id}`).value; save(); alert("Salvo!"); }
function closeModal(e) { if(!e || e.target.id === 'modal-overlay' || e.target.classList.contains('close-modal')) document.getElementById('modal-overlay').style.display = 'none'; }
function save() { localStorage.setItem('poke_db_ultimate', JSON.stringify(db)); }
function exportData() { const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); a.download = "backup.json"; a.click(); }
function importData(inp) { const f = inp.files[0]; if(!f) return; const r = new FileReader(); r.onload = e => { try { db = JSON.parse(e.target.result); save(); location.reload(); } catch(e){ alert("Erro."); } }; r.readAsText(f); }

// MAPAS E CANVAS
function updateMapSelect() {
    const sel = document.getElementById('submap-select'); sel.innerHTML = '';
    const maps = { ...(typeof MAPS_DB !== 'undefined' ? MAPS_DB[currentRegId] : {}), ...db.customMaps[currentRegId] };
    Object.keys(maps).sort().forEach(n => {
        const opt = document.createElement('option'); opt.value = maps[n]; opt.innerText = n;
        if(n === currentSubMapName) opt.selected = true; sel.appendChild(opt);
    });
}
function changeSubMap() {
    const sel = document.getElementById('submap-select'); if(!sel.value) return;
    currentSubMapName = sel.options[sel.selectedIndex].text;
    document.getElementById('custom-map-url').value = db.customMaps[currentRegId]?.[currentSubMapName] || "";
    mapImg.src = sel.value; mapImg.onload = () => { view.scale = mapImg.width > 2000 ? 0.4 : 1; draw(); };
    mapImg.onerror = () => { draw(); };
}
function addCustomMap() {
    const url = document.getElementById('custom-map-url').value; if(!url) return;
    if(!db.customMaps[currentRegId]) db.customMaps[currentRegId] = {};
    db.customMaps[currentRegId][currentSubMapName] = url; save(); updateMapSelect();
}
function addNewMap() {
    const name = prompt("Nome:"); const url = document.getElementById('custom-map-url').value;
    if(name && url) {
        if(!db.customMaps[currentRegId]) db.customMaps[currentRegId] = {};
        db.customMaps[currentRegId][name] = url; save(); updateMapSelect();
        const sel = document.getElementById('submap-select');
        for(let i=0; i<sel.options.length; i++) if(sel.options[i].text === name) sel.selectedIndex = i;
        changeSubMap();
    }
}
function deleteCurrentMap() {
    if(db.customMaps[currentRegId]?.[currentSubMapName]) {
        if(confirm("Excluir?")) { delete db.customMaps[currentRegId][currentSubMapName]; save(); updateMapSelect(); changeSubMap(); }
    } else alert("Padrão não pode.");
}
function initCanvas() {
    resizeCanvas(); window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousedown', startInteract); canvas.addEventListener('mousemove', moveInteract);
    canvas.addEventListener('mouseup', endInteract); canvas.addEventListener('wheel', (e) => { e.preventDefault(); view.scale *= e.deltaY > 0 ? 0.9 : 1.1; draw(); });
}
function resizeCanvas() { const c = document.getElementById('map-container'); if(c) { canvas.width = c.clientWidth; canvas.height = c.clientHeight; draw(); } }
function getMapKey() { return `${currentRegId}_${currentSubMapName}`; }
function draw() {
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.scale, view.scale);
    if(mapImg.complete && mapImg.naturalWidth > 0) ctx.drawImage(mapImg, 0, 0);
    const key = getMapKey();
    (db.drawings[key]||[]).forEach(d => { ctx.beginPath(); ctx.strokeStyle=d.color; ctx.lineWidth=d.width/view.scale; if(d.points.length){ ctx.moveTo(d.points[0].x, d.points[0].y); d.points.forEach(p=>ctx.lineTo(p.x,p.y)); } ctx.stroke(); });
    if(currentPath.length) { ctx.beginPath(); ctx.strokeStyle=document.getElementById('color').value; ctx.lineWidth=5/view.scale; ctx.moveTo(currentPath[0].x,currentPath[0].y); currentPath.forEach(p=>ctx.lineTo(p.x,p.y)); ctx.stroke(); }
    (db.teleports[key]||[]).forEach(t => { ctx.beginPath(); ctx.arc(t.x,t.y,15/view.scale,0,Math.PI*2); ctx.fillStyle='rgba(0,188,212,0.8)'; ctx.fill(); ctx.strokeStyle='white'; ctx.lineWidth=2/view.scale; ctx.stroke(); ctx.fillStyle='white'; ctx.font=`${16/view.scale}px Arial`; ctx.textAlign='center'; ctx.fillText('🌀',t.x,t.y); });
    ctx.restore();
}
function startInteract(e) {
    const mx=(e.offsetX-view.x)/view.scale, my=(e.offsetY-view.y)/view.scale;
    if(tool==='tele') {
        const maps={...(typeof MAPS_DB !== 'undefined' ? MAPS_DB[currentRegId] : {}),...db.customMaps[currentRegId]};
        const dest=prompt("Destino:\n"+Object.keys(maps).slice(0,5).join("\n")+"...");
        if(dest && maps[dest]) { const k=getMapKey(); if(!db.teleports[k])db.teleports[k]=[]; db.teleports[k].push({x:mx,y:my,target:dest}); save(); draw(); }
        return;
    }
    if(tool==='move') {
        const hit = (db.teleports[getMapKey()]||[]).find(t=>Math.sqrt((mx-t.x)**2+(my-t.y)**2)<20/view.scale);
        if(hit) { const sel=document.getElementById('submap-select'); for(let i=0;i<sel.options.length;i++)if(sel.options[i].text===hit.target){sel.selectedIndex=i;changeSubMap();return;} }
        isDrag=true;
    }
    if(tool==='draw') { isDraw=true; currentPath=[{x:mx,y:my}]; }
    lastPos={x:e.offsetX,y:e.offsetY};
}
function moveInteract(e) {
    if(isDrag) { view.x+=e.offsetX-lastPos.x; view.y+=e.offsetY-lastPos.y; lastPos={x:e.offsetX,y:e.offsetY}; draw(); }
    if(isDraw) { const mx=(e.offsetX-view.x)/view.scale, my=(e.offsetY-view.y)/view.scale; currentPath.push({x:mx,y:my}); draw(); }
}
function endInteract() {
    isDrag=false;
    if(isDraw) { isDraw=false; if(currentPath.length){ const k=getMapKey(); if(!db.drawings[k])db.drawings[k]=[]; db.drawings[k].push({color:document.getElementById('color').value,width:5,points:currentPath}); save(); } currentPath=[]; draw(); }
}
function setTool(t) { tool=t; document.querySelectorAll('.tool').forEach(b=>b.classList.remove('active')); document.getElementById('t-'+t).classList.add('active'); }
function undo() { const k=getMapKey(); if(db.drawings[k]?.length){ db.drawings[k].pop(); save(); draw(); } }
function clearMap() { if(confirm("Limpar?")){ const k=getMapKey(); db.drawings[k]=[]; db.teleports[k]=[]; save(); draw(); } }
