/* ===== Care Management Workbench demo — core + queue ===== */
(function(){
'use strict';
const WB = window.WB;
/* Element.append that skips null/false and flattens arrays (used throughout). */
(function(){ const ap = Element.prototype.append; Element.prototype.append = function(...k){ return ap.apply(this, k.flat(Infinity).filter(x=>x!==null&&x!==undefined&&x!==false)); }; })();
const P = Object.fromEntries(WB.patients.map(p => [p.id, p]));
const IDS = WB.patients.map(p => p.id);
const App = window.App = { WB, P, IDS, screens:{} };

/* ---------- dates ---------- */
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function parseD(s){ if(!s) return null; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); if(!m) return null; return new Date(+m[1], +m[2]-1, +m[3], +(m[4]||0), +(m[5]||0)); }
const AS_OF = parseD(WB.meta.asOf);
function fmtDate(s, withDow=true){ const d = s instanceof Date ? s : parseD(s); if(!d) return '—'; return (withDow? DOW[d.getDay()]+' ' : '') + d.getDate()+' '+MON[d.getMonth()]; }
function fmtTime(d){ let h=d.getHours(), m=d.getMinutes(); const ap = h>=12?'PM':'AM'; h = h%12||12; return h+':'+String(m).padStart(2,'0')+' '+ap; }
function hasTime(s){ return /T\d{2}:\d{2}/.test(String(s||'')); }
function fmtDT(s){ const d=parseD(s); if(!d) return '—'; return fmtDate(d) + (hasTime(s)? ', '+fmtTime(d):''); }
function dayDiff(s){ const d = s instanceof Date ? s : parseD(s); if(!d) return null; const a = new Date(AS_OF.getFullYear(),AS_OF.getMonth(),AS_OF.getDate()); const b = new Date(d.getFullYear(),d.getMonth(),d.getDate()); return Math.round((b-a)/864e5); }
function dueLabel(s){ const n = dayDiff(s); if(n===null) return 'no date'; if(n===0) return 'today'; if(n===1) return 'tomorrow'; if(n===-1) return 'yesterday'; return n>0 ? 'in '+n+' d' : (-n)+' d ago'; }
function ageLabel(s){ const n = dayDiff(s); if(n===null) return '—'; const a = -n; if(a<=0) return 'today'; if(a<14) return a+' d'; if(a<60) return Math.round(a/7)+' wk'; return Math.round(a/30.4)+' mo'; }
function nowDemo(){ return new Date(AS_OF.getTime() + (S.clockOffsetMin||0)*60000); }
Object.assign(App, { parseD, fmtDate, fmtTime, fmtDT, dayDiff, dueLabel, ageLabel, nowDemo, AS_OF });

/* ---------- state ---------- */
const KEY = 'wb-demo-v1';
function fresh(){ return { weights:{...WB.meta.weights}, order:null, overrides:[], merged:false, medAnswers:{}, goalsDone:{}, notes:{}, contactState:{}, signed:{}, tasks:[], requested:{}, clockOffsetMin:0, welcomed:false, skipped:{}, snoozed:{}, recent:[], callLog:{}, filter:'all' }; }
let S = fresh();
try { const raw = localStorage.getItem(KEY); if(raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch(e){}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
App.S = () => S; App.save = save;
App.reset = function(){ try{ localStorage.removeItem(KEY);}catch(e){} S = fresh(); App.S = () => S; location.hash = '#queue'; render(); renderTop(); welcome(); };

/* ---------- dom helper ---------- */
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if(attrs) for(const [k,v] of Object.entries(attrs)){
    if(v===null || v===undefined || v===false) continue;
    if(k==='class') el.className = v;
    else if(k==='style' && typeof v==='object') Object.assign(el.style, v);
    else if(k.startsWith('on') && typeof v==='function') el.addEventListener(k.slice(2), v);
    else if(k==='html') el.innerHTML = v;
    else el.setAttribute(k, v===true? '' : v);
  }
  for(const k of kids.flat(Infinity)){ if(k===null||k===undefined||k===false) continue; el.append(k instanceof Node ? k : document.createTextNode(String(k))); }
  return el;
}
App.h = h;
const nm = n => h('span',{class:'nm','aria-hidden':'true'}, String(n));
App.nm = nm;

/* ---------- data helpers ---------- */
const ID_KEYS = {adt:'alertID',claims:'claimID',pharmacy:'rxID',contacts:'contactID',sdoh:'screenID',labs:'labID',appointments:'apptID',auth:'authID',notes:'noteID'};
const TABLE_LABEL = {eligibility:'Member & eligibility',adt:'Hospital alert (ADT)',claims:'Claims',pharmacy:'Pharmacy',contacts:'Contact history',sdoh:'SDOH / HRA',labs:'Labs & clinical',appointments:'Appointments',auth:'Authorizations & UM',notes:'Notes & call center',riskDeadlines:'Risk scores & deadlines'};
function findRecord(p, ref){
  if(ref==='riskDeadlines') return {table:'riskDeadlines', rows:p.raw.riskDeadlines};
  if(/^M-\d+$/.test(ref)) return {table:'eligibility', record:p.raw.eligibility.find(r=>r.memberID===ref)};
  for(const [t,k] of Object.entries(ID_KEYS)){ const r = p.raw[t].find(x=>x[k]===ref); if(r) return {table:t, record:r}; }
  return null;
}
function weightsNorm(){ const w = S.weights; const t = Object.values(w).reduce((a,b)=>a+b,0)||1; const o={}; for(const k in w) o[k]=w[k]/t; return o; }
function score(p){ const w = weightsNorm(); let s=0; for(const k in w) s += w[k]*p.scores[k]; return Math.round(s*100)/100; }
function merged(){ return S.merged===true; }
function queueOrder(){
  let ids = IDS.slice().sort((a,b)=> score(P[b]) - score(P[a]));
  if(S.order && S.order.length===IDS.length) ids = S.order.slice();
  return ids;
}
function whyNow(p){ return (p.id==='P3' && merged()) ? p.merge.afterMerge.whyNow : p.queue.whyNow; }
function flagsFor(p){
  let f = p.queue.flags.slice();
  if(p.id==='P3'){ if(merged()) f = f.filter(x=>x.kind!=='duplicate'); else if(S.merged==='rejected') f = f.map(x=> x.kind==='duplicate'? {kind:'grey',text:'Marked not a duplicate'} : x); }
  return f;
}
Object.assign(App, { findRecord, score, merged, queueOrder, whyNow, flagsFor, weightsNorm, TABLE_LABEL });

/* ---------- labels ---------- */
function labelize(k){ return k.replace(/ID$/,' ID').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase()).replace(/\bDob\b/,'Date of birth').replace(/\bIcd10\b/,'ICD-10').replace(/\bPcp\b/,'PCP').replace(/\bLoinc\b/,'LOINC').replace(/\bHrs\b/,'(hours)').replace(/\bImp Ref\b/,'Imperfection'); }
function fmtVal(v){ if(typeof v==='string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return fmtDT(v)+'  ·  '+v; return String(v); }

/* ---------- components ---------- */
function SourceChip(p, s){
  const lbl = s.label + (s.date? ' · '+fmtDate(s.date,false):'');
  return h('button',{class:'src', title:'Open source record '+s.ref, onclick:(e)=>{ e.stopPropagation(); openEvidence(p, s.ref, s); }}, lbl);
}
function AgeBadge(date){ if(!date) return h('span',{class:'age'},'—'); const n = -dayDiff(date); return h('span',{class:'age'+(n>90?' stale':''), title:fmtDate(date)}, n>90? ageLabel(date)+' · stale' : ageLabel(date)); }
function ClockChip(c){ return h('div',{class:'clockchip '+(c.urgency||'none')}, h('b',null,c.label), c.sub? h('span',null,c.sub):null); }
function StatusPill(st){ let label = st.label; if(st.kind==='conflict' && !/conflict/i.test(label)) label = 'Conflict · '+label; return h('span',{class:'pill '+st.kind}, label); }
function Inferred(conf, because){ return h('span',{class:'inferred', title: because? 'Because: '+because : 'Inferred'}, 'Inferred' + (conf? ' · '+conf : '')); }
const Draft = () => h('span',{class:'draft', title:'Drafted automatically from the sources shown. Check before relying on it.'}, 'Draft');
function Flag(f){ return h('span',{class:'flag '+f.kind}, f.kind==='restricted'? h('span',{class:'lock'}):null, f.text); }
Object.assign(App, { SourceChip, AgeBadge, ClockChip, StatusPill, Inferred, Draft, Flag });

/* ---------- overlays ---------- */
let overlayStack = [];
function closeTop(){ const o = overlayStack.pop(); if(o){ o.forEach(n=>n.remove()); if(o.onClose) o.onClose(); } }
App.closeTop = closeTop;
function drawer(title, sub, body){
  const scrim = h('div',{class:'scrim', onclick:closeTop});
  const d = h('aside',{class:'drawer', role:'dialog', 'aria-label':title},
    h('div',{class:'drawer-h'}, h('div',null, h('div',{class:'eyebrow'}, sub||''), h('h2',{class:'h1', style:{fontSize:'22px'}}, title)), h('button',{class:'x','aria-label':'Close',onclick:closeTop},'×')),
    h('div',{class:'drawer-b'}, body));
  document.body.append(scrim, d); const entry=[scrim,d]; overlayStack.push(entry); setTimeout(()=>d.querySelector('.x').focus(),30); return entry;
}
function modal(title, body, footer, opts={}){
  const wrap = h('div',{class:'modal-wrap'});
  const scrim = h('div',{class:'scrim'});
  const m = h('div',{class:'modal'+(opts.narrow?' narrow':''), role:'dialog','aria-modal':'true','aria-label':title},
    h('div',{class:'modal-h'}, h('div',null, opts.eyebrow? h('div',{class:'eyebrow'},opts.eyebrow):null, h('h2',{class:'h1', style:{fontSize:'22px'}}, title)), opts.noClose? null : h('button',{class:'x','aria-label':'Close',onclick:closeTop},'×')),
    h('div',{class:'modal-b'}, body), footer? h('div',{class:'modal-f'}, footer) : null);
  wrap.append(m); wrap.addEventListener('click', e=>{ if(e.target===wrap && !opts.noClose) closeTop(); });
  document.body.append(scrim, wrap); const entry=[scrim,wrap]; entry.onClose = opts.onClose; overlayStack.push(entry);
  setTimeout(()=>{ const f = m.querySelector('.modal-f .primary, input, button'); if(f) f.focus(); },30);
  return entry;
}
function toast(msg, undo){
  let box = document.querySelector('.toasts'); if(!box){ box = h('div',{class:'toasts','aria-live':'polite'}); document.body.append(box); }
  const t = h('div',{class:'toast'}, h('span',null,msg), undo? h('button',{onclick:()=>{ undo(); t.remove(); }},'Undo'):null);
  box.append(t); setTimeout(()=>t.remove(), undo? 7000 : 4200);
}
function confirmBox(title, text, okLabel, onOk){
  modal(title, h('p',null,text), [h('button',{class:'btn',onclick:closeTop},'Cancel'), h('button',{class:'btn primary',onclick:()=>{ closeTop(); onOk(); }}, okLabel)], {narrow:true});
}
Object.assign(App, { drawer, modal, toast, confirmBox });

/* ---------- evidence drawer ---------- */
function recordTable(rec){
  const dl = h('dl',{class:'kv'});
  for(const [k,v] of Object.entries(rec)){ if(k==='impRef') continue; dl.append(h('dt',null,labelize(k)), h('dd',{class: /ID$|phone|Phone/.test(k)?'mono':null}, fmtVal(v))); }
  return dl;
}
function impNotes(rec){
  if(!rec || !rec.impRef) return null;
  return String(rec.impRef).split(/;\s*/).map(id=>{ const im = WB.imperfections.find(x=>x.impID===id); if(!im) return null;
    return h('div',{class:'imp'}, h('b',null,'Planted imperfection '+id+' · '+im.type), h('p',{style:{marginTop:'4px'}}, im.whatIsWrong), h('p',{style:{marginTop:'6px'}}, h('b',{style:{color:'var(--ink-2)'}},'How the workbench handles it: '), im.howTheProductShouldHandleIt)); });
}
function openEvidence(p, ref, src){
  const f = findRecord(p, ref);
  if(!f){ toast('No source record found for '+ref); return; }
  if(f.rows){
    const body = h('div',{class:'stack'}, f.rows.map(r=> h('div',{class:'card'}, h('b',null,r.metric), h('div',{class:'muted small',style:{margin:'2px 0 8px'}}, r.sourceModel||''), recordTable(r), impNotes(r))));
    drawer(TABLE_LABEL.riskDeadlines, p.name, body); return;
  }
  const body = h('div',null,
    h('p',{class:'muted small',style:{marginBottom:'12px'}}, 'Raw record as received from the feed. ', src && src.date? 'Received or recorded '+fmtDate(src.date)+' ('+ageLabel(src.date)+' ago).':''),
    recordTable(f.record), impNotes(f.record));
  drawer(ref, TABLE_LABEL[f.table]+' · '+p.name, body);
}
function openSources(p){
  const seen = new Set(); const items = [];
  p.summary.forEach(s=> s.sources.forEach(src=>{ if(!seen.has(src.ref)){ seen.add(src.ref); items.push(src); } }));
  const body = h('div',null,
    h('p',{class:'muted',style:{marginBottom:'12px'}}, 'The “why now” line is built from these records. Open any one to see it raw.'),
    h('div',{class:'side-list'}, items.map(s=>{ const f = findRecord(p,s.ref); return h('div',{class:'side-item'}, h('div',null, h('div',{style:{fontWeight:600}}, f? TABLE_LABEL[f.table]:s.label), h('div',{class:'muted small'}, s.ref)), SourceChip(p,s)); })));
  drawer(items.length+' sources', 'Why now · '+p.name, body);
}
App.openEvidence = openEvidence; App.openSources = openSources;

/* ---------- top bar & rail ---------- */
function renderTop(){
  const tb = document.querySelector('.topbar'); tb.innerHTML = '';
  const input = h('input',{type:'search', id:'search', placeholder:'Search member name or ID', 'aria-label':'Search members', autocomplete:'off'});
  const results = h('div',{class:'search-results', hidden:true});
  input.addEventListener('input', ()=>{
    const q = input.value.trim().toLowerCase(); results.innerHTML='';
    if(!q){ results.hidden=true; return; }
    const hits = WB.patients.filter(p=> p.name.toLowerCase().includes(q) || p.memberIds.some(id=>id.toLowerCase().includes(q)));
    if(!hits.length){ results.append(h('div',{style:{padding:'10px 12px'},class:'muted'},'No member matches “'+input.value+'” in the demo data.')); }
    hits.forEach(p=>{ const idHit = p.memberIds.find(id=>id.toLowerCase().includes(q));
      const dup = p.id==='P3' && !merged() && idHit==='M-20193';
      results.append(h('button',{onclick:()=>{ input.value=''; results.hidden=true; go('member-'+p.id.toLowerCase()); }},
        h('span',null, h('b',null,p.name), ' · ', p.age, ' · ', p.program), h('span',{class:'mono small muted'}, dup? 'M-20193 · possible duplicate of M-20103' : p.memberIds.join(' / ')))); });
    results.hidden=false;
  });
  input.addEventListener('keydown', e=>{ if(e.key==='Escape'){ input.value=''; results.hidden=true; input.blur(); } if(e.key==='Enter'){ const b=results.querySelector('button'); if(b) b.click(); } });
  const notesBtn = h('button',{class:'tb-btn hide-sm', 'aria-pressed': document.body.classList.contains('notes-on')?'true':'false', onclick:toggleNotes, title:'Show why each element is designed this way (N)'}, 'Design notes');
  tb.append(
    h('div',{class:'brand'}, h('b',null,'Workbench'), h('span',null, WB.meta.plan+' · Care Management')),
    h('div',{class:'search'}, input, results),
    h('div',{class:'tb-right'},
      h('span',{class:'clock', title:'Demo clock — frozen at Monday 9 Nov 2026'}, fmtDate(nowDemo())+' · '+fmtTime(nowDemo())),
      notesBtn,
      h('button',{class:'tb-btn hide-sm', onclick:()=>App.startTour && App.startTour()}, 'Tour'),
      h('button',{class:'tb-btn hide-sm', onclick:()=>confirmBox('Reset the demo?','This clears merges, calls, signed notes, tasks and reorders, and starts Monday 8:00 AM again.','Reset demo', App.reset)}, 'Reset demo'),
      h('span',{class:'avatar'}, h('i',null,WB.persona.initials), h('span',null,'Maria R., RN'))));
}
App.renderTop = renderTop;
function renderRail(route){
  const rail = document.querySelector('.rail'); rail.innerHTML='';
  const open = IDS.filter(id=>!S.signed[id]).length;
  const openTasks = S.tasks.filter(t=>!t.done).length;
  rail.append(
    h('a',{href:'#queue','aria-current': route.name==='queue'?'page':null}, h('span',null,'Today'), h('span',{class:'count'},open)),
    h('a',{href:'#tasks','aria-current': route.name==='tasks'?'page':null}, h('span',null,'Tasks'), h('span',{class:'count'},openTasks)),
    S.recent.length? h('div',{class:'label'},'Recent') : null,
    S.recent.slice(0,4).map(id=> h('a',{href:'#member-'+id.toLowerCase(), 'aria-current': (route.id===id)?'page':null}, h('span',null,P[id].name), h('span',{class:'mono small muted'}, id))),
    h('div',{class:'foot'}, WB.meta.planNote, h('br'), h('br'), 'Demo for the HiLabs APM case.'));
}

/* ---------- router ---------- */
function parseRoute(){
  const hsh = (location.hash||'').replace(/^#/,'');
  let m;
  if((m = hsh.match(/^member-(p[1-5])$/i))) return {name:'member', id:m[1].toUpperCase()};
  if((m = hsh.match(/^outreach-(p[1-5])$/i))) return {name:'outreach', id:m[1].toUpperCase()};
  if(hsh==='tasks') return {name:'tasks'};
  return {name:'queue'};
}
function go(hash){ if(location.hash==='#'+hash) render(); else location.hash = hash; }
App.go = go; App.route = parseRoute;
function render(){
  const r = parseRoute();
  if(r.id){ S.recent = [r.id, ...S.recent.filter(x=>x!==r.id)].slice(0,4); save(); }
  renderRail(r);
  const main = document.querySelector('main'); main.innerHTML=''; main.scrollTop = 0;
  const scr = App.screens[r.name];
  if(scr) scr.render(main, r); else main.append(h('div',{class:'page'},'Loading…'));
  renderNotesPanel(r);
  renderTop();
}
App.render = render;
window.addEventListener('hashchange', ()=>{ while(overlayStack.length) closeTop(); render(); });

/* ---------- design notes ---------- */
function toggleNotes(){ document.body.classList.toggle('notes-on'); render(); }
App.toggleNotes = toggleNotes;
function renderNotesPanel(r){
  document.querySelectorAll('.notes-panel').forEach(n=>n.remove());
  if(!document.body.classList.contains('notes-on')) return;
  const key = r.name==='member'?'member': r.name==='outreach'?'outreach': r.name==='queue'?'queue':null;
  const panel = h('aside',{class:'notes-panel','aria-label':'Design notes'},
    h('div',{class:'row',style:{justifyContent:'space-between'}}, h('h3',null,'Design notes'), h('button',{class:'x','aria-label':'Close design notes',onclick:toggleNotes},'×')),
    h('p',{class:'muted small'}, 'Why each part of this screen sits where it does. Numbers match the dark markers on the screen.'));
  if(key) WB.annotations[key].forEach(a=> panel.append(h('div',{class:'note-item'}, nm(a.n), h('div',null, h('b',null,a.title+'. '), a.text))));
  else panel.append(h('p',{class:'muted',style:{marginTop:'12px'}}, 'Tasks are created when Maria signs a note. Nothing is assigned without her sign-off.'));
  if(r.name==='outreach'){
    panel.append(h('div',{class:'eyebrow',style:{marginTop:'18px'}},'Where AI stops'));
    [['Automated',WB.aiBoundary.automated],['Maria confirms',WB.aiBoundary.mariaConfirms],['Never automatic',WB.aiBoundary.neverAutomatic]].forEach(([t,l])=> panel.append(h('div',{class:'note-item',style:{gridTemplateColumns:'1fr'}}, h('div',null,h('b',null,t), h('ul',{style:{margin:'4px 0 0',paddingLeft:'18px'}}, l.map(x=>h('li',null,x)))))));
  }
  if(r.name==='member'){
    const imps = WB.imperfections.filter(x=>x.patientRef===r.id);
    panel.append(h('div',{class:'eyebrow',style:{marginTop:'18px'}}, 'Planted data problems for '+P[r.id].shortName+' ('+imps.length+')'));
    imps.forEach(im=> panel.append(h('div',{class:'note-item',style:{gridTemplateColumns:'1fr'}}, h('div',null, h('b',null, im.impID+' · '+im.type), h('div',{class:'small',style:{marginTop:'3px'}}, im.whatIsWrong), h('div',{class:'small muted',style:{marginTop:'4px'}}, '→ '+im.howTheProductShouldHandleIt)))));
  }
  if(r.name==='queue'){
    panel.append(h('div',{class:'eyebrow',style:{marginTop:'18px'}},'Maria’s day today (estimate)'));
    WB.persona.timeModel.forEach(t=> panel.append(h('div',{class:'side-item'}, h('span',null,t.activity), h('span',{class:'mono small'}, t.min+' → '+t.target+' min'))));
    panel.append(h('p',{class:'muted small',style:{marginTop:'6px'}},'Left: today without the workbench. Right: the pilot target.'));
  }
  document.body.append(panel);
}

/* ---------- welcome ---------- */
function welcome(){
  if(S.welcomed) return;
  const pr = WB.persona;
  const body = h('div',null,
    h('p',{style:{fontSize:'15px',marginBottom:'14px'}}, 'It’s ', h('b',null,'Monday 9 November, 8:00 AM'), '. Six hospital alerts came in over the weekend. This is your workbench.'),
    h('dl',{class:'persona'},
      h('dt',null,'Role'), h('dd',null, pr.role),
      h('dt',null,'Background'), h('dd',null, pr.background),
      h('dt',null,'Caseload'), h('dd',null, pr.caseload),
      h('dt',null,'Judged on'), h('dd',null, pr.judgedOn.join(' · ')),
      h('dt',null,'Your edge'), h('dd',null, pr.edge),
      h('dt',null,'Without this tool'), h('dd',null, pr.todayWithoutProduct),
      h('dt',null,'Your ask'), h('dd',{style:{fontStyle:'italic'}}, '“'+pr.ask+'”')),
    h('p',{class:'muted small',style:{marginTop:'16px'}}, 'Demo of the Care Management Workbench · HiLabs APM case 2026–27 · ', WB.meta.planNote));
  const done = ()=>{ S.welcomed=true; save(); };
  modal('You are Maria.', body, [
    h('button',{class:'btn',onclick:()=>{ done(); closeTop(); }},'Explore on my own'),
    h('button',{class:'btn primary',onclick:()=>{ done(); closeTop(); App.startTour && App.startTour(); }},'Take the 2-minute tour')
  ], {eyebrow: pr.fullTitle, onClose: done});
}
App.welcome = welcome;

/* =======================================================================
   SCREEN 1 — TODAY (WORK QUEUE)
   ======================================================================= */
const FILTERS = [
  {key:'all', label:'All', test:()=>true},
  {key:'alerts', label: WB.meta.caseload.newAlertsSinceFri+' new alerts since Fri', test:p=> p.raw.adt.some(a=> (dayDiff(a.alertReceived)||-99) >= -3)},
  {key:'clocks', label: WB.meta.caseload.clocksWithin2Days+' clocks ≤ 2 days', test:p=> ['today','soon'].includes(p.queue.clock.urgency)},
  {key:'merge', label: WB.meta.caseload.recordsToMerge+' record to merge', test:p=> p.id==='P3' && S.merged!==true && S.merged!=='rejected'},
];
function plannedTimes(){
  // "Now" items get 30-minute slots from 8:00 in queue order; fixed times stay.
  const out = {}; let slot = 8*60;
  queueOrder().forEach(id=>{ const w = P[id].queue.nba.when; if(/^\d{1,2}:\d{2}$/.test(w)){ const [hh,mm]=w.split(':').map(Number); out[id]=hh*60+mm; } else { out[id]=slot; slot+=30; } });
  return out;
}
function minLabel(m){ const d = new Date(AS_OF); d.setHours(Math.floor(m/60), m%60); return fmtTime(d); }

function renderQueue(main){
  const page = h('div',{class:'page'});
  const openCount = IDS.filter(id=>!S.signed[id]).length;
  page.append(
    h('div',{class:'q-head','data-tour':'queue-header'},
      h('div',null, h('div',{class:'eyebrow'},'Today · '+fmtDate(AS_OF)), h('h1',{class:'h1',style:{marginTop:'4px'}},'Good morning, Maria'),
        h('p',{class:'muted',style:{marginTop:'4px'}}, WB.meta.caseload.active+' active cases · '+openCount+' need you today · ranked by risk and hard deadlines')),
      h('div',{class:'row'},
        S.order? h('button',{class:'btn ghost', onclick:()=>{ S.order=null; save(); flipRender(); toast('Order reset to the ranking.'); }},'Reset order') : null,
        h('button',{class:'btn','data-tour':'rank-settings', onclick:openRanking},'How ranking works'))),
    h('div',{class:'filters', role:'group','aria-label':'Filter the queue'}, FILTERS.map(f=> h('button',{class:'fchip','aria-pressed': S.filter===f.key?'true':'false', onclick:()=>{ S.filter=f.key; save(); render(); }}, f.label))),
    dayPlan(),
    h('div',{class:'qtable', id:'qtable'})
  );
  main.append(page);
  fillQueue();
}
function dayPlan(){
  const times = plannedTimes(); const start=8*60, end=19*60;
  const pct = m => ((Math.min(Math.max(m,start),end)-start)/(end-start)*100)+'%';
  const track = h('div',{class:'dp-track'}, h('div',{class:'dp-line'}));
  for(let t=8;t<=19;t+=1){ if((t-8)%2===0||t===19) track.append(h('span',{class:'dp-tick',style:{left:pct(t*60)}}, (t>12?t-12:t)+(t>=12?' pm':' am'))); }
  const nowM = nowDemo().getHours()*60+nowDemo().getMinutes();
  track.append(h('div',{class:'dp-now',style:{left:pct(nowM)},title:'Now'}));
  queueOrder().forEach(id=>{ const p=P[id]; const m=times[id];
    track.append(h('button',{class:'dp-dot'+(S.signed[id]?' done':''), style:{left:pct(m)}, 'aria-label':minLabel(m)+' '+p.queue.nba.label+' — '+p.name, onclick:()=>{ const row=document.querySelector('[data-id="'+id+'"]'); if(row){ row.scrollIntoView({block:'center',behavior:'smooth'}); row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); } }},
      h('span',{class:'tip'}, minLabel(m)+' · '+p.queue.nba.label+(S.signed[id]?' · done':''))));
  });
  return h('div',{class:'dayplan'}, h('div',{class:'row',style:{justifyContent:'space-between'}}, h('span',{class:'eyebrow'},'Your day plan'), h('span',{class:'muted small'},'Suggested contact times from each member’s best hour and deadline')), track);
}
function fillQueue(){
  const box = document.getElementById('qtable'); if(!box) return; box.innerHTML='';
  box.append(h('div',{class:'qhead'}, h('span',null,'# ',nm(1)), h('span',null,'Member'), h('span',null,'Why now ',nm(2)), h('span',null,'Clock ',nm(3)), h('span',null,'Next step ',nm(4)), h('span')));
  const f = FILTERS.find(x=>x.key===S.filter)||FILTERS[0];
  const order = queueOrder();
  const open = order.filter(id=>!S.signed[id]); const done = order.filter(id=>S.signed[id]);
  const shown = open.filter(id=>f.test(P[id]));
  shown.forEach(id=> box.append(qRow(P[id], open.indexOf(id)+1)));
  if(!shown.length) box.append(h('div',{class:'qfoot'}, open.length? 'No members match this filter. ' : 'Everyone on today’s list is done. ', h('button',{class:'linkbtn',onclick:()=>{S.filter='all';save();render();}},'Show all')));
  if(S.filter!=='all' && f.key==='alerts') box.append(h('div',{class:'qfoot'},'2 of the 6 weekend alerts belong to members in this demo; the other 4 sit in cases outside the demo data.'));
  if(done.length){ box.append(h('div',{class:'group-label'},'Done today')); done.forEach(id=> box.append(qRow(P[id], null))); }
  box.append(h('div',{class:'qfoot'}, (WB.meta.caseload.otherCasesNotInDemo)+' other active cases — nothing due today (not in demo data)'));
}
function qRow(p, rank){
  const isDone = !!S.signed[p.id];
  const urgent = !isDone && ['today','soon'].includes(p.queue.clock.urgency);
  const sc = score(p);
  const row = h('div',{class:'qrow'+(urgent?' urgent':'')+(isDone?' done':''), 'data-id':p.id, 'data-tour':'row-'+p.id, tabindex:'0', role:'link', 'aria-label':p.name+', open member view',
    onclick:(e)=>{ if(e.target.closest('button,a,.popover,.menu,input,select')) return; go('member-'+p.id.toLowerCase()); },
    onkeydown:(e)=>{ if(e.key==='Enter' && e.target===row) go('member-'+p.id.toLowerCase()); }});
  // rank + score
  const scoreBtn = h('button',{class:'score', 'aria-label':'Score '+sc.toFixed(2)+', show breakdown', onclick:(e)=>{ e.stopPropagation(); togglePopover(scoreBtn, scorePopover(p)); }}, sc.toFixed(2));
  const handle = h('button',{class:'handle', draggable: isDone? null:'true', title:'Drag to reorder', 'aria-label':'Drag to reorder '+p.name});
  row.append(h('div',{class:'rankcell'}, isDone? null : handle, h('span',{class:'rankno'}, rank||'✓'), scoreBtn));
  // member
  const ed = p.id==='P3' ? (merged()? '7 ED visits, 85 d' : '3 ED visits (+4 on 2nd ID?)') : p.queue.subtitle;
  row.append(h('div',{class:'mname'}, h('b',null, p.shortName+', '+p.age, p.language.conflict? h('span',{class:'lang',title:'Prefers Spanish (self-reported)'},'ES'):null), h('span',null, ed)));
  // why
  row.append(h('div',{class:'why'}, isDone? h('span',{class:'muted'},'Note signed '+S.signed[p.id]+'. Tasks created.') : [whyNow(p), ' ', h('button',{class:'src', onclick:(e)=>{e.stopPropagation(); openSources(p);}}, p.queue.sourceCount+' sources')],
    h('div',{class:'flags'}, isDone? null : flagsFor(p).slice(0,2).map(Flag))));
  // clock
  row.append(isDone? h('div',{class:'clockchip none'}, h('b',null,'Done'), h('span',null,S.signed[p.id])) : ClockChip(p.queue.clock));
  // next step
  const nb = p.queue.nba; const when = plannedTimes()[p.id];
  const snooze = S.snoozed[p.id];
  row.append(h('div',{class:'nba'},
    isDone? h('button',{class:'btn sm',onclick:(e)=>{e.stopPropagation(); go('member-'+p.id.toLowerCase());}},'Open member') :
    [ h('button',{class:'btn primary', onclick:(e)=>{ e.stopPropagation(); if(p.id==='P3' && S.merged!==true && S.merged!=='rejected' && App.openMerge){ App.openMerge(()=>go('outreach-p3')); } else go('outreach-'+p.id.toLowerCase()); }}, (p.id==='P3' && merged())? 'Text (555) 010-1391' : nb.label),
      h('small',null, snooze? 'Snoozed until '+snooze : (nb.when==='Now'? 'Now · slot '+minLabel(when) : minLabel(when)), nb.note? h('span',{class:'info',tabindex:'0','aria-label':nb.note}, 'i', h('span',{class:'tip'}, nb.note)):null) ]));
  // menu
  const menuBtn = h('button',{class:'menu-btn','aria-label':'More actions for '+p.name, onclick:(e)=>{ e.stopPropagation(); toggleMenu(row, p); }}, '⋯');
  row.append(h('div',{class:'menu-cell'}, isDone? null : menuBtn));
  // drag & drop
  if(!isDone){
    handle.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed='move'; row.style.opacity='.5'; });
    handle.addEventListener('dragend', ()=>{ row.style.opacity=''; });
    row.addEventListener('dragover', e=>{ e.preventDefault(); row.classList.add('dragover'); });
    row.addEventListener('dragleave', ()=> row.classList.remove('dragover'));
    row.addEventListener('drop', e=>{ e.preventDefault(); row.classList.remove('dragover'); const from = e.dataTransfer.getData('text/plain'); if(from && from!==p.id) askReorder(from, p.id); });
  }
  return row;
}
function togglePopover(anchor, content){
  document.querySelectorAll('.popover').forEach(n=>n.remove());
  const pop = h('div',{class:'popover'}, content);
  anchor.parentElement.style.position='relative';
  pop.style.left='0'; pop.style.top='30px';
  anchor.parentElement.append(pop);
  setTimeout(()=> document.addEventListener('click', function off(e){ if(!e.target.closest('.popover')){ pop.remove(); document.removeEventListener('click', off); } }), 0);
}
function scorePopover(p){
  const w = weightsNorm();
  return h('div',null, h('b',null,'Why '+p.shortName+' scores '+score(p).toFixed(2)),
    h('div',{class:'bars'}, Object.keys(w).map(k=>[ h('span',null, WB.meta.weightLabels[k]+' ', h('span',{class:'mono muted'}, p.scores[k]+'/5')), h('div',{class:'bar'}, h('i',{style:{width:(p.scores[k]/5*100)+'%'}})), h('span',{class:'mono small',style:{textAlign:'right'}}, '×'+Math.round(w[k]*100)+'%') ])),
    h('p',{class:'muted'}, WB.meta.weightHelp));
}
function toggleMenu(row, p){
  document.querySelectorAll('.menu').forEach(n=>n.remove());
  const m = h('div',{class:'menu',role:'menu'},
    h('button',{role:'menuitem', onclick:()=>{ m.remove(); reasonModal('Skip '+p.shortName+' for today?', ['Already handled outside the workbench','Member asked not to be called today','Waiting on someone else'], r=>{ S.skipped[p.id]=r; S.overrides.unshift({at:fmtTime(nowDemo()), text:'Skipped '+p.shortName+' today', reason:r}); save(); toast('Skipped. Logged with your reason.'); }); }}, 'Skip for today…'),
    h('div',{class:'hint'},'Snooze until'),
    h('div',{class:'row',style:{padding:'0 10px 8px'}}, ['10:00 AM','12:00 PM','3:00 PM'].map(t=> h('button',{class:'btn sm', onclick:()=>{ m.remove(); S.snoozed[p.id]=t; save(); fillQueue(); toast(p.shortName+' snoozed until '+t+'.'); }}, t))),
    h('button',{role:'menuitem', onclick:()=>{ m.remove(); toast(p.id==='P2'? 'Reassignment request sent to your supervisor (demo).' : 'Reassign request sent (demo).'); }}, p.id==='P2'? 'Reassign — suggested: Spanish-speaking case manager' : 'Reassign…'),
    h('button',{role:'menuitem', onclick:()=>{ m.remove(); go('member-'+p.id.toLowerCase()); }}, 'Open member view'));
  row.querySelector('.menu-cell').append(m);
  setTimeout(()=> document.addEventListener('click', function off(e){ if(!e.target.closest('.menu')){ m.remove(); document.removeEventListener('click', off); } }), 0);
}
function reasonModal(title, reasons, onSave, opts={}){
  let chosen = null; const other = h('input',{type:'text', id:'reason-other', placeholder:'Type a reason', 'aria-label':'Other reason'});
  const list = h('div',{class:'reasons'}, reasons.concat(['Other']).map((r,i)=> h('label',null, h('input',{type:'radio',name:'reason',value:r,id:'reason-'+i,onchange:()=>{ chosen=r; saveBtn.disabled=false; }}), r==='Other'? [h('span',null,'Other:'), other] : r)));
  const saveBtn = h('button',{class:'btn primary', disabled:true, onclick:()=>{ let r = chosen==='Other'? (other.value.trim()||'Other') : chosen; closeTop(); onSave(r); }}, opts.ok||'Save');
  other.addEventListener('focus', ()=>{ list.querySelector('input[value="Other"]').checked=true; chosen='Other'; saveBtn.disabled=false; });
  modal(title, h('div',null, opts.text? h('p',{class:'muted'},opts.text):null, list), [h('button',{class:'btn',onclick:closeTop},'Cancel'), saveBtn], {narrow:true, onClose:opts.onCancel});
}
App.reasonModal = reasonModal;
function askReorder(fromId, toId){
  const order = queueOrder().filter(id=>!S.signed[id]);
  const next = order.filter(id=>id!==fromId); const idx = next.indexOf(toId); next.splice(idx,0,fromId);
  const doneIds = queueOrder().filter(id=>S.signed[id]);
  reasonModal('Why move '+P[fromId].shortName+' above '+P[toId].shortName+'?', ['Clinical judgment','Member asked for a time','Waiting on someone else'], r=>{
    S.order = next.concat(doneIds); S.overrides.unshift({at:fmtTime(nowDemo()), text:'Moved '+P[fromId].shortName+' above '+P[toId].shortName, reason:r}); save();
    flipRender(); toast('Logged. Reorders and their reasons tune the ranking rules.');
  }, {text:'Your reason is logged. Over time, these overrides tune the ranking weights.'});
}
function flipRender(){
  const box = document.getElementById('qtable'); if(!box){ render(); return; }
  const first = {}; box.querySelectorAll('.qrow').forEach(r=> first[r.dataset.id] = r.getBoundingClientRect().top);
  fillQueue();
  box.querySelectorAll('.qrow').forEach(r=>{ const f = first[r.dataset.id]; if(f===undefined) return; const d = f - r.getBoundingClientRect().top; if(!d) return;
    r.style.transform='translateY('+d+'px)'; r.style.transition='none'; requestAnimationFrame(()=>{ r.style.transition='transform .35s ease-out'; r.style.transform=''; }); });
}
function openRanking(){
  const body = h('div');
  const totalOut = h('span',{class:'mono'});
  const draw = ()=>{
    body.innerHTML='';
    const tot = Object.values(S.weights).reduce((a,b)=>a+b,0);
    body.append(h('p',{class:'muted',style:{marginBottom:'14px'}}, 'Each member gets 1–5 on four factors. The queue sorts by the weighted sum. Move a slider and the list re-sorts behind this panel.'));
    Object.keys(S.weights).forEach(k=>{
      const id = 'w-'+k; const out = h('output',{for:id}, Math.round(S.weights[k]/tot*100)+'%');
      const inp = h('input',{type:'range', id, min:'0', max:'0.5', step:'0.05', value:String(S.weights[k])});
      inp.addEventListener('input', ()=>{ S.weights[k] = +inp.value; if(Object.values(S.weights).every(v=>v===0)) S.weights[k]=0.05; S.order=null; save(); const t2 = Object.values(S.weights).reduce((a,b)=>a+b,0); body.querySelectorAll('.slider').forEach(sl=>{ const kk = sl.dataset.k; sl.querySelector('output').textContent = Math.round(S.weights[kk]/t2*100)+'%'; }); flipRender(); });
      body.append(h('div',{class:'slider','data-k':k}, h('label',{for:id}, WB.meta.weightLabels[k]), out, inp));
    });
    body.append(h('p',{class:'small',style:{background:'var(--blue-tint)',padding:'10px 12px',borderRadius:'6px'}}, WB.meta.weightHelp),
      h('div',{class:'row',style:{margin:'12px 0 22px'}}, h('button',{class:'btn', onclick:()=>{ S.weights={...WB.meta.weights}; S.order=null; save(); draw(); flipRender(); }}, 'Reset weights')),
      h('div',{class:'eyebrow'},'Override log'),
      S.overrides.length? h('div',{class:'side-list',style:{marginTop:'6px'}}, S.overrides.map(o=> h('div',{class:'side-item'}, h('div',null, h('div',null,o.text), h('div',{class:'muted small'},'Reason: '+o.reason)), h('span',{class:'mono small muted'},o.at))))
        : h('p',{class:'muted',style:{marginTop:'6px'}},'No overrides yet. Drag a row in the queue to log one.'));
  };
  draw();
  drawer('How the queue is ranked', 'Ranking', body);
}
App.screens.queue = { render: renderQueue };
App.fillQueue = fillQueue;

/* ---------- boot ---------- */
App.boot = function(){
  document.body.append(h('div',{class:'shell'}, h('header',{class:'topbar'}), h('div',{class:'body'}, h('nav',{class:'rail','aria-label':'Main'}), h('main',{id:'main'}))));
  if(!location.hash) history.replaceState(null,'','#queue');
  render(); welcome();
};
document.addEventListener('click', e=>{ if(!e.target.closest('.search')) document.querySelectorAll('.search-results').forEach(r=>r.hidden=true); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && overlayStack.length && !document.querySelector('.tour-card')) closeTop(); });
})();
