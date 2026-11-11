/* Medicine Donation prototype logic - written by Omkar Dudhalkar.
   Safety rule built in: software only FLAGS items; a human reviewer decides. */
(function(){
'use strict';
var KEY='md_proto_v1', mem=null;
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var T0=new Date(new Date().toDateString());
var pad=function(n){return String(n).padStart(2,'0')};
var fmt=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
var addDays=function(n){return fmt(new Date(T0.getTime()+n*864e5))};
var dleft=function(d){return Math.round((new Date(d+'T00:00:00')-T0)/864e5)};
var now=function(){var d=new Date();return fmt(d)+' '+pad(d.getHours())+':'+pad(d.getMinutes())};
var ORGS=['Sample Charitable Clinic A','Sample NGO Medicine Bank B','Sample Community Health Trust C'];
var STEPS=[['submitted','Submitted, awaiting review'],['verified','Verified by an authorised reviewer'],['matched','Matched with an authorised organisation'],['handed','Handed over, record kept']];
var LABEL={submitted:'Awaiting review',verified:'Verified',matched:'Matched',handed:'Handed over',rejected:'Rejected'};
var ROUTES={home:'Home',donate:'Donate',track:'Track a donation',review:'Review queue',inventory:'Inventory & expiry',match:'Matching & handover',reports:'Reports'};
var STAFF={review:1,inventory:1,match:1,reports:1};

function seed(){
  function it(n,name,form,qty,exp,pack,st,rx,status,extra){
    var o={id:'MD-'+String(n).padStart(4,'0'),name:name,form:form,qty:qty,expiry:addDays(exp),pack:pack,storage:'room',rx:rx,controlled:false,recalled:false,status:status,reason:'',org:'',handler:'',reviewer:'',log:[[now(),'Submitted (demo record)']]};
    for(var k in extra)o[k]=extra[k];
    o.flags=evaluate(o).flags;return o;}
  var items=[
    it(1,'Paracetamol 500 mg','Tablets','2 strips',400,'sealed','room','no','submitted',{}),
    it(2,'Cetirizine 10 mg','Tablets','3 strips',300,'sealed','room','no','verified',{reviewer:'Demo pharmacist'}),
    it(3,'Oral rehydration salts','Sachets','10 sachets',500,'sealed','room','no','matched',{reviewer:'Demo pharmacist',org:ORGS[0]}),
    it(4,'Amoxicillin 500 mg','Capsules','1 strip',60,'sealed','room','yes','submitted',{}),
    it(5,'Antacid suspension','Syrup','1 bottle',200,'opened','room','no','rejected',{reason:'Bottle already opened',reviewer:'Demo pharmacist'}),
    it(6,'Zinc sulfate 20 mg','Tablets','2 strips',350,'sealed','room','no','handed',{reviewer:'Demo pharmacist',org:ORGS[1],handler:'Demo volunteer'})
  ];
  return {n:7,items:items,staff:false};
}
function load(){try{var r=localStorage.getItem(KEY);if(r)return JSON.parse(r)}catch(e){}return mem||seed()}
var db=load();
function save(){mem=db;try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}}
function toast(t){var m=$('#msg');m.textContent=t;m.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){m.hidden=true},2600)}

/* Eligibility screening: returns flags for a HUMAN to review. It never certifies safety. */
function evaluate(f){
  var flags=[],block=false,d=f.expiry?dleft(f.expiry):null;
  function add(t,b){flags.push({t:t,b:!!b});if(b)block=true}
  if(d===null)add('Enter an expiry date.',true);
  else if(d<0)add('Expired: cannot be accepted.',true);
  else if(d<=90)add('Expires within 90 days: reviewer decides if it is still useful.');
  if(f.recalled)add('Marked as recalled: cannot be accepted.',true);
  if(f.pack!=='sealed')add('Packaging is not sealed or intact: normally not acceptable.');
  if(f.storage==='cold')add('Cold-chain product: restricted category, authorised handling only.');
  if(f.controlled)add('Controlled drug: only where law and authorised procedure permit.');
  if(f.rx!=='no')add('Prescription medicine: authorised pharmacist review required.');
  return {flags:flags,block:block};
}
function tagFor(s){return '<span class="tag '+(s==='rejected'?'bad':s==='handed'||s==='verified'?'ok':'warn')+'">'+LABEL[s]+'</span>'}
function flagHtml(fl){return fl.length?'<div class="flags">'+fl.map(function(x){return '<div class="'+(x.b?'blk':'')+'">'+esc(x.t)+'</div>'}).join('')+'</div>':'<p class="muted">No automatic flags. A reviewer must still verify this item.</p>'}
function logIt(o,m){o.log.push([now(),m])}

/* ---------- views ---------- */
var V={};
V.home=function(){return '<div class="hero"><h1>Medicine Donation</h1><p>A proposed, verification-first route for sending eligible unused medicines to authorised organisations that serve people in need.</p><p><a class="btn" href="#donate" style="text-decoration:none;display:inline-block">Submit a donation</a> <a class="btn alt" href="#track" style="text-decoration:none;display:inline-block;background:var(--panel);color:var(--deep)">Track a donation</a></p></div>'+
'<div class="grid">'+[['1 Donor submits','Name, expiry date, packaging, storage and quantity.'],['2 Automatic flags','Rules flag expired, damaged, restricted or prescription items for review.'],['3 Human verification','A pharmacist or authorised organisation accepts or rejects, with a reason.'],['4 Matching','Verified stock is matched with an approved organisation.'],['5 Safe handover','Authorised staff store, issue and record the handover.'],['6 Transparency','Donors see status only; recipient details are never shown.']].map(function(c){return '<div class="card"><h3>'+c[0]+'</h3><p class="muted" style="margin:0">'+c[1]+'</p></div>'}).join('')+'</div>'+
'<div class="card"><h2>Safety first</h2><ul><li>Not every unused medicine can be donated. Expired, damaged, improperly stored and recalled medicines are excluded.</li><li>Controlled drugs, prescription medicines and cold-chain products are handled only where applicable law and authorised procedures permit.</li><li>The software only flags items. It cannot decide that a medicine is safe; a qualified human reviewer decides.</li><li>Never hand medicines directly to strangers. Use authorised, licensed channels only.</li></ul></div>'+
'<div class="notice"><strong>Prototype notice:</strong> this demo uses sample data and sample organisations. It is not an operating service and has no partnerships or approvals.</div>'};

V.donate=function(){return '<div class="card"><h2>Submit unused medicine for review</h2><p class="muted">No personal details are collected in this prototype. You will get a donation ID to track progress.</p>'+
'<form id="df" novalidate><div class="row"><div><label for="name">Medicine name and strength</label><input id="name" required placeholder="e.g. Paracetamol 500 mg"></div>'+
'<div><label for="form">Form</label><select id="form"><option>Tablets</option><option>Capsules</option><option>Syrup</option><option>Ointment</option><option>Sachets</option><option>Other</option></select></div></div>'+
'<div class="row"><div><label for="qty">Quantity</label><input id="qty" type="number" min="1" value="1"></div><div><label for="unit">Unit</label><select id="unit"><option>strips</option><option>bottles</option><option>sachets</option><option>tubes</option><option>boxes</option></select></div>'+
'<div><label for="expiry">Expiry date</label><input id="expiry" type="date" required></div></div>'+
'<div class="row"><div><label for="pack">Packaging condition</label><select id="pack"><option value="sealed">Sealed and intact</option><option value="opened">Opened</option><option value="damaged">Damaged</option></select></div>'+
'<div><label for="storage">Storage needed</label><select id="storage"><option value="room">Room temperature</option><option value="cold">Needs refrigeration</option></select></div>'+
'<div><label for="rx">Prescription-only?</label><select id="rx"><option value="no">No</option><option value="yes">Yes</option><option value="unsure">Not sure</option></select></div></div>'+
'<label class="chk"><input type="checkbox" id="controlled">This may be a controlled drug</label><label class="chk"><input type="checkbox" id="recalled">This medicine has been recalled</label>'+
'<h3 style="margin-top:14px">Automatic screening</h3><div id="pv"></div>'+
'<label class="chk"><input type="checkbox" id="agree">I confirm the details are correct and I understand an authorised reviewer will decide. I will not hand this medicine to anyone directly.</label>'+
'<p><button type="submit" id="sub">Submit for review</button></p></form></div><div id="done"></div>'};

V.track=function(){return '<div class="card"><h2>Track a donation</h2><label for="tid">Donation ID</label><div style="display:flex;gap:8px"><input id="tid" placeholder="e.g. MD-0001" style="flex:1"><button type="button" id="tgo">Check status</button></div><p class="muted">Try the sample IDs MD-0002, MD-0003 or MD-0006. Donors see status only, never recipient details.</p></div><div id="tres"></div>'};

V.review=function(){var q=db.items.filter(function(x){return x.status==='submitted'});
return '<h2>Review queue</h2><p class="muted">Demo staff area. Tick every check to enable Accept. A reason is needed to reject.</p>'+(q.length?q.map(function(x){return '<div class="card" data-id="'+x.id+'"><h3>'+esc(x.id)+': '+esc(x.name)+'</h3><p class="muted" style="margin:0">'+esc(x.form)+' &middot; '+esc(x.qty)+' &middot; expires '+esc(x.expiry)+' ('+dleft(x.expiry)+' days) &middot; '+esc(x.pack)+' &middot; '+(x.storage==='cold'?'cold-chain':'room temp')+'</p>'+flagHtml(x.flags)+
'<label class="chk"><input type="checkbox" class="c">Expiry date and batch checked on the pack</label><label class="chk"><input type="checkbox" class="c">Packaging sealed and storage acceptable</label><label class="chk"><input type="checkbox" class="c">Not recalled or restricted for this setting</label><label class="chk"><input type="checkbox" class="c">Permitted under applicable law and procedure</label>'+
'<div class="row"><div><label>Reviewer name (demo)</label><input class="rv" placeholder="Pharmacist name"></div><div><label>Reason (required to reject)</label><input class="rs" placeholder="e.g. packaging damaged"></div></div><p><button class="acc" disabled>Accept</button> <button class="bad rej">Reject</button></p></div>'}).join(''):'<div class="card muted">Nothing waiting for review.</div>')};

V.inventory=function(){var s=db.items.filter(function(x){return x.status==='verified'||x.status==='matched'}).sort(function(a,b){return a.expiry<b.expiry?-1:1});
return '<h2>Inventory & expiry tracker</h2><p class="muted">Verified stock, soonest expiry first.</p><div class="card scroll"><table><thead><tr><th>ID</th><th>Medicine</th><th>Qty</th><th>Expiry</th><th>Days left</th><th>Status</th></tr></thead><tbody>'+(s.length?s.map(function(x){var d=dleft(x.expiry);return '<tr><td>'+esc(x.id)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.qty)+'</td><td>'+esc(x.expiry)+'</td><td><span class="tag '+(d<=0?'bad':d<=90?'warn':'ok')+'">'+d+'</span></td><td>'+tagFor(x.status)+'</td></tr>'}).join(''):'<tr><td colspan="6" class="muted">No verified stock yet.</td></tr>')+'</tbody></table></div>'};

V.match=function(){var ver=db.items.filter(function(x){return x.status==='verified'}),mat=db.items.filter(function(x){return x.status==='matched'}),han=db.items.filter(function(x){return x.status==='handed'});
var opts=ORGS.map(function(o){return '<option>'+o+'</option>'}).join('');
return '<h2>Matching & handover</h2><div class="notice">The organisations below are sample entries, not real partners. In practice, only approved, licensed organisations would appear.</div>'+
'<h3>Verified, ready to match</h3>'+(ver.length?ver.map(function(x){return '<div class="card" data-id="'+x.id+'"><strong>'+esc(x.id)+': '+esc(x.name)+'</strong> <span class="muted">('+esc(x.qty)+', expires '+esc(x.expiry)+')</span><div style="display:flex;gap:8px;margin-top:8px"><select class="og" style="flex:1">'+opts+'</select><button class="mt">Match</button></div></div>'}).join(''):'<div class="card muted">Nothing ready to match.</div>')+
'<h3>Matched, awaiting handover</h3>'+(mat.length?mat.map(function(x){return '<div class="card" data-id="'+x.id+'"><strong>'+esc(x.id)+': '+esc(x.name)+'</strong> <span class="muted">to '+esc(x.org)+'</span><div style="display:flex;gap:8px;margin-top:8px"><input class="hd" placeholder="Authorised handler name (demo)" style="flex:1"><button class="ho">Mark handed over</button></div></div>'}).join(''):'<div class="card muted">Nothing awaiting handover.</div>')+
'<h3>Handover log</h3><div class="card scroll"><table><thead><tr><th>ID</th><th>Medicine</th><th>Organisation</th><th>Handler</th><th>Recorded</th></tr></thead><tbody>'+(han.length?han.map(function(x){return '<tr><td>'+esc(x.id)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.org)+'</td><td>'+esc(x.handler)+'</td><td>'+esc(x.log[x.log.length-1][0])+'</td></tr>'}).join(''):'<tr><td colspan="5" class="muted">No handovers yet.</td></tr>')+'</tbody></table></div>'};

V.reports=function(){var c=function(s){return db.items.filter(function(x){return x.status===s}).length},tot=db.items.length;
var acc=c('verified')+c('matched')+c('handed'),rev=acc+c('rejected');
var soon=db.items.filter(function(x){return (x.status==='verified'||x.status==='matched')&&dleft(x.expiry)<=90}).length;
var cards=[['Submitted',tot],['Awaiting review',c('submitted')],['Verified or later',acc],['Rejected',c('rejected')],['Handed over',c('handed')],['Stock expiring in 90 days',soon],['Verification pass rate',rev?Math.round(acc/rev*100)+'%':'n/a']];
return '<h2>Reports</h2><p class="muted">Indicators from the proposal, calculated from demo data. No real impact is shown.</p><div class="grid">'+cards.map(function(x){return '<div class="card"><div class="stat">'+x[1]+'</div><div class="muted">'+x[0]+'</div></div>'}).join('')+'</div><p><button class="bad" id="reset">Reset demo data</button></p>'};

/* ---------- wiring ---------- */
function route(){var r=(location.hash||'#home').slice(1);if(!ROUTES[r])r='home';return r}
function nav(r){var h='';for(var k in ROUTES){if(STAFF[k]&&!db.staff)continue;h+='<a href="#'+k+'" class="'+(k===r?'on ':'')+(STAFF[k]?'staff':'')+'">'+ROUTES[k]+'</a>'}$('#nav').innerHTML=h;
  var b=$('#staffBtn');b.textContent='Staff demo mode: '+(db.staff?'on':'off');b.setAttribute('aria-pressed',db.staff)}
function render(){var r=route();nav(r);
  if(STAFF[r]&&!db.staff){$('#app').innerHTML='<div class="card"><h2>Staff area</h2><p>This page is for authorised reviewers. In this prototype there is no real login; switch on staff demo mode to explore it.</p><button id="en">Turn on staff demo mode</button></div>';return}
  $('#app').innerHTML=V[r]();window.scrollTo(0,0);
  if(r==='donate')wireDonate();if(r==='track')wireTrack()}
function formVals(){var g=function(i){return $('#'+i)};return {name:g('name').value.trim(),form:g('form').value,qty:g('qty').value+' '+g('unit').value,expiry:g('expiry').value,pack:g('pack').value,storage:g('storage').value,rx:g('rx').value,controlled:g('controlled').checked,recalled:g('recalled').checked}}
function wireDonate(){var f=$('#df'),pv=function(){var e=evaluate(formVals());$('#pv').innerHTML=flagHtml(e.flags);return e};pv();
  f.addEventListener('input',pv);f.addEventListener('change',pv);
  f.addEventListener('submit',function(ev){ev.preventDefault();var v=formVals(),e=pv();
    if(!v.name){toast('Please enter the medicine name.');return}
    if(e.block){toast('This item cannot be accepted (see flags).');return}
    if(!$('#agree').checked){toast('Please tick the confirmation box.');return}
    var o=v;o.id='MD-'+String(db.n++).padStart(4,'0');o.flags=e.flags;o.status='submitted';o.reason='';o.org='';o.handler='';o.reviewer='';o.log=[[now(),'Submitted']];
    db.items.push(o);save();f.reset();pv();
    $('#done').innerHTML='<div class="card"><h2>Submitted</h2><p>Your donation ID is <strong style="font-size:1.4rem;color:var(--pink)">'+o.id+'</strong>. It now waits for authorised review. Keep this ID to track progress.</p><a class="btn" style="text-decoration:none;display:inline-block" href="#track">Go to tracking</a></div>'})}
function wireTrack(){var go=function(){var id=$('#tid').value.trim().toUpperCase(),x=db.items.filter(function(i){return i.id===id})[0],o=$('#tres');
    if(!x){o.innerHTML='<div class="card">No donation found with that ID.</div>';return}
    var idx=-1;STEPS.forEach(function(s,i){if(s[0]===x.status)idx=i});
    o.innerHTML='<div class="card"><h2>'+esc(x.id)+': '+esc(x.name)+'</h2>'+tagFor(x.status)+
    (x.status==='rejected'?'<p>This donation could not be accepted. Reason given: <strong>'+esc(x.reason)+'</strong></p>':'<ul class="steps">'+STEPS.map(function(s,i){return '<li class="'+(i<=idx?'done':'')+'">'+s[1]+'</li>'}).join('')+'</ul>')+
    '<h3>History</h3>'+x.log.map(function(l){return '<div class="muted">'+esc(l[0])+' &middot; '+esc(l[1])+'</div>'}).join('')+'<p class="muted">Recipient details are never shown to donors.</p></div>'};
  $('#tgo').addEventListener('click',go);$('#tid').addEventListener('keydown',function(e){if(e.key==='Enter')go()})}

document.addEventListener('click',function(e){var t=e.target,card=t.closest&&t.closest('[data-id]'),x=card&&db.items.filter(function(i){return i.id===card.dataset.id})[0];
  if(t.id==='staffBtn'||t.id==='en'){db.staff=!db.staff||t.id==='en';save();if(!db.staff&&STAFF[route()])location.hash='#home';render();return}
  if(t.id==='reset'){db=seed();save();render();toast('Demo data reset.');return}
  if(!x)return;
  if(t.classList.contains('rej')){var rs=$('.rs',card).value.trim(),rv=$('.rv',card).value.trim();if(!rs||!rv){toast('Reviewer name and a reason are required.');return}
    x.status='rejected';x.reason=rs;x.reviewer=rv;logIt(x,'Rejected by '+rv+': '+rs);save();render();toast('Rejected and recorded.')}
  if(t.classList.contains('acc')){var rv2=$('.rv',card).value.trim();if(!rv2){toast('Enter the reviewer name.');return}
    x.status='verified';x.reviewer=rv2;logIt(x,'Verified by '+rv2);save();render();toast('Verified and added to inventory.')}
  if(t.classList.contains('mt')){x.org=$('.og',card).value;x.status='matched';logIt(x,'Matched with an authorised organisation');save();render();toast('Matched.')}
  if(t.classList.contains('ho')){var h=$('.hd',card).value.trim();if(!h){toast('Enter the handler name.');return}
    x.status='handed';x.handler=h;logIt(x,'Handed over by '+h);save();render();toast('Handover recorded.')}
});
document.addEventListener('change',function(e){if(e.target.classList.contains('c')){var card=e.target.closest('[data-id]');$('.acc',card).disabled=card.querySelectorAll('.c:checked').length<4}});
window.addEventListener('hashchange',render);
render();
})();
