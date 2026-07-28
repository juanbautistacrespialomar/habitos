/* ============================================================
   Hábitos — lógica principal (vanilla JS, sin frameworks)
   Datos guardados en localStorage. 100% offline.
   ============================================================ */
'use strict';

/* ---------- Configuración ---------- */
const MEALS = [
  { key:'desayuno', label:'Desayuno', color:'#F59E0B' },
  { key:'almuerzo', label:'Almuerzo', color:'#10B981' },
  { key:'merienda', label:'Merienda', color:'#8B5CF6' },
  { key:'cena',     label:'Cena',     color:'#3B82F6' },
];
const DRINKS = [
  { key:'cerveza', label:'Cerveza', emoji:'🍺', unit:'unidad', alcohol:true,  color:'#D97706' },
  { key:'vino',    label:'Vino',    emoji:'🍷', unit:'copa',   alcohol:true,  color:'#9F1239' },
  { key:'fernet',  label:'Fernet',  emoji:'🥃', unit:'vaso',   alcohol:true,  color:'#7C3B12' },
  { key:'gaseosa', label:'Gaseosa', emoji:'🥤', unit:'vaso',   alcohol:false, color:'#0891B2' },
  { key:'agua',    label:'Agua',    emoji:'💧', unit:'vaso',   alcohol:false, color:'#38BDF8' },
];
const SUPPS = [
  { key:'creatina', label:'Creatina', unit:'g', step:1,  color:'#6366F1' },
  { key:'proteina', label:'Proteína', unit:'g', step:5,  color:'#EC4899' },
];

const STORE_KEY = 'habitos_data_v1';
const THEME_KEY = 'habitos_theme';

/* ---------- Estado ---------- */
let DATA = loadData();
let current = todayKey();      // fecha seleccionada (YYYY-MM-DD)
let deferredPrompt = null;     // para "instalar"

/* ---------- Utilidades de fecha ---------- */
function todayKey(){ return dateToKey(new Date()); }
function dateToKey(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function keyToDate(k){ const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); }
function shiftDay(k, delta){ const d = keyToDate(k); d.setDate(d.getDate()+delta); return dateToKey(d); }

const WD = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MO_LONG = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

/* ---------- Persistencia ---------- */
function loadData(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch { return {}; }
}
function saveData(){ localStorage.setItem(STORE_KEY, JSON.stringify(DATA)); }

function blankDay(){
  const meals = {}; MEALS.forEach(m => meals[m.key] = []);
  const drinks = {}; DRINKS.forEach(d => drinks[d.key] = 0);
  const supp = {}; SUPPS.forEach(s => supp[s.key] = 0);
  return { meals, drinks, supp, otros:{} };
}
// Devuelve el registro del día actual, creándolo/normalizándolo si hace falta.
function day(){
  if(!DATA[current]) DATA[current] = blankDay();
  const r = DATA[current];
  if(!r.meals) r.meals = {}; MEALS.forEach(m => { if(!Array.isArray(r.meals[m.key])) r.meals[m.key] = []; });
  if(!r.drinks) r.drinks = {}; DRINKS.forEach(d => { if(typeof r.drinks[d.key] !== 'number') r.drinks[d.key] = 0; });
  if(!r.supp) r.supp = {}; SUPPS.forEach(s => { if(typeof r.supp[s.key] !== 'number') r.supp[s.key] = 0; });
  if(!r.otros) r.otros = {};
  return r;
}
// ¿El día tiene algún dato cargado?
function dayHasData(r){
  if(!r) return false;
  const meals = Object.values(r.meals||{}).some(a => a && a.length);
  const drinks = Object.values(r.drinks||{}).some(n => n>0);
  const otros = Object.values(r.otros||{}).some(n => n>0);
  const supp = Object.values(r.supp||{}).some(n => n>0);
  return meals || drinks || otros || supp;
}
// Limpia del storage los días que quedaron vacíos (para no ensuciar el historial).
function pruneEmpty(){
  Object.keys(DATA).forEach(k => { if(!dayHasData(DATA[k])) delete DATA[k]; });
}

/* ============================================================
   RENDER
   ============================================================ */
function render(){
  renderDateNav();
  renderSummary();
  renderMeals();
  renderDrinks();
  renderSupps();
}

function renderDateNav(){
  const d = keyToDate(current);
  const main = document.getElementById('dateMain');
  const full = document.getElementById('dateFull');
  const isToday = current === todayKey();
  const isYesterday = current === shiftDay(todayKey(), -1);
  if(isToday) main.textContent = 'Hoy';
  else if(isYesterday) main.textContent = 'Ayer';
  else main.textContent = `${WD[d.getDay()].slice(0,3)} ${d.getDate()}`;
  full.textContent = `${d.getDate()} de ${MO_LONG[d.getMonth()]} ${d.getFullYear()}`;
  main.style.textTransform = 'capitalize';
  document.getElementById('goToday').classList.toggle('hidden', isToday);
}

function renderSummary(){
  const r = day();
  const mealsDone = MEALS.filter(m => r.meals[m.key].length > 0).length;
  const alcohol = DRINKS.filter(d => d.alcohol).reduce((s,d) => s + r.drinks[d.key], 0);
  const agua = r.drinks.agua;
  const suppOn = SUPPS.filter(s => r.supp[s.key] > 0).length;
  const stats = [
    { top:'Comidas', val:`${mealsDone}<small>/4</small>`, frac:mealsDone/4 },
    { top:'Alcohol', val:`${alcohol}`, frac: alcohol>0 ? 1 : 0, warn: alcohol>0 },
    { top:'Agua',    val:`${agua}<small> v</small>`, frac: Math.min(agua/8,1) },
    { top:'Suple',   val: suppOn>0 ? '✓' : '—', frac: suppOn/2 },
  ];
  document.getElementById('summary').innerHTML = stats.map(s => `
    <div class="stat">
      <div class="top">${s.top}</div>
      <div class="val">${s.val}</div>
      <div class="bar" style="width:${Math.round(s.frac*100)}%; background:${s.warn?'#E0A106':'var(--primary)'}"></div>
    </div>`).join('');
}

function renderMeals(){
  const r = day();
  const wrap = document.getElementById('mealsWrap');
  wrap.innerHTML = `<div class="section-title">Comidas</div>` + MEALS.map(m => {
    const items = r.meals[m.key];
    const list = items.length
      ? `<div class="items">${items.map((it,i) => `
          <div class="item"><span>${esc(it)}</span>
            <button data-meal="${m.key}" data-i="${i}" aria-label="Quitar">
              <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>`).join('')}</div>`
      : `<div class="empty">Sin registros todavía.</div>`;
    return `
      <div class="card">
        <div class="card-head">
          <div class="dot" style="background:${m.color}"></div>
          <h3>${m.label}</h3>
          <div class="count">${items.length || ''}</div>
        </div>
        ${list}
        <div class="add-row">
          <input type="text" placeholder="Agregar a ${m.label.toLowerCase()}…" data-meal-input="${m.key}"
                 enterkeyhint="done" autocomplete="off" autocapitalize="sentences" />
          <button class="add" data-meal-add="${m.key}" aria-label="Agregar">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  // eventos comidas
  wrap.querySelectorAll('[data-meal-add]').forEach(btn => {
    btn.onclick = () => addMeal(btn.dataset.mealAdd);
  });
  wrap.querySelectorAll('[data-meal-input]').forEach(inp => {
    inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); addMeal(inp.dataset.mealInput); }});
  });
  wrap.querySelectorAll('[data-meal][data-i]').forEach(btn => {
    btn.onclick = () => { const r2 = day(); r2.meals[btn.dataset.meal].splice(+btn.dataset.i,1); saveData(); render(); };
  });
}

function addMeal(key){
  const inp = document.querySelector(`[data-meal-input="${key}"]`);
  const val = inp.value.trim();
  if(!val) return;
  day().meals[key].push(val);
  saveData();
  render();
  // re-enfocar el mismo input para seguir cargando rápido
  const again = document.querySelector(`[data-meal-input="${key}"]`);
  if(again) again.focus();
}

function renderDrinks(){
  const r = day();
  const el = document.getElementById('drinks');
  const fixed = DRINKS.map(d => {
    const n = r.drinks[d.key];
    return `
      <div class="chip ${n>0?'on':''}" style="--c:${d.color}" data-drink="${d.key}">
        <button class="minus" data-drink-minus="${d.key}" aria-label="Restar">−</button>
        <div class="emoji">${d.emoji}</div>
        <div class="name">${d.label}</div>
        <div class="n">${n}</div>
        <div class="unit">${n===1?d.unit:pluralUnit(d.unit)}</div>
      </div>`;
  }).join('');
  const otros = Object.entries(r.otros).map(([name,n]) => `
      <div class="chip ${n>0?'on':''}" style="--c:#64748B" data-other="${esc(name)}">
        <button class="minus" data-other-minus="${esc(name)}" aria-label="Restar">−</button>
        <div class="emoji">🥤</div>
        <div class="name">${esc(name)}</div>
        <div class="n">${n}</div>
        <div class="unit">${n===1?'unidad':'unidades'}</div>
      </div>`).join('');
  const addBtn = `<div class="chip add-drink" id="addDrink"><div class="plus">+</div><div class="t">Otro</div></div>`;
  el.innerHTML = fixed + otros + addBtn;

  el.querySelectorAll('[data-drink]').forEach(c => {
    c.onclick = e => { if(e.target.closest('[data-drink-minus]')) return; bumpDrink(c.dataset.drink, +1); };
  });
  el.querySelectorAll('[data-drink-minus]').forEach(b => {
    b.onclick = e => { e.stopPropagation(); bumpDrink(b.dataset.drinkMinus, -1); };
  });
  el.querySelectorAll('[data-other]').forEach(c => {
    c.onclick = e => { if(e.target.closest('[data-other-minus]')) return; bumpOther(c.dataset.other, +1); };
  });
  el.querySelectorAll('[data-other-minus]').forEach(b => {
    b.onclick = e => { e.stopPropagation(); bumpOther(b.dataset.otherMinus, -1); };
  });
  document.getElementById('addDrink').onclick = promptOtherDrink;
}

function pluralUnit(u){ return u === 'copa' ? 'copas' : u === 'vaso' ? 'vasos' : 'unidades'; }

function bumpDrink(key, delta){
  const r = day();
  r.drinks[key] = Math.max(0, r.drinks[key] + delta);
  saveData(); render();
  if(delta>0) haptic();
}
function bumpOther(name, delta){
  const r = day();
  r.otros[name] = Math.max(0, (r.otros[name]||0) + delta);
  if(r.otros[name] === 0) delete r.otros[name];
  saveData(); render();
  if(delta>0) haptic();
}
function promptOtherDrink(){
  openModal({
    title:'Otra bebida',
    desc:'¿Qué tomaste? (ej: café, mate, jugo). Se cuenta por unidades.',
    input:'Nombre de la bebida',
    confirm:'Agregar',
    onConfirm:(val) => {
      const name = (val||'').trim();
      if(!name) return;
      bumpOther(name, +1);
    }
  });
}

function renderSupps(){
  const r = day();
  document.getElementById('suppCard').innerHTML = SUPPS.map((s,idx) => `
    <div class="supp" ${idx>0?'style="border-top:1px solid var(--border)"':''}>
      <div class="dot" style="background:${s.color}"></div>
      <div class="lbl">${s.label}</div>
      <div class="stepper">
        <button data-supp-minus="${s.key}" aria-label="Restar">−</button>
        <input type="number" inputmode="numeric" min="0" step="${s.step}" value="${r.supp[s.key]}" data-supp-input="${s.key}" />
        <span class="u">${s.unit}</span>
        <button data-supp-plus="${s.key}" aria-label="Sumar">+</button>
      </div>
    </div>`).join('');

  const card = document.getElementById('suppCard');
  card.querySelectorAll('[data-supp-plus]').forEach(b => {
    b.onclick = () => bumpSupp(b.dataset.suppPlus, +1);
  });
  card.querySelectorAll('[data-supp-minus]').forEach(b => {
    b.onclick = () => bumpSupp(b.dataset.suppMinus, -1);
  });
  card.querySelectorAll('[data-supp-input]').forEach(inp => {
    inp.onchange = () => {
      const v = Math.max(0, parseFloat(inp.value.replace(',','.')) || 0);
      day().supp[inp.dataset.suppInput] = v;
      saveData(); render();
    };
  });
}
function bumpSupp(key, dir){
  const s = SUPPS.find(x => x.key === key);
  const r = day();
  r.supp[key] = Math.max(0, +(r.supp[key] + dir*s.step).toFixed(2));
  saveData(); render();
  haptic();
}

/* ============================================================
   HISTORIAL
   ============================================================ */
function renderHistory(){
  pruneEmpty();
  const keys = Object.keys(DATA).sort().reverse();
  const list = document.getElementById('histList');
  if(!keys.length){
    list.innerHTML = `<div class="empty" style="padding:24px 6px; text-align:center">Todavía no cargaste ningún día. Empezá desde la pestaña <b>Hoy</b>.</div>`;
    return;
  }
  list.innerHTML = keys.map(k => {
    const r = DATA[k]; const d = keyToDate(k);
    const mealsDone = MEALS.filter(m => (r.meals?.[m.key]||[]).length>0).length;
    const alcohol = DRINKS.filter(x=>x.alcohol).reduce((s,x)=>s+(r.drinks?.[x.key]||0),0);
    const suppOn = SUPPS.some(s => (r.supp?.[s.key]||0)>0);
    const tags = [];
    tags.push(`<span class="tag">${mealsDone}/4 comidas</span>`);
    if(alcohol>0) tags.push(`<span class="tag al">🍷 ${alcohol}</span>`);
    if((r.drinks?.agua||0)>0) tags.push(`<span class="tag">💧 ${r.drinks.agua}</span>`);
    if(suppOn) tags.push(`<span class="tag">💪 suple</span>`);
    return `
      <button class="hist-item" data-goto="${k}">
        <div class="date"><div class="day">${d.getDate()}</div><div class="mon">${MO[d.getMonth()]}</div></div>
        <div class="meta"><div class="wd">${WD[d.getDay()]}</div><div class="tags">${tags.join('')}</div></div>
        <div class="chev"><svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      </button>`;
  }).join('');
  list.querySelectorAll('[data-goto]').forEach(b => {
    b.onclick = () => { current = b.dataset.goto; switchView('hoy'); render(); window.scrollTo(0,0); };
  });
}

/* ============================================================
   EXPORTAR / IMPORTAR
   ============================================================ */
// Columnas: Fecha;Tipo;Categoría;Detalle;Cantidad;Unidad
function buildCsv(keys){
  const rows = [['Fecha','Tipo','Categoria','Detalle','Cantidad','Unidad']];
  keys.sort().forEach(k => {
    const r = DATA[k]; if(!r) return;
    const fecha = k.split('-').reverse().join('/'); // DD/MM/YYYY para Excel es-AR
    MEALS.forEach(m => (r.meals?.[m.key]||[]).forEach(it => {
      rows.push([fecha,'Comida',m.label,it,'','']);
    }));
    DRINKS.forEach(d => { const n = r.drinks?.[d.key]||0; if(n>0)
      rows.push([fecha, d.alcohol?'Bebida alcohólica':'Bebida', d.label, '', n, d.unit]);
    });
    Object.entries(r.otros||{}).forEach(([name,n]) => { if(n>0)
      rows.push([fecha,'Bebida', name, '', n, 'unidad']);
    });
    SUPPS.forEach(s => { const v = r.supp?.[s.key]||0; if(v>0)
      rows.push([fecha,'Suplemento', s.label, '', String(v).replace('.',','), s.unit]);
    });
  });
  const csv = rows.map(row => row.map(cell => {
    const c = String(cell);
    return /[;"\n]/.test(c) ? '"' + c.replace(/"/g,'""') + '"' : c;
  }).join(';')).join('\r\n');
  return '\uFEFF' + csv; // BOM para que Excel respete los acentos
}

function download(filename, content, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function exportCsvMonth(){
  const ym = document.getElementById('monthSelect').value;
  if(!ym){ toast('No hay datos para exportar'); return; }
  const keys = Object.keys(DATA).filter(k => k.startsWith(ym) && dayHasData(DATA[k]));
  if(!keys.length){ toast('Ese mes no tiene registros'); return; }
  download(`habitos_${ym}.csv`, buildCsv(keys), 'text/csv;charset=utf-8');
  toast(`Exportado: ${keys.length} día(s)`);
}
function exportCsvAll(){
  const keys = Object.keys(DATA).filter(k => dayHasData(DATA[k]));
  if(!keys.length){ toast('Todavía no hay datos'); return; }
  download(`habitos_todo.csv`, buildCsv(keys), 'text/csv;charset=utf-8');
  toast(`Exportado: ${keys.length} día(s)`);
}
function exportBackup(){
  pruneEmpty();
  const payload = { app:'Habitos', version:1, exportedAt:new Date().toISOString(), data:DATA };
  download(`habitos_backup_${todayKey()}.json`, JSON.stringify(payload,null,2), 'application/json');
  toast('Backup descargado');
}
function doRestore(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      const incoming = parsed.data || parsed; // acepta backup completo o data cruda
      if(typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('formato');
      DATA = incoming; pruneEmpty(); saveData();
      current = todayKey(); render(); renderHistory(); fillMonths();
      toast('Datos restaurados');
    }catch{ toast('Archivo inválido'); }
  };
  reader.readAsText(file);
}

function fillMonths(){
  const sel = document.getElementById('monthSelect');
  const months = [...new Set(Object.keys(DATA).filter(k=>dayHasData(DATA[k])).map(k => k.slice(0,7)))].sort().reverse();
  if(!months.length){
    sel.innerHTML = `<option value="">Sin datos aún</option>`; return;
  }
  const cur = todayKey().slice(0,7);
  sel.innerHTML = months.map(ym => {
    const [y,m] = ym.split('-');
    return `<option value="${ym}" ${ym===cur?'selected':''}>${MO_LONG[+m-1]} ${y}</option>`;
  }).join('');
}

/* ============================================================
   NAVEGACIÓN / UI
   ============================================================ */
function switchView(name){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b.dataset.view===name));
  if(name==='hist') renderHistory();
  if(name==='datos'){ fillMonths(); }
  window.scrollTo(0,0);
}

/* ---------- Modal genérico ---------- */
function openModal({title, desc, input, confirm, danger, onConfirm}){
  const bg = document.getElementById('modalBg');
  const m = document.getElementById('modal');
  m.innerHTML = `
    <h3>${esc(title)}</h3>
    ${desc?`<p>${esc(desc)}</p>`:''}
    ${input!==undefined?`<input type="text" id="modalInput" placeholder="${esc(input)}" autocomplete="off" enterkeyhint="done" />`:''}
    <div class="modal-actions">
      <button class="btn-ghost" id="modalCancel">Cancelar</button>
      <button class="${danger?'btn-danger':'btn-primary'}" id="modalOk">${esc(confirm||'Aceptar')}</button>
    </div>`;
  bg.classList.add('show');
  const inp = document.getElementById('modalInput');
  if(inp){ setTimeout(()=>inp.focus(),50); inp.addEventListener('keydown',e=>{ if(e.key==='Enter') ok(); }); }
  function close(){ bg.classList.remove('show'); }
  function ok(){ const v = inp?inp.value:null; close(); onConfirm && onConfirm(v); }
  document.getElementById('modalCancel').onclick = close;
  document.getElementById('modalOk').onclick = ok;
  bg.onclick = e => { if(e.target===bg) close(); };
}

/* ---------- Toast + haptic ---------- */
let toastTimer;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}
function haptic(){ if(navigator.vibrate) navigator.vibrate(8); }

/* ---------- Escape HTML ---------- */
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- Tema ---------- */
function applyTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(THEME_KEY, mode);
  const btn = document.getElementById('themeBtn');
  btn.innerHTML = mode==='dark'
    ? `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}
function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  const mode = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(mode);
}

/* ============================================================
   EVENTOS GLOBALES
   ============================================================ */
document.getElementById('prevDay').onclick = () => { current = shiftDay(current,-1); render(); };
document.getElementById('nextDay').onclick = () => { current = shiftDay(current,+1); render(); };
document.getElementById('goToday').onclick = () => { current = todayKey(); render(); };
document.getElementById('themeBtn').onclick = () => {
  const next = document.documentElement.getAttribute('data-theme')==='dark' ? 'light':'dark';
  applyTheme(next);
};
document.querySelectorAll('.nav button').forEach(b => b.onclick = () => switchView(b.dataset.view));

document.getElementById('btnCsvMonth').onclick = exportCsvMonth;
document.getElementById('btnCsvAll').onclick = exportCsvAll;
document.getElementById('btnBackup').onclick = exportBackup;
document.getElementById('btnRestore').onclick = () => document.getElementById('restoreInput').click();
document.getElementById('restoreInput').onchange = e => {
  const f = e.target.files[0];
  if(!f) return;
  openModal({
    title:'Restaurar backup',
    desc:'Esto reemplaza TODOS los datos actuales por los del archivo. ¿Seguro?',
    confirm:'Restaurar', danger:true,
    onConfirm:()=>doRestore(f)
  });
  e.target.value = '';
};
document.getElementById('btnReset').onclick = () => {
  openModal({
    title:'Borrar todos los datos',
    desc:'Se elimina todo el historial de este dispositivo. Esta acción no se puede deshacer.',
    confirm:'Borrar todo', danger:true,
    onConfirm:()=>{ DATA = {}; saveData(); current = todayKey(); render(); renderHistory(); fillMonths(); toast('Datos borrados'); }
  });
};

// sombra en la appbar al scrollear
addEventListener('scroll', () => {
  document.getElementById('appbar').classList.toggle('scrolled', window.scrollY > 4);
}, { passive:true });

/* ---------- Instalación PWA ---------- */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  document.getElementById('btnInstall').classList.remove('hidden');
});
document.getElementById('btnInstall').onclick = async () => {
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('btnInstall').classList.add('hidden');
};
// pista para iOS (no soporta beforeinstallprompt)
(function iosHint(){
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if(isIOS && !standalone){
    document.getElementById('installHint').innerHTML =
      'En iPhone: tocá <b>Compartir</b> ⬆️ y luego <b>Agregar a inicio</b>.';
  }
})();

/* ---------- Service worker ---------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

/* ============================================================
   ARRANQUE
   ============================================================ */
initTheme();
render();
fillMonths();
