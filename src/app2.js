/* ===== Care Management Workbench demo — member view, merge, outreach, tasks, tour ===== */
(function(){
'use strict';
const A = window.App, WB = A.WB, P = A.P, h = A.h, nm = A.nm;
const S = () => A.S();

/* =======================================================================
   SCREEN 2 — MEMBER VIEW
   ======================================================================= */
function card(title, extra, ...body){ return h('section',{class:'card'}, h('div',{class:'card-h'}, h('h2',{class:'h2'}, title), extra||null, h('span',{class:'spacer'})), ...body); }

function renderMember(main, r){
  const p = P[r.id], st = S();
  const merged = A.merged();
  // header
  const ids = (p.id==='P3' && !merged) ? [h('span',{class:'mono'}, p.memberIds.join(' / ')), ' ', h('button',{class:'btn sm warn', onclick:()=>openMerge()}, 'Possible duplicate — review')] : h('span',{class:'mono'}, p.id==='P3'? 'M-20103 (merged with M-20193)' : p.memberIds.join(' / '));
  const opened = A.dayDiff(p.caseOpened);
  const lang = p.language.conflict ? h('button',{class:'pill conflict', style:{border:'1px solid var(--orange)',cursor:'pointer'}, onclick:(e)=>{ e.stopPropagation(); A.toast('Language: '+p.language.conflict.selfReport+' vs '+p.language.conflict.onFile+'. Rule: '+p.language.conflict.rule+'.'); }}, 'Conflict · Spanish (self-report) vs English (file)') : p.language.value;
  let riskVal = p.riskScore.value;
  if(p.id==='P3' && !merged) riskVal = '3 on this record';
  main.append(h('div',{class:'mhead'},
    h('div',{style:{minWidth:'0',flex:'1'}},
      h('div',{class:'eyebrow'}, p.program),
      h('h1',{class:'h1',style:{fontSize:'30px',marginTop:'3px'}}, p.name),
      h('div',{class:'mmeta'},
        h('span',null, p.age+' · '+(p.sex==='M'?'Male':'Female')), h('span',null, p.product), h('span',null, ids),
        h('span',null, 'Case opened '+A.fmtDate(p.caseOpened)+' ('+(opened===0?'today':(-opened)+' d ago')+')'),
        h('span',null, 'PCP: '+p.pcp), h('span',null, 'Language: ', lang))),
    h('div',{class:'row',style:{alignItems:'stretch'}},
      h('div',{class:'risk', title:p.riskScore.note}, h('div',{class:'muted'}, p.riskScore.label), h('b',null, riskVal===null?'—':riskVal), ' ', h('span',{class:'pill '+(/High|Very/i.test(p.riskScore.band)?'conflict':'grey')}, p.riskScore.band)),
      h('div',{class:'stack',style:{gap:'6px'}},
        h('button',{class:'btn primary', onclick:()=>A.go('outreach-'+p.id.toLowerCase())}, 'Start outreach'),
        h('button',{class:'btn', onclick:()=>addTaskModal(p)}, 'Add task')))));

  const mainCol = h('div',{class:'stack'}), side = h('div',{class:'stack'});
  main.append(h('div',{class:'mgrid'}, mainCol, side));

  // 1 since last touch
  const nSrc = new Set(p.summary.flatMap(s=>s.sources.map(x=>x.ref))).size;
  const lines = h('div',null, p.summary.map(s=>{
    if(s.requiresMerge && !merged) return h('div',{class:'sum-line locked'}, h('span',{class:'bullet'}), h('div',null, '3 ED visits on this record — 4 more sit on M-20193. ', h('button',{class:'linkbtn',onclick:()=>openMerge()},'Review the merge'), ' to see the full history.'));
    return h('div',{class:'sum-line'}, h('span',{class:'bullet'}), h('div',null, h('span',{class:'txt'+(s.inferred?' inf':''), title: s.because? 'Because: '+s.because : null}, s.text), s.inferred? [' ', A.Inferred(s.confidence, s.because), nm(4)] : null, ' ', s.sources.map(src=>A.SourceChip(p,src))));
  }));
  mainCol.append(h('section',{class:'card','data-tour':'since-last-touch'}, h('div',{class:'card-h'}, nm(1), h('h2',{class:'h2'},'Since last touch'), A.Draft(), h('span',{class:'muted small'}, 'built from '+nSrc+' sources'), h('span',{class:'spacer'})), lines));

  // 2 attention
  mainCol.append(card('Needs your attention', h('span',{class:'muted small'},'max 3, most serious first'),
    h('div',{class:'attn'}, p.attention.map(a=> h('div',{class:'attn-card '+a.severity}, h('div',{class:'sev'}, a.severity+' priority'), h('h3',null,a.title), h('p',null,a.detail), h('div',{class:'row',style:{marginTop:'6px'}}, a.sources.map(s=>A.SourceChip(p,s))))))));

  // 3 meds
  mainCol.append(medTable(p));

  // 4 timeline
  mainCol.append(timeline(p));

  // side: clocks
  const dl = p.deadlines.slice().sort((a,b)=> (a.due||'9999').localeCompare(b.due||'9999'));
  side.append(card('Clocks', null, h('div',{class:'side-list'}, dl.map(d=>{ const n = d.due? A.dayDiff(d.due) : null; const hot = d.kind==='hard' && n!==null && n<=2;
    return h('div',{class:'side-item'}, h('div',null, h('div',null,d.label), h('div',{class:'row',style:{marginTop:'3px'}}, A.SourceChip(p,d.source))), h('div',{class:'r'}, h('div',{class:hot?'due-hot':''}, d.due? A.dueLabel(d.due) : 'open'), h('div',{class:'muted'}, d.due? A.fmtDate(d.due):''), h('div',{class:'muted'}, d.kind==='hard'?'hard deadline': d.kind==='soft'?'quality target':'info'))); }))));

  // freshness
  const req = st.requested[p.id]||[];
  side.append(h('section',{class:'card'}, h('div',{class:'card-h'}, nm(5), h('h2',{class:'h2'},'Data freshness'), h('span',{class:'spacer'})),
    h('div',{class:'side-list'}, p.freshness.map(f=>{
      if(f.state==='missing'){ const done = req.includes(f.feed);
        return h('div',{style:{padding:'8px 0',borderTop:'1px solid var(--line-soft)'}}, h('div',{class:'row',style:{justifyContent:'space-between'}}, h('b',null,f.feed), h('span',{class:'fr-state missing'}, done?'requested':'missing')),
          h('div',{class:'missing-box'}, h('span',{class:'small'}, done? 'Requested '+A.fmtTime(A.nowDemo())+'. You’ll see it here when it arrives.' : f.note), done? null : h('button',{class:'btn sm primary', onclick:()=>{ (st.requested[p.id] ||= []).push(f.feed); A.save(); A.toast((f.action||'Request sent')+' — sent (demo).'); A.render(); }}, 'Request'))); }
      return h('div',{class:'side-item'}, h('div',null, h('b',{style:{fontWeight:600}},f.feed), f.note? h('div',{class:'muted small'},f.note):null), h('div',{class:'r'}, h('div',{class:'fr-state '+f.state}, f.state), f.last? A.AgeBadge(f.last.slice(0,10)) : null));
    }))));

  // people
  side.append(card('People and permissions', null, h('div',{class:'side-list'}, p.careTeam.map(c=> h('div',{class:'side-item'}, h('div',null, h('div',{style:{fontWeight:600}}, c.name), h('div',{class:'muted small'}, c.role), c.contact? h('div',{class:'mono small'}, c.contact):null), c.authorized? h('span',{class:'pill '+(/Not authorized/.test(c.authorized)?'conflict':'grey'), style:{alignSelf:'flex-start',maxWidth:'150px'}}, c.authorized):null))),
    p.restricted? h('div',{class:'locked-row'}, h('span',{class:'lock'}), h('b',null, p.restricted.label), ' · ', p.restricted.rule, h('div',{class:'muted small',style:{marginTop:'3px'}}, p.restricted.state+'. '+p.restricted.action+'.')) : null));

  // sdoh
  side.append(card('Social needs', h('span',{class:'muted small'},'with age of each answer'), h('div',{class:'side-list'}, p.sdoh.map(s=> h('div',{class:'side-item'}, h('div',null, h('div',{class:s.supersededBy?'struck':''}, h('b',{style:{fontWeight:600}}, s.domain+': '), s.finding), h('div',{class:'row',style:{marginTop:'3px'}}, A.SourceChip(p,s.source), s.supersededBy? h('span',{class:'muted small'},'superseded by newer note') : s.stale? h('span',{class:'pill gap'},'Re-ask on call'):null)), h('div',{class:'r'}, s.date? A.AgeBadge(s.date) : h('span',{class:'age'},'none')))))));

  // labs
  side.append(card('Labs', null, h('div',{class:'side-list'}, p.labs.map(l=> h('div',{class:'side-item'}, h('div',null, h('b',{style:{fontWeight:600}}, l.test+' '), l.value, l.flag? h('span',{class:'muted'},' · '+l.flag.toLowerCase()):null, l.inferred? [' ', A.Inferred('Medium','Unit missing in the feed; 9.6 is only plausible as %')]:null, l.trend? h('div',{class:'muted small'}, l.trend):null), h('div',{class:'r'}, A.SourceChip(p,l.source), h('div',{class:'muted',style:{marginTop:'3px'}}, 'drawn '+A.fmtDate(l.date,false))))))));
}

function medTable(p){
  const st = S(); const ans = st.medAnswers[p.id] ||= {};
  const conf = Object.keys(ans).length;
  const tb = h('table',{class:'t'},
    h('thead',null, h('tr',null, h('th',null,'Medication'), h('th',null,p.meds.colA), h('th',null,p.meds.colB,' ',nm(2)), h('th',null,'Status ',nm(3)), h('th',null,'On the call'))),
    h('tbody',null, p.meds.rows.map((m,i)=>{
      const sel = h('select',{class:'sel'+(ans[i]?' set':''), id:'med-'+p.id+'-'+i, 'aria-label':'What '+p.shortName+' is actually taking: '+m.drug},
        h('option',{value:''},'Not asked yet'), p.meds.callOptions.map(o=> h('option',{value:o, selected: ans[i]===o? true:null}, o)));
      sel.addEventListener('change', ()=>{ if(sel.value) ans[i]=sel.value; else delete ans[i]; A.save(); const c = Object.keys(ans).length; document.getElementById('medcount').textContent = c+' of '+p.meds.rows.length+' confirmed'; sel.classList.toggle('set', !!sel.value); });
      const cell = (x)=> h('td',null, x.inferred? h('span',{class:'cell-inf',title:'Not stated by the source — assumed'}, x.text, h('span',{class:'muted small'},' · assumed')) : x.text, x.source? [h('br'), A.SourceChip(p,x.source)] : null);
      return h('tr',{class:['conflict','blocked'].includes(m.status.kind)?'hot':null}, h('td',null,h('b',{style:{fontWeight:600}},m.drug)), cell(m.a), cell(m.b), h('td',null, A.StatusPill(m.status)), h('td',null, sel));
    })));
  return h('section',{class:'card','data-tour':'med-check'}, h('div',{class:'card-h'}, h('h2',{class:'h2'},'Medication check'), h('span',{class:'muted small'},'sources disagree → both shown; Maria records what is really taken'), h('span',{class:'spacer'}), h('span',{class:'mono small',id:'medcount'}, conf+' of '+p.meds.rows.length+' confirmed')),
    h('div',{class:'tbl-wrap'}, tb));
}

const FEEDS = {adt:'ADT',claims:'Claim',pharmacy:'Pharmacy',contacts:'Contact',labs:'Lab',appointments:'Appt',auth:'Auth',notes:'Note',sdoh:'SDOH'};
function events(p){
  const R = p.raw, ev = [];
  const push = (table, id, date, title, detail, lag, recv) => ev.push({table, id, date, title, detail, lag, recv, mid: (R[table].find(x=>(x.alertID||x.claimID||x.rxID||x.contactID||x.labID||x.apptID||x.authID||x.noteID||x.screenID)===id)||{}).memberID});
  R.adt.forEach(a=> push('adt', a.alertID, a.eventDatetime, a.eventType+' — '+a.facility, [a.dxOrReasonInAlert, a.disposition].filter(Boolean).join(' · '), a.lagHrs>=6? 'arrived '+Math.round(a.lagHrs)+' h later':null, a.alertReceived));
  R.claims.forEach(c=> push('claims', c.claimID, c.serviceDate, 'Claim: '+c.dxDescription+' ('+c.icd10+')', c.providerFacility, c.lagDays? 'arrived '+c.lagDays+' d later':null, c.receivedDate));
  R.pharmacy.forEach(x=> push('pharmacy', x.rxID, x.fillOrRxDate, x.drug+' '+x.strengthSig+' — '+x.status, x.pharmacy+' · '+x.sourceFeed, null, x.fillOrRxDate));
  R.contacts.forEach(c=> push('contacts', c.contactID, c.contactDatetime, c.channel+' ('+c.direction.toLowerCase()+'): '+c.outcome, c.notes||c.numberOrAddressUsed, null, c.contactDatetime));
  R.labs.forEach(l=> push('labs', l.labID, l.collected, l.test+' '+l.result+(l.unit?' '+l.unit:' (no unit)')+(l.flag?' · '+l.flag:''), l.source, l.lagDays>=2? 'arrived '+l.lagDays+' d later':null, l.received));
  R.appointments.forEach(a=> push('appointments', a.apptID, a.apptDate, a.providerSpecialty+' — '+a.type+' — '+a.status, a.note, null, null));
  R.auth.forEach(a=> push('auth', a.authID, a.requestDate, a.type+': '+a.itemService+' — '+a.status, a.note, null, a.requestDate));
  R.notes.forEach(n=> push('notes', n.noteID, n.date, n.source+' ('+n.authorRole+')', n.noteText.length>120? n.noteText.slice(0,118)+'…' : n.noteText, null, n.date));
  R.sdoh.forEach(s=> push('sdoh', s.screenID, s.date, s.domain+': '+s.finding, s.source, null, s.date));
  return ev;
}
function timeline(p){
  const st = S(); const wrap = h('div');
  let filter = 'all', all = false;
  const draw = ()=>{
    wrap.innerHTML='';
    let ev = events(p);
    let hidden = 0;
    if(p.id==='P3' && !A.merged()){ hidden = ev.filter(e=>e.mid==='M-20193').length; ev = ev.filter(e=>e.mid!=='M-20193'); }
    const counts = {}; ev.forEach(e=> counts[e.table]=(counts[e.table]||0)+1);
    wrap.append(h('div',{class:'tl-filters'}, h('button',{class:'fchip','aria-pressed':filter==='all'?'true':'false',onclick:()=>{filter='all';draw();}}, 'All '+ev.length),
      Object.keys(FEEDS).filter(k=>counts[k]).map(k=> h('button',{class:'fchip','aria-pressed':filter===k?'true':'false',onclick:()=>{filter=k;draw();}}, FEEDS[k]+' '+counts[k]))));
    if(filter!=='all') ev = ev.filter(e=>e.table===filter);
    const dated = ev.filter(e=>A.parseD(e.date)).sort((a,b)=> A.parseD(b.date)-A.parseD(a.date));
    const undated = ev.filter(e=>!A.parseD(e.date));
    const inWin = all? dated : dated.filter(e=> A.dayDiff(e.date) >= -60);
    const list = h('div',{class:'tl'});
    inWin.forEach(e=> list.append(item(e)));
    if(!inWin.length) list.append(h('p',{class:'muted',style:{padding:'8px 0'}},'Nothing in the last 60 days for this filter.'));
    wrap.append(list);
    if(dated.length>inWin.length || all) wrap.append(h('button',{class:'linkbtn',style:{marginTop:'8px'},onclick:()=>{all=!all;draw();}}, all? 'Show last 60 days only' : 'Show all '+dated.length+' dated events'));
    if(undated.length){ wrap.append(h('div',{class:'eyebrow',style:{marginTop:'14px'}},'Not scheduled / no date')); const l2=h('div',{class:'tl'}); undated.forEach(e=>l2.append(item(e))); wrap.append(l2); }
    if(hidden) wrap.append(h('p',{class:'small',style:{marginTop:'10px',color:'var(--orange-text)'}}, hidden+' more events sit on M-20193. ', h('button',{class:'linkbtn',onclick:()=>openMerge()},'Review the merge')));
  };
  function item(e){
    return h('div',{class:'tl-item'}, h('span',{class:'d'}, A.parseD(e.date)? A.fmtDate(e.date) : '—'), h('span',{class:'feed'}, FEEDS[e.table]),
      h('div',null, h('div',null, e.title, e.lag? h('span',{class:'lagtag'}, e.lag):null), e.detail? h('div',{class:'muted small'}, e.detail):null,
        h('div',{style:{marginTop:'3px'}}, A.SourceChip(p,{ref:e.id,label:e.id,date:e.recv? e.recv.slice(0,10):null}))));
  }
  draw();
  return card('Timeline', h('span',{class:'muted small'},'every feed, one list · “arrived later” = data lag'), wrap);
}

function addTaskModal(p){
  const inp = h('input',{type:'text',id:'newtask',style:{width:'100%',border:'1px solid var(--line)',borderRadius:'6px',padding:'8px 10px'},placeholder:'e.g. Call Dr. Okafor’s office about the visit'});
  A.modal('Add a task for '+p.shortName, h('div',null, h('label',{for:'newtask',class:'small muted'},'Task'), inp, h('p',{class:'muted small',style:{marginTop:'8px'}},'Due today, owner Maria. You can complete it from Tasks.')),
    [h('button',{class:'btn',onclick:A.closeTop},'Cancel'), h('button',{class:'btn primary',onclick:()=>{ const v=inp.value.trim(); if(!v){ inp.focus(); return; } S().tasks.push({id:Date.now(),pid:p.id,title:v,due:'2026-11-09',owner:'Maria',done:false}); A.save(); A.closeTop(); A.toast('Task added.'); A.render(); }},'Add task')], {narrow:true});
}

/* ---------- merge ---------- */
function openMerge(after){
  const p = P.P3, m = p.merge;
  const rows = [['Name','name'],['Date of birth','dob'],['PCP','pcp'],['Phone','phone'],['Address','address'],['Coverage','coverage'],['ED visits (90 d)','edVisits']];
  const cmp = h('div',{class:'cmp'}, h('div',{class:'hd'},'Field'), h('div',{class:'hd mono'},m.left.id), h('div',{class:'hd mono'},m.right.id),
    rows.map(([lab,k])=>{ let a=m.left[k], b=m.right[k]; if(k==='dob'){ a=A.fmtDate(a,false)+' 1979'; b=A.fmtDate(b,false)+' 1979'; } const diff = String(a)!==String(b); return [h('div',{class:'muted'},lab), h('div',{class:diff?'diff':''},String(a)), h('div',{class:diff?'diff':''},String(b))]; }));
  const ev = h('table',{class:'t',style:{marginTop:'14px'}}, h('thead',null,h('tr',null,h('th',null,'Evidence'),h('th',null,'Verdict'),h('th',null,'Why'))), h('tbody',null, m.evidence.map(e=>h('tr',null,h('td',null,e.field),h('td',null,h('span',{class:'pill '+(e.verdict==='Match'||e.verdict==='Supports'?'ok':'gap')},e.verdict)),h('td',null,e.why)))));
  A.modal('Are these the same person?', h('div',null,
    h('p',{style:{marginBottom:'12px'}}, h('b',{class:'mono',style:{fontSize:'18px'}}, m.score.toFixed(2)), ' match · ', h('span',{class:'pill conflict'},'needs your confirmation'), h('span',{class:'muted'},'  Highlighted fields differ.')),
    cmp, ev,
    h('p',{class:'muted small',style:{marginTop:'12px'}},'Merging is reversible for 30 days. Nothing else changes until you confirm.')),
    [h('button',{class:'btn',onclick:()=>{ S().merged='rejected'; A.save(); A.closeTop(); A.toast('Marked as different people. The flag is cleared.', ()=>{ S().merged=false; A.save(); A.render(); }); A.render(); }},'Not the same person'),
     h('button',{class:'btn primary',onclick:()=>{ S().merged=true; A.save(); A.closeTop(); A.toast('Merged M-20193 into M-20103 · 3 + 4 = 7 ED visits in 85 days · reversible for 30 days', ()=>{ S().merged=false; A.save(); A.render(); }); if(after) after(); else A.render(); }},'Confirm merge')],
    {eyebrow:'Possible duplicate record · Darnell Whitaker'});
}
A.openMerge = openMerge;

/* =======================================================================
   SCREEN 3 — OUTREACH & DOCUMENTATION
   ======================================================================= */
let callTimers = [];
function stopTimers(){ callTimers.forEach(t=>clearInterval(t)); callTimers=[]; }
window.addEventListener('hashchange', stopTimers);

function cl(pid){ const st=S(); return st.callLog[pid] ||= {status:'idle', idx:0, secs:0, sel:null, connected:false, textSent:false, outcomes:[]}; }
function cs(pid, rank){ const st=S(); const o = st.contactState[pid] ||= {}; return o[rank] ||= {fails:0, retired:false, confirmed:false}; }
function livePaths(p){ return p.contactPaths.filter(c=> c.status!=='retired' && !cs(p.id,c.rank).retired); }
function selectedPath(p){ const c = cl(p.id); const lp = livePaths(p); return lp.find(x=>x.rank===c.sel) || lp[0] || null; }
function fieldsOf(p){
  const st = S(); const ns = st.notes[p.id] ||= {};
  return p.noteFields.map(f=>{
    let x = {...f, confirmed:false};
    if(p.id==='P3' && f.key==='identity' && A.merged()) x = {...x, value:'M-20193 merged into M-20103 — confirmed by Maria', origin:'record'};
    if(ns[f.key]) x = {...x, ...ns[f.key]};
    return x;
  });
}
function isReady(f){ return (f.origin==='record' && f.value) || (f.origin==='call' && f.confirmed) || (f.origin==='maria' && f.value && f.value.trim()); }

function renderOutreach(main, r){
  stopTimers();
  const p = P[r.id];
  if(p.id==='P3' && S().merged!==true && S().merged!=='rejected'){
    main.append(h('div',{class:'page'}, h('div',{class:'card',style:{maxWidth:'640px'}}, h('h1',{class:'h1'},'Confirm who Darnell is first'), h('p',{style:{margin:'8px 0 14px'}},'Two member records probably belong to the same person. Outreach goes to the wrong address and a dead phone until you decide.'), h('button',{class:'btn primary',onclick:()=>openMerge(()=>A.render())},'Review the possible duplicate'))));
    return;
  }
  const head = h('div',{class:'ohead'},
    h('div',{style:{flex:'1',minWidth:'0'}}, h('div',{class:'eyebrow'},'Outreach and documentation'), h('h1',{class:'h1',style:{fontSize:'26px'}}, p.name, h('span',{class:'muted',style:{fontFamily:'var(--font-body)',fontSize:'14px',fontWeight:'400'}}, '  ·  '+p.age+' · '+p.product))),
    A.ClockChip(p.queue.clock),
    p.language.conflict? h('span',{class:'pill conflict'},'Call in Spanish · interpreter line available') : null,
    h('button',{class:'btn',onclick:()=>A.go('member-'+p.id.toLowerCase())},'Back to member'));
  const left = h('div',{class:'stack',id:'paths'}), center = h('div',{class:'stack',id:'center'}), right = h('div',{class:'notecol',id:'notecol'});
  main.append(head, h('div',{class:'ogrid'}, left, center, right));
  drawPaths(p); drawCenter(p); drawNote(p);
  if(cl(p.id).status==='live') startPlayback(p, true);
}

function drawPaths(p){
  const box = document.getElementById('paths'); if(!box) return; box.innerHTML='';
  const c = cl(p.id); const sel = selectedPath(p);
  box.append(h('div',{class:'row'}, nm(1), h('h2',{class:'h2'},'Ways to reach'), h('span',{class:'muted small'},'best first')));
  livePaths(p).forEach(pa=>{
    const st = cs(p.id, pa.rank);
    const status = st.confirmed? 'confirmed' : pa.status;
    const tag = st.confirmed? 'Confirmed on call' : {best:'Best path', unconfirmed:'Unconfirmed · found by AI', limited:'Limited', ok:''}[pa.status];
    const acts = pa.actions.map(a=>{
      if(a==='call') return h('button',{class:'btn sm'+(sel&&sel.rank===pa.rank?' primary':''), onclick:()=>{ c.sel=pa.rank; A.save(); drawPaths(p); drawCenter(p); }}, sel&&sel.rank===pa.rank? 'Selected for call' : 'Call');
      if(a==='text') return h('button',{class:'btn sm', onclick:()=>textComposer(p, pa)}, 'Text');
      if(a==='lookup') return h('button',{class:'btn sm', onclick:()=>A.toast('Looking up Hope Haven’s front-desk number in the community directory (demo).')}, 'Look up number');
      if(a==='task') return h('button',{class:'btn sm', onclick:()=>{ S().tasks.push({id:Date.now(),pid:p.id,title:'Community health worker visit — Harbor Inn, Rm 12',due:'2026-11-11',owner:'CHW team',done:false}); A.save(); A.toast('Field-visit task created for the CHW team.'); }}, 'Request visit');
      return null; });
    box.append(h('div',{class:'path '+status+(sel&&sel.rank===pa.rank?' selected':'')},
      tag? h('span',{class:'tag',style:{color: status==='best'||status==='confirmed'?'var(--blue-ink)': status==='unconfirmed'?'var(--orange-text)':'var(--muted)'}}, tag):null,
      h('span',{class:'lbl'}, pa.label), h('span',{class:'meta'}, pa.who), h('span',{class:'meta'}, 'Source: '+pa.provenance),
      pa.bestTime? h('span',{class:'meta'}, 'Best time: '+pa.bestTime):null,
      h('span',{class:'meta'}, 'Last: '+(st.fails? st.fails+' failed attempt'+(st.fails>1?'s':'')+' today · ':'')+pa.lastOutcome),
      pa.warning? h('span',{class:'warnline'}, pa.warning):null,
      h('div',{class:'row',style:{marginTop:'6px',justifyContent:'space-between'}}, h('div',{class:'row'}, acts), (pa.actions.includes('call')||pa.actions.includes('text'))? h('button',{class:'linkbtn',onclick:()=>logFail(p,pa,'No answer')},'Log failed attempt'):null)));
  });
  const retired = p.contactPaths.filter(c=> c.status==='retired' || cs(p.id,c.rank).retired);
  if(retired.length) box.append(h('details',{class:'card',style:{padding:'10px 14px'}}, h('summary',{class:'small',style:{cursor:'pointer'}}, 'Retired ('+retired.length+') — won’t be dialled again'),
    retired.map(pa=> h('div',{style:{padding:'8px 0',borderTop:'1px solid var(--line-soft)'}}, h('div',{class:'struck mono small'},pa.label), h('div',{class:'muted small'}, cs(p.id,pa.rank).retired? 'Retired today after 2 failed attempts' : pa.lastOutcome)))));
  if(p.restricted) box.append(h('div',{class:'locked-row'}, h('span',{class:'lock'}), h('b',null,p.restricted.label+' · '+p.restricted.rule), h('div',{class:'muted small'}, p.restricted.state)));
}
function logFail(p, pa, what){
  const st = cs(p.id, pa.rank); st.fails++;
  cl(p.id).outcomes.push(what);
  if(st.fails>=2){ st.retired=true; A.toast('Retired '+pa.label+' after 2 failed attempts — it won’t be dialled again.'); }
  else { const next = livePaths(p).find(x=>x.rank!==pa.rank); A.toast('Logged: '+what.toLowerCase()+'.'+(next? ' Next best path: '+next.label+'.' : '')); }
  A.save(); drawPaths(p); drawCenter(p);
}
function textComposer(p, pa){
  const ta = h('textarea',{id:'sms',style:{width:'100%',minHeight:'110px',border:'1px solid var(--line)',borderRadius:'6px',padding:'8px 10px'}}, p.textDraft || ('Hi '+p.name.split(' ')[0]+', this is Maria, a nurse with Evergreen Health Plan. Is now a good time for a quick call?'));
  A.modal('Text '+pa.label.replace(/^Text /,''), h('div',null, h('div',{class:'row',style:{marginBottom:'6px'}}, A.Draft(), h('span',{class:'muted small'},'drafted from his notes; edit before sending')), ta, h('p',{class:'muted small',style:{marginTop:'8px'}},'Simulated: no real message is sent.')),
    [h('button',{class:'btn',onclick:A.closeTop},'Cancel'), h('button',{class:'btn primary',onclick:()=>{ const c = cl(p.id); c.textSent=true; c.sel = pa.rank;
      const ns = S().notes[p.id] ||= {}; ns.contact = {value:'Text sent to '+pa.label.replace(/^Text /,'')+' at '+A.fmtTime(A.nowDemo())+'; awaiting reply', origin:'call', confirmed:true};
      A.save(); A.closeTop(); A.toast('Text sent (simulated). Logged to the contact history.'); drawPaths(p); drawCenter(p); drawNote(p); }},'Send text')], {narrow:true});
}

function drawCenter(p){
  const box = document.getElementById('center'); if(!box) return; box.innerHTML='';
  const st = S(); const done = new Set(st.goalsDone[p.id]||[]); const covered = new Set(cl(p.id).covered||[]);
  // goals
  box.append(h('section',{class:'card','data-tour':'call-goals'}, h('div',{class:'card-h'}, nm(2), h('h2',{class:'h2'},'Call goals'), A.Draft(), h('span',{class:'muted small'},'from the open problems on the member view'), h('span',{class:'spacer'}), h('span',{class:'mono small'}, done.size+'/'+p.callGoals.length)),
    h('div',{class:'goals'}, p.callGoals.map((g,i)=>{ const cb = h('input',{type:'checkbox',id:'goal-'+i, checked: done.has(i)? true:null, onchange:()=>{ const arr = new Set(st.goalsDone[p.id]||[]); cb.checked? arr.add(i):arr.delete(i); st.goalsDone[p.id]=[...arr]; A.save(); drawCenter(p); }});
      return h('label',{class:'goal'+(done.has(i)?' done':''), for:'goal-'+i}, cb, h('span',null, g), covered.has(i)? h('em',{class:'cov'},'covered on call'):null); }))));
  // call box
  const c = cl(p.id); const sel = selectedPath(p);
  const hasScript = !!p.callScript;
  const timer = h('span',{class:'live',id:'calltimer'}, fmtSecs(c.secs));
  const top = h('div',{class:'call-top'},
    h('div',null, h('div',{class:'eyebrow'}, c.status==='live'?'On call':'Call'), h('div',{class:'mono',style:{fontWeight:600}}, sel? sel.label : 'No live contact path')),
    c.status==='live'? timer : c.status==='ended'? h('span',{class:'pill ok'},'Call ended · '+fmtSecs(c.secs)+' · connected') : c.connected? h('span',{class:'pill ok'},'Connected') : c.textSent? h('span',{class:'pill ok'},'Text sent · awaiting reply') : h('span',{class:'muted small'}, c.outcomes.length? c.outcomes.length+' attempt'+(c.outcomes.length>1?'s':'')+' logged today' : 'Ready'));
  const tr = h('div',{class:'transcript',id:'transcript'});
  if(hasScript && c.idx>0) p.callScript.slice(0,c.idx).forEach(l=>tr.append(tline(l)));
  if(c.idx===0 && c.status!=='live'){
    tr.append(h('p',{class:'muted small'}, hasScript? 'Simulated call. Press Start to hear how '+(p.id==='P1'?'Joan':'Tanya')+' answers; the note on the right fills in as she talks.' : 'Start the call, then log what happened. If you connect, type what you hear into the note.'));
  }
  const ctrls = h('div',{class:'outcomes'});
  if(c.status==='live'){
    ctrls.append(h('button',{class:'btn',onclick:()=>{ c.paused=!c.paused; A.save(); drawCenter(p); if(!c.paused) startPlayback(p,true); }}, c.paused?'Resume':'Pause'),
      h('button',{class:'btn',onclick:()=>{ while(c.idx<p.callScript.length) applyLine(p, p.callScript[c.idx++]); endCall(p); }},'Skip to end'),
      h('button',{class:'btn warn',onclick:()=>endCall(p)},'End call'));
  } else if(c.status!=='ended' && sel){
    if(hasScript) ctrls.append(h('button',{class:'btn primary',onclick:()=>{ c.status='live'; c.paused=false; c.sel=sel.rank; A.save(); drawCenter(p); startPlayback(p); }},'Start call · '+sel.label.split(' · ')[0]));
    else if(sel.actions.includes('call')) ctrls.append(h('span',{class:'small muted',style:{alignSelf:'center'}},'Dial '+sel.label.split(' · ')[0]+', then log:'),
      ['No answer','Voicemail','Wrong number'].map(o=> h('button',{class:'btn sm',onclick:()=>logFail(p, sel, o)}, o)),
      h('button',{class:'btn sm primary',onclick:()=>{ c.connected=true; A.save(); A.toast('Connected. Type what you hear into the note on the right.'); drawCenter(p); drawNote(p); }},'Connected'));
    else ctrls.append(h('span',{class:'small muted'},'This path is text-only. Use “Text” on the left.'));
  } else if(c.status==='ended'){ ctrls.append(h('span',{class:'small muted'},'Confirm the orange fields in the note, add your assessment, then review and sign.')); }
  box.append(h('section',{class:'callbox'}, top, tr, ctrls), hasScript? h('p',{class:'muted small'}, p.callScriptNote) : null);
  // ai boundary
  box.append(h('section',{class:'card'}, h('div',{class:'card-h'}, h('h2',{class:'h2'},'Where AI stops'), h('span',{class:'spacer'})),
    h('div',{class:'aib'}, h('div',null,h('b',null,'Automated'),h('ul',null,WB.aiBoundary.automated.map(x=>h('li',null,x)))), h('div',null,h('b',null,'Maria confirms'),h('ul',null,WB.aiBoundary.mariaConfirms.map(x=>h('li',null,x)))), h('div',null,h('b',null,'Never automatic'),h('ul',null,WB.aiBoundary.neverAutomatic.map(x=>h('li',null,x)))))));
  const t = document.getElementById('transcript'); if(t) t.scrollTop = t.scrollHeight;
}
function fmtSecs(s){ return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function tline(l, fresh){
  const fills = l.fills? l.fills.map(f=>{ const nf = l._p && l._p.noteFields.find(x=>x.key===f.field); return f; }) : null;
  return h('div',{class:'tline '+(l.speaker==='Maria'?'maria':'')}, h('span',{class:'who'}, l.speaker), h('div',{class:'txt'}, l.text, l.fills? h('span',{class:'fillnote'}, '→ filled in the note: '+l.fills.map(f=>f.value).join('; ')) : null));
}
function applyLine(p, l){
  const st = S(); const c = cl(p.id);
  if(l.fills){ const ns = st.notes[p.id] ||= {}; l.fills.forEach(f=>{ ns[f.field] = {value:f.value, origin:'call', confirmed:false}; }); c.lastFilled = l.fills.map(f=>f.field); }
  if(l.goal!==undefined){ const g = new Set(st.goalsDone[p.id]||[]); g.add(l.goal); st.goalsDone[p.id]=[...g]; c.covered = [...new Set([...(c.covered||[]), l.goal])]; }
  if(l.confirmsPath){ cs(p.id, l.confirmsPath).confirmed = true; }
}
function startPlayback(p, resume){
  stopTimers(); const c = cl(p.id);
  callTimers.push(setInterval(()=>{ if(c.paused) return; c.secs++; const t=document.getElementById('calltimer'); if(t) t.textContent = fmtSecs(c.secs); }, 1000));
  const step = ()=>{
    if(c.paused) return;
    if(c.idx>=p.callScript.length){ endCall(p); return; }
    const l = p.callScript[c.idx++]; applyLine(p, l); A.save();
    const tr = document.getElementById('transcript'); if(!tr){ stopTimers(); return; }
    if(c.idx===1) tr.innerHTML='';
    tr.append(tline(l)); tr.scrollTop = tr.scrollHeight;
    if(l.fills || l.goal!==undefined || l.confirmsPath){ refreshGoals(p); drawNote(p, c.lastFilled); if(l.confirmsPath) drawPaths(p); }
  };
  if(!resume) setTimeout(step, 400);
  callTimers.push(setInterval(step, 1900));
}
function refreshGoals(p){
  const st=S(); const done = new Set(st.goalsDone[p.id]||[]); const cov = new Set(cl(p.id).covered||[]);
  document.querySelectorAll('.goal').forEach((g,i)=>{ const cb=g.querySelector('input'); cb.checked = done.has(i); g.classList.toggle('done', done.has(i)); if(cov.has(i) && !g.querySelector('.cov')) g.append(h('em',{class:'cov'},'covered on call')); });
}
function endCall(p){
  stopTimers(); const c = cl(p.id);
  if(c.status!=='ended'){ c.status='ended'; c.connected=true; S().clockOffsetMin += Math.max(6, Math.round(c.secs/60*5) || 9); }
  A.save(); drawPaths(p); drawCenter(p); drawNote(p); A.renderTop();
  A.toast('Call ended. Confirm the orange fields, then add your assessment.');
}

/* ---------- note column ---------- */
function drawNote(p, flashKeys){
  const box = document.getElementById('notecol'); if(!box) return; box.innerHTML='';
  const st = S(); const c = cl(p.id); const ns = st.notes[p.id] ||= {};
  const fields = fieldsOf(p);
  const ready = fields.filter(isReady).length;
  const needYou = fields.filter(f=> (f.origin==='call' && !f.confirmed) || (f.origin==='maria' && !(f.value||'').trim())).length;
  const canSign = (c.connected || c.textSent) && !fields.some(f=>f.origin==='call' && !f.confirmed) && fields.filter(f=>f.origin==='maria').every(f=>(f.value||'').trim());
  const why = !(c.connected||c.textSent)? 'Reach the member first (call or text).' : fields.some(f=>f.origin==='call'&&!f.confirmed)? 'Confirm the orange “from this call” fields.' : 'Add your clinical assessment and plan.';
  const card = h('section',{class:'card'},
    h('div',{class:'card-h'}, nm(3), h('h2',{class:'h2'},'Note'), A.Draft(), h('span',{class:'spacer'}), h('span',{class:'mono small'}, ready+' of '+fields.length+' ready')),
    h('div',{class:'progress'}, h('i',{style:{width:(ready/fields.length*100)+'%'}})),
    h('p',{class:'muted small'}, needYou? needYou+' need you · ' : '', 'From record (sourced) · From this call (confirm) · For you'));
  let sec = null;
  fields.forEach(f=>{
    if(f.section!==sec){ sec=f.section; card.append(h('div',{class:'nsec'}, sec)); }
    const fl = h('div',{class:'nfield'+(f.origin==='maria'?' maria':'')});
    let tag;
    if(f.origin==='record') tag = h('span',{class:'origin record'},'From record');
    else if(f.origin==='call') tag = h('span',{class:'origin '+(f.confirmed?'confirmed':'call')}, f.confirmed? 'Confirmed' : 'From this call');
    else if(f.origin==='maria') tag = h('span',{class:'origin maria'},'For you');
    else tag = h('span',{class:'origin empty'},'Waiting for the call');
    fl.append(h('div',{class:'top'}, h('span',{class:'lab'}, f.label), tag));
    if(f.origin==='maria'){
      const ta = h('textarea',{id:'nf-'+f.key,'aria-label':f.label, placeholder:'Your clinical judgment — the workbench never writes this.'}, f.value||'');
      ta.addEventListener('input', ()=>{ ns[f.key] = {value:ta.value, origin:'maria'}; A.save(); });
      ta.addEventListener('change', ()=>drawNote(p));
      fl.append(ta, (f.value||'').trim()? null : h('div',{class:'actions'}, h('span'), h('button',{class:'linkbtn',onclick:()=>{ ns[f.key]={value:'[Demo] Written by Maria after the call.',origin:'maria'}; A.save(); drawNote(p); }},'Use demo text')));
    } else if(f.origin==='empty'){
      if(c.connected || c.textSent){ const ta = h('textarea',{id:'nf-'+f.key,'aria-label':f.label, placeholder:'Type what you heard'}); ta.addEventListener('change', ()=>{ if(ta.value.trim()){ ns[f.key]={value:ta.value.trim(), origin:'call', confirmed:true}; A.save(); drawNote(p); } }); fl.append(ta); }
      else fl.append(h('div',{class:'val muted small'}, 'Fills in during the call'));
    } else {
      const v = h('div',{class:'val', contenteditable:'true', role:'textbox', 'aria-label':f.label, 'data-ph':'—'}, f.value||'');
      v.addEventListener('blur', ()=>{ const nv = v.textContent.trim(); if(nv!==(f.value||'')){ ns[f.key] = {...(ns[f.key]||{}), value:nv, origin:f.origin, confirmed: f.origin==='call'? true : undefined}; A.save(); drawNote(p); } });
      fl.append(v);
      const acts = h('div',{class:'actions'});
      if(f.origin==='record'){ acts.append(h('div',{class:'row'}, f.source? A.SourceChip(p,f.source):null, f.inferred? A.Inferred('Medium'):null)); }
      if(f.origin==='call' && !f.confirmed) acts.append(h('span'), h('button',{class:'btn sm primary',onclick:()=>{ ns[f.key] = {value:f.value, origin:'call', confirmed:true}; A.save(); drawNote(p); }},'Confirm'));
      if(acts.childNodes.length) fl.append(acts);
    }
    if(flashKeys && flashKeys.includes(f.key)){ fl.classList.add('flash'); setTimeout(()=>fl.classList.remove('flash'), 1400); }
    card.append(fl);
  });
  const preview = notePreview(p, fields);
  card.append(h('details',{style:{marginTop:'12px'}}, h('summary',{class:'small',style:{cursor:'pointer'}}, 'Draft note preview'), h('div',{class:'preview',style:{marginTop:'8px'}}, preview)));
  const signBtn = h('button',{class:'btn primary', 'data-tour':'sign', disabled: canSign? null:true, style:{width:'100%',justifyContent:'center',marginTop:'14px',padding:'10px'}, onclick:()=>reviewSign(p)}, st.signed[p.id]? 'Signed '+st.signed[p.id] : 'Review and sign');
  if(st.signed[p.id]) signBtn.disabled = true;
  card.append(signBtn, (!canSign && !st.signed[p.id])? h('p',{class:'muted small',style:{marginTop:'6px',textAlign:'center'}}, why) : null);
  box.append(card);
}
function notePreview(p, fields){
  const parts = []; let sec=null, buf=[];
  fields.forEach(f=>{ if(f.section!==sec){ if(buf.length) parts.push(sec.toUpperCase()+': '+buf.join(' ')); sec=f.section; buf=[]; } if(f.value && f.value.trim()) buf.push(f.label+' — '+f.value.trim()+(f.value.trim().endsWith('.')?'':'.')); });
  if(buf.length) parts.push(sec.toUpperCase()+': '+buf.join(' '));
  return 'Case management note — '+p.name+' ('+p.memberIds[0]+'), '+A.fmtDate(A.nowDemo())+' '+A.fmtTime(A.nowDemo())+'\n\n'+parts.join('\n\n');
}
function reviewSign(p){
  const fields = fieldsOf(p);
  const changes = p.recordChanges.slice();
  p.contactPaths.forEach(pa=>{ const s = cs(p.id,pa.rank); if(s.confirmed) changes.push('Contact path confirmed on call: '+pa.label); if(s.retired) changes.push('Retire '+pa.label+' (2 failed attempts today)'); });
  const chk = (txt,i,pre)=> h('label',{for:pre+i}, h('input',{type:'checkbox',id:pre+i,checked:true}), h('span',null,txt));
  const taskBoxes = p.tasksAfterCall.map((t,i)=> h('label',{for:'tk'+i}, h('input',{type:'checkbox',id:'tk'+i,checked:true,'data-i':i}), h('span',null, t.title, h('span',{class:'muted small'}, '  · due '+A.fmtDate(t.due)+' · '+t.owner))));
  A.modal('Review and sign', h('div',null,
    h('p',{class:'muted',style:{marginBottom:'12px'}},'Nothing below changes the record or reaches anyone until you sign.'),
    h('div',{class:'eyebrow'},'Changes to the member record'), h('div',{class:'checklist',style:{margin:'6px 0 14px'}}, changes.map((c,i)=>chk(c,i,'ch'))),
    h('div',{class:'eyebrow'},'Tasks to create'), h('div',{class:'checklist',id:'tasklist',style:{margin:'6px 0 14px'}}, taskBoxes),
    h('div',{class:'eyebrow'},'Note'), h('div',{class:'preview',style:{marginTop:'6px',maxHeight:'220px',overflow:'auto'}}, notePreview(p, fields))),
    [h('button',{class:'btn',onclick:A.closeTop},'Back'), h('button',{class:'btn primary',onclick:()=>{
      const st = S(); const picked = [...document.querySelectorAll('#tasklist input')].filter(x=>x.checked).map(x=>p.tasksAfterCall[+x.dataset.i]);
      st.clockOffsetMin += 4; st.signed[p.id] = A.fmtTime(A.nowDemo());
      picked.forEach((t,i)=> st.tasks.push({id:Date.now()+i, pid:p.id, title:t.title, due:t.due, owner:t.owner, done:false}));
      A.save(); A.closeTop();
      A.toast('Signed '+st.signed[p.id]+' · filed to case · '+picked.length+' tasks created');
      const next = A.queueOrder().find(id=>!st.signed[id]);
      A.go('queue');
      if(next) setTimeout(()=>{ const row=document.querySelector('[data-id="'+next+'"]'); if(row){ row.classList.add('flash'); row.scrollIntoView({block:'center',behavior:'smooth'}); } }, 120);
    }},'Sign and file')], {eyebrow:p.name});
}

/* ---------- tasks screen ---------- */
function renderTasks(main){
  const st = S(); const page = h('div',{class:'page'});
  page.append(h('div',{class:'eyebrow'},'Tasks'), h('h1',{class:'h1',style:{margin:'4px 0 16px'}},'Your tasks'));
  if(!st.tasks.length){ page.append(h('div',{class:'empty'}, 'No tasks yet. Sign a note and its follow-ups appear here with due dates. ', h('button',{class:'linkbtn',onclick:()=>A.go('queue')},'Go to today’s queue'))); main.append(page); return; }
  const groups = [['Today',n=>n<=0],['Tomorrow',n=>n===1],['This week',n=>n>=2&&n<=6],['Later',n=>n>6]];
  groups.forEach(([lab,test])=>{
    const items = st.tasks.filter(t=>test(A.dayDiff(t.due)));
    if(!items.length) return;
    page.append(h('div',{class:'card',style:{padding:'0',marginBottom:'14px'}}, h('div',{class:'group-label',style:{borderTop:'0',borderRadius:'8px 8px 0 0'}}, lab+' · '+items.length),
      items.map(t=>{ const cb = h('input',{type:'checkbox',id:'t'+t.id,checked:t.done?true:null,onchange:()=>{ t.done=cb.checked; A.save(); A.render(); }});
        return h('div',{class:'task'+(t.done?' done':'')}, cb, h('label',{for:'t'+t.id,class:'t'}, t.title, h('div',null, h('a',{href:'#member-'+t.pid.toLowerCase(),class:'small'}, P[t.pid].name))), h('span',{class:'pill grey'}, t.owner), h('span',{class:'mono small muted'}, A.fmtDate(t.due))); })));
  });
  main.append(page);
}

A.screens.member = { render: renderMember };
A.screens.outreach = { render: renderOutreach };
A.screens.tasks = { render: renderTasks };

/* =======================================================================
   TOUR
   ======================================================================= */
let tourIdx = -1;
function routeOf(r){ return r.replace('#/','').replace(/^member\/(P\d)$/i,(m,id)=>'member-'+id.toLowerCase()).replace(/^outreach\/(P\d)$/i,(m,id)=>'outreach-'+id.toLowerCase()); }
function endTour(){ tourIdx=-1; document.querySelectorAll('.tour-hole,.tour-card').forEach(n=>n.remove()); window.removeEventListener('resize', placeTour); }
function startTour(){ while(document.querySelector('.modal-wrap')) A.closeTop(); tourIdx=0; window.addEventListener('resize', placeTour); showStep(); }
A.startTour = startTour;
function showStep(){
  const s = WB.tour[tourIdx]; if(!s){ endTour(); return; }
  const target = routeOf(s.route);
  if(target==='outreach-p3' || (s.target==='row-P3')) {}
  if(parseHash()!==target){ location.hash = target; }
  setTimeout(()=>{ const el = document.querySelector('[data-tour="'+s.target+'"]'); if(el) el.scrollIntoView({block:'center'}); setTimeout(placeTour, 260); }, 140);
}
function parseHash(){ return (location.hash||'#queue').slice(1).toLowerCase(); }
function placeTour(){
  if(tourIdx<0) return; const s = WB.tour[tourIdx];
  document.querySelectorAll('.tour-hole,.tour-card').forEach(n=>n.remove());
  const el = document.querySelector('[data-tour="'+s.target+'"]');
  const vw = window.innerWidth, vh = window.innerHeight;
  const cardEl = h('div',{class:'tour-card',role:'dialog','aria-label':'Tour step'},
    h('div',{class:'eyebrow'}, 'Tour · '+(tourIdx+1)+' / '+WB.tour.length), h('h3',null,s.title), h('p',null,s.text),
    h('div',{class:'f'}, h('button',{class:'linkbtn',onclick:endTour},'End tour'), h('div',{class:'row'}, tourIdx>0? h('button',{class:'btn sm',onclick:()=>{ tourIdx--; showStep(); }},'Back'):null, h('button',{class:'btn sm primary',onclick:()=>{ tourIdx++; if(tourIdx>=WB.tour.length){ endTour(); A.toast('Tour done. Everything is clickable — try Walter’s call, or confirm Darnell’s merge.'); } else showStep(); }}, tourIdx===WB.tour.length-1?'Finish':'Next'))));
  if(el){
    const r = el.getBoundingClientRect(); const pad = 6;
    const top = Math.max(60, r.top-pad), height = Math.min(r.height+pad*2, vh-top-10);
    document.body.append(h('div',{class:'tour-hole',style:{left:(r.left-pad)+'px',top:top+'px',width:(r.width+pad*2)+'px',height:height+'px'}}));
    document.body.append(cardEl);
    const cw = Math.min(340, vw-24), ch = cardEl.offsetHeight;
    let cx = Math.min(Math.max(12, r.left), vw-cw-12), cy = top+height+12;
    if(cy+ch > vh-12){ cy = top-ch-12; }
    if(cy < 60){ cx = (r.right+16+cw < vw)? r.right+16 : Math.max(12, r.left-cw-16); cy = Math.min(Math.max(70, r.top), vh-ch-12); }
    if(cy < 60 || cx<0){ cx = (vw-cw)/2; cy = vh-ch-24; }
    cardEl.style.left = cx+'px'; cardEl.style.top = cy+'px'; cardEl.style.width = cw+'px';
  } else {
    document.body.append(h('div',{class:'tour-hole',style:{left:'50%',top:'50%',width:'0',height:'0'}}), cardEl);
    cardEl.style.left = Math.max(12,(vw-340)/2)+'px'; cardEl.style.top = Math.max(70,(vh-cardEl.offsetHeight)/2)+'px';
  }
  cardEl.querySelector('.primary').focus();
}
window.addEventListener('hashchange', ()=>{ if(tourIdx>=0) setTimeout(placeTour, 300); });

/* =======================================================================
   KEYBOARD
   ======================================================================= */
let kIdx = -1, gPending = false;
document.addEventListener('keydown', e=>{
  if(e.target.closest('input,textarea,select,[contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if(tourIdx>=0){ if(e.key==='Escape') endTour(); if(e.key==='ArrowRight') { const b=document.querySelector('.tour-card .primary'); if(b) b.click(); } return; }
  const route = A.route();
  if(gPending){ gPending=false; if(e.key==='q'){ A.go('queue'); return; } if(e.key==='t'){ A.go('tasks'); return; } }
  if(e.key==='g'){ gPending=true; setTimeout(()=>gPending=false, 900); return; }
  if(e.key==='n'){ A.toggleNotes(); return; }
  if(e.key==='?'){ A.modal('Keyboard shortcuts', h('dl',{class:'kv'}, [['j / k','Move through the queue'],['Enter','Open the focused member'],['o','Outreach for the focused or open member'],['n','Design notes on / off'],['g then q','Go to today’s queue'],['g then t','Go to tasks'],['Esc','Close a panel or the tour']].map(([k,v])=>[h('dt',{class:'mono'},k),h('dd',null,v)])), null, {narrow:true}); return; }
  if(route.name==='queue' && (e.key==='j'||e.key==='k')){
    const rows=[...document.querySelectorAll('.qrow')]; if(!rows.length) return;
    kIdx = Math.max(0, Math.min(rows.length-1, kIdx + (e.key==='j'?1:-1))); rows.forEach(r=>r.classList.remove('kfocus')); rows[kIdx].classList.add('kfocus'); rows[kIdx].focus(); return;
  }
  if(e.key==='o'){ const f = document.querySelector('.qrow.kfocus'); const id = f? f.dataset.id : route.id; if(id) A.go('outreach-'+id.toLowerCase()); }
});
window.addEventListener('hashchange', ()=>{ kIdx=-1; });

A.boot();
})();
