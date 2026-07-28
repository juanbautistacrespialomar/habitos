/* ============================================================
   Hábitos — lógica principal (vanilla JS, sin frameworks)
   Datos en localStorage. 100% offline.
   Secciones: Comida · Entreno · Cuerpo (IMC) · Historial · Datos
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
  { key:'cerveza', label:'Cerveza', unit:'unidad', alcohol:true,  color:'#D97706', icon:'<svg viewBox="0 0 24 24" fill="none"><path d="M7 8h8v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15 10h2a2 2 0 012 2v2a2 2 0 01-2 2h-2" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 11h8" stroke="currentColor" stroke-width="1.4"/></svg>' },
  { key:'vino',    label:'Vino',    unit:'copa',   alcohol:true,  color:'#9F1239', icon:'<svg viewBox="0 0 24 24" fill="none"><path d="M7 4h10l-1 5a4 4 0 01-8 0L7 4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 14v5M9 20h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' },
  { key:'fernet',  label:'Fernet',  unit:'vaso',   alcohol:true,  color:'#7C3B12', icon:'<svg viewBox="0 0 24 24" fill="none"><path d="M7 5h10l-1.2 13.5a1.5 1.5 0 01-1.5 1.4H9.7a1.5 1.5 0 01-1.5-1.4L7 5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7.8 12.5h8.4" stroke="currentColor" stroke-width="1.5"/></svg>' },
  { key:'gaseosa', label:'Gaseosa', unit:'vaso',   alcohol:false, color:'#0891B2', icon:'<svg viewBox="0 0 24 24" fill="none"><path d="M10 3h4v2.5l1.4 2.3a4 4 0 01.6 2.1V19a2 2 0 01-2 2H10a2 2 0 01-2-2V9.9a4 4 0 01.6-2.1L10 5.5V3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 13h8" stroke="currentColor" stroke-width="1.5"/></svg>' },
  { key:'agua',    label:'Agua',    unit:'vaso',   alcohol:false, color:'#38BDF8', icon:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5s6 6 6 10a6 6 0 11-12 0c0-4 6-10 6-10z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>' },
];
// Ícono genérico para bebidas "otras" cargadas a mano.
const OTHER_DRINK_ICON = '<svg viewBox="0 0 24 24" fill="none"><path d="M7 6h10l-1.2 13a1.5 1.5 0 01-1.5 1.4H9.7A1.5 1.5 0 018.2 19L7 6z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
const SUPPS = [
  { key:'creatina', label:'Creatina', unit:'g', step:1, color:'#6366F1' },
  { key:'proteina', label:'Proteína', unit:'g', step:5, color:'#EC4899' },
];
const TRAIN_TYPES = [
  { key:'futbol',   label:'Fútbol',   color:'#16A34A', icon:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 8l3.2 2.3-1.2 3.7H10l-1.2-3.7L12 8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 3.5V8M20 10.5l-4.8 2.5M15.8 20l-1.8-4.7M8.2 20l1.8-4.7M4 10.5l4.8 2.5" stroke="currentColor" stroke-width="1.3"/></svg>' },
  { key:'gimnasio', label:'Gimnasio', color:'#0D9488', icon:'<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 8v8M17.5 8v8M4 10v4M20 10v4M6.5 12h11" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>' },
  { key:'otro',     label:'Otro',     color:'#6366F1', icon:'<svg viewBox="0 0 24 24" fill="none"><path d="M3 12h3.5l2-6 3.2 12L14 8l1.5 4H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
];
const INTENS = ['Suave','Media','Alta'];

// Bandas OMS de IMC (para escala y clasificación)
const IMC_BANDS = [
  { max:18.5, label:'Bajo peso',  color:'#3B82F6' },
  { max:25,   label:'Normal',     color:'#10B981' },
  { max:30,   label:'Sobrepeso',  color:'#F59E0B' },
  { max:99,   label:'Obesidad',   color:'#EF4444' },
];

const STORE_KEY   = 'habitos_data_v1';
const PROFILE_KEY = 'habitos_profile_v1';
const GOALS_KEY   = 'habitos_goals_v1';
const THEME_KEY   = 'habitos_theme';

/* ---------- Estado ---------- */
let DATA = loadJSON(STORE_KEY, {});
let PROFILE = loadJSON(PROFILE_KEY, { altura:null });
// Qué criterios cuentan para que un día sea "completo" (configurable desde Datos).
const GOALS_DEFAULT = { comidas:true, agua:true, descanso:true, creatina:true, proteina:true };
let GOALS = Object.assign({}, GOALS_DEFAULT, loadJSON(GOALS_KEY, {}));
let current = todayKey();
let deferredPrompt = null;

/* ---------- Utilidades ---------- */
function loadJSON(k, def){ try { return JSON.parse(localStorage.getItem(k)) || def; } catch { return def; } }
function todayKey(){ return dateToKey(new Date()); }
function dateToKey(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function keyToDate(k){ const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); }
function shiftDay(k, delta){ const d = keyToDate(k); d.setDate(d.getDate()+delta); return dateToKey(d); }
function nf(n){ return String(n).replace('.', ','); } // número con coma decimal (es-AR)

const WD = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MO_LONG = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

/* ---------- Persistencia ---------- */
function saveData(){ localStorage.setItem(STORE_KEY, JSON.stringify(DATA)); }
function saveProfile(){ localStorage.setItem(PROFILE_KEY, JSON.stringify(PROFILE)); }
function saveGoals(){ localStorage.setItem(GOALS_KEY, JSON.stringify(GOALS)); }

function blankDay(){
  const meals = {}; MEALS.forEach(m => meals[m.key] = []);
  const drinks = {}; DRINKS.forEach(d => drinks[d.key] = 0);
  const supp = {}; SUPPS.forEach(s => supp[s.key] = 0);
  return { meals, drinks, supp, otros:{}, training:[], peso:null, cintura:null, sueno:null };
}
function day(){
  if(!DATA[current]) DATA[current] = blankDay();
  return normalize(DATA[current]);
}
function normalize(r){
  if(!r.meals) r.meals = {}; MEALS.forEach(m => { if(!Array.isArray(r.meals[m.key])) r.meals[m.key] = []; });
  if(!r.drinks) r.drinks = {}; DRINKS.forEach(d => { if(typeof r.drinks[d.key] !== 'number') r.drinks[d.key] = 0; });
  if(!r.supp) r.supp = {}; SUPPS.forEach(s => { if(typeof r.supp[s.key] !== 'number') r.supp[s.key] = 0; });
  if(!r.otros) r.otros = {};
  if(!Array.isArray(r.training)) r.training = [];
  if(r.peso === undefined) r.peso = null;
  if(r.cintura === undefined) r.cintura = null;
  if(r.sueno === undefined) r.sueno = null;
  return r;
}
function dayHasData(r){
  if(!r) return false;
  return Object.values(r.meals||{}).some(a => a && a.length)
    || Object.values(r.drinks||{}).some(n => n>0)
    || Object.values(r.otros||{}).some(n => n>0)
    || Object.values(r.supp||{}).some(n => n>0)
    || (Array.isArray(r.training) && r.training.length>0)
    || (r.peso != null)
    || (r.sueno != null);
}
function pruneEmpty(){ Object.keys(DATA).forEach(k => { if(!dayHasData(DATA[k])) delete DATA[k]; }); }

/* ============================================================
   RENDER PRINCIPAL (día)
   ============================================================ */
function render(){
  renderDateNav();
  renderSummary();
  renderMeals();
  renderDrinks();
  renderSupps();
  renderTraining();
  renderSleep();
}

function renderDateNav(){
  const d = keyToDate(current);
  const main = document.getElementById('dateMain');
  const isToday = current === todayKey();
  const isYesterday = current === shiftDay(todayKey(), -1);
  main.textContent = isToday ? 'Hoy' : isYesterday ? 'Ayer' : `${WD[d.getDay()].slice(0,3)} ${d.getDate()}`;
  document.getElementById('dateFull').textContent = `${d.getDate()} de ${MO_LONG[d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById('goToday').classList.toggle('hidden', isToday);
}

function renderSummary(){
  const r = day();
  const mealsDone = MEALS.filter(m => r.meals[m.key].length > 0).length;
  const suppOn = SUPPS.filter(s => r.supp[s.key] > 0).length;
  const stats = [
    { top:'Comidas', val:`${mealsDone}<small>/4</small>`, frac:mealsDone/4 },
    { top:'Suplementos', val: suppOn>0 ? `${suppOn}<small>/2</small>` : '—', frac: suppOn/2 },
  ];
  const el = document.getElementById('summary');
  el.style.gridTemplateColumns = 'repeat(2,1fr)'; // solo 2 tarjetas: que ocupen todo el ancho
  el.innerHTML = statHTML(stats);
}
function statHTML(stats){
  return stats.map(s => `
    <div class="stat">
      <div class="top">${s.top}</div>
      <div class="val">${s.val}</div>
      <div class="bar" style="width:${Math.round(s.frac*100)}%; background:${s.warn?'#E0A106':'var(--primary)'}"></div>
    </div>`).join('');
}

/* ---------- Comidas ---------- */
function renderMeals(){
  const r = day();
  const wrap = document.getElementById('mealsWrap');
  wrap.innerHTML = `<div class="section-title">Comidas</div>` + MEALS.map(m => {
    const items = r.meals[m.key];
    const list = items.length
      ? `<div class="items">${items.map((it,i) => `
          <div class="item">
            <span class="item-txt" data-meal-edit="${m.key}" data-i="${i}">${esc(it)}</span>
            <button class="item-edit" data-meal-edit="${m.key}" data-i="${i}" aria-label="Editar"><svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 000-3L17.5 5.5a2.1 2.1 0 00-3 0L4 16v4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.5 6.5l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
            <button class="item-del" data-meal="${m.key}" data-i="${i}" aria-label="Quitar"><svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
          </div>`).join('')}</div>`
      : `<div class="empty">Sin registros todavía.</div>`;
    return `
      <div class="card">
        <div class="card-head"><div class="dot" style="background:${m.color}"></div><h3>${m.label}</h3><div class="count">${items.length||''}</div></div>
        ${list}
        <div class="add-row">
          <input type="text" placeholder="Agregar a ${m.label.toLowerCase()}…" data-meal-input="${m.key}" enterkeyhint="done" autocomplete="off" autocapitalize="sentences" />
          <button class="add" data-meal-add="${m.key}" aria-label="Agregar"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
        </div>
        <div class="suggest-inline hidden" data-suggest="${m.key}"></div>
      </div>`;
  }).join('');

  wrap.querySelectorAll('[data-meal-add]').forEach(b => b.onclick = () => addMeal(b.dataset.mealAdd));
  wrap.querySelectorAll('[data-meal][data-i]').forEach(b => b.onclick = () => { day().meals[b.dataset.meal].splice(+b.dataset.i,1); saveData(); refreshMeals(); });
  wrap.querySelectorAll('[data-meal-edit]').forEach(sp => sp.onclick = () => editMealItem(sp.dataset.mealEdit, +sp.dataset.i));
  wrap.querySelectorAll('[data-meal-input]').forEach(inp => {
    inp.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); addMeal(inp.dataset.mealInput); }});
    inp.addEventListener('focus', () => openFoodSuggest(inp, inp.dataset.mealInput));
    inp.addEventListener('input', () => openFoodSuggest(inp, inp.dataset.mealInput));
    inp.addEventListener('blur',  () => { suggestHideTimer = setTimeout(hideSuggest, 170); });
  });
}
/* Re-render liviano tras tocar una comida: solo comidas + resumen, preservando
   la posición del scroll. Evita el "salto hacia arriba" que producía render()
   completo + focus() con el teclado abierto en iOS. */
function refreshMeals(){
  const main = document.querySelector('main');
  const sc = main ? main.scrollTop : 0;
  renderMeals();
  renderSummary();
  if(main) main.scrollTop = sc;
}
function addMeal(key){
  const inp = document.querySelector(`[data-meal-input="${key}"]`);
  const val = inp.value.trim(); if(!val) return;
  day().meals[key].push(val); saveData(); refreshMeals();
  const again = document.querySelector(`[data-meal-input="${key}"]`);
  if(again){ again.focus({ preventScroll:true }); openFoodSuggest(again, key); }
}
function editMealItem(key, i){
  const actual = day().meals[key][i]; if(actual===undefined) return;
  openInputModal({ title:'Editar alimento', placeholder:'Alimento', value:actual, confirm:'Guardar',
    onConfirm:v => { const t=(v||'').trim(); const r=day(); if(t) r.meals[key][i]=t; else r.meals[key].splice(i,1); saveData(); refreshMeals(); } });
}

/* ---------- Autocompletado de alimentos ---------- */
// Quita acentos y pasa a minúsculas para comparar sin importar tildes/mayúsculas.
function norm(s){ return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
// Junta todos los alimentos cargados en cualquier día/comida, contando repeticiones.
function foodSuggestions(){
  const map = new Map();
  Object.values(DATA).forEach(r => {
    if(!r || !r.meals) return;
    MEALS.forEach(m => (r.meals[m.key]||[]).forEach(it => {
      const name = String(it).trim(); if(!name) return;
      const nk = norm(name);
      if(map.has(nk)) map.get(nk).count++; else map.set(nk, { name, count:1 });
    }));
  });
  return [...map.values()].sort((a,b) => b.count-a.count || a.name.localeCompare(b.name,'es'));
}
let suggestHideTimer = null;
// Oculta todos los desplegables inline (hay uno por comida).
function hideAllSuggest(){ document.querySelectorAll('.suggest-inline').forEach(b => { b.classList.add('hidden'); b.innerHTML=''; }); }
function hideSuggest(){ clearTimeout(suggestHideTimer); hideAllSuggest(); }
// Desplegable INLINE: se dibuja DENTRO de la tarjeta de la comida, justo debajo del
// input. Al vivir en el flujo normal del scroll, se mueve con el contenido, aparece
// siempre pegado a su input y nunca queda "flotando" ni bloquea el scroll. Esto elimina
// de raíz el bug de position:fixed + teclado en iOS.
function openFoodSuggest(inp, mealKey){
  clearTimeout(suggestHideTimer);
  const box = document.querySelector(`.suggest-inline[data-suggest="${mealKey}"]`);
  if(!box) return;
  hideAllSuggest(); // que solo se vea el de la comida activa
  const q = norm(inp.value.trim());
  let list = foodSuggestions();
  if(q) list = list.filter(s => norm(s.name).includes(q) && norm(s.name)!==q);
  list = list.slice(0, 6);
  if(!list.length){ box.classList.add('hidden'); box.innerHTML=''; return; }
  box.innerHTML = list.map(s => `<button type="button" data-food="${esc(s.name)}"><span>${esc(s.name)}</span>${s.count>1?`<small>×${s.count}</small>`:''}</button>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('[data-food]').forEach(btn => btn.onclick = () => {
    day().meals[mealKey].push(btn.dataset.food); saveData(); refreshMeals();
    const again = document.querySelector(`[data-meal-input="${mealKey}"]`);
    if(again){ again.value=''; again.focus({ preventScroll:true }); openFoodSuggest(again, mealKey); } // seguir cargando rápido
  });
}

/* ---------- Bebidas ---------- */
function renderDrinks(){
  const r = day();
  const el = document.getElementById('drinks');
  const fixed = DRINKS.map(d => {
    const n = r.drinks[d.key];
    return `<div class="chip ${n>0?'on':''}" style="--c:${d.color}" data-drink="${d.key}">
        <button class="minus" data-drink-minus="${d.key}" aria-label="Restar">−</button>
        <div class="dico">${d.icon}</div><div class="name">${d.label}</div>
        <div class="n">${n}</div><div class="unit">${n===1?d.unit:pluralUnit(d.unit)}</div>
      </div>`;
  }).join('');
  const otros = Object.entries(r.otros).map(([name,n]) => `
      <div class="chip ${n>0?'on':''}" style="--c:#64748B" data-other="${esc(name)}">
        <button class="minus" data-other-minus="${esc(name)}" aria-label="Restar">−</button>
        <div class="dico">${OTHER_DRINK_ICON}</div><div class="name">${esc(name)}</div>
        <div class="n">${n}</div><div class="unit">${n===1?'unidad':'unidades'}</div>
      </div>`).join('');
  el.innerHTML = fixed + otros + `<div class="chip add-drink" id="addDrink"><div class="plus">+</div><div class="t">Otro</div></div>`;

  el.querySelectorAll('[data-drink]').forEach(c => c.onclick = e => { if(e.target.closest('[data-drink-minus]')) return; bumpDrink(c.dataset.drink,+1); });
  el.querySelectorAll('[data-drink-minus]').forEach(b => b.onclick = e => { e.stopPropagation(); bumpDrink(b.dataset.drinkMinus,-1); });
  el.querySelectorAll('[data-other]').forEach(c => c.onclick = e => { if(e.target.closest('[data-other-minus]')) return; bumpOther(c.dataset.other,+1); });
  el.querySelectorAll('[data-other-minus]').forEach(b => b.onclick = e => { e.stopPropagation(); bumpOther(b.dataset.otherMinus,-1); });
  document.getElementById('addDrink').onclick = promptOtherDrink;
}
function pluralUnit(u){ return u==='copa'?'copas':u==='vaso'?'vasos':'unidades'; }
function bumpDrink(key, delta){ const r=day(); r.drinks[key]=Math.max(0,r.drinks[key]+delta); saveData(); render(); if(delta>0) haptic(); }
function bumpOther(name, delta){ const r=day(); r.otros[name]=Math.max(0,(r.otros[name]||0)+delta); if(r.otros[name]===0) delete r.otros[name]; saveData(); render(); if(delta>0) haptic(); }
function promptOtherDrink(){
  openInputModal({ title:'Otra bebida', desc:'¿Qué tomaste? (ej: café, mate, jugo). Se cuenta por unidades.', placeholder:'Nombre de la bebida', confirm:'Agregar',
    onConfirm:v => { const name=(v||'').trim(); if(name) bumpOther(name,+1); } });
}

/* ---------- Suplementos ---------- */
function renderSupps(){
  const r = day();
  document.getElementById('suppCard').innerHTML = SUPPS.map((s,i) => `
    <div class="supp" ${i>0?'style="border-top:1px solid var(--border)"':''}>
      <div class="dot" style="background:${s.color}"></div><div class="lbl">${s.label}</div>
      <div class="stepper">
        <button data-supp-minus="${s.key}" aria-label="Restar">−</button>
        <input type="number" inputmode="numeric" min="0" step="${s.step}" value="${r.supp[s.key]}" data-supp-input="${s.key}" />
        <span class="u">${s.unit}</span>
        <button data-supp-plus="${s.key}" aria-label="Sumar">+</button>
      </div>
    </div>`).join('');
  const card = document.getElementById('suppCard');
  card.querySelectorAll('[data-supp-plus]').forEach(b => b.onclick = () => bumpSupp(b.dataset.suppPlus,+1));
  card.querySelectorAll('[data-supp-minus]').forEach(b => b.onclick = () => bumpSupp(b.dataset.suppMinus,-1));
  card.querySelectorAll('[data-supp-input]').forEach(inp => inp.onchange = () => { day().supp[inp.dataset.suppInput]=Math.max(0,parseFloat(inp.value.replace(',','.'))||0); saveData(); render(); });
}
function bumpSupp(key, dir){ const s=SUPPS.find(x=>x.key===key); const r=day(); r.supp[key]=Math.max(0,+(r.supp[key]+dir*s.step).toFixed(2)); saveData(); render(); haptic(); }

/* ============================================================
   ENTRENO
   ============================================================ */
function renderTraining(){
  const r = day();
  const sesiones = r.training.length;
  const minutos = r.training.reduce((s,t)=>s+(+t.duracion||0),0);
  const tipos = new Set(r.training.map(t=>t.tipo)).size;
  document.getElementById('trainSummary').innerHTML = statHTML([
    { top:'Sesiones', val:`${sesiones}`, frac: sesiones>0?1:0 },
    { top:'Minutos',  val:`${minutos}`, frac: Math.min(minutos/90,1) },
    { top:'Tipos',    val:`${tipos}`, frac: tipos/TRAIN_TYPES.length },
    { top:'Sueño',    val: r.sueno!=null ? `${nf(r.sueno)}<small> h</small>` : '—', frac: r.sueno!=null?Math.min(r.sueno/9,1):0 },
  ]);

  const list = document.getElementById('trainList');
  if(!sesiones){
    list.innerHTML = `<div class="empty center">Sin entrenamientos cargados este día.</div>`;
  } else {
    list.innerHTML = r.training.map((t,i) => {
      const cfg = TRAIN_TYPES.find(x=>x.key===t.tipo) || TRAIN_TYPES[2];
      const name = t.tipo==='otro' ? (t.nombre||'Otro') : cfg.label;
      const badges = [];
      if(t.intensidad) badges.push(`<span class="badge">${esc(t.intensidad)}</span>`);
      return `
        <div class="train-item">
          <div class="tico" style="background:${cfg.color}22; color:${cfg.color}">${cfg.icon}</div>
          <div class="tbody">
            <div class="trow"><span class="tname">${esc(name)}</span>${t.duracion?`<span class="tmin">· ${t.duracion} min</span>`:''}</div>
            <div class="trow" style="margin-top:5px; gap:6px">${badges.join('')}</div>
            ${t.nota?`<div class="tnote">${esc(t.nota)}</div>`:''}
          </div>
          <button class="tdel" data-train-del="${i}" aria-label="Quitar"><svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        </div>`;
    }).join('');
    list.querySelectorAll('[data-train-del]').forEach(b => b.onclick = () => { day().training.splice(+b.dataset.trainDel,1); saveData(); render(); });
  }
}

/* ---------- Descanso / sueño ---------- */
function renderSleep(){
  const r = day();
  document.getElementById('sleepCard').innerHTML = `
    <div class="supp">
      <div class="dot" style="background:#8B5CF6"></div>
      <div class="lbl">Sueño <span style="color:var(--faint); font-weight:600; font-size:12px">de anoche</span></div>
      <div class="stepper">
        <button id="sleepMinus" aria-label="Restar">−</button>
        <input type="number" inputmode="decimal" min="0" max="24" step="0.5" value="${r.sueno!=null?r.sueno:''}" placeholder="—" id="sleepInput" style="width:64px">
        <span class="u">h</span>
        <button id="sleepPlus" aria-label="Sumar">+</button>
      </div>
    </div>`;
  document.getElementById('sleepPlus').onclick = () => bumpSleep(+0.5);
  document.getElementById('sleepMinus').onclick = () => bumpSleep(-0.5);
  document.getElementById('sleepInput').onchange = e => {
    const v = e.target.value.trim();
    day().sueno = v==='' ? null : Math.max(0, Math.min(24, parseFloat(v.replace(',','.'))||0));
    saveData(); render();
  };
}
function bumpSleep(delta){
  const r = day();
  const base = r.sueno!=null ? r.sueno : (delta>0 ? 0 : 0);
  r.sueno = Math.max(0, Math.min(24, +(base+delta).toFixed(1)));
  saveData(); render(); haptic();
}

function openTrainingModal(){
  const state = { tipo:'futbol', nombre:'', duracion:'', intensidad:'Media', nota:'' };
  const bg = document.getElementById('modalBg');
  const m = document.getElementById('modal');
  function draw(){
    m.innerHTML = `
      <h3>Nuevo entrenamiento</h3>
      <div class="field"><label>Tipo</label>
        <div class="seg" id="segTipo">${TRAIN_TYPES.map(t=>`<button data-t="${t.key}" class="${state.tipo===t.key?'on':''}"><span class="e">${t.icon}</span>${t.label}</button>`).join('')}</div>
      </div>
      ${state.tipo==='otro'?`<div class="field"><label>¿Qué hiciste?</label><input id="fNombre" placeholder="Ej: natación, running, tenis…" value="${esc(state.nombre)}" autocomplete="off"></div>`:''}
      <div class="field"><label>Duración (minutos)</label><input id="fDur" type="number" inputmode="numeric" min="0" step="5" placeholder="Ej: 60" value="${state.duracion}"></div>
      <div class="field"><label>Intensidad</label>
        <div class="seg" id="segInt">${INTENS.map(x=>`<button data-i="${x}" class="${state.intensidad===x?'on':''}">${x}</button>`).join('')}</div>
      </div>
      <div class="field"><label>Nota (opcional)</label><input id="fNota" placeholder="Ej: piernas, partido con amigos…" value="${esc(state.nota)}" autocomplete="off"></div>
      <div class="modal-actions"><button class="btn-ghost" id="mCancel">Cancelar</button><button class="btn-primary" id="mOk">Guardar</button></div>`;
    bg.classList.add('show');
    m.querySelectorAll('#segTipo button').forEach(b => b.onclick = () => { sync(); state.tipo=b.dataset.t; draw(); });
    m.querySelectorAll('#segInt button').forEach(b => b.onclick = () => { sync(); state.intensidad=b.dataset.i; draw(); });
    m.querySelector('#mCancel').onclick = close;
    m.querySelector('#mOk').onclick = save;
  }
  function sync(){
    const n=m.querySelector('#fNombre'), d=m.querySelector('#fDur'), no=m.querySelector('#fNota');
    if(n) state.nombre=n.value; if(d) state.duracion=d.value; if(no) state.nota=no.value;
  }
  function close(){ bg.classList.remove('show'); }
  function save(){
    sync();
    const dur = Math.max(0, parseInt(state.duracion)||0);
    if(state.tipo==='otro' && !state.nombre.trim()){ toast('Poné qué entrenaste'); return; }
    day().training.push({ tipo:state.tipo, nombre:state.nombre.trim()||null, duracion:dur, intensidad:state.intensidad, nota:state.nota.trim()||null });
    saveData(); close(); render(); haptic(); toast('Entrenamiento guardado');
  }
  draw();
  bg.onclick = e => { if(e.target===bg) close(); };
}

/* ============================================================
   CUERPO / IMC
   ============================================================ */
function imcOf(peso){ const a=PROFILE.altura; if(!a||!peso) return null; const m=a/100; return peso/(m*m); }
function classifyImc(v){ for(const b of IMC_BANDS){ if(v < b.max) return b; } return IMC_BANDS[IMC_BANDS.length-1]; }
function weighIns(){ // [{key, peso}] ordenado por fecha asc
  return Object.keys(DATA).filter(k => DATA[k] && DATA[k].peso!=null)
    .sort().map(k => ({ key:k, peso:DATA[k].peso, cintura:DATA[k].cintura }));
}

function renderCuerpo(){
  const wraps = document.getElementById('imcWrap');
  const ins = weighIns();
  const last = ins[ins.length-1] || null;

  if(!PROFILE.altura){
    wraps.innerHTML = `<div class="imc-card"><div class="imc-sub">Para calcular tu IMC primero cargá tu <b>altura</b>.</div>
      <button class="btn-primary" id="setH" style="margin-top:14px; padding:12px 20px; border-radius:12px; font-weight:700">Cargar altura</button></div>`;
    wraps.querySelector('#setH').onclick = promptHeight;
  } else if(!last){
    wraps.innerHTML = `<div class="imc-card"><div class="imc-sub">Altura: <b>${PROFILE.altura} cm</b>.<br>Registrá tu peso para ver el IMC.</div></div>`;
  } else {
    const v = imcOf(last.peso);
    const band = classifyImc(v);
    // escala 15–35 para posicionar el marcador
    const pos = Math.max(0, Math.min(100, ((v-15)/(35-15))*100));
    const seg = [ ['#3B82F6', (18.5-15)/20*100], ['#10B981',(25-18.5)/20*100], ['#F59E0B',(30-25)/20*100], ['#EF4444',(35-30)/20*100] ];
    const dLabel = last.key===todayKey() ? 'hoy' : keyToDate(last.key).getDate()+' '+MO[keyToDate(last.key).getMonth()];
    wraps.innerHTML = `
      <div class="imc-card">
        <div class="imc-val" style="color:${band.color}">${nf(v.toFixed(1))}</div>
        <div class="imc-tag" style="background:${band.color}22; color:${band.color}">${band.label}</div>
        <div class="imc-scale">${seg.map(s=>`<div style="background:${s[0]}; width:${s[1]}%"></div>`).join('')}</div>
        <div class="imc-marker"><span style="left:${pos}%"></span></div>
        <div class="imc-legend"><span>15</span><span>18,5</span><span>25</span><span>30</span><span>35</span></div>
        <div class="imc-sub">Peso <b>${nf(last.peso)} kg</b> · Altura <b>${PROFILE.altura} cm</b> · <span style="color:var(--faint)">${dLabel}</span></div>
      </div>`;
  }

  // fila altura + cintura
  const lastCintura = last && last.cintura!=null ? last.cintura : null;
  document.getElementById('heightRow').innerHTML = `
    <div class="measure-row"><div class="lbl">Altura</div><div class="v">${PROFILE.altura?PROFILE.altura+' cm':'—'}</div><button class="edit" id="editH">${PROFILE.altura?'Cambiar':'Cargar'}</button></div>
    ${lastCintura!=null?`<div class="measure-row"><div class="lbl">Cintura (últ.)</div><div class="v">${nf(lastCintura)} cm</div><span class="badge">opcional</span></div>`:''}`;
  document.getElementById('editH').onclick = promptHeight;

  renderWeightTrend(ins);
}

function renderWeightTrend(ins){
  const box = document.getElementById('weightTrend');
  if(!ins.length){ box.innerHTML = `<div class="empty center">Todavía no registraste tu peso.</div>`; return; }
  const pts = ins.slice(-14);
  box.innerHTML = sparkline(pts) + pts.slice().reverse().map(p => {
    const v = imcOf(p.peso);
    const d = keyToDate(p.key);
    return `<div class="wlog">
      <div class="wd">${d.getDate()} ${MO[d.getMonth()]}</div>
      <div class="wkg">${nf(p.peso)} kg</div>
      ${v?`<div class="wimc">IMC ${nf(v.toFixed(1))}</div>`:''}
      <button class="wdel" data-wdel="${p.key}" aria-label="Quitar"><svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-wdel]').forEach(b => b.onclick = () => {
    const k=b.dataset.wdel;
    openConfirm({ title:'Quitar registro de peso', desc:`Se elimina el peso del ${keyToDate(k).getDate()}/${keyToDate(k).getMonth()+1}.`, confirm:'Quitar', danger:true,
      onConfirm:()=>{ if(DATA[k]){ DATA[k].peso=null; DATA[k].cintura=null; } pruneEmpty(); saveData(); renderCuerpo(); } });
  });
}

function sparkline(pts){
  if(pts.length<2) return `<div style="padding:16px 16px 4px; font-size:13px; color:var(--faint)">Cargá al menos dos pesos para ver la curva.</div>`;
  const W=600, H=120, pad=14;
  const xs = pts.map((_,i)=>i), ys = pts.map(p=>p.peso);
  const minY=Math.min(...ys), maxY=Math.max(...ys), rng=(maxY-minY)||1;
  const X=i=> pad + (i/(pts.length-1))*(W-2*pad);
  const Y=y=> pad + (1-(y-minY)/rng)*(H-2*pad);
  const d = pts.map((p,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(p.peso).toFixed(1)}`).join(' ');
  const area = `M${X(0).toFixed(1)},${(H-pad).toFixed(1)} ` + pts.map((p,i)=>`L${X(i).toFixed(1)},${Y(p.peso).toFixed(1)}`).join(' ') + ` L${X(pts.length-1).toFixed(1)},${(H-pad).toFixed(1)} Z`;
  const dots = pts.map((p,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(p.peso).toFixed(1)}" r="3" fill="var(--primary-strong)"/>`).join('');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <path d="${area}" fill="var(--primary)" opacity="0.12"/>
      <path d="${d}" fill="none" stroke="var(--primary-strong)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
}

function promptHeight(){
  openInputModal({ title:'Tu altura', desc:'En centímetros. Se usa para calcular el IMC.', placeholder:'Ej: 178', type:'number', value:PROFILE.altura||'', confirm:'Guardar',
    onConfirm:v => { const cm=parseFloat(String(v).replace(',','.')); if(cm>80&&cm<260){ PROFILE.altura=Math.round(cm); saveProfile(); renderCuerpo(); render(); toast('Altura guardada'); } else toast('Altura inválida'); } });
}

function openWeightModal(){
  const state = { fecha:todayKey(), peso: (DATA[todayKey()]&&DATA[todayKey()].peso)||'', cintura:(DATA[todayKey()]&&DATA[todayKey()].cintura)||'' };
  const bg = document.getElementById('modalBg'), m = document.getElementById('modal');
  m.innerHTML = `
    <h3>Registrar peso</h3>
    <div class="field"><label>Fecha</label><input id="wFecha" type="date" value="${state.fecha}" max="${todayKey()}"></div>
    <div class="field"><label>Peso (kg)</label><input id="wPeso" type="number" inputmode="decimal" step="0.1" min="0" placeholder="Ej: 78,5" value="${state.peso}"></div>
    <div class="field"><label>Cintura (cm) — opcional</label><input id="wCint" type="number" inputmode="decimal" step="0.5" min="0" placeholder="Perímetro abdominal" value="${state.cintura}"></div>
    <div class="modal-actions"><button class="btn-ghost" id="mCancel">Cancelar</button><button class="btn-primary" id="mOk">Guardar</button></div>`;
  bg.classList.add('show');
  m.querySelector('#mCancel').onclick = () => bg.classList.remove('show');
  m.querySelector('#mOk').onclick = () => {
    const fecha = m.querySelector('#wFecha').value || todayKey();
    const peso = parseFloat(m.querySelector('#wPeso').value.replace(',','.'));
    const cint = parseFloat(m.querySelector('#wCint').value.replace(',','.'));
    if(!(peso>0&&peso<400)){ toast('Peso inválido'); return; }
    if(!DATA[fecha]) DATA[fecha]=blankDay(); normalize(DATA[fecha]);
    DATA[fecha].peso = +peso.toFixed(1);
    DATA[fecha].cintura = (cint>0&&cint<300) ? +cint.toFixed(1) : null;
    saveData(); bg.classList.remove('show'); renderCuerpo(); haptic(); toast('Peso guardado');
  };
  bg.onclick = e => { if(e.target===bg) bg.classList.remove('show'); };
}

/* ============================================================
   HISTORIAL
   ============================================================ */
function renderHistory(){
  const list = document.getElementById('histList');
  if(!list) return; // la pestaña Historial fue removida
  pruneEmpty();
  const keys = Object.keys(DATA).sort().reverse();
  if(!keys.length){ list.innerHTML = `<div class="empty center">Todavía no cargaste ningún día. Empezá desde <b>Comida</b> o <b>Entreno</b>.</div>`; return; }
  list.innerHTML = keys.map(k => {
    const r = normalize(DATA[k]); const d = keyToDate(k);
    const mealsDone = MEALS.filter(m => r.meals[m.key].length>0).length;
    const alcohol = DRINKS.filter(x=>x.alcohol).reduce((s,x)=>s+r.drinks[x.key],0);
    const suppOn = SUPPS.some(s=>r.supp[s.key]>0);
    const minutos = r.training.reduce((s,t)=>s+(+t.duracion||0),0);
    const tags = [`<span class="tag">${mealsDone}/4 comidas</span>`];
    if(alcohol>0) tags.push(`<span class="tag al">${alcohol} alcohol</span>`);
    if(r.drinks.agua>0) tags.push(`<span class="tag">${r.drinks.agua} agua</span>`);
    if(suppOn) tags.push(`<span class="tag">suple</span>`);
    if(r.training.length) tags.push(`<span class="tag tr">${r.training.length} entreno${r.training.length>1?'s':''}${minutos?` · ${minutos}′`:''}</span>`);
    if(r.peso!=null) tags.push(`<span class="tag">${nf(r.peso)} kg</span>`);
    if(r.sueno!=null) tags.push(`<span class="tag">${nf(r.sueno)} h sueño</span>`);
    return `
      <button class="hist-item" data-goto="${k}">
        <div class="date"><div class="day">${d.getDate()}</div><div class="mon">${MO[d.getMonth()]}</div></div>
        <div class="meta"><div class="wd">${WD[d.getDay()]}</div><div class="tags">${tags.join('')}</div></div>
        <div class="chev"><svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      </button>`;
  }).join('');
  list.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { current=b.dataset.goto; switchView('comida'); render(); const sc=document.querySelector('main'); if(sc) sc.scrollTop=0; });
}

/* ============================================================
   RESUMEN (métricas + adherencia)
   Día completo = 4 comidas + agua + (entreno o descanso cargado)
   ============================================================ */
let resumenMonth = null; // 'YYYY-MM' visible en el heatmap; se inicializa al mes actual
function shiftMonth(ym, delta){
  let [y,m] = ym.split('-').map(Number); m += delta;
  while(m < 1){ m += 12; y--; } while(m > 12){ m -= 12; y++; }
  return `${y}-${String(m).padStart(2,'0')}`;
}
const CHEV_L = '<svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEV_R = '<svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const LEVELCOL = [
  'var(--surface-2)',
  'color-mix(in srgb, var(--primary) 28%, var(--surface-2))',
  'color-mix(in srgb, var(--primary) 48%, var(--surface-2))',
  'color-mix(in srgb, var(--primary) 72%, var(--surface-2))',
  'var(--primary)'
];
const FIRE_ICON = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3s4 3 4 7a4 4 0 01-8 0c0-1 .3-1.7.7-2.4C9 9 9 10.5 10 11c-.4-2 .8-6 2-8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.5 13.5A5.5 5.5 0 1017.5 14c0-2-1-3.5-1-3.5-.3 1.6-1.5 2.2-1.5 2.2.3-2.4-1-4.7-2.5-5.7 0 2-1.2 3-2.3 4.2-.9 1-3.7 1-3.7 1.3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

// Metadatos de los criterios configurables de "día completo".
const GOAL_DEFS = [
  { key:'comidas',  label:'Las 4 comidas',      desc:'Desayuno, almuerzo, merienda y cena', note:'las 4 comidas' },
  { key:'agua',     label:'Agua',               desc:'Al menos un vaso',                    note:'agua' },
  { key:'descanso', label:'Entreno o descanso', desc:'Un entrenamiento o las horas de sueño', note:'un entreno o descanso' },
  { key:'creatina', label:'Creatina',           desc:'Dosis del día',                       note:'creatina' },
  { key:'proteina', label:'Proteína',           desc:'Dosis del día',                       note:'proteína' },
];
// Texto legible de los criterios activos, para la nota del heatmap.
function goalsNoteText(){
  const on = GOAL_DEFS.filter(g => GOALS[g.key]).map(g => g.note);
  if(!on.length) return 'cualquier registro del día';
  if(on.length === 1) return on[0];
  return on.slice(0,-1).join(', ') + ' y ' + on[on.length-1];
}

// Puntaje de un día según los criterios ACTIVOS en GOALS.
// complete = cumple todos los criterios tildados; frac (0..1) = promedio de cumplimiento (para el color).
function dayScore(r){
  if(!r) return { level:0, complete:false, has:false, frac:0 };
  const has = dayHasData(r);
  const meals  = MEALS.filter(m => ((r.meals && r.meals[m.key]) || []).length > 0).length;
  const aguaOK = !!(r.drinks && r.drinks.agua > 0);
  const restOK = (Array.isArray(r.training) && r.training.length > 0) || (r.sueno != null);
  const creOK  = !!(r.supp && r.supp.creatina > 0);
  const proOK  = !!(r.supp && r.supp.proteina > 0);
  const parts = [];
  if(GOALS.comidas)  parts.push(meals/4);          // crédito parcial por comida
  if(GOALS.agua)     parts.push(aguaOK ? 1 : 0);
  if(GOALS.descanso) parts.push(restOK ? 1 : 0);
  if(GOALS.creatina) parts.push(creOK ? 1 : 0);
  if(GOALS.proteina) parts.push(proOK ? 1 : 0);
  let complete, frac;
  if(!parts.length){ complete = has; frac = has ? 1 : 0; }             // sin criterios: alcanza con cargar algo
  else { complete = parts.every(p => p >= 1); frac = parts.reduce((a,b)=>a+b,0)/parts.length; }
  complete = complete && has;
  let level;
  if(complete) level = 4;
  else if(!has) level = 0;
  else if(frac >= 0.75) level = 3;
  else if(frac >= 0.45) level = 2;
  else level = 1;
  return { level, complete, has, frac };
}
// Racha de días completos terminando en hoy (con gracia: si hoy aún no está completo, arranca en ayer).
function completeStreak(){
  let k = todayKey();
  if(!dayScore(DATA[k]).complete) k = shiftDay(k, -1);
  let s = 0, guard = 0;
  while(dayScore(DATA[k]).complete && guard < 3660){ s++; k = shiftDay(k, -1); guard++; }
  return s;
}
function bestStreak(){
  const keys = Object.keys(DATA).filter(k => dayScore(DATA[k]).complete).sort();
  let best = 0, cur = 0, prev = null;
  keys.forEach(k => { cur = (prev && shiftDay(prev,1) === k) ? cur+1 : 1; if(cur > best) best = cur; prev = k; });
  return best;
}
function periodStats(keys){
  const dk = keys.filter(k => DATA[k] && dayHasData(DATA[k]));
  const n = dk.length || 1;
  let mealsSum=0, aguaSum=0, entrenos=0, minutos=0, alcoholDays=0, completos=0;
  dk.forEach(k => {
    const r = normalize(DATA[k]);
    mealsSum += MEALS.filter(m => r.meals[m.key].length>0).length;
    aguaSum  += r.drinks.agua || 0;
    entrenos += r.training.length;
    minutos  += r.training.reduce((s,t)=>s+(+t.duracion||0),0);
    if(DRINKS.filter(d=>d.alcohol).reduce((s,d)=>s+r.drinks[d.key],0) > 0) alcoholDays++;
    if(dayScore(r).complete) completos++;
  });
  return { dias:dk.length, comidasProm:mealsSum/n, aguaProm:aguaSum/n, entrenos, minutos, alcoholDays, completos };
}

function renderResumen(){
  const wrap = document.getElementById('resumenWrap');
  const anyData = Object.keys(DATA).some(k => dayHasData(DATA[k]));
  if(!anyData){
    wrap.innerHTML = `<div class="empty center">Todavía no hay datos para resumir. Cargá algunos días desde <b>Comida</b> o <b>Entreno</b> y volvé.</div>`;
    return;
  }
  const curMonth = todayKey().slice(0,7);
  if(!resumenMonth) resumenMonth = curMonth;
  const [Y,M] = resumenMonth.split('-').map(Number);
  const pad = n => String(n).padStart(2,'0');
  const dim = new Date(Y, M, 0).getDate();
  const monthKeys = []; for(let d=1; d<=dim; d++) monthKeys.push(`${Y}-${pad(M)}-${pad(d)}`);
  const nextDisabled = resumenMonth >= curMonth; // no navegar al futuro

  const st  = periodStats(monthKeys);              // métricas del mes visible
  const cur = completeStreak(), best = bestStreak(); // racha: siempre global/actual

  // ---- heatmap del mes (lunes primero) ----
  const firstDow = (new Date(Y, M-1, 1).getDay()+6)%7;
  let cells = '';
  for(let i=0;i<firstDow;i++) cells += '<div></div>';
  monthKeys.forEach(k => {
    const d = +k.slice(-2);
    const future = k > todayKey();
    const sc = dayScore(DATA[k]);
    const bg = future ? 'var(--surface-2)' : LEVELCOL[sc.level];
    const goto = (!future && dayHasData(DATA[k])) ? `data-goto="${k}"` : '';
    cells += `<div class="cal-cell ${sc.level>=3?'filled':''} ${k===todayKey()?'today':''}" style="background:${bg};${future?'opacity:.35;':''}" ${goto}><span>${d}</span></div>`;
  });
  const monthComplete = monthKeys.filter(k => dayScore(DATA[k]).complete).length;

  // ---- constancia por día de la semana (frac promedio del mes, hasta hoy) ----
  const buckets = [[],[],[],[],[],[],[]];
  monthKeys.forEach(k => { if(k > todayKey() || !dayHasData(DATA[k])) return; buckets[(keyToDate(k).getDay()+6)%7].push(dayScore(DATA[k]).frac); });
  const wdAvg = buckets.map(a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0);
  const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  // ---- peso del mes ----
  const wins = monthKeys.filter(k => DATA[k] && DATA[k].peso != null).map(k => ({ key:k, peso:DATA[k].peso }));
  let pesoBlock = '';
  if(wins.length >= 2){
    const first = wins[0], last = wins[wins.length-1], delta = +(last.peso - first.peso).toFixed(1);
    pesoBlock = `
      <div class="section-title">Peso del mes</div>
      <div class="card res-pad">${sparkline(wins)}
        <div class="wk"><span>${keyToDate(first.key).getDate()} ${MO[keyToDate(first.key).getMonth()]} · <b>${nf(first.peso)} kg</b></span>
        <span><b>${nf(last.peso)} kg</b> <span style="color:var(--primary-strong)">${(delta>=0?'+':'')+nf(delta)}</span></span></div>
      </div>`;
  }

  wrap.innerHTML = `
    <div class="card streak">
      <div class="fire">${FIRE_ICON}</div>
      <div><div class="n">${cur}<small> día${cur===1?'':'s'}</small></div><div class="lb">Racha de días completos</div></div>
      <div class="best"><div class="v">${best}</div><div class="k">Mejor</div></div>
    </div>

    <div class="res-stats">
      <div class="res-stat"><div class="k">Comidas / día</div><div class="v">${nf(st.comidasProm.toFixed(1))}<small>/4</small></div><div class="sub">promedio del mes</div></div>
      <div class="res-stat"><div class="k">Agua / día</div><div class="v">${nf(st.aguaProm.toFixed(1))}<small> v</small></div><div class="sub">promedio</div></div>
      <div class="res-stat"><div class="k">Entrenos</div><div class="v">${st.entrenos}</div><div class="sub">${st.minutos} min</div></div>
      <div class="res-stat"><div class="k">Días con alcohol</div><div class="v">${st.alcoholDays}</div><div class="sub">de ${st.dias} con registro</div></div>
    </div>

    <div class="section-title">Adherencia</div>
    <div class="card res-pad">
      <div class="cal-nav">
        <button class="cal-arrow" id="calPrev" aria-label="Mes anterior">${CHEV_L}</button>
        <span class="cal-m">${MO_LONG[M-1]} ${Y}</span>
        <button class="cal-arrow" id="calNext" ${nextDisabled?'disabled':''} aria-label="Mes siguiente">${CHEV_R}</button>
      </div>
      <div class="cal-dow"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-legend"><span>menos</span><i style="background:var(--surface-2)"></i><i style="background:${LEVELCOL[2]}"></i><i style="background:${LEVELCOL[3]}"></i><i style="background:var(--primary)"></i><span>más</span></div>
      <div class="cal-note"><b>${monthComplete} día${monthComplete===1?'':'s'}</b> completo${monthComplete===1?'':'s'}. Un día se completa con ${goalsNoteText()}. Tocá un día para abrirlo. <span style="color:var(--faint)">Configurable en Datos.</span></div>
    </div>

    <div class="section-title">Constancia por día de la semana</div>
    <div class="card res-pad"><div class="wd-bars">${DIAS.map((d,i)=>`<div class="wd-col ${i>=5?'wknd':''}"><div class="wd-track"><div class="wd-fill" style="height:${Math.max(3,Math.round(wdAvg[i]*100))}%"></div></div><div class="bl">${d}</div></div>`).join('')}</div></div>

    ${pesoBlock}`;

  const p = wrap.querySelector('#calPrev'); if(p) p.onclick = () => { resumenMonth = shiftMonth(resumenMonth, -1); renderResumen(); };
  const nx = wrap.querySelector('#calNext'); if(nx) nx.onclick = () => { if(resumenMonth < curMonth){ resumenMonth = shiftMonth(resumenMonth, 1); renderResumen(); } };
  wrap.querySelectorAll('[data-goto]').forEach(c => c.onclick = () => { current = c.dataset.goto; switchView('comida'); render(); const sc = document.querySelector('main'); if(sc) sc.scrollTop = 0; });
}

// Interruptores de "día completo" en la pestaña Datos.
function renderGoals(){
  const wrap = document.getElementById('goalsWrap');
  if(!wrap) return;
  wrap.innerHTML = GOAL_DEFS.map(g => `
    <div class="goal-row">
      <div class="gtext"><div class="gl">${g.label}</div><div class="gs">${g.desc}</div></div>
      <label class="switch"><input type="checkbox" data-goal="${g.key}" ${GOALS[g.key]?'checked':''}><span class="track"></span><span class="knob"></span></label>
    </div>`).join('');
  wrap.querySelectorAll('[data-goal]').forEach(inp => inp.onchange = () => {
    GOALS[inp.dataset.goal] = inp.checked; saveGoals(); haptic();
  });
}

/* ============================================================
   EXPORTAR / IMPORTAR
   Columnas: Fecha;Tipo;Categoria;Detalle;Cantidad;Unidad
   ============================================================ */
function buildCsv(keys){
  const rows = [['FechaISO','Fecha','DiaSemana','Tipo','Categoria','Detalle','Cantidad','Unidad']];
  keys.sort().forEach(k => {
    const r = normalize(DATA[k]); if(!r) return;
    const iso = k;                                  // YYYY-MM-DD: ordena y parsea sin ambigüedad
    const fecha = k.split('-').reverse().join('/');  // DD/MM/YYYY: legible en Excel
    const dow = WD[keyToDate(k).getDay()];           // día de la semana (patrones fin de semana, etc.)
    const push = (tipo,cat,det,cant,uni) => rows.push([iso,fecha,dow,tipo,cat,det,cant,uni]);
    MEALS.forEach(m => r.meals[m.key].forEach(it => push('Comida',m.label,it,'','')));
    DRINKS.forEach(d => { if(r.drinks[d.key]>0) push(d.alcohol?'Bebida alcohólica':'Bebida', d.label,'',r.drinks[d.key],d.unit); });
    Object.entries(r.otros).forEach(([name,n]) => { if(n>0) push('Bebida',name,'',n,'unidad'); });
    SUPPS.forEach(s => { if(r.supp[s.key]>0) push('Suplemento',s.label,'',nf(r.supp[s.key]),s.unit); });
    r.training.forEach(t => {
      const cfg = TRAIN_TYPES.find(x=>x.key===t.tipo)||TRAIN_TYPES[2];
      const cat = t.tipo==='otro' ? (t.nombre||'Otro') : cfg.label;
      const det = [t.intensidad, t.nota].filter(Boolean).join(' — ');
      push('Entrenamiento',cat,det,(t.duracion||''),t.duracion?'min':'');
    });
    if(r.peso!=null){
      push('Cuerpo','Peso','',nf(r.peso),'kg');
      const v = imcOf(r.peso);
      if(v) push('Cuerpo','IMC','',nf(v.toFixed(1)),'');
      if(PROFILE.altura) push('Cuerpo','Altura','',PROFILE.altura,'cm');
      if(r.cintura!=null) push('Cuerpo','Cintura','',nf(r.cintura),'cm');
    }
    if(r.sueno!=null) push('Descanso','Sueño','',nf(r.sueno),'h');
  });
  const csv = rows.map(row => row.map(c => { c=String(c); return /[;"\n]/.test(c) ? '"'+c.replace(/"/g,'""')+'"' : c; }).join(';')).join('\r\n');
  return '\uFEFF' + csv;
}
function download(filename, content, mime){
  const blob = new Blob([content], { type:mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
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
  download('habitos_todo.csv', buildCsv(keys), 'text/csv;charset=utf-8');
  toast(`Exportado: ${keys.length} día(s)`);
}
function exportBackup(){
  pruneEmpty();
  const payload = { app:'Habitos', version:2, exportedAt:new Date().toISOString(), profile:PROFILE, goals:GOALS, data:DATA };
  download(`habitos_backup_${todayKey()}.json`, JSON.stringify(payload,null,2), 'application/json');
  toast('Backup descargado');
}
function doRestore(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      const incoming = parsed.data || parsed;
      if(typeof incoming!=='object' || Array.isArray(incoming)) throw 0;
      DATA = incoming;
      if(parsed.profile) PROFILE = parsed.profile;
      if(parsed.goals) GOALS = Object.assign({}, GOALS_DEFAULT, parsed.goals);
      pruneEmpty(); saveData(); saveProfile(); saveGoals();
      current = todayKey(); render(); renderCuerpo(); fillMonths();
      toast('Datos restaurados');
    }catch{ toast('Archivo inválido'); }
  };
  reader.readAsText(file);
}
function fillMonths(){
  const sel = document.getElementById('monthSelect');
  const months = [...new Set(Object.keys(DATA).filter(k=>dayHasData(DATA[k])).map(k=>k.slice(0,7)))].sort().reverse();
  if(!months.length){ sel.innerHTML = `<option value="">Sin datos aún</option>`; return; }
  const cur = todayKey().slice(0,7);
  sel.innerHTML = months.map(ym => { const [y,m]=ym.split('-'); return `<option value="${ym}" ${ym===cur?'selected':''}>${MO_LONG[+m-1]} ${y}</option>`; }).join('');
}

/* ============================================================
   NAVEGACIÓN / MODALES / UI
   ============================================================ */
const DAY_VIEWS = ['comida','entreno'];
function switchView(name){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.view===name));
  document.getElementById('dateBar').style.display = DAY_VIEWS.includes(name) ? '' : 'none';
  if(name==='cuerpo') renderCuerpo();
  if(name==='resumen') renderResumen();
  if(name==='datos'){ fillMonths(); renderGoals(); }
  const sc = document.querySelector('main'); if(sc) sc.scrollTop = 0;
}

function openInputModal({title, desc, placeholder, type='text', value='', confirm, onConfirm}){
  const bg=document.getElementById('modalBg'), m=document.getElementById('modal');
  m.innerHTML = `<h3>${esc(title)}</h3>${desc?`<p>${esc(desc)}</p>`:''}
    <input id="mIn" type="${type}" inputmode="${type==='number'?'decimal':'text'}" placeholder="${esc(placeholder||'')}" value="${esc(String(value))}" enterkeyhint="done" autocomplete="off">
    <div class="modal-actions"><button class="btn-ghost" id="mCancel">Cancelar</button><button class="btn-primary" id="mOk">${esc(confirm||'Aceptar')}</button></div>`;
  bg.classList.add('show');
  const inp=m.querySelector('#mIn'); setTimeout(()=>inp.focus(),50);
  inp.addEventListener('keydown', e=>{ if(e.key==='Enter') ok(); });
  function close(){ bg.classList.remove('show'); }
  function ok(){ const v=inp.value; close(); onConfirm&&onConfirm(v); }
  m.querySelector('#mCancel').onclick=close; m.querySelector('#mOk').onclick=ok;
  bg.onclick=e=>{ if(e.target===bg) close(); };
}
function openConfirm({title, desc, confirm, danger, onConfirm}){
  const bg=document.getElementById('modalBg'), m=document.getElementById('modal');
  m.innerHTML = `<h3>${esc(title)}</h3>${desc?`<p>${esc(desc)}</p>`:''}
    <div class="modal-actions"><button class="btn-ghost" id="mCancel">Cancelar</button><button class="${danger?'btn-danger':'btn-primary'}" id="mOk">${esc(confirm||'Aceptar')}</button></div>`;
  bg.classList.add('show');
  function close(){ bg.classList.remove('show'); }
  m.querySelector('#mCancel').onclick=close;
  m.querySelector('#mOk').onclick=()=>{ close(); onConfirm&&onConfirm(); };
  bg.onclick=e=>{ if(e.target===bg) close(); };
}

const TK_OK  = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TK_BAD = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 7v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/></svg>';
function toast(msg){
  const wrap = document.getElementById('toasts');
  const bad = /inválid|error|no hay|no se pudo|falló|todavía no/i.test(msg);
  const card = document.createElement('div');
  card.className = 'toastcard' + (bad ? ' bad' : '');
  card.innerHTML = `<span class="tk">${bad?TK_BAD:TK_OK}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(card);
  requestAnimationFrame(() => card.classList.add('show'));
  setTimeout(() => { card.classList.remove('show'); setTimeout(() => card.remove(), 300); }, 2200);
  while(wrap.children.length > 4) wrap.removeChild(wrap.firstChild); // que la pila no crezca infinito
}
function haptic(){ if(navigator.vibrate) navigator.vibrate(8); }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- Tema ---------- */
function applyTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(THEME_KEY, mode);
  document.getElementById('themeBtn').innerHTML = mode==='dark'
    ? `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}
function initTheme(){ const saved=localStorage.getItem(THEME_KEY); applyTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')); }

/* ============================================================
   EVENTOS GLOBALES
   ============================================================ */
document.getElementById('prevDay').onclick = () => { current=shiftDay(current,-1); render(); };
document.getElementById('nextDay').onclick = () => { current=shiftDay(current,+1); render(); };
document.getElementById('goToday').onclick = () => { current=todayKey(); render(); };
document.getElementById('themeBtn').onclick = () => applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
document.querySelectorAll('.tab').forEach(b => b.onclick = () => switchView(b.dataset.view));

document.getElementById('addTrain').onclick = openTrainingModal;
document.getElementById('addWeight').onclick = openWeightModal;

document.getElementById('btnCsvMonth').onclick = exportCsvMonth;
document.getElementById('btnCsvAll').onclick = exportCsvAll;
document.getElementById('btnBackup').onclick = exportBackup;
document.getElementById('btnRestore').onclick = () => document.getElementById('restoreInput').click();
document.getElementById('restoreInput').onchange = e => {
  const f=e.target.files[0]; if(!f) return;
  openConfirm({ title:'Restaurar backup', desc:'Esto reemplaza TODOS los datos actuales por los del archivo. ¿Seguro?', confirm:'Restaurar', danger:true, onConfirm:()=>doRestore(f) });
  e.target.value='';
};
document.getElementById('btnReset').onclick = () => {
  openConfirm({ title:'Borrar todos los datos', desc:'Se elimina todo el historial de este dispositivo. Esta acción no se puede deshacer.', confirm:'Borrar todo', danger:true,
    onConfirm:()=>{ DATA={}; PROFILE={altura:null}; GOALS=Object.assign({},GOALS_DEFAULT); saveData(); saveProfile(); saveGoals(); current=todayKey(); render(); renderCuerpo(); fillMonths(); toast('Datos borrados'); } });
};

document.querySelector('main').addEventListener('scroll', (e) => document.getElementById('appbar').classList.toggle('scrolled', e.target.scrollTop>4), { passive:true });

/* ---------- Instalación PWA ---------- */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt=e; document.getElementById('btnInstall').classList.remove('hidden'); });
document.getElementById('btnInstall').onclick = async () => { if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; document.getElementById('btnInstall').classList.add('hidden'); };
(function iosHint(){
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone=navigator.standalone||matchMedia('(display-mode: standalone)').matches;
  if(isIOS&&!standalone) document.getElementById('installHint').innerHTML='En iPhone: tocá <b>Compartir</b> ⬆️ y luego <b>Agregar a inicio</b>.';
})();

/* ---------- Service worker + cartel de actualización ---------- */
/* ---------- Cartel de actualización ----------
   Cuando el service worker nuevo toma control, en vez de recargar de golpe
   (que interrumpe si estás cargando algo), mostramos un cartel para que
   actualices cuando quieras. */
function showUpdateBanner(){
  if(document.getElementById('updateBanner')) return; // evitar duplicados
  const b = document.createElement('div');
  b.id = 'updateBanner'; b.className = 'update-banner';
  b.innerHTML = `<div class="ub-txt"><b>Nueva versión disponible</b><span>Actualizá para ver las mejoras</span></div><button id="updateBtn">Actualizar</button>`;
  document.body.appendChild(b);
  requestAnimationFrame(() => b.classList.add('show'));
  b.querySelector('#updateBtn').onclick = () => { b.querySelector('#updateBtn').textContent = 'Actualizando…'; window.location.reload(); };
}
if('serviceWorker' in navigator){
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(hadController) showUpdateBanner(); // hubo control previo = es actualización, no primera instalación
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.update();                                   // chequea versión nueva al abrir
      setInterval(() => reg.update(), 60 * 60 * 1000); // y cada hora si queda abierta
    }).catch(()=>{});
  });
}

/* ---------- Parche de altura para iOS instalado (app-shell) ----------
   En iOS standalone, 100dvh queda corto y la barra flotante "sube". Medimos el alto
   real de la pantalla (screen.height menos el safe-area top) y lo fijamos en --saH,
   para que el body llene toda la pantalla y la .bottomnav quede siempre abajo.
   SOLO iOS instalado: en Android/desktop 100dvh ya funciona bien. */
(function(){
  var standalone = (window.navigator.standalone === true) ||
                   (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if(!(standalone && isIOS)) return;
  document.documentElement.classList.add('sa');
  var maxH = 0;
  function setH(){
    var probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;visibility:hidden;height:env(safe-area-inset-top)';
    document.body.appendChild(probe);
    var top = Math.round(probe.getBoundingClientRect().height); probe.remove();
    var real = ((window.screen && window.screen.height) ? window.screen.height : window.innerHeight) - top;
    var h = Math.max(window.innerHeight, real) + 6;
    if(h > maxH) maxH = h; // nunca achicar: evita que la barra "rebote" hacia arriba
    document.documentElement.style.setProperty('--saH', maxH + 'px');
  }
  setH();
  [60,200,500,1000].forEach(function(t){ setTimeout(setH, t); });
  window.addEventListener('resize', setH);
  window.addEventListener('orientationchange', function(){ maxH = 0; setTimeout(setH, 300); });
})();

/* ============================================================
   ARRANQUE
   ============================================================ */
initTheme();
render();
fillMonths();
