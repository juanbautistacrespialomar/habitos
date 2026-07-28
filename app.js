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
  { key:'cerveza', label:'Cerveza', emoji:'🍺', unit:'unidad', alcohol:true,  color:'#D97706' },
  { key:'vino',    label:'Vino',    emoji:'🍷', unit:'copa',   alcohol:true,  color:'#9F1239' },
  { key:'fernet',  label:'Fernet',  emoji:'🥃', unit:'vaso',   alcohol:true,  color:'#7C3B12' },
  { key:'gaseosa', label:'Gaseosa', emoji:'🥤', unit:'vaso',   alcohol:false, color:'#0891B2' },
  { key:'agua',    label:'Agua',    emoji:'💧', unit:'vaso',   alcohol:false, color:'#38BDF8' },
];
const SUPPS = [
  { key:'creatina', label:'Creatina', unit:'g', step:1, color:'#6366F1' },
  { key:'proteina', label:'Proteína', unit:'g', step:5, color:'#EC4899' },
];
const TRAIN_TYPES = [
  { key:'futbol',   label:'Fútbol',   emoji:'⚽', color:'#16A34A' },
  { key:'gimnasio', label:'Gimnasio', emoji:'🏋️', color:'#0D9488' },
  { key:'otro',     label:'Otro',     emoji:'🤸', color:'#6366F1' },
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
const THEME_KEY   = 'habitos_theme';

/* ---------- Estado ---------- */
let DATA = loadJSON(STORE_KEY, {});
let PROFILE = loadJSON(PROFILE_KEY, { altura:null });
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

function blankDay(){
  const meals = {}; MEALS.forEach(m => meals[m.key] = []);
  const drinks = {}; DRINKS.forEach(d => drinks[d.key] = 0);
  const supp = {}; SUPPS.forEach(s => supp[s.key] = 0);
  return { meals, drinks, supp, otros:{}, training:[], peso:null, cintura:null };
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
  return r;
}
function dayHasData(r){
  if(!r) return false;
  return Object.values(r.meals||{}).some(a => a && a.length)
    || Object.values(r.drinks||{}).some(n => n>0)
    || Object.values(r.otros||{}).some(n => n>0)
    || Object.values(r.supp||{}).some(n => n>0)
    || (Array.isArray(r.training) && r.training.length>0)
    || (r.peso != null);
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
  const alcohol = DRINKS.filter(d => d.alcohol).reduce((s,d) => s + r.drinks[d.key], 0);
  const agua = r.drinks.agua;
  const suppOn = SUPPS.filter(s => r.supp[s.key] > 0).length;
  const stats = [
    { top:'Comidas', val:`${mealsDone}<small>/4</small>`, frac:mealsDone/4 },
    { top:'Alcohol', val:`${alcohol}`, frac: alcohol>0?1:0, warn: alcohol>0 },
    { top:'Agua',    val:`${agua}<small> v</small>`, frac: Math.min(agua/8,1) },
    { top:'Suple',   val: suppOn>0 ? '✓' : '—', frac: suppOn/2 },
  ];
  document.getElementById('summary').innerHTML = statHTML(stats);
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
          <div class="item"><span>${esc(it)}</span>
            <button data-meal="${m.key}" data-i="${i}" aria-label="Quitar"><svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
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
      </div>`;
  }).join('');

  wrap.querySelectorAll('[data-meal-add]').forEach(b => b.onclick = () => addMeal(b.dataset.mealAdd));
  wrap.querySelectorAll('[data-meal-input]').forEach(inp => inp.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); addMeal(inp.dataset.mealInput); }}));
  wrap.querySelectorAll('[data-meal][data-i]').forEach(b => b.onclick = () => { day().meals[b.dataset.meal].splice(+b.dataset.i,1); saveData(); render(); });
}
function addMeal(key){
  const inp = document.querySelector(`[data-meal-input="${key}"]`);
  const val = inp.value.trim(); if(!val) return;
  day().meals[key].push(val); saveData(); render();
  const again = document.querySelector(`[data-meal-input="${key}"]`); if(again) again.focus();
}

/* ---------- Bebidas ---------- */
function renderDrinks(){
  const r = day();
  const el = document.getElementById('drinks');
  const fixed = DRINKS.map(d => {
    const n = r.drinks[d.key];
    return `<div class="chip ${n>0?'on':''}" style="--c:${d.color}" data-drink="${d.key}">
        <button class="minus" data-drink-minus="${d.key}" aria-label="Restar">−</button>
        <div class="emoji">${d.emoji}</div><div class="name">${d.label}</div>
        <div class="n">${n}</div><div class="unit">${n===1?d.unit:pluralUnit(d.unit)}</div>
      </div>`;
  }).join('');
  const otros = Object.entries(r.otros).map(([name,n]) => `
      <div class="chip ${n>0?'on':''}" style="--c:#64748B" data-other="${esc(name)}">
        <button class="minus" data-other-minus="${esc(name)}" aria-label="Restar">−</button>
        <div class="emoji">🥤</div><div class="name">${esc(name)}</div>
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
    { top:'Estado',   val: sesiones>0?'✓':'—', frac: sesiones>0?1:0 },
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
          <div class="tico" style="background:${cfg.color}22">${cfg.emoji}</div>
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

function openTrainingModal(){
  const state = { tipo:'futbol', nombre:'', duracion:'', intensidad:'Media', nota:'' };
  const bg = document.getElementById('modalBg');
  const m = document.getElementById('modal');
  function draw(){
    m.innerHTML = `
      <h3>Nuevo entrenamiento</h3>
      <div class="field"><label>Tipo</label>
        <div class="seg" id="segTipo">${TRAIN_TYPES.map(t=>`<button data-t="${t.key}" class="${state.tipo===t.key?'on':''}"><span class="e">${t.emoji}</span>${t.label}</button>`).join('')}</div>
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
  pruneEmpty();
  const keys = Object.keys(DATA).sort().reverse();
  const list = document.getElementById('histList');
  if(!keys.length){ list.innerHTML = `<div class="empty center">Todavía no cargaste ningún día. Empezá desde <b>Comida</b> o <b>Entreno</b>.</div>`; return; }
  list.innerHTML = keys.map(k => {
    const r = normalize(DATA[k]); const d = keyToDate(k);
    const mealsDone = MEALS.filter(m => r.meals[m.key].length>0).length;
    const alcohol = DRINKS.filter(x=>x.alcohol).reduce((s,x)=>s+r.drinks[x.key],0);
    const suppOn = SUPPS.some(s=>r.supp[s.key]>0);
    const minutos = r.training.reduce((s,t)=>s+(+t.duracion||0),0);
    const tags = [`<span class="tag">${mealsDone}/4 comidas</span>`];
    if(alcohol>0) tags.push(`<span class="tag al">🍷 ${alcohol}</span>`);
    if(r.drinks.agua>0) tags.push(`<span class="tag">💧 ${r.drinks.agua}</span>`);
    if(suppOn) tags.push(`<span class="tag">💪 suple</span>`);
    if(r.training.length) tags.push(`<span class="tag tr">🏋️ ${r.training.length}${minutos?` · ${minutos}′`:''}</span>`);
    if(r.peso!=null) tags.push(`<span class="tag">⚖️ ${nf(r.peso)} kg</span>`);
    return `
      <button class="hist-item" data-goto="${k}">
        <div class="date"><div class="day">${d.getDate()}</div><div class="mon">${MO[d.getMonth()]}</div></div>
        <div class="meta"><div class="wd">${WD[d.getDay()]}</div><div class="tags">${tags.join('')}</div></div>
        <div class="chev"><svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      </button>`;
  }).join('');
  list.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { current=b.dataset.goto; switchView('comida'); render(); window.scrollTo(0,0); });
}

/* ============================================================
   EXPORTAR / IMPORTAR
   Columnas: Fecha;Tipo;Categoria;Detalle;Cantidad;Unidad
   ============================================================ */
function buildCsv(keys){
  const rows = [['Fecha','Tipo','Categoria','Detalle','Cantidad','Unidad']];
  keys.sort().forEach(k => {
    const r = normalize(DATA[k]); if(!r) return;
    const fecha = k.split('-').reverse().join('/'); // DD/MM/YYYY
    MEALS.forEach(m => r.meals[m.key].forEach(it => rows.push([fecha,'Comida',m.label,it,'',''])));
    DRINKS.forEach(d => { if(r.drinks[d.key]>0) rows.push([fecha, d.alcohol?'Bebida alcohólica':'Bebida', d.label,'',r.drinks[d.key],d.unit]); });
    Object.entries(r.otros).forEach(([name,n]) => { if(n>0) rows.push([fecha,'Bebida',name,'',n,'unidad']); });
    SUPPS.forEach(s => { if(r.supp[s.key]>0) rows.push([fecha,'Suplemento',s.label,'',nf(r.supp[s.key]),s.unit]); });
    r.training.forEach(t => {
      const cfg = TRAIN_TYPES.find(x=>x.key===t.tipo)||TRAIN_TYPES[2];
      const cat = t.tipo==='otro' ? (t.nombre||'Otro') : cfg.label;
      const det = [t.intensidad, t.nota].filter(Boolean).join(' — ');
      rows.push([fecha,'Entrenamiento',cat,det,(t.duracion||''),t.duracion?'min':'']);
    });
    if(r.peso!=null){
      rows.push([fecha,'Cuerpo','Peso','',nf(r.peso),'kg']);
      const v = imcOf(r.peso);
      if(v) rows.push([fecha,'Cuerpo','IMC','',nf(v.toFixed(1)),'']);
      if(PROFILE.altura) rows.push([fecha,'Cuerpo','Altura','',PROFILE.altura,'cm']);
      if(r.cintura!=null) rows.push([fecha,'Cuerpo','Cintura','',nf(r.cintura),'cm']);
    }
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
  const payload = { app:'Habitos', version:2, exportedAt:new Date().toISOString(), profile:PROFILE, data:DATA };
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
      pruneEmpty(); saveData(); saveProfile();
      current = todayKey(); render(); renderCuerpo(); renderHistory(); fillMonths();
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
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b.dataset.view===name));
  document.getElementById('dateBar').style.display = DAY_VIEWS.includes(name) ? '' : 'none';
  if(name==='cuerpo') renderCuerpo();
  if(name==='hist') renderHistory();
  if(name==='datos') fillMonths();
  window.scrollTo(0,0);
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

let toastTimer;
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2200); }
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
document.querySelectorAll('.nav button').forEach(b => b.onclick = () => switchView(b.dataset.view));

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
    onConfirm:()=>{ DATA={}; PROFILE={altura:null}; saveData(); saveProfile(); current=todayKey(); render(); renderCuerpo(); renderHistory(); fillMonths(); toast('Datos borrados'); } });
};

addEventListener('scroll', () => document.getElementById('appbar').classList.toggle('scrolled', window.scrollY>4), { passive:true });

/* ---------- Instalación PWA ---------- */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt=e; document.getElementById('btnInstall').classList.remove('hidden'); });
document.getElementById('btnInstall').onclick = async () => { if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; document.getElementById('btnInstall').classList.add('hidden'); };
(function iosHint(){
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone=navigator.standalone||matchMedia('(display-mode: standalone)').matches;
  if(isIOS&&!standalone) document.getElementById('installHint').innerHTML='En iPhone: tocá <b>Compartir</b> ⬆️ y luego <b>Agregar a inicio</b>.';
})();

/* ---------- Service worker ---------- */
if('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));

/* ============================================================
   ARRANQUE
   ============================================================ */
initTheme();
render();
fillMonths();
