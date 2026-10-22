/* Schach 1001+ Pro: Spielen und Stockfish-Analyse. Stockfish ist lokal im APK enthalten. */
(function(){'use strict';
const files='abcdefgh';
const vals={p:100,n:320,b:330,r:500,q:900,k:20000};
const nm={P:'Bauer',N:'Springer',B:'Läufer',R:'Turm',Q:'Dame',K:'König'};
const mlets={P:'',N:'N',B:'B',R:'R',Q:'Q',K:'K'};
const W='w',B='b';
const startFen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function elem(id){return document.getElementById(id)}
function isW(pc){return pc&&pc===pc.toUpperCase()}
function color(pc){return isW(pc)?W:B}
function enemy(side){return side===W?B:W}
function ind(f,r){return r*8+f}
function coords(i){return [i%8,Math.floor(i/8)]}
function sq(i){return files[i%8]+(8-Math.floor(i/8))}
function idx(str){if(!/^[a-h][1-8]$/.test(str))return -1;return (8-Number(str[1]))*8+files.indexOf(str[0])}
function dup(p){return {...p,board:p.board.slice()}}
function fromFen(fen){let a=fen.trim().split(/\s+/);if(a.length<2)throw new Error('FEN unvollständig');let b=[];let rows=a[0].split('/');if(rows.length!==8)throw new Error('FEN-Brett ungültig'); for(const row of rows){for(const ch of row){if(/[1-8]/.test(ch)){for(let j=0;j<+ch;j++)b.push(null);}else if(/[KQRBNPkqrbnp]/.test(ch)){b.push(ch)}else throw new Error('FEN-Zeichen ungültig')}}if(b.length!==64)throw new Error('FEN-Felder ungültig');return {board:b,turn:a[1],castle:a[2]||'-',ep:(a[3]&&a[3]!=='-')?idx(a[3]):-1,half:+(a[4]||0),full:+(a[5]||1)}}
function toFen(p){let s='';for(let r=0;r<8;r++){let zeros=0;for(let f=0;f<8;f++){let pc=p.board[ind(f,r)];if(!pc)zeros++;else{if(zeros)s+=zeros,zeros=0;s+=pc}}if(zeros)s+=zeros;if(r<7)s+='/';}return s+' '+p.turn+' '+(p.castle||'-')+' '+(p.ep<0?'-':sq(p.ep))+' '+p.half+' '+p.full}
function squareAttacked(p,target,by){const [x,y]=coords(target),b=p.board; let py=y+(by===W?1:-1);for(const dx of [-1,1]){let f=x+dx;if(f>=0&&f<8&&py>=0&&py<8){let pc=b[ind(f,py)];if(pc===(by===W?'P':'p'))return true;}}
 for(const [df,dr] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]){let f=x+df,r=y+dr;if(f>=0&&f<8&&r>=0&&r<8){const pc=b[ind(f,r)];if(pc&&color(pc)===by&&pc.toLowerCase()==='n')return true}}
 for(const [df,dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){let f=x+df,r=y+dr,dist=1;while(f>=0&&f<8&&r>=0&&r<8){const pc=b[ind(f,r)];if(pc){if(color(pc)===by){const pt=pc.toLowerCase();if(pt==='q'||(dist===1&&pt==='k')||((df===0||dr===0)&&pt==='r')||((df!==0&&dr!==0)&&pt==='b'))return true;}break;}f+=df;r+=dr;dist++;}}
 return false}
function inCheck(p,side){let k=p.board.indexOf(side===W?'K':'k');return k<0||squareAttacked(p,k,enemy(side))}
function pseudo(p,side=p.turn){let out=[],b=p.board;function emit(f,t,opt={}){if(t<0||t>=64)return;const hit=b[t];if(hit&&color(hit)===side)return;if(hit&&hit.toLowerCase()==='k')return;out.push({f,t,piece:b[f],capture:hit||null,...opt});}
 for(let i=0;i<64;i++){let pc=b[i];if(!pc||color(pc)!==side)continue;let type=pc.toLowerCase(),[x,y]=coords(i);
 if(type==='p'){let d=side===W?-1:1,n=y+d;if(n<0||n>7)continue;const finish=n===0||n===7;function pawnEmit(t,opt={}){if(finish){for(const promo of ['q','r','b','n'])emit(i,t,{...opt,promo});}else emit(i,t,opt)}
 if(!b[ind(x,n)]){pawnEmit(ind(x,n));if((side===W&&y===6)||(side===B&&y===1)){let two=ind(x,y+2*d);if(!b[two])emit(i,two,{dbl:true})}}
 for(const dx of [-1,1]){let f=x+dx;if(f<0||f>7)continue;let t=ind(f,n);if(b[t]&&color(b[t])!==side&&b[t].toLowerCase()!=='k')pawnEmit(t);if(t===p.ep&&!b[t])emit(i,t,{enpassant:true,capture:side===W?'p':'P'})}continue}
 if(type==='n'||type==='k'){let offsets=type==='n'?[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];for(let [df,dr] of offsets){let f=x+df,r=y+dr;if(f>=0&&f<8&&r>=0&&r<8)emit(i,ind(f,r))}}
 if(['b','r','q'].includes(type)){let dirs=(type==='b'?[[1,1],[-1,1],[1,-1],[-1,-1]]:type==='r'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]);for(let [df,dr] of dirs){let f=x+df,r=y+dr;while(f>=0&&f<8&&r>=0&&r<8){let t=ind(f,r);if(b[t]){if(color(b[t])!==side)emit(i,t);break;}emit(i,t);f+=df;r+=dr;}}}
 if(type==='k'&&!inCheck(p,side)){let row=side===W?7:0,kHome=ind(4,row);if(i!==kHome)continue;
 for(let [flag,rookF,clear,passes,target] of [['K',7,[5,6],[5,6],6],['Q',0,[1,2,3],[3,2],2]]){if(side===B)flag=flag.toLowerCase();if(!p.castle.includes(flag))continue;const rook=b[ind(rookF,row)];if(rook!==(side===W?'R':'r'))continue;if(clear.some(f=>b[ind(f,row)]))continue;if(passes.some(f=>squareAttacked(p,ind(f,row),enemy(side))))continue;emit(i,ind(target,row),{castle:target===6?'K':'Q'});}
 }
 }
 return out}
function move(p,m){let n=dup(p),pc=p.board[m.f],target=p.board[m.t];n.board[m.f]=null;n.board[m.t]=m.promo?(p.turn===W?m.promo.toUpperCase():m.promo.toLowerCase()):pc;
 if(m.enpassant){n.board[m.t+(p.turn===W?8:-8)]=null}
 if(m.castle){let r=p.turn===W?7:0,from=ind(m.castle==='K'?7:0,r),to=ind(m.castle==='K'?5:3,r);n.board[to]=n.board[from];n.board[from]=null}
 let cast=p.castle==='-'?'':p.castle;
 if(pc==='K')cast=cast.replace(/[KQ]/g,'');if(pc==='k')cast=cast.replace(/[kq]/g,'');
 if(m.f===63||m.t===63)cast=cast.replace('K','');if(m.f===56||m.t===56)cast=cast.replace('Q','');if(m.f===7||m.t===7)cast=cast.replace('k','');if(m.f===0||m.t===0)cast=cast.replace('q','');n.castle=cast||'-';
 n.ep=m.dbl?m.f+(p.turn===W?-8:8):-1;n.half=(pc.toLowerCase()==='p'||target||m.enpassant)?0:p.half+1;n.full=p.full+(p.turn===B?1:0);n.turn=enemy(p.turn);return n}
function legal(p){return pseudo(p,p.turn).filter(m=>!inCheck(move(p,m),p.turn))}
function outcome(p){const l=legal(p);if(!l.length)return inCheck(p,p.turn)?(p.turn===W?'Schwarz gewinnt durch Matt':'Weiß gewinnt durch Matt'):'Remis durch Patt';if(p.half>=150)return 'Remis durch 75-Züge-Regel';if(!p.board.some(pc=>pc&&['p','r','q'].includes(pc.toLowerCase()))){let minor=p.board.filter(pc=>pc&&['n','b'].includes(pc.toLowerCase()));if(minor.length<=1)return 'Remis (unzureichendes Material)';}return null}
function notation(p,m,all){let pc=p.board[m.f];if(m.castle)return m.castle==='K'?'O-O':'O-O-O';let t=pc.toUpperCase(),piece=mlets[t],cap=m.capture?'x':'',text='';if(t==='P'&&cap)text=files[m.f%8];else if(t!=='P')text=piece;
 if(t!=='P'&&t!=='K'){let conflicts=all.filter(other=>other.t===m.t&&other.f!==m.f&&p.board[other.f]===pc);if(conflicts.length){let sameFile=conflicts.some(o=>o.f%8===m.f%8),sameRank=conflicts.some(o=>Math.floor(o.f/8)===Math.floor(m.f/8));if(!sameFile)text+=files[m.f%8];else if(!sameRank)text+=8-Math.floor(m.f/8);else text+=sq(m.f);}}
 text+=cap+sq(m.t)+(m.promo?'='+m.promo.toUpperCase():'');const np=move(p,m);if(inCheck(np,np.turn))text+=legal(np).length?'+' :'#';return text}
function evalWhite(p){let score=0;for(let i=0;i<64;i++){let pc=p.board[i];if(!pc)continue;let type=pc.toLowerCase(),base=vals[type],f=i%8,r=Math.floor(i/8),center=(3.5-Math.abs(f-3.5))+(3.5-Math.abs(r-3.5));let bonus=(type==='p'?(isW(pc)?6-r:r-1)*7:type==='n'||type==='b'?center*8:type==='q'?center*1.5:0);if(type==='k')bonus=(p.full<25?-center*4:center*4);score+=(isW(pc)?1:-1)*(base+bonus);}return Math.round(score)}
function scoreForSide(p){return evalWhite(p)*(p.turn===W?1:-1)}
function ordered(p,moves){return moves.slice().sort((a,b)=>(b.capture?vals[b.capture.toLowerCase()]:0)+(b.promo?800:0)-(a.capture?vals[a.capture.toLowerCase()]:0)-(a.promo?800:0))}
let searchedNodes=0;
function search(p,depth,alpha,beta,maxNodes){searchedNodes++;if(searchedNodes>maxNodes)return scoreForSide(p);const available=legal(p);if(!available.length)return inCheck(p,p.turn)?-30000-(depth*100):0;if(depth===0)return scoreForSide(p);
 let best=-1e9;for(const m of ordered(p,available)){let value=-search(move(p,m),depth-1,-beta,-alpha,maxNodes);if(value>best)best=value;if(best>alpha)alpha=best;if(alpha>=beta||searchedNodes>maxNodes)break;}return best}
function think(p,level,analysis=false){const all=legal(p);if(!all.length)return null;
 // 400–1800: einfacher lokaler Trainingsgegner. Ab 2000 kommt echte Stockfish 19 Lite zum Einsatz.
 const l=Math.max(1,Math.min(9,Math.round(level)));
 const depth=analysis?2:[1,1,1,2,2,2,2,3,3][l-1];
 const nodeLimit=analysis?6000:[150,300,650,1200,2500,3600,6200,10000,18000][l-1];
 searchedNodes=0;const ranked=[];
 for(const m of ordered(p,all)){const value=-search(move(p,m),depth-1,-31000,31000,nodeLimit);ranked.push({m,value});if(searchedNodes>nodeLimit&&ranked.length>=6)break;}
 ranked.sort((a,b)=>b.value-a.value);const top=ranked[0];if(analysis||l===9)return {m:top.m,value:top.value,depth};
 const tolerance=[600,500,370,290,200,140,80,35,0][l-1],pool=ranked.filter(v=>v.value>=top.value-tolerance);
 const choice=pool[Math.floor(Math.random()*pool.length)]||top;return {m:choice.m,value:choice.value,depth};}
// Bounded two-half-move offline search. This is a teaching estimate, not Stockfish.
function localCandidates(p){
 const fen=toFen(p);if(reviewCache.has(fen))return reviewCache.get(fen);
 const moves=legal(p),items=[];
 for(const m of ordered(p,moves)){
  searchedNodes=0;
  const value=-search(move(p,m),1,-31000,31000,900);
  items.push({m,value,uci:moveUci(m)});
 }
 items.sort((a,b)=>b.value-a.value);
 const result={items,best:items[0]||null,fen};
 reviewCache.set(fen,result);
 if(reviewCache.size>90)reviewCache.delete(reviewCache.keys().next().value);
 return result;
}
function deSan(san){return String(san).replace(/^([NBRQK])/,c=>({N:'S',B:'L',R:'T',Q:'D',K:'K'}[c]||c));}
function coachHTML(rec){
 const c=rec.coach||null,who=fromFen(rec.before).turn==='w'?'Weiß':'Schwarz';
 const move=escapeHtml(who+': '+deSan(rec.san));
 if(!c)return '<strong>'+move+'</strong><p>Stockfish bewertet den gespielten Zug. Einen Moment …</p>';
 if(c.source==='none')return '<strong>'+move+'</strong><p>'+escapeHtml(c.why||'Keine Bewertung verfügbar.')+'</p>';
 const parts=['<strong>'+move+' · '+escapeHtml(c.label)+'</strong>'];
 parts.push('<p class="coachReason"><b>Warum?</b> '+escapeHtml(c.why||'Stockfish bewertet diesen Zug.')+'</p>');
 if(c.positives)parts.push('<p><b>Das bewirkt dein Zug:</b> '+escapeHtml(c.positives)+'</p>');
 if(c.risks)parts.push('<p><b>Achte darauf:</b> '+escapeHtml(c.risks)+'</p>');
 if(c.plan)parts.push('<p><b>Dein nächster Plan:</b> '+escapeHtml(c.plan)+'</p>');
 if(bestVisible()&&c.alternative)parts.push('<p class="coachAlternative"><b>Stockfish-Alternative:</b> '+escapeHtml(c.alternative)+'</p>');
 if(typeof c.loss==='number')parts.push('<small>Stockfish 19 Lite · Bewertungsabweichung ca. '+(c.loss/100).toFixed(2)+' Bauerneinheiten (begrenzte Suchtiefe)</small>');
 return parts.join('');
}
function refreshCoach(){
 queueMicrotask(v58CoachBar);
 const el=elem('gameCoachText'),brief=elem('gameCoachCompact'),detail=elem('gameCoachExpanded'),history=elem('gameCoachHistory');
 const details=elem('gameCoachDetails'),isExpanded=!!(details&&details.open),readPosition=isExpanded&&detail?detail.scrollTop:0;
 if(!el)return;
 syncCoachToggle();
 if(!coachVisible()){el.textContent='Coach ausgeschaltet.';if(detail)detail.textContent='';if(history)history.textContent='';return;}
 if(!record.length){
  const start='Spiele einen Zug. Der Coach erklärt dir anschließend die Idee, mögliche Risiken und den nächsten Plan.';
  el.textContent=start;if(brief)brief.textContent='Coach bereit · Tippe für die ausführliche Erklärung';
  if(detail)detail.textContent=start;if(history)history.textContent='';return;
 }
 const last=record[record.length-1],c=last.coach;
 const html=coachHTML(last);el.innerHTML=html;if(detail){detail.innerHTML=html;if(isExpanded)detail.scrollTop=readPosition;}
 if(brief)brief.textContent=c&&c.source!=='none'?deSan(last.san)+' · '+c.label+' — '+(c.brief||c.why||'Erklärung öffnen'):c&&c.source==='none'?'Stockfish nicht verfügbar · Erklärung öffnen':deSan(last.san)+' · Stockfish prüft deinen Zug …';
 const older=record.slice(-5,-1).reverse();
 if(history)history.innerHTML=older.length?'<details><summary>Frühere Zugerklärungen ('+older.length+')</summary>'+older.map(r=>'<div class="coachHistoryEntry">'+coachHTML(r)+'</div>').join('')+'</details>':'';
 v57AugmentCoach();
}

function updateSideEvaluation(value){
 const headline=elem('gameEval'),fill=elem('gameEvalFill'),rail=elem('gameEvalRail');
 if(!headline||!fill||!rail)return;
 const known=Number.isFinite(value);
 const pct=known?Math.min(94,Math.max(6,50+44*Math.tanh(value/350))):50;
 headline.textContent=known?fmtEval(value):'– (Stockfish)';
 fill.style.height=pct.toFixed(1)+'%';
 rail.setAttribute('aria-valuenow',String(Math.round(pct)));
 rail.setAttribute('aria-valuetext',known?(fmtEval(value)+' aus Sicht von Weiß'):'Noch keine Stockfish-Bewertung');
}
function fmtEval(cp){if(Math.abs(cp)>25000)return cp>0?'Matt für Weiß':'Matt für Schwarz';return (cp>=0?'+':'')+(cp/100).toFixed(2)}
const imgMap={K:'wK.png',Q:'wQ.png',R:'wR.png',B:'wB.png',N:'wN.png',P:'wP.png',k:'bK.png',q:'bQ.png',r:'bR.png',b:'bB.png',n:'bN.png',p:'bP.png'};
const TIME_CONTROLS={
 none:{title:'Ohne Uhr',ms:0,inc:0,type:'none'},
 b1:{title:'1 Min.',ms:60000,inc:0,type:'live'},b11:{title:'1 + 1',ms:60000,inc:1,type:'live'},b21:{title:'2 + 1',ms:120000,inc:1,type:'live'},
 b3:{title:'3 Min.',ms:180000,inc:0,type:'live'},b32:{title:'3 + 2',ms:180000,inc:2,type:'live'},b5:{title:'5 Min.',ms:300000,inc:0,type:'live'},b55:{title:'5 + 5',ms:300000,inc:5,type:'live'},b52:{title:'5 + 2',ms:300000,inc:2,type:'live'},
 r10:{title:'10 Min.',ms:600000,inc:0,type:'live'},r105:{title:'10 + 5',ms:600000,inc:5,type:'live'},r1510:{title:'15 + 10',ms:900000,inc:10,type:'live'},r20:{title:'20 Min.',ms:1200000,inc:0,type:'live'},r30:{title:'30 Min.',ms:1800000,inc:0,type:'live'},r60:{title:'60 Min.',ms:3600000,inc:0,type:'live'},
 d1:{title:'1 Tag/Zug',ms:86400000,inc:0,type:'daily'},d2:{title:'2 Tage/Zug',ms:2*86400000,inc:0,type:'daily'},d3:{title:'3 Tage/Zug',ms:3*86400000,inc:0,type:'daily'},d5:{title:'5 Tage/Zug',ms:5*86400000,inc:0,type:'daily'},d7:{title:'7 Tage/Zug',ms:7*86400000,inc:0,type:'daily'},d14:{title:'14 Tage/Zug',ms:14*86400000,inc:0,type:'daily'}
};
let pos=fromFen(startFen),record=[],setup={mode:'computer',elo:1000,side:'w',time:'r10',customMin:10,customInc:0,engine:'local',showBestMove:false,coachEnabled:true},picked=-1,flip=false,busy=false,token=0,drag=null,clickSuppress=0;
let clock={w:600000,b:600000,active:null,started:false,lastAt:0,finished:null};
let gameResult=null, activeFlights=new Set(),timerHandle=null;
let sessionId='s'+Date.now()+'-'+Math.floor(Math.random()*1e6);
// Zugvorschläge sind nur Hinweise: niemals automatisch einen Spielzug ausführen.
let suggestedMove=null, analysisSequence=0;
// V5.35: Mehrere bedingte Vorauszüge. Die tatsächliche Stellung bleibt unverändert.
let premove=null,premovePlan=[],executingPremove=false;
function projectedPremovePosition(){
 let projected=fromFen(toFen(pos));
 for(const pending of premovePlan){
  projected.turn=setup.side;projected.ep=-1;
  const match=legal(projected).find(m=>m.f===pending.f&&m.t===pending.t&&(!m.promo||m.promo===pending.promo));
  if(!match)break;
  projected=move(projected,match);
 }
 projected.turn=setup.side;projected.ep=-1;
 return projected;
}

// null = live game; integer 0..record.length = historical ply shown on board.
let reviewPly=null;
let boardRenderKey='';
const reviewCache=new Map();
let v517AfterMove=()=>{},v517UpdateReview=()=>{};
let sfPositionScore=null;
// V5.17 preferences — strictly additive: never replace existing saved games, puzzles or settings.
const V517_KEY='schach1001_v517_preferences';
let v517Prefs={legalDots:true,sounds:false,haptic:true,focus:false};
try{v517Prefs={...v517Prefs,...JSON.parse(localStorage.getItem(V517_KEY)||'{}')}}catch(_){}
// V5.43: alte Vollbild-Funktion entfernt; gespeicherten Zustand sicher zurücksetzen.
v517Prefs.focus=false;
function v517SavePrefs(){try{localStorage.setItem(V517_KEY,JSON.stringify(v517Prefs))}catch(_){}}

function stockfishUnavailable(e){return "Stockfish ist derzeit nicht verfügbar: "+(e&&e.message?e.message:"keine Verbindung")+". Keine lokale Ersatzanalyse."}
function sfWhiteScore(fen,ans){if(!ans||ans.scoreType===null)return null;const white=fromFen(fen).turn===W?1:-1;return ans.scoreType==='cp'?ans.score*white:ans.scoreType==='mate'?Math.sign(ans.score||1)*30000*white:null;}

function chosenTime(){if(setup.time==='custom')return {title:setup.customMin+' + '+setup.customInc,ms:Math.max(1,Number(setup.customMin)||1)*60000,inc:Math.max(0,Number(setup.customInc)||0),type:'live'};return TIME_CONTROLS[setup.time]||TIME_CONTROLS.r10;}
function newClock(){const t=chosenTime();return {w:t.ms,b:t.ms,active:null,started:false,lastAt:0,finished:null};}
function saveClock(){return {...clock};}
function persist(){try{localStorage.setItem('schach1001_analysis_v2',JSON.stringify({fen:toFen(pos),record,setup,flip,clock,gameResult,premove,premovePlan,sessionId}))}catch(e){} if(typeof v58AutoBackup==='function')v58AutoBackup();}
function restore(){try{
 let raw=localStorage.getItem('schach1001_analysis_v2');
 if(!raw){let old=JSON.parse(localStorage.getItem('schach1001_analysis_v1'));if(old){pos=fromFen(old.fen);record=old.record||[];setup={...setup,...old.setup,elo:({1:400,2:700,3:1000,4:1400,5:1800}[old.setup?.level]||1000)};flip=!!old.flip;clock=newClock();return;}}
 let s=JSON.parse(raw);if(s&&s.fen&&Array.isArray(s.record)){pos=fromFen(s.fen);record=s.record.slice(0,400);setup={...setup,...s.setup};flip=!!s.flip;clock=s.clock&&typeof s.clock.w==='number'?s.clock:newClock();gameResult=s.gameResult||null;premove=s.premove||null;premovePlan=Array.isArray(s.premovePlan)?s.premovePlan.slice(0,6):premove?[premove]:[];premove=premovePlan[0]||null;sessionId=s.sessionId||('legacy-'+String([...JSON.stringify(s.record||[]),s.fen||'',s.gameResult||''].join('|').split('').reduce((h,ch)=>Math.imul(h^ch.charCodeAt(0),16777619),2166136261)>>>0));}
 }catch(e){clock=newClock();}}
restore();
// V5.54: Eine laufende Altpartie mit weniger als zwei Halbzügen darf
// nicht bereits herunterzählen. Für ältere abgeschlossene Partien werden
// keine gespeicherten Uhren verändert.
if(!gameResult&&record.length<2){clock=newClock();}
// Diese Einstellung ist absichtlich bei Erstinstallation AUS.
setup.showBestMove=setup.showBestMove===true;
setup.coachEnabled=setup.coachEnabled!==false;
let coachSequence=0;
function coachVisible(){return setup.coachEnabled!==false;}
function syncCoachToggle(){
 const btn=elem('gameCoachToggle'),dock=elem('gameCoachDock'),details=elem('gameCoachDetails'),panel=elem('gameCoachPanel');
 if(btn){btn.setAttribute('aria-checked',String(coachVisible()));btn.classList.toggle('on',coachVisible());btn.textContent=coachVisible()?'● Coach: EIN':'○ Coach: AUS';}
 if(details)details.hidden=!coachVisible();
 if(dock)dock.classList.toggle('disabled',!coachVisible());
 if(panel)panel.hidden=!coachVisible();
 if(!coachVisible()&&elem('gameCoachCompact'))elem('gameCoachCompact').textContent='Der Coach ist pausiert. Schalte ihn ein, um deine Züge erklären zu lassen.';
}
function setCoachVisibility(enabled){
 setup.coachEnabled=enabled===true;coachSequence++;if(!enabled)v57StopSpeech();persist();refreshCoach();
 if(coachVisible()&&record.length&&!record.at(-1).coach)postMoveCoach();
}

function bestVisible(){return setup.showBestMove===true;}
function syncBestToggle(){
 const btn=elem('gameBestToggle'),status=elem('gameBestToggleStatus'),readout=elem('gameBestReadout'),again=elem('gameBest');
 if(btn){btn.setAttribute('aria-checked',String(bestVisible()));btn.classList.toggle('on',bestVisible());btn.textContent=bestVisible()?'● Bester Zug: EIN':'○ Bester Zug: AUS';}
 if(status)status.textContent=bestVisible()?'Stockfish-Zugvorschlag und Pfeil sichtbar.':'Zugvorschläge verborgen – Coach und Stellungsbewertung bleiben aktiv.';
 if(elem('v514ArrowButton')){elem('v514ArrowButton').setAttribute('aria-pressed',String(bestVisible()));elem('v514ArrowButton').textContent=bestVisible()?'➜ Pfeil AN':'➜ Pfeil AUS'}
 if(readout)readout.hidden=!bestVisible();
 if(again)again.hidden=!bestVisible();
}
function setNote(text,warning=false){elem('gameNotice').textContent=text;elem('gameNotice').classList.toggle('gameBad',!!warning)}
function isTimed(){return (setup.mode==='computer'||setup.mode==='free')&&chosenTime().type!=='none'}
function updateClock(){
 if(!isTimed()||!clock.started||!clock.active||clock.finished||gameResult)return;
 const now=Date.now(),elapsed=Math.max(0,now-clock.lastAt),side=clock.active;
 clock[side]=Math.max(0,clock[side]-elapsed);clock.lastAt=now;
 if(clock[side]<=0){clock.finished=side;gameResult=(side===W?'Schwarz':'Weiß')+' gewinnt auf Zeit';token++;busy=false;persist();archiveGame();setNote(gameResult,true);render();}
}
function fmtTime(ms){ms=Math.max(0,Math.ceil(ms));if(ms>=86400000)return Math.ceil(ms/86400000)+' T';if(ms>=3600000){const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);return h+':'+String(m).padStart(2,'0')+':00';}const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000);if(ms<20000)return m+':'+String(s).padStart(2,'0')+'.'+Math.floor((ms%1000)/100);return m+':'+String(s).padStart(2,'0');}
function paintClock(){let white=elem('gameClockW'),black=elem('gameClockB');if(!white||!black)return;
 const hide=!isTimed();elem('gameClocks').hidden=hide;
 for(const side of [W,B]){let node=elem(side===W?'gameClockW':'gameClockB');node.querySelector('strong').textContent=hide?'–':fmtTime(clock[side]);node.classList.toggle('clockRunning',!hide&&clock.started&&!clock.finished&&!gameResult&&clock.active===side);node.classList.toggle('clockExpired',!!clock.finished&&clock.finished===side);}
}
function refreshTimePicker(){let t=chosenTime(),els=document.querySelectorAll('.timePreset');for(const b of els)b.classList.toggle('on',b.dataset.time===setup.time);
 const custom=elem('customTime'),clockWrap=elem('clockSettings');if(clockWrap)clockWrap.hidden=setup.mode==='analysis'||setup.mode==='opening';if(custom)custom.hidden=setup.time!=='custom';
 if(elem('customMin'))elem('customMin').value=setup.customMin;if(elem('customInc'))elem('customInc').value=setup.customInc;
 if(elem('customLabel'))elem('customLabel').textContent=setup.time==='custom'?(setup.customMin+' Min. + '+setup.customInc+' Sek.'):(t.type==='daily'?t.title+' (offline)':t.title+(t.inc?' · '+t.inc+' Sek. Bonus/Zug':''));
 if(elem('timeSummaryValue'))elem('timeSummaryValue').textContent=setup.time==='custom'?(setup.customMin+' + '+setup.customInc):t.title;
}
function clearFlights(){for(const node of activeFlights){node.remove()}activeFlights.clear();document.querySelectorAll('.gamePiece.flightHidden').forEach(x=>x.classList.remove('flightHidden'));}
function floatPiece(moveObj,ghostRect=null){
 const board=elem('gameBoard');if(!board||board.getBoundingClientRect().width<10)return;
 const target=board.querySelector('.gameSq[data-i="'+moveObj.t+'"]');if(!target)return;
 const sourceRect=ghostRect||moveObj.sourceRect;
 if(!sourceRect)return;
 const img=document.createElement('img');img.src='./theme_pieces/'+imgMap[moveObj.pc];img.alt='Bewegte Schachfigur';img.className='flightPiece';
 const destRect=target.getBoundingClientRect(),s=destRect.width;let ax=sourceRect.left+(sourceRect.width-s)/2,ay=sourceRect.top+(sourceRect.height-s)/2;
 let bx=destRect.left,by=destRect.top;img.style.left=ax+'px';img.style.top=ay+'px';img.style.width=s+'px';img.style.height=s+'px';document.body.appendChild(img);activeFlights.add(img);
 const inCell=target.querySelector('.gamePiece');if(inCell)inCell.classList.add('flightHidden');
 function cleanup(){if(inCell)inCell.classList.remove('flightHidden');img.remove();activeFlights.delete(img)}
 if(typeof img.animate==='function'){
 const animation=img.animate([{transform:'translate3d(0,0,0) scale(1.04)',offset:0},{transform:'translate3d('+((bx-ax)*.72)+'px,'+((by-ay)*.72)+'px,0) scale(1.025)',offset:.73},{transform:'translate3d('+(bx-ax)+'px,'+(by-ay)+'px,0) scale(1)',offset:1}],{duration:Math.max(100,Math.min(550,Number(window.__v58AnimMs)||240)),easing:'cubic-bezier(.20,.78,.25,1)',fill:'forwards'});
 animation.onfinish=cleanup;animation.oncancel=cleanup;
 }else{img.style.transition='transform '+Math.max(100,Math.min(550,Number(window.__v58AnimMs)||240))+'ms cubic-bezier(.20,.78,.25,1)';requestAnimationFrame(()=>img.style.transform='translate3d('+(bx-ax)+'px,'+(by-ay)+'px,0)');setTimeout(cleanup,Math.max(100,Math.min(550,Number(window.__v58AnimMs)||240))+35);}
}
function render(){
 const elo=elem('gameElo');elo.value=setup.elo;elem('eloValue').textContent='≈ '+setup.elo+' Elo';elem('gameSide').value=setup.side;elem('gameMode').value=setup.mode;
 elem('eloField').hidden=setup.mode!=='computer';document.querySelectorAll('#v514EloPresets [data-elo]').forEach(b=>b.classList.toggle('active',+b.dataset.elo===setup.elo));elem('gameSideField').hidden=setup.mode!=='computer';elem('engineField').hidden=setup.mode==='free'||setup.mode==='opening';elem('gameEngine').value=setup.engine;elem('openingTrainer').hidden=setup.mode!=='opening' && !(elem('gameContent')?.dataset.v526Page==='training'&&elem('gameContent')?.dataset.v516Tool==='opening');refreshTimePicker();
 const board=elem('gameBoard');const inReview=reviewPly!==null;
 const shownPos=inReview?(reviewPly===0?fromFen(record[0]?.before||startFen):fromFen(record[Math.min(record.length,reviewPly)-1]?.after||startFen)):(canQueuePremove()&&premovePlan.length?projectedPremovePosition():pos);
 const whiteBottom=flip?setup.side!==W:setup.side===W;let arr=Array.from({length:64},(_,i)=>whiteBottom?i:63-i);
 syncBestToggle();
 const premoveControl=elem('gamePremoveRow');if(premoveControl)premoveControl.hidden=setup.mode!=='computer'||(!canQueuePremove()&&!premove);
 const premoveText=elem('gamePremoveText');if(premoveText){premoveText.textContent=premovePlan.length?'Planung ('+premovePlan.length+'/6): '+premovePlan.map((m,i)=>(i+1)+'. '+sq(m.f)+'→'+sq(m.t)).join(' · ')+(canQueuePremove()?' · Virtuelles Brett: Computerantwort unbekannt.':' · Wird Zug für Zug geprüft.'):(canQueuePremove()?'Computer am Zug: Du kannst bis zu 6 eigene Züge vormerken.':'Vorabzüge nur während des Computerzuges möglich.')}
 let planBadge=elem('v535PlanBadge');if(!planBadge&&premoveControl){planBadge=document.createElement('small');planBadge.id='v535PlanBadge';planBadge.className='v535PlanBadge';premoveControl.append(planBadge)}
 if(planBadge){planBadge.hidden=!premovePlan.length;planBadge.textContent=premovePlan.length?'VIRTUELLE STELLUNG · '+premovePlan.length+' geplante Züge · Antworten des Computers sind nicht vorhersehbar':'';}
 const shownLast=inReview?reviewPly:record.length;
 const last=shownLast?record[shownLast-1]:null,options=inReview?[]:legal(pos);
 const visualKey=[toFen(shownPos),picked,flip,setup.side,reviewPly??'live',
    premovePlan.map(x=>x.f+'-'+x.t).join(','),window.SchachLastMove?.enabled()?'lastOn':'lastOff',last?.f??'',last?.t??'',
    bestVisible()&&suggestedMove?.fen===toFen(pos)?(suggestedMove.f+'-'+suggestedMove.t):'nohint',v517Prefs.legalDots?'dots':'nodots'].join('|');
 if(boardRenderKey!==visualKey){
  boardRenderKey=visualKey;
  board.replaceChildren();
 for(let i=0;i<64;i++){
 let idx0=arr[i],pc=shownPos.board[idx0],box=document.createElement('div');box.className='gameSq '+((Math.floor(idx0/8)+idx0%8)%2===0?'light':'dark');box.dataset.i=idx0;
 if(idx0===picked)box.classList.add('picked');
 if(shownPos.board[idx0]===(shownPos.turn===W?'K':'k')&&inCheck(shownPos,shownPos.turn))box.classList.add('v514CheckKing');if(premovePlan.some(m=>m.f===idx0))box.classList.add('queuedFrom');if(premovePlan.some(m=>m.t===idx0))box.classList.add('queuedTo');if(last&&window.SchachLastMove?.enabled()){if(last.f===idx0)box.classList.add('lastMoveFrom');if(last.t===idx0)box.classList.add('lastMoveTo');}if(!inReview&&bestVisible()&&suggestedMove&&suggestedMove.fen===toFen(pos)){if(idx0===suggestedMove.f)box.classList.add('bestFrom');if(idx0===suggestedMove.t)box.classList.add('bestTo')}
 if(v517Prefs.legalDots&&!inReview&&picked>=0&&!canQueuePremove()&&options.some(m=>m.f===picked&&m.t===idx0)){let dot=document.createElement('span');dot.className=pc?'targetRing':'targetDot';box.appendChild(dot)}
 if(pc){let image=document.createElement('img');image.src='./theme_pieces/'+imgMap[pc];image.alt=(isW(pc)?'Weißer ':'Schwarzer ')+nm[pc.toUpperCase()];image.draggable=false;image.className='gamePiece';box.appendChild(image)}
 if(i>=56){let c=document.createElement('span');c.className='gameCoord fileCoord';c.textContent=files[idx0%8];box.appendChild(c)}
 if(i%8===0){let c=document.createElement('span');c.className='gameCoord rankCoord';c.textContent=8-Math.floor(idx0/8);box.appendChild(c)}
 box.onclick=()=>{if(inReview||Date.now()<clickSuppress)return;selectOrMove(idx0)};board.appendChild(box);
 }
 if(!inReview&&bestVisible()&&suggestedMove&&suggestedMove.fen===toFen(pos)){
  const from=arr.indexOf(suggestedMove.f),to=arr.indexOf(suggestedMove.t);
  if(from>=0&&to>=0){
   const ax=(from%8+0.5)*100,ay=(Math.floor(from/8)+0.5)*100,bx=(to%8+0.5)*100,by=(Math.floor(to/8)+0.5)*100;
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 800 800');svg.setAttribute('class','gameBestArrow');svg.setAttribute('aria-label','Empfohlener Zug von '+sq(suggestedMove.f)+' nach '+sq(suggestedMove.t));
   svg.innerHTML='<defs><marker id="bestArrowHead" markerWidth="5" markerHeight="5" refX="3.4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#42d18b"/></marker></defs><line x1="'+ax+'" y1="'+ay+'" x2="'+bx+'" y2="'+by+'" stroke="#42d18b" stroke-width="15" stroke-linecap="round" opacity=".82" marker-end="url(#bestArrowHead)"/>';
   board.appendChild(svg);
  }
 }
 } // End visual board update: layout and animated pieces survive status-only renders.
 const msg=gameResult||legalDrawState()||outcome(pos);elem('gameTurn').textContent=inReview?('Rückblick · '+(reviewPly===0?'Ausgangsstellung':'Zug '+reviewPly+'/'+record.length)):msg||((pos.turn===W?'Weiß':'Schwarz')+' am Zug'+(inCheck(pos,pos.turn)?' · Schach!':''));
 elem('gameThinking').textContent=busy?'Computer denkt …':(setup.mode==='computer'?(setup.elo>=2000||setup.engine==='stockfish'?'Stockfish 19 Lite · Profil '+setup.elo:'Offline-Spielgegner · Stärkeprofil '+setup.elo):setup.mode==='opening'?'Eröffnungstraining':'Analyse: Stockfish 19 Lite');elem('gameUndo').disabled=!record.length||busy;
 v533OpeningHintPaint();renderPlyHistory();v514UpdateGameSummary();const sfValue=sfPositionScore&&sfPositionScore.fen===toFen(pos)?sfPositionScore.whiteCp:null;updateSideEvaluation(sfValue);paintClock();
}
function setReviewPly(ply){
 if(ply===null||ply>=record.length)reviewPly=null;
 else reviewPly=Math.max(0,Math.min(record.length,Math.floor(Number(ply)||0)));
 picked=-1;clearFlights();render();
}
function changeReviewPly(step){
 const current=reviewPly===null?record.length:reviewPly;
 setReviewPly(Math.max(0,Math.min(record.length,current+step)));
}
function renderPlyHistory(){
 const list=elem('gameMoves'),recent=elem('gameRecentMoves'),state=elem('gameReviewStatus');
 if(!list||!recent||!state)return;
 const current=reviewPly===null?record.length:reviewPly;
 state.textContent=reviewPly===null?'● Live · '+record.length+' Halbzüge':'◀ Rückblick '+current+'/'+record.length+' · Partie läuft weiter';
 const btn=(i,short=false)=>'<button type="button" class="historyMove'+(i+1===current?' viewing':'')+(reviewPly===null&&i===record.length-1?' latest':'')+'" data-review-ply="'+(i+1)+'" aria-label="Zug '+(i+1)+': '+escapeHtml(record[i].san)+' anzeigen" aria-current="'+(i+1===current?'step':'false')+'">'+(short?'':(i%2===0?'<b>'+(Math.floor(i/2)+1)+'.</b> ':''))+escapeHtml(record[i].san)+(record[i].coach&&record[i].coach.source==='Stockfish 19 Lite'?'<span class="v514MoveGrade '+record[i].coach.level+'" title="'+escapeHtml(record[i].coach.label)+'">'+escapeHtml(({'Bester Zug':'★','Sehr gut':'✓','Gut':'✓','Ungenauigkeit':'?!','Fehler':'?','Patzer':'??'})[record[i].coach.label]||'✓')+'</span>':'')+'</button>';
 let out='';for(let i=0;i<record.length;i+=2)out+='<div class="historyPair"><span class="historyNumber">'+(Math.floor(i/2)+1)+'.</span>'+btn(i,true)+(record[i+1]?btn(i+1,true):'<span class="historyEmpty">…</span>')+'</div>';
 list.innerHTML=out||'<span class="historyEmpty">Noch keine Züge · beginne eine Partie.</span>';
 recent.innerHTML=record.slice(-4).map((r,j)=>btn(record.length-Math.min(4,record.length)+j)).join('')||'<span class="historyEmpty">Züge erscheinen hier.</span>';
 const live=elem('gameHistoryLive');if(live){live.disabled=reviewPly===null;live.classList.toggle('active',reviewPly===null)}
 for(const [id,enabled] of [['gameHistoryStart',current>0],['gameHistoryPrev',current>0],['gameHistoryNext',current<record.length]]){const node=elem(id);if(node)node.disabled=!enabled}
 const full=elem('gameFullMoveList');if(full&&!full.hidden){const active=full.querySelector('.viewing');if(active&&active.scrollIntoView&&document.activeElement&&document.activeElement.closest('#gameFullMoveList'))active.scrollIntoView({block:'nearest'})}
 const mode=elem('gameModeBadge');if(mode)mode.textContent=(setup.mode==='computer'?'Gegen Computer':setup.mode==='free'?'Lokal zu zweit':setup.mode==='opening'?'Eröffnungstrainer':'Analysebrett')+' · '+(setup.mode==='computer'?(setup.side===W?'Weiß':'Schwarz')+' · ':'')+chosenTime().title;
}
function escapeHtml(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function playerAllowed(){return !gameResult&&!clock.finished&&(setup.mode!=='computer'||pos.turn===setup.side)&&(setup.mode!=='opening'||pos.turn===opening().side)}

function canQueuePremove(){return setup.mode==='computer'&&!gameResult&&!clock.finished&&pos.turn!==setup.side;}
function clearPremove(message=''){
 premovePlan=[];premove=null;picked=-1;persist();
 const node=elem('gamePremoveText');if(node)node.textContent=message||'Alle Vorauszüge gelöscht.';
 render();
}
function queuePremove(f,t){
 if(reviewPly!==null||!canQueuePremove())return false;
 if(premovePlan.length>=6){setNote('Maximal 6 Vorauszüge. Bitte auf den Computer warten.',true);return false;}
 const planned=projectedPremovePosition();
 const pc=planned.board[f];if(!pc||color(pc)!==setup.side){setNote('Wähle eine eigene Figur auf dem virtuellen Brett.',true);return false;}
 const possible=legal(planned).filter(m=>m.f===f&&m.t===t);
 if(!possible.length){setNote('Dieser vorausgeplante Zug ist in der virtuellen Stellung nicht legal.',true);return false;}
 const chosen=possible.find(m=>m.promo==='q')||possible[0];
 premovePlan.push({f,t,promo:chosen.promo||''});premove=premovePlan[0];picked=-1;persist();render();
 setNote('Zug '+premovePlan.length+' vorgemerkt: '+sq(f)+' → '+sq(t)+'. Abhängig von den Computerzügen.');return true;
}
function executePremove(){
 if(!premovePlan.length||gameResult||clock.finished)return;
 if(setup.mode!=='computer'||pos.turn!==setup.side)return;
 const pending=premovePlan.shift();premove=premovePlan[0]||null;picked=-1;
 const possible=legal(pos).filter(m=>m.f===pending.f&&m.t===pending.t);
 const matched=possible.find(m=>(m.promo||'')===pending.promo)||possible.find(m=>!m.promo)||possible.find(m=>m.promo==='q');
 if(matched){executingPremove=true;try{playMove(matched,true)}finally{executingPremove=false}const n=elem('gamePremoveText');if(n)n.textContent='Vorauszug '+sq(pending.f)+' → '+sq(pending.t)+' ausgeführt. '+premovePlan.length+' übrig.';}
 else{premovePlan=[];premove=null;persist();render();setNote('Vorauszug '+sq(pending.f)+' → '+sq(pending.t)+' war nach der Computerantwort nicht legal. Planung beendet.',true);}
}
function chooseUserMove(options,fromRect=null){
 if(!options.length)return;
 if(options.length===1){playMove(options[0],true,fromRect);return}
 const picker=elem('promotionPicker');if(!picker){playMove(options.find(m=>m.promo==='q')||options[0],true,fromRect);return}
 const side=pos.turn,icons={q:'Dame',r:'Turm',b:'Läufer',n:'Springer'};
 const currentToken=token;
 const actions=picker.querySelector('.promotionOptions');actions.innerHTML='';
 for(const promo of ['q','r','b','n']){
  const opt=options.find(m=>m.promo===promo);if(!opt)continue;
  const button=document.createElement('button');button.className='promotionChoice';button.type='button';
  const pic=document.createElement('img');pic.src='./theme_pieces/'+imgMap[side===W?promo.toUpperCase():promo];pic.alt=icons[promo];
  const caption=document.createElement('span');caption.textContent=icons[promo];button.append(pic,caption);
  button.onclick=()=>{picker.hidden=true;if(currentToken===token)playMove(opt,true,fromRect)};
  actions.appendChild(button);
 }
 picker.hidden=false;
}

function selectOrMove(i){
 if(reviewPly!==null)return;
 if(canQueuePremove()){
  const pc=projectedPremovePosition().board[i];
  if(picked<0){if(pc&&color(pc)===setup.side){picked=i;render()}return;}
  if(pc&&color(pc)===setup.side){picked=i;render();return;}
  const from=picked;queuePremove(from,i);return;
 }
 if(busy||outcome(pos)||!playerAllowed())return;const all=legal(pos);if(picked>=0){let options=all.filter(m=>m.f===picked&&m.t===i);if(options.length){chooseUserMove(options);return}}
 if(pos.board[i]&&color(pos.board[i])===pos.turn){picked=i;render();return;}picked=-1;render()}
function clockAfterMove(movingSide){
 if(!isTimed())return;
 // record wird erst NACH dieser Funktion um den aktuellen Zug ergänzt.
 // Zug 1 (Weiß): beide Uhren bleiben stehen. Zug 2 (Schwarz): erst danach
 // läuft Weiß. Kein Zeitabzug und kein Inkrement für diese zwei Züge.
 if(record.length<1){clock.active=null;clock.started=false;clock.lastAt=0;return;}
 if(record.length===1){clock.started=true;clock.active=W;clock.lastAt=Date.now();return;}
 if(!clock.started){clock.started=true;clock.active=movingSide;clock.lastAt=Date.now()}
 updateClock();if(gameResult)return;
 const t=chosenTime();if(t.type==='daily'){clock[movingSide]=t.ms;clock[enemy(movingSide)]=t.ms;}
 else clock[movingSide]+=t.inc*1000;
 clock.active=enemy(movingSide);clock.lastAt=Date.now();
}
function playMove(m,human,fromGhost=null){
 if(gameResult)return;
 clearFlights();
 if(reviewPly!==null)reviewPly=null;
 if(human&&!executingPremove&&premovePlan.length){premovePlan=[];premove=null;}
 if(isTraining()&&human){const selected=moveUci(m),possible=v57OpeningOptions().filter(x=>x.uci[record.length]===selected);
 if(!possible.length){setNote('Dieser Zug gehört nicht zu den aktuell verfügbaren Eröffnungsvarianten. Probiere einen anderen Entwicklungszug.',true);return;}
 if(v57prefs.variants&&possible[0].id&&possible[0].id!==openingId){openingId=possible[0].id;elem('openingPick').value=openingId;}
 }if(isTimed())updateClock();if(gameResult)return;
 const original=elem('gameBoard').querySelector('.gameSq[data-i="'+m.f+'"] .gamePiece');
 const fromRect=fromGhost||((original&&original.getBoundingClientRect())||null),before=pos,all=legal(before),san=notation(before,m,all),oldClock=saveClock();
 suggestedMove=null;analysisSequence++;pos=move(before,m);clockAfterMove(before.turn);if(gameResult){pos=before;return;}
 record.push({f:m.f,t:m.t,san,uci:sq(m.f)+sq(m.t)+(m.promo||''),before:toFen(before),after:toFen(pos),actor:human?'Mensch':'Computer',beforeClock:oldClock});
 v57HintLevel=0;if(elem('v57GameHintText'))elem('v57GameHintText').textContent='Tippe auf Hinweis für drei aufeinanderfolgende Hilfestufen.';if(v57prefs.vibrate&&navigator.vibrate)navigator.vibrate(15);
 picked=-1;token++;persist();render();v517AfterMove(m,human);if(fromRect)floatPiece({t:m.t,pc:before.board[m.f],sourceRect:fromRect});
 let end=outcome(pos);if(end){gameResult=end;if(isTimed())clock.active=null;persist();archiveGame();render()}
 const forced=legalDrawState();if(forced&&!gameResult){gameResult=forced;clock.active=null;persist();archiveGame();render()}
 if(isTraining()&&!gameResult){if(record.length>=opening().uci.length){completeOpening()}else {trainingMessage();if(pos.turn!==opening().side)openingAuto()}}
 postMoveCoach();
 if(typeof v515AfterMove==='function')v515AfterMove();
 elem('gameTopAnalysis').textContent='Zug gespielt: '+san+'. '+(bestVisible()?'Stockfish prüft den nächsten Zug.':'Die beste Fortsetzung bleibt verborgen.');
 elem('gameBestReadout').textContent='Nächste Stellung: Stockfish berechnet den Zugvorschlag.';
 setNote(end||((human?'Dein Zug':'Computerzug')+': '+san+'. '+(inCheck(pos,pos.turn)?'Schach!':(coachVisible()?'Der Coach erklärt den Zug automatisch.':'Coach ist ausgeschaltet.'))));
 if(!end&&!gameResult&&setup.mode==='computer'&&pos.turn!==setup.side)scheduleComputer();else if(!end&&!gameResult&&!human&&premovePlan.length&&setup.mode==='computer'&&pos.turn===setup.side){setTimeout(executePremove,80)}else if(!end&&!isTraining()){const version=token;setTimeout(()=>{if(version===token)analyze()},290)}
}
function v532EnginePlan(elo,remainingMs){
 const rating=Math.max(400,Math.min(2800,Number(elo)||1000));
 // Bei >=2000 immer echte Stockfish Engine, keine kosmetische Elo-Erhöhung.
 if(rating<2000)return null;
 const depth=rating>=2800?22:rating>=2600?21:rating>=2400?19:rating>=2200?17:15;
 let movetime=rating>=2800?10000:rating>=2600?6500:rating>=2400?3500:rating>=2200?2200:1200;
 // Die Engine darf bei kurzen Zeitkontrollen nicht blind 10 Sekunden verbrauchen.
 if(Number.isFinite(remainingMs)&&remainingMs>0)movetime=Math.min(movetime,Math.max(250,Math.floor(remainingMs/18)));
 return {engineElo:rating,depth,movetime,skill:20};
}
async function scheduleComputer(){
 if(busy||outcome(pos)||gameResult||isTraining())return;
 busy=true;const t=++token;render();await new Promise(resolve=>setTimeout(resolve,230));
 if(t!==token){busy=false;render();return}
 if(isTimed())updateClock();if(gameResult){busy=false;return}
 let chosen=null,engineUsed='offline';
 const plan=v532EnginePlan(setup.elo,isTimed()?clock[pos.turn]:Infinity);
 const useStockfish=!!plan||setup.engine==='stockfish';
 if(useStockfish&&typeof window.analyzeFen==='function'){
  try{
   setNote(plan?'Stockfish spielt mit Stärkeprofil '+plan.engineElo+' (keine offiziell gemessene Elo) …':'Stockfish wird abgefragt …');
   const level=Math.max(0,Math.min(20,Math.round((setup.elo-400)/80)));
   const options=plan||{skill:level};
   const depth=plan?plan.depth:Math.max(5,Math.min(15,7+Math.round(level/3)));
   const sf=await window.analyzeFen(toFen(pos),depth,1,options);
   if(t===token&&sf&&sf.bestmove){chosen=legal(pos).find(m=>moveUci(m)===sf.bestmove);if(chosen)engineUsed='stockfish'}
  }catch(e){if(t===token)setNote('Stockfish konnte den Zug nicht berechnen. '+(e?.message||'')+' Einfacher Notfallgegner übernimmt.',true)}
 }
 if(t!==token){busy=false;render();return}
 if(!chosen&&plan){busy=false;render();setNote('Stockfish konnte keinen starken Zug liefern. Die Stufe '+setup.elo+' wird nicht durch einen schwachen Notfallgegner ersetzt. Bitte später erneut versuchen oder niedrigere Stärke wählen.',true);return}
 if(!chosen){const level=Math.max(1,Math.min(9,Math.round((Math.min(setup.elo,2000)-400)/200)+1)),item=think(pos,level);chosen=item&&item.m}
 // Ab 2000 ELO niemals den schwächeren Stile-Umweg verwenden.
 if(chosen&&engineUsed==='offline'&&!plan&&v58prefs.style!=='ausgeglichen')chosen=v58StyledMove(pos,chosen);
 busy=false;if(t!==token||gameResult)return;
 if(chosen){playMove(chosen,false);if(engineUsed==='stockfish')setNote('Stockfish hat '+record.at(-1).san+' gespielt.')}else render();
}

function gameNew(){
 v551ApplyAdaptiveOpponent();reviewPly=null;premove=null;premovePlan=[];token++;busy=false;suggestedMove=null;analysisSequence++;clearFlights();pos=fromFen(startFen);record=[];picked=-1;gameResult=null;clock=newClock();openingCompleted=false;sessionId='s'+Date.now()+'-'+Math.floor(Math.random()*1e6);
 // V5.54: Uhrstart erst nach dem ersten weißen UND schwarzen Zug.
 v57HintLevel=0;v57VoiceLast='';v57StopSpeech();
 elem('gameAnalysis').textContent=isTraining()?'Trainiere eine Eröffnung ohne Uhr.':'Neue Partie. Die Uhr beginnt erst nach dem ersten weißen und schwarzen Zug.';
 elem('gameTopAnalysis').textContent=bestVisible()?'Stockfish berechnet den nächsten Zug.':'Stockfish bewertet die Stellung. Bester Zug ist ausgeschaltet.';
 elem('gameBestReadout').textContent='Tippe auf „Besten Zug prüfen“, um den nächsten Zug zu sehen.';refreshCoach();
 setNote('Neue Partie gestartet. Ziehe eine Figur oder tippe auf Start- und Zielfeld.');persist();render();if(setup.mode==='computer'&&setup.side===B)scheduleComputer();if(isTraining()){trainingMessage();if(pos.turn!==opening().side)openingAuto()}renderProfile();
}
function undo(){reviewPly=null;premove=null;premovePlan=[];v57StopSpeech();token++;busy=false;suggestedMove=null;analysisSequence++;clearFlights();let count=(setup.mode==='computer'&&record.length>=2)?2:1;
 for(let j=0;j<count&&record.length;j++){let z=record.pop();pos=fromFen(z.before);clock=z.beforeClock||newClock();}
 if(record.length<2)clock=newClock();else clock.lastAt=Date.now();gameResult=null;clock.finished=null;openingCompleted=false;picked=-1;setNote('Zug zurückgenommen.');elem('gameAnalysis').textContent='Analyse wird nach dem nächsten Zug aktualisiert.';persist();render();if(setup.mode==='computer'&&pos.turn!==setup.side)scheduleComputer();if(isTraining()){trainingMessage();if(pos.turn!==opening().side)openingAuto()}}
async function analyze(){
 const available=legal(pos),end=outcome(pos)||gameResult;
 const near=elem('gameTopAnalysis'),coach=elem('gameBestReadout'),panel=elem('gameAnalysis');
 if(end){near.textContent=end;coach.textContent=end;panel.textContent=end;return;}
 const ident=++analysisSequence,fen=toFen(pos);
 near.textContent='♟ Stockfish analysiert die Stellung …';
 panel.textContent='♟ Stockfish berechnet die Stellungsbewertung …';
 if(bestVisible())coach.textContent='♟ Stockfish berechnet den besten Zug …';
 await new Promise(resolve=>setTimeout(resolve,35));
 try{
  if(typeof window.analyzeFen!=='function')throw new Error('Stockfish-Modul fehlt');
  const answer=await window.analyzeFen(fen,12);
  if(ident!==analysisSequence||fen!==toFen(pos))return;
  if(!answer||!answer.bestmove)throw new Error('Kein Engine-Ergebnis');
  const bestMove=available.find(m=>moveUci(m)===answer.bestmove);
  if(!bestMove)throw new Error('Stockfish-Zug konnte nicht übernommen werden');
  const score=sfWhiteScore(fen,answer);
  sfPositionScore=score===null?null:{fen,whiteCp:score};
  const scoreText=score===null?'Keine gültige Bewertung':(answer.scoreType==='mate'?'Mattansage':fmtEval(score)+' aus Weiß-Sicht');
  if(bestVisible()){
   const san=deSan(notation(pos,bestMove,available)),who=pos.turn===W?'Weiß':'Schwarz';
   const msg='♟ Stockfish: '+who+' '+san+' ('+sq(bestMove.f)+' → '+sq(bestMove.t)+')';
   suggestedMove={f:bestMove.f,t:bestMove.t,fen};
   near.textContent=msg+' · Grüner Pfeil zeigt den Zug.';
   coach.textContent=msg+' · Suchtiefe '+answer.depth+'.';
   panel.textContent='Bewertung: '+scoreText+' · '+msg;
  }else{
   suggestedMove=null;
   near.textContent='♟ Stockfish: '+scoreText+' · Bester Zug verborgen.';
   coach.textContent='';
   panel.textContent='Stockfish 19 Lite · Stellungsbewertung '+scoreText+'. Zugvorschlag ist ausgeschaltet.';
  }
  render();
 }catch(e){
  if(ident!==analysisSequence||fen!==toFen(pos))return;
  suggestedMove=null;sfPositionScore=null;render();
  const msg=stockfishUnavailable(e);
  near.textContent=msg;panel.textContent=msg;
  if(bestVisible())coach.textContent=msg;
 }
}
function setBestVisibility(enabled){
 setup.showBestMove=enabled===true;
 analysisSequence++; // Veraltete parallele Analyseergebnisse ignorieren.
 suggestedMove=null;
 persist();
 syncBestToggle();refreshCoach();
 if(bestVisible()){
  elem('gameBestReadout').textContent='Stockfish berechnet den besten Zug …';
 }else{
  elem('gameBestReadout').textContent='';
 }
 render();
 // Beide Schalterstellungen aktualisieren die Analyse, aber nur EIN zeigt den Vorschlag.
 analyze();
}

function bindDrag(){
 const board=elem('gameBoard');
 board.addEventListener('pointerdown',e=>{
  if(reviewPly!==null)return;
 if(!canQueuePremove()&&(busy||!playerAllowed()))return;const cell=e.target.closest('.gameSq');if(!cell)return;
 const from=+cell.dataset.i,pc=(canQueuePremove()?projectedPremovePosition():pos).board[from];if(!pc||color(pc)!==(canQueuePremove()?setup.side:pos.turn))return;
 drag={id:e.pointerId,from,x:e.clientX,y:e.clientY,ghost:null,img:cell.querySelector('.gamePiece')};try{board.setPointerCapture(e.pointerId)}catch(_){}
 });
 board.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8)return;
 if(!drag.ghost){drag.ghost=drag.img.cloneNode(true);drag.ghost.className='gameDragGhost';document.body.appendChild(drag.ghost);drag.img.style.opacity='.18';picked=drag.from}
 e.preventDefault();const size=board.getBoundingClientRect().width/8;drag.ghost.style.width=size*.98+'px';drag.ghost.style.height=size*.98+'px';drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';
 });
 board.addEventListener('pointerup',e=>{
 if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;
 if(d.ghost){
 const ghostRect=d.ghost.getBoundingClientRect(),srcCell=board.querySelector('.gameSq[data-i="'+d.from+'"]');
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.gameSq');const at=target&&board.contains(target)?+target.dataset.i:-1;
 const prewindow=canQueuePremove();const options=prewindow?[]:legal(pos).filter(m=>m.f===d.from&&m.t===at);
 d.ghost.remove();d.img.style.opacity='';clickSuppress=Date.now()+350;
 if(prewindow&&at>=0)queuePremove(d.from,at);else if(options.length)chooseUserMove(options,ghostRect);
 else{
 picked=-1;render();const pc=pos.board[d.from];if(pc&&srcCell){const rect=board.querySelector('.gameSq[data-i="'+d.from+'"]')?.getBoundingClientRect();if(rect)floatPiece({t:d.from,pc,sourceRect:ghostRect})}
 }
 }else{clickSuppress=Date.now()+20;selectOrMove(d.from)}
 });
 board.addEventListener('pointercancel',()=>{if(drag){if(drag.ghost)drag.ghost.remove();drag=null;picked=-1;render()}});
}
function timeOptions(title,icon,options){return `<div class="timeGroup"><h4>${icon} ${title}</h4><div class="timeTiles">${options.map(id=>`<button type="button" class="timePreset" data-time="${id}">${TIME_CONTROLS[id].title}</button>`).join('')}</div></div>`}
// Zusatzmodule V4: Turnier, Partiebesprechung, Eröffnungen, Statistik.
const OPENINGS={"italian":{"name":"Italienische Partie","side":"w","eco":"C50","group":"Offene Spiele","level":"Einsteiger","plan":"Läufer auf c4, Zentrum mit c3 und d4 vorbereiten.","uci":["e2e4","e7e5","g1f3","b8c6","f1c4","f8c5","c2c3","g8f6","d2d4"],"tips":["Du besetzt das Zentrum mit dem Königsbauern.","","Springer f3 entwickelt sich mit Angriff auf e5.","","Läufer c4 richtet Druck gegen f7.","","c3 bereitet den Bauernvorstoß d4 vor.","","d4 öffnet das Zentrum im passenden Moment."]},"queen":{"name":"Damengambit – abgelehnt","side":"w","eco":"D37","group":"Damengambit","level":"Einsteiger","plan":"c4 greift d5 an; entwickle dich und baue Druck auf das Zentrum auf.","uci":["d2d4","d7d5","c2c4","e7e6","b1c3","g8f6","c1g5","f8e7","e2e3"],"tips":["d4 nimmt Raum im Zentrum.","","c4 greift den d5-Bauern an und lockt Schwarz.","","Springer c3 erhöht den Druck auf d5.","","Läufer g5 fesselt den Springer am König.","","e3 stabilisiert die Bauernstruktur."]},"caro":{"name":"Caro-Kann – klassische Variante","side":"b","eco":"B18","group":"Halboffene Spiele","level":"Einsteiger","plan":"Mit c6 und d5 stabil im Zentrum spielen und den Läufer früh entwickeln.","uci":["e2e4","c7c6","d2d4","d7d5","b1c3","d5e4","c3e4","c8f5","e4g3"],"tips":["","c6 bereitet einen sicheren Vorstoß nach d5 vor.","","d5 stellt den weißen Zentrumsbauern infrage.","","Schlage auf e4, um den Druck aufzulösen.","","Läufer f5 kommt vor ...e6 außerhalb der Bauernkette heraus.",""]},"ruy":{"name":"Spanische Partie (Ruy López)","side":"w","eco":"C60","group":"Offene Spiele","level":"Einsteiger","plan":"Läufer b5 setzt den Springer c6 unter Druck, der e5 verteidigt.","uci":["e2e4","e7e5","g1f3","b8c6","f1b5","a7a6","b5a4","g8f6","e1g1","f8e7","f1e1","b7b5","a4b3"],"tips":["e4 kontrolliert die Mitte.","","Springer f3 greift e5 an.","","Läufer b5 erhöht indirekt den Druck auf e5.","","Der Läufer weicht zurück und erhält die Fesselungsdrohung.","","Rochiere rechtzeitig.","","Turm e1 unterstützt einen späteren Zentralvorstoß.","","Bleibe mit dem Läufer auf der langen Diagonale."]},"scotch":{"name":"Schottische Partie","side":"w","eco":"C45","group":"Offene Spiele","level":"Einsteiger","plan":"Das Zentrum bereits im dritten Zug mit d4 öffnen.","uci":["e2e4","e7e5","g1f3","b8c6","d2d4","e5d4","f3d4","f8c5","d4b3","c5b6","b1c3","g8f6"],"tips":["e4 schafft Zentrumsraum.","","Entwickle deinen Springer.","","d4 greift den Bauern auf e5 an.","","Hole den Bauern mit dem Springer zurück.","","Weiche der Läuferattacke mit Tempo aus.","","Entwickle den zweiten Springer.",""]},"vienna":{"name":"Wiener Partie","side":"w","eco":"C25","group":"Offene Spiele","level":"Fortgeschritten","plan":"Springer c3 und Bauernhebel f4 erzeugen Königsflügelspiel.","uci":["e2e4","e7e5","b1c3","g8f6","f2f4","d7d5","f4e5","f6e4","d1f3"],"tips":["e4 greift die Zentrumsfelder an.","","Springer c3 bereitet f4 vor.","","f4 sucht aktives Spiel gegen e5.","","Schlage e5 und beachte den Springerzug des Gegners.","","Dame f3 setzt den Springer e4 unter Druck."]},"fourknights":{"name":"Vierspringerspiel","side":"w","eco":"C47","group":"Offene Spiele","level":"Einsteiger","plan":"Alle Springer entwickeln, König sichern und das Zentrum kontrollieren.","uci":["e2e4","e7e5","g1f3","b8c6","b1c3","g8f6","f1b5","f8b4","e1g1","e8g8"],"tips":["e4 besetzt das Zentrum.","","Springer f3 entwickelt sich mit Tempo.","","Entwickle Springer c3.","","Läufer b5 greift den Springer c6 an.","","Rochiere und bring den König in Sicherheit.",""]},"kinggambit":{"name":"Königsgambit","side":"w","eco":"C30","group":"Offene Spiele","level":"Fortgeschritten","plan":"Mit f4 einen Bauern anbieten, um Linien und Initiative zu gewinnen.","uci":["e2e4","e7e5","f2f4","e5f4","g1f3","g7g5","f1c4","f8g7","e1g1"],"tips":["Besetze das Zentrum mit e4.","","f4 bietet einen Bauern für Angriffschancen an.","","Springer f3 entwickelt sich und stoppt ...Dh4+.","","Läufer c4 zielt auf f7.","","Rochiere, bevor sich das Zentrum öffnet."]},"evans":{"name":"Evans-Gambit","side":"w","eco":"C51","group":"Offene Spiele","level":"Fortgeschritten","plan":"Bauernopfer b4 für Entwicklungstempo und starkes Zentrum.","uci":["e2e4","e7e5","g1f3","b8c6","f1c4","f8c5","b2b4","c5b4","c2c3","b4a5","d2d4","e5d4"],"tips":["e4 gibt Raum.","","Springer f3 attackiert e5.","","Läufer c4 blickt auf f7.","","b4 gewinnt Läufertempo gegen einen Bauern.","","c3 treibt den Läufer zurück und unterstützt d4.","","d4 greift das Zentrum mit Entwicklungsvorsprung an.",""]},"danish":{"name":"Dänisches Gambit","side":"w","eco":"C21","group":"Offene Spiele","level":"Experte","plan":"Mit frühen Bauernopfern offene Linien für die Läufer bekommen.","uci":["e2e4","e7e5","d2d4","e5d4","c2c3","d4c3","f1c4","c3b2","c1b2"],"tips":["e4 nimmt Raum.","","d4 fordert das schwarze Zentrum heraus.","","c3 bietet einen Bauern für freie Linien an.","","Läufer c4 entwickelt sich mit Druck auf f7.","","Läufer b2 bekommt die lange Diagonale."]},"london":{"name":"Londoner System","side":"w","eco":"D02","group":"Damenspiele","level":"Einsteiger","plan":"Flexibles System mit Lf4, e3, c3 und solidem Bauernzentrum.","uci":["d2d4","d7d5","g1f3","g8f6","c1f4","e7e6","e2e3","c7c5","c2c3","b8c6","b1d2"],"tips":["d4 kontrolliert e5 und c5.","","Springer f3 schützt d4.","","Läufer f4 verlässt die Bauernkette früh.","","e3 stabilisiert d4.","","c3 macht das Zentrum robust.","","Springer d2 unterstützt e4."]},"colle":{"name":"Colle-System","side":"w","eco":"D05","group":"Damenspiele","level":"Einsteiger","plan":"Ruhiger Aufbau mit e3, Ld3 und später e4.","uci":["d2d4","d7d5","g1f3","g8f6","e2e3","e7e6","f1d3","c7c5","e1g1","b8c6","b1d2"],"tips":["d4 nimmt Zentralraum.","","Springer f3 stärkt d4.","","e3 bereitet Entwicklung vor.","","Läufer d3 schaut Richtung h7.","","Rochiere früh.","","Springer d2 unterstützt den Durchbruch e4."]},"catalan":{"name":"Katalanische Eröffnung","side":"w","eco":"E01","group":"Damenspiele","level":"Fortgeschritten","plan":"Fianchetto-Läufer g2 kontrolliert die lange Diagonale.","uci":["d2d4","g8f6","c2c4","e7e6","g2g3","d7d5","f1g2","f8e7","g1f3","e8g8","e1g1"],"tips":["d4 greift das Zentrum an.","","Mit c4 forderst du d5 heraus.","","g3 bereitet das Fianchetto vor.","","Läufer g2 kontrolliert die lange Diagonale.","","Springer f3 unterstützt das Zentrum.","","Rochiere und bring den Turm ins Spiel."]},"trompowsky":{"name":"Trompowsky-Angriff","side":"w","eco":"A45","group":"Damenspiele","level":"Fortgeschritten","plan":"Läufer g5 attackiert den Springer f6 früh.","uci":["d2d4","g8f6","c1g5","f6e4","g5f4","d7d5","e2e3","c7c5","g1f3","b8c6"],"tips":["d4 ist dein Zentrumsanker.","","Läufer g5 stört die schwarze Entwicklung.","","Läufer f4 bleibt aktiv, wenn der Springer zieht.","","e3 schützt die Bauernkette.","","Springer f3 entwickelt sich flexibel.",""]},"qga":{"name":"Damengambit – angenommen","side":"w","eco":"D20","group":"Damengambit","level":"Einsteiger","plan":"Den angebotenen c4-Bauern durch schnelle Entwicklung zurückgewinnen.","uci":["d2d4","d7d5","c2c4","d5c4","g1f3","g8f6","e2e3","e7e6","f1c4","c7c5"],"tips":["d4 beansprucht das Zentrum.","","c4 fordert d5 heraus.","","Springer f3 mit Tempo entwickeln.","","e3 öffnet den Weg für Läufer f1.","","Läufer c4 gewinnt den Bauern zurück.",""]},"english":{"name":"Englische Eröffnung","side":"w","eco":"A20","group":"Flankeneröffnungen","level":"Einsteiger","plan":"Mit c4 Kontrolle über d5, flexible Bauernstruktur.","uci":["c2c4","e7e5","b1c3","g8f6","g2g3","d7d5","c4d5","f6d5","f1g2","d5b6"],"tips":["c4 kontrolliert d5 von der Flanke.","","Springer c3 sichert d5 und e4.","","g3 kündigt Läufer g2 an.","","Nimm auf d5 und kläre das Zentrum.","","Fianchetto-Läufer g2 wird aktiv.",""]},"reti":{"name":"Réti-Eröffnung","side":"w","eco":"A09","group":"Flankeneröffnungen","level":"Einsteiger","plan":"Nf3 und c4 greifen das Zentrum von der Seite an.","uci":["g1f3","d7d5","c2c4","e7e6","g2g3","g8f6","f1g2","f8e7","e1g1","e8g8"],"tips":["Springer f3 kontrolliert e5 und d4.","","c4 attackiert den d5-Bauern.","","g3 bereitet das Läuferfianchetto vor.","","Läufer g2 erzeugt Diagonaldruck.","","Rochiere vor zentralen Aktionen.",""]},"bird":{"name":"Bird-Eröffnung","side":"w","eco":"A02","group":"Flankeneröffnungen","level":"Fortgeschritten","plan":"Mit f4 das Feld e5 sichern und Königsflügelraum gewinnen.","uci":["f2f4","d7d5","g1f3","g8f6","e2e3","e7e6","b2b3","f8e7","c1b2","e8g8"],"tips":["f4 kontrolliert e5, schwächt aber den König etwas.","","Springer f3 verhindert schnelle schwarze Vorstöße.","","e3 entwickelt den Läufer.","","b3 bereitet Läufer b2 vor.","","Läufer b2 richtet sich auf die lange Diagonale.",""]},"kia":{"name":"Königsindischer Angriff","side":"w","eco":"A07","group":"Flankeneröffnungen","level":"Einsteiger","plan":"Kompakter Aufbau mit Nf3, g3, Lg2, 0-0 und d3.","uci":["g1f3","d7d5","g2g3","g8f6","f1g2","e7e6","e1g1","f8e7","d2d3","e8g8","b1d2"],"tips":["Springer f3 entwickelt sich unabhängig vom Gegner.","","g3 bereitet das Fianchetto vor.","","Läufer g2 kontrolliert zentrale dunkle Felder.","","Rochiere früh.","","d3 hält die Bauernstruktur flexibel.","","Springer d2 unterstützt e4."]},"nimzolarsen":{"name":"Nimzowitsch-Larsen-Angriff","side":"w","eco":"A01","group":"Flankeneröffnungen","level":"Fortgeschritten","plan":"Mit b3 und Läufer b2 Druck auf e5 ausüben.","uci":["b2b3","e7e5","c1b2","b8c6","e2e3","g8f6","f1b5","f8d6","g1f3","d8e7"],"tips":["b3 erlaubt sofortiges Läuferfianchetto.","","Läufer b2 greift e5 aus der Distanz an.","","e3 stabilisiert d4.","","Läufer b5 fesselt den Springer c6.","","Springer f3 entwickelt sich aktiv.",""]},"alapin":{"name":"Alapin gegen Sizilianisch","side":"w","eco":"B22","group":"Anti-Sizilianisch","level":"Einsteiger","plan":"c3 bereitet das starke Zentrum mit d4 vor.","uci":["e2e4","c7c5","c2c3","g8f6","e4e5","f6d5","d2d4","c5d4","c3d4","b8c6","g1f3"],"tips":["e4 eröffnet das Zentrum.","","c3 bereitet d4 vor.","","e5 gewinnt Raum gegen Springer f6.","","d4 besetzt das Zentrum.","","Mit cxd4 hältst du den Bauern im Zentrum.","","Springer f3 entwickelt sich."]},"grandprix":{"name":"Grand-Prix-Angriff gegen Sizilianisch","side":"w","eco":"B23","group":"Anti-Sizilianisch","level":"Fortgeschritten","plan":"f4 und schnelle Entwicklung für einen Königsflügelangriff.","uci":["e2e4","c7c5","b1c3","b8c6","f2f4","g7g6","g1f3","f8g7","f1c4","e7e6","d2d3"],"tips":["e4 greift das Zentrum an.","","Springer c3 sichert e4.","","f4 bereitet einen Angriff vor.","","Springer f3 kontrolliert wichtige Zentralfelder.","","Läufer c4 zielt auf f7.","","d3 stabilisiert e4."]},"caroexchange":{"name":"Abtauschvariante gegen Caro-Kann","side":"w","eco":"B13","group":"Anti-Caro-Kann","level":"Einsteiger","plan":"Symmetrische Bauernstruktur, aktiv entwickeln und c3 als Stütze.","uci":["e2e4","c7c6","d2d4","d7d5","e4d5","c6d5","f1d3","b8c6","c2c3","g8f6"],"tips":["e4 nimmt Raum.","","d4 schafft ein starkes Bauernzentrum.","","Tausche auf d5 und öffne die e-Linie.","","Läufer d3 schaut auf h7.","","c3 hält dein Zentrum fest.",""]},"panov":{"name":"Panow-Angriff gegen Caro-Kann","side":"w","eco":"B14","group":"Anti-Caro-Kann","level":"Fortgeschritten","plan":"Mit c4 aktives Figurenspiel und Angriff auf das Zentrum.","uci":["e2e4","c7c6","d2d4","d7d5","e4d5","c6d5","c2c4","g8f6","b1c3","e7e6"],"tips":["e4 kontrolliert das Zentrum.","","d4 verstärkt es.","","Tausche im Zentrum.","","c4 setzt d5 unter Druck.","","Springer c3 erhöht den Druck auf d5.",""]},"frenchadvance":{"name":"Vorstoßvariante gegen Französisch","side":"w","eco":"C02","group":"Anti-Französisch","level":"Einsteiger","plan":"e5 gewinnt Raum; c3 sichert d4, Schwarz greift die Kette an.","uci":["e2e4","e7e6","d2d4","d7d5","e4e5","c7c5","c2c3","b8c6","g1f3","d8b6"],"tips":["e4 kontrolliert d5.","","d4 stärkt die Mitte.","","e5 gewinnt Raum und vertreibt Springer f6.","","c3 sichert den d4-Bauern.","","Springer f3 unterstützt d4.",""]},"sicilian_najdorf":{"name":"Sizilianisch – Najdorf","side":"b","eco":"B90","group":"Sizilianische Verteidigung","level":"Experte","plan":"Flexibler Aufbau mit ...d6, ...Nf6 und ...a6.","uci":["e2e4","c7c5","g1f3","d7d6","d2d4","c5d4","f3d4","g8f6","b1c3","a7a6","c1e3","e7e5"],"tips":["","c5 bricht die Symmetrie und kämpft gegen d4.","","d6 stabilisiert e5.","","Tausche auf d4 und öffne die c-Linie.","","Springer f6 attackiert e4.","","a6 verhindert Springer b5 und bereitet ...b5 vor.","","e5 vertreibt den weißen Springer d4."]},"sicilian_dragon":{"name":"Sizilianisch – Drachenvariante","side":"b","eco":"B70","group":"Sizilianische Verteidigung","level":"Fortgeschritten","plan":"Fianchetto-Läufer g7 übt Druck auf die lange Diagonale aus.","uci":["e2e4","c7c5","g1f3","d7d6","d2d4","c5d4","f3d4","g8f6","b1c3","g7g6","c1e3","f8g7"],"tips":["","c5 eröffnet Gegenspiel am Damenflügel.","","d6 sichert das Zentrum.","","Nimm d4 und öffne die c-Linie.","","Springer f6 attackiert e4.","","g6 bereitet den Läufer auf g7 vor.","","Läufer g7 blickt auf die lange Diagonale."]},"sicilian_acc":{"name":"Sizilianisch – beschleunigter Drache","side":"b","eco":"B34","group":"Sizilianische Verteidigung","level":"Fortgeschritten","plan":"Ohne frühes ...d6 wird ...d5 in einem Zug möglich.","uci":["e2e4","c7c5","g1f3","b8c6","d2d4","c5d4","f3d4","g7g6","b1c3","f8g7"],"tips":["","c5 kämpft gegen d4.","","Springer c6 entwickelt sich ohne ...d6.","","Schlage im Zentrum auf d4.","","g6 bereitet das Fianchetto vor.","","Läufer g7 setzt das Zentrum unter Druck."]},"french":{"name":"Französische Verteidigung – klassisch","side":"b","eco":"C11","group":"Französische Verteidigung","level":"Einsteiger","plan":"e6 und d5 bilden eine starke Bauernkette; ...c5 greift die Basis an.","uci":["e2e4","e7e6","d2d4","d7d5","b1c3","g8f6","c1g5","f8e7","e4e5","f6d7"],"tips":["","e6 bereitet ...d5 solide vor.","","d5 greift das weiße Zentrum an.","","Springer f6 entwickelt sich und setzt e4 unter Druck.","","Läufer e7 löst die Fesselung.","","Der Springer zieht nach d7 zurück, um f6 neu zu besetzen."]},"winawer":{"name":"Französisch – Winawer","side":"b","eco":"C15","group":"Französische Verteidigung","level":"Experte","plan":"Mit ...Lb4 den Springer c3 fesseln und die weiße Bauernstruktur angreifen.","uci":["e2e4","e7e6","d2d4","d7d5","b1c3","f8b4","e4e5","c7c5","a2a3","b4c3","b2c3"],"tips":["","e6 bereitet das Gegenspiel im Zentrum vor.","","d5 greift e4 an.","","Läufer b4 fesselt Springer c3.","","c5 greift die Basis d4 an.","","Tausche auf c3 und erzeuge Doppelbauern.",""]},"scandinavian":{"name":"Skandinavische Verteidigung","side":"b","eco":"B01","group":"Halboffene Spiele","level":"Einsteiger","plan":"...d5 greift e4 sofort an; die Dame muss sicher zurückweichen.","uci":["e2e4","d7d5","e4d5","d8d5","b1c3","d5a5","d2d4","g8f6","g1f3","c7c6"],"tips":["","d5 fordert den weißen Zentrumsbauern sofort heraus.","","Dame d5 gewinnt den Bauern zurück.","","Dame a5 bleibt aktiv und entgeht dem Springerangriff.","","Springer f6 entwickelt sich mit Tempo.","","c6 kontrolliert b5 und d5."]},"pirc":{"name":"Pirc-Verteidigung","side":"b","eco":"B07","group":"Halboffene Spiele","level":"Fortgeschritten","plan":"Weiß erhält Raum, Schwarz greift das Zentrum mit Figuren an.","uci":["e2e4","d7d6","d2d4","g8f6","b1c3","g7g6","g1f3","f8g7","f1e2","e8g8"],"tips":["","d6 kontrolliert e5 und bereitet ...Nf6 vor.","","Springer f6 greift e4 an.","","g6 bereitet Fianchetto vor.","","Läufer g7 erhöht Druck auf d4.","","Rochiere und beginne mit ...e5 oder ...c5 Gegenspiel."]},"modern":{"name":"Moderne Verteidigung","side":"b","eco":"B06","group":"Halboffene Spiele","level":"Fortgeschritten","plan":"Schnelles ...g6 und ...Lg7 vor dem Angriff auf das Zentrum.","uci":["e2e4","g7g6","d2d4","f8g7","b1c3","d7d6","g1f3","g8f6","f1e2","e8g8"],"tips":["","g6 macht den Weg für Läufer g7 frei.","","Läufer g7 greift die Mitte von der Flanke an.","","d6 unterstützt ...e5.","","Springer f6 entwickelt sich und attackiert e4.","","Rochiere sicher."]},"alekhine":{"name":"Aljechin-Verteidigung","side":"b","eco":"B02","group":"Halboffene Spiele","level":"Fortgeschritten","plan":"Weiße Bauern vorlocken und danach angreifen.","uci":["e2e4","g8f6","e4e5","f6d5","d2d4","d7d6","g1f3","c8g4","f1e2","e7e6"],"tips":["","Springer f6 provoziert e5.","","Ziehe nach d5 und fordere weitere Bauernzüge heraus.","","d6 greift e5 an.","","Läufer g4 fesselt den Springer f3.","","e6 baut stabile Bauernketten."]},"petrov":{"name":"Russische Verteidigung (Petrow)","side":"b","eco":"C42","group":"Offene Spiele","level":"Einsteiger","plan":"...Nf6 greift e4 an, ohne früh den e-Bauern zu decken.","uci":["e2e4","e7e5","g1f3","g8f6","f3e5","d7d6","e5f3","f6e4","d2d4","d6d5"],"tips":["","e5 besetzt das Zentrum.","","Springer f6 attackiert den Bauern e4.","","d6 jagt den weißen Springer zurück.","","Springer e4 holt den Bauern zurück.","","d5 baut eigene Zentralpräsenz auf."]},"philidor":{"name":"Philidor-Verteidigung","side":"b","eco":"C41","group":"Offene Spiele","level":"Einsteiger","plan":"e5 mit d6 absichern und danach Figuren entwickeln.","uci":["e2e4","e7e5","g1f3","d7d6","d2d4","g8f6","b1c3","b8d7","f1c4","f8e7"],"tips":["","e5 nimmt Zentralraum.","","d6 unterstützt e5.","","Springer f6 entwickelt sich und greift e4 an.","","Springer d7 stützt e5 und c5.","","Läufer e7 bereitet die Rochade vor."]},"berlin":{"name":"Berliner Verteidigung gegen Spanisch","side":"b","eco":"C65","group":"Offene Spiele","level":"Experte","plan":"Mit ...Nf6 und später ...Nxe4 das weiße Zentrum sofort infrage stellen.","uci":["e2e4","e7e5","g1f3","b8c6","f1b5","g8f6","e1g1","f6e4","d2d4","e4d6","b5c6","d7c6"],"tips":["","e5 kämpft um das Zentrum.","","Springer c6 deckt e5.","","Springer f6 greift e4 an.","","Springer e4 holt den ungeschützten Bauern.","","Springer d6 weicht zurück und deckt c4.","","dxc6 nimmt den Läufer zurück und hält das Läuferpaar."]},"kings_indian":{"name":"Königsindische Verteidigung","side":"b","eco":"E60","group":"Indische Verteidigungen","level":"Einsteiger","plan":"Läufer g7 und ...d6; später mit ...e5 oder ...c5 das Zentrum angreifen.","uci":["d2d4","g8f6","c2c4","g7g6","b1c3","f8g7","e2e4","d7d6","g1f3","e8g8","f1e2","e7e5"],"tips":["","Springer f6 hindert e4.","","g6 bereitet Läufer g7 vor.","","Läufer g7 kontrolliert d4 und e5.","","d6 stabilisiert die Stellung.","","Rochiere und verbinde die Türme.","","e5 attackiert das weiße Bauernzentrum."]},"nimzo_indian":{"name":"Nimzo-Indische Verteidigung","side":"b","eco":"E20","group":"Indische Verteidigungen","level":"Fortgeschritten","plan":"Läufer b4 fesselt den Springer c3 und greift die Bauernstruktur an.","uci":["d2d4","g8f6","c2c4","e7e6","b1c3","f8b4","e2e3","e8g8","f1d3","d7d5","g1f3","c7c5"],"tips":["","Springer f6 verhindert e4.","","e6 bereitet ...d5 vor.","","Läufer b4 fesselt den Springer c3.","","Rochiere rechtzeitig.","","d5 fordert das Zentrum heraus.","","c5 übt Druck auf d4 aus."]},"queens_indian":{"name":"Damenindische Verteidigung","side":"b","eco":"E12","group":"Indische Verteidigungen","level":"Fortgeschritten","plan":"...b6 und ...Lb7 üben von weitem Druck auf das Zentrum aus.","uci":["d2d4","g8f6","c2c4","e7e6","g1f3","b7b6","g2g3","c8b7","f1g2","f8e7","e1g1","e8g8"],"tips":["","Springer f6 greift e4 an.","","e6 schützt die dunklen Felder.","","b6 bereitet Läufer b7 vor.","","Läufer b7 kontrolliert e4.","","Läufer e7 öffnet die Rochade.","","Rochiere und entwickle den Turm."]},"slav":{"name":"Slawische Verteidigung","side":"b","eco":"D10","group":"Damengambit","level":"Einsteiger","plan":"...c6 deckt d5 ohne den Läufer c8 einzusperren.","uci":["d2d4","d7d5","c2c4","c7c6","g1f3","g8f6","b1c3","d5c4","a2a4","c8f5"],"tips":["","d5 greift das Zentrum an.","","c6 stabilisiert den Bauern d5.","","Springer f6 entwickelt sich.","","Mit ...dxc4 erhältst du vorübergehend einen Mehrbauern.","","Läufer f5 kommt vor ...e6 aktiv heraus."]},"semislav":{"name":"Halbslawische Verteidigung","side":"b","eco":"D43","group":"Damengambit","level":"Fortgeschritten","plan":"Solides Dreieck c6–d5–e6, gefolgt von Gegenangriffen.","uci":["d2d4","d7d5","c2c4","c7c6","g1f3","g8f6","b1c3","e7e6","e2e3","b8d7","f1d3","d5c4"],"tips":["","d5 besetzt das Zentrum.","","c6 stützt d5.","","Springer f6 entwickelt sich.","","e6 ergänzt die Bauernkette.","","Springer d7 stützt ...e5 oder ...c5.","","Nimm auf c4 im richtigen Moment."]},"dutch":{"name":"Holländische Verteidigung","side":"b","eco":"A80","group":"Damenspiele","level":"Fortgeschritten","plan":"...f5 kontrolliert e4; achte auf die Schwächung der Königsdiagonale.","uci":["d2d4","f7f5","c2c4","g8f6","b1c3","e7e6","g2g3","f8b4","f1g2","e8g8"],"tips":["","f5 setzt einen Schwerpunkt auf e4.","","Springer f6 deckt e4.","","e6 stützt f5.","","Läufer b4 greift Springer c3 an.","","Rochiere früh und vermeide Königsschwächen."]},"grunfeld":{"name":"Grünfeld-Indische Verteidigung","side":"b","eco":"D85","group":"Indische Verteidigungen","level":"Experte","plan":"Erlaube das weiße Zentrum, um es mit ...d5 und Figuren anzugreifen.","uci":["d2d4","g8f6","c2c4","g7g6","b1c3","d7d5","c4d5","f6d5","e2e4","d5c3","b2c3","f8g7"],"tips":["","Springer f6 attackiert e4.","","g6 bereitet das Fianchetto vor.","","d5 stellt das Bauernzentrum infrage.","","Springer schlägt auf d5.","","Nxc3 beschädigt die Bauernstruktur.","","Läufer g7 greift die weißen Bauern an."]},"benoni":{"name":"Moderne Benoni-Verteidigung","side":"b","eco":"A60","group":"Indische Verteidigungen","level":"Experte","plan":"Asymmetrische Bauernstruktur: Gegenspiel auf der halboffenen e-Linie.","uci":["d2d4","g8f6","c2c4","c7c5","d4d5","e7e6","b1c3","e6d5","c4d5","d7d6","e2e4","g7g6"],"tips":["","Springer f6 verhindert e4.","","c5 greift d4 an.","","e6 attackiert die weiße Bauernkette.","","Tausche auf d5 und öffne Linien.","","d6 stützt das Zentrum.","","g6 bereitet einen aktiven Läufer g7 vor."]},"budapest":{"name":"Budapester Gambit","side":"b","eco":"A51","group":"Gambits für Schwarz","level":"Fortgeschritten","plan":"Bauernopfer ...e5 für schnelles Figurenspiel und Tempo.","uci":["d2d4","g8f6","c2c4","e7e5","d4e5","f6g4","g1f3","b8c6","c1f4","f8b4"],"tips":["","Springer f6 entwickelt sich.","","e5 bietet einen Bauern für Aktivität.","","Springer g4 greift den Bauern e5 an.","","Springer c6 entwickelt sich mit Angriff auf e5.","","Läufer b4 fesselt Springer c3, falls er erscheint."]},"benko":{"name":"Wolgagambit (Benko-Gambit)","side":"b","eco":"A57","group":"Gambits für Schwarz","level":"Experte","plan":"Bauernopfer b5 für langanhaltenden Druck auf den a- und b-Linien.","uci":["d2d4","g8f6","c2c4","c7c5","d4d5","b7b5","c4b5","a7a6","b5a6","c8a6"],"tips":["","Springer f6 kontrolliert das Zentrum.","","c5 setzt d4 unter Druck.","","b5 bietet den Bauern für offene Linien an.","","a6 bietet einen weiteren Bauern für Gegenangriff.","","Läufer a6 entwickelt sich und öffnet die a-Linie."]}};
let openingId='italian', openingCompleted=false;
let summaryStore={games:[],openings:{},studyChecks:0};
try{summaryStore={...summaryStore,...(JSON.parse(localStorage.getItem('schach1001_profile_v4'))||{})}}catch(_){}
function persistProfile(){try{localStorage.setItem('schach1001_profile_v4',JSON.stringify(summaryStore))}catch(_){}}
function isTraining(){return setup.mode==='opening'}

// V5.33: Zweistufige Eröffnungshilfe direkt auf dem echten Trainingsbrett.
const V533_OPENING_PREF='schach1001_v533_opening_hints';
let v533OpeningHintsOn=true;
try{v533OpeningHintsOn=localStorage.getItem(V533_OPENING_PREF)!=='off'}catch(_){}
let v533OpeningHintLevel=0, v533OpeningHintSignature='';
function v533OpeningHintMove(){
 if(!isTraining()||openingCompleted||pos.turn!==opening().side)return null;
 const next=nextOpeningMove();if(!next)return null;
 const chosen=legal(pos).find(m=>moveUci(m)===next);
 return chosen||null;
}
function v533OpeningHintReset(){
 const sig=openingId+'|'+record.length+'|'+toFen(pos);
 if(sig!==v533OpeningHintSignature){v533OpeningHintSignature=sig;v533OpeningHintLevel=0;}
}
function v533OpeningHintPaint(){
 const board=elem('gameBoard'),dock=elem('v533OpeningAssist');
 if(!board||!dock)return;
 const host=document.querySelector('#gameContent');const active=!elem('v538Board')&&isTraining()&&host?.dataset.v526Page==='training'&&host?.dataset.v516Tool==='opening';
 dock.hidden=!active;
 const btn=elem('v533OpeningHintNext'),switcher=elem('v533OpeningHintsToggle'),info=elem('v533OpeningHintText');
 if(switcher)switcher.checked=v533OpeningHintsOn;
 const old=board.querySelector('.v533OpeningArrow');if(old)old.remove();
 board.querySelectorAll('.v533HintOrigin,.v533HintTarget').forEach(c=>c.classList.remove('v533HintOrigin','v533HintTarget'));
 if(!active)return;
 v533OpeningHintReset();const move=v533OpeningHintMove();
 if(btn){btn.disabled=!v533OpeningHintsOn||!move;btn.textContent=v533OpeningHintLevel===0?'💡 Tipp 1 · Figur':v533OpeningHintLevel===1?'➜ Tipp 2 · Zug':'✓ Beide Tipps gezeigt';}
 if(info){
  info.textContent=!v533OpeningHintsOn?'Eröffnungstipps ausgeschaltet.':openingCompleted?'Eröffnung abgeschlossen. Gute Arbeit!':!move?'Gegnerischer Demonstrationszug oder keine offene Übung.':'Versuche den besten Eröffnungszug selbst. Tipp 1 zeigt nur die Figur.';
 }
 if(!v533OpeningHintsOn||!move||v533OpeningHintLevel===0)return;
 const from=board.querySelector('.gameSq[data-i="'+move.f+'"]'),to=board.querySelector('.gameSq[data-i="'+move.t+'"]');
 if(!from||!to)return;
 from.classList.add('v533HintOrigin');
 const pc=pos.board[move.f];
 if(info)info.textContent='Tipp 1: Spiele mit '+(nm[pc?.toUpperCase()]||'der markierten Figur')+' auf '+sq(move.f)+'. Das Zielfeld findest du selbst.';
 if(v533OpeningHintLevel<2)return;
 to.classList.add('v533HintTarget');
 if(info)info.textContent='Tipp 2: Ziehe von '+sq(move.f)+' nach '+sq(move.t)+'. Probiere den Zug jetzt selbst.';
 const all=Array.from(board.querySelectorAll('.gameSq'));const a=all.indexOf(from),b=all.indexOf(to);
 if(a<0||b<0)return;
 const ax=(a%8+0.5)*100,ay=(Math.floor(a/8)+0.5)*100,bx=(b%8+0.5)*100,by=(Math.floor(b/8)+0.5)*100;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','v533OpeningArrow');svg.setAttribute('viewBox','0 0 800 800');svg.setAttribute('role','img');svg.setAttribute('aria-label','Eröffnungstipp: '+sq(move.f)+' nach '+sq(move.t));
 svg.innerHTML='<defs><marker id="v533Arrowhead" markerWidth="5" markerHeight="5" refX="3.5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#35c77d"/></marker></defs><line x1="'+ax+'" y1="'+ay+'" x2="'+bx+'" y2="'+by+'" stroke="#35c77d" stroke-width="19" stroke-linecap="round" opacity=".85" marker-end="url(#v533Arrowhead)"/>';
 board.appendChild(svg);
}
function v533OpeningHintInit(){
 const frame=elem('gameBoard')?.closest('.gameBoardFrame');
 if(!frame||elem('v533OpeningAssist'))return;
 const dock=document.createElement('section');dock.id='v533OpeningAssist';dock.className='v533OpeningAssist';dock.hidden=true;
 dock.innerHTML='<div class="v533AssistHead"><span class="v533AssistIcon" aria-hidden="true">✦</span><div><strong>Eröffnungs-Coach</strong><small>Stufe für Stufe den richtigen Zug finden</small></div><label class="v533HintSwitch"><input id="v533OpeningHintsToggle" type="checkbox" checked aria-label="Eröffnungstipps aktivieren"><span>Tipps</span></label></div><div class="v533AssistButtons"><button type="button" id="v533OpeningHintNext">💡 Tipp 1 · Figur</button><button type="button" id="v533OpeningHintClear">↺ Zurücksetzen</button></div><p id="v533OpeningHintText" aria-live="polite">Wähle eine Eröffnung und beginne die Übung.</p>';
 frame.after(dock);
 elem('v533OpeningHintsToggle').onchange=e=>{v533OpeningHintsOn=!!e.target.checked;v533OpeningHintLevel=0;try{localStorage.setItem(V533_OPENING_PREF,v533OpeningHintsOn?'on':'off')}catch(_){}v533OpeningHintPaint()};
 elem('v533OpeningHintNext').onclick=()=>{v533OpeningHintLevel=Math.min(2,v533OpeningHintLevel+1);v533OpeningHintPaint()};
 elem('v533OpeningHintClear').onclick=()=>{v533OpeningHintLevel=0;v533OpeningHintPaint()};
 v533OpeningHintPaint();
}

function opening(){return OPENINGS[openingId]}
function moveUci(m){return sq(m.f)+sq(m.t)+(m.promo||'')}
function nextOpeningMove(){return opening().uci[record.length]}
function trainingMessage(){if(!isTraining())return;
 const line=opening(),el=elem('openingGuidance');if(!el)return;
 const done=summaryStore.openings[openingId]||0;
 const optionCount=v57OpeningOptions().length;
 if(openingCompleted){el.innerHTML='<strong>✔ '+escapeHtml(line.name)+'</strong> abgeschlossen. Wiederhole die Folge für mehr Sicherheit. <small>Bisher '+done+'× erfolgreich.</small>';return;}
 const expected=nextOpeningMove();if(!expected){el.textContent='Alle Züge geschafft!';return;}
 const index=record.length,whose=pos.turn===line.side?'Dein Zug':'Gegnerischer Demonstrationszug';
 const detail=line.tips[index]||(pos.turn===line.side?'Entwickle deine Figuren, verbessere die Kontrolle über das Zentrum und prüfe gegnerische Drohungen.':'Achte darauf, welche zentralen Felder Schwarz und Weiß kontrollieren.');
 el.innerHTML='<div class="openingSummary"><b>'+escapeHtml(line.name)+'</b><span>'+escapeHtml(line.eco||'')+' · '+escapeHtml(line.level||'')+' · '+(line.side==='w'?'Weiß':'Schwarz')+'</span></div>'+
  '<p><strong>Plan:</strong> '+escapeHtml(line.plan||'')+'</p><p class="quiet">'+(v57prefs.variants?optionCount+' zu dieser Stellung passende Varianten aus den vorhandenen 47 Linien':'Feste Zugfolge')+'</p><p><strong>'+whose+' · '+(index+1)+'/'+line.uci.length+':</strong> '+escapeHtml(detail)+'</p>'+
  '<div class="openingProgress"><div style="width:'+Math.round(index/line.uci.length*100)+'%"></div></div><small>'+done+'× bisher erfolgreich trainiert. Ohne Spieluhr.</small>';
}

function openingAuto(){if(!isTraining()||openingCompleted||busy||gameResult)return;
 const candidates=v57OpeningOptions();const select=candidates[Math.floor(Math.random()*candidates.length)];if(v57prefs.variants&&select?.id){openingId=select.id;elem('openingPick').value=openingId;}
 const sequence=opening().uci,next=sequence[record.length];if(!next)return;
 if(pos.turn===opening().side){trainingMessage();return}
 const t=++token;busy=true;render();setTimeout(()=>{if(t!==token||!isTraining()){busy=false;return;}busy=false;
 const match=legal(pos).find(m=>moveUci(m)===next);if(match)playMove(match,false);else setNote('Eröffnungsfolge konnte nicht fortgesetzt werden.',true);
 },380);
}
function completeOpening(){if(openingCompleted)return; openingCompleted=true;
 summaryStore.openings[openingId]=(summaryStore.openings[openingId]||0)+1;
 v58OpeningDone();persistProfile();trainingMessage();
 setNote('Eröffnung gelernt – sehr gut. Du kannst sie wiederholen oder wechseln.');
}
function hasSessionStored(){return summaryStore.games.some(g=>g.id===sessionId)}
function resultCode(result){if(!result)return '*';if(/^Weiß gewinnt|^Schwarz verliert/.test(result))return '1-0';if(/^Schwarz gewinnt|^Weiß verliert/.test(result))return '0-1';return '1/2-1/2'}
const V532_ARCHIVE_KEY='schach1001_game_archive_v532';
function v532GetArchive(){try{const rows=JSON.parse(localStorage.getItem(V532_ARCHIVE_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch(_){return []}}
function v532SaveFinishedGame(){
 if(!gameResult||isTraining()||setup.mode==='analysis')return;
 const archived=v532GetArchive();if(archived.some(g=>g.id===sessionId))return;
 const game={id:sessionId,at:new Date().toISOString(),result:gameResult,score:resultCode(gameResult),
  mode:setup.mode,opponent:setup.mode==='computer'?'Stockfish / Computer '+setup.elo:'Mensch',side:setup.side,
  clock:chosenTime().title,elo:setup.elo,uci:record.map(r=>r.uci),san:record.map(r=>r.san),positions:[startFen,...record.map(r=>r.after)],finalFen:toFen(pos)};
 archived.unshift(game);
 for(let limit=Math.min(120,archived.length);limit>=0;limit=Math.floor(limit*.75)){
  try{localStorage.setItem(V532_ARCHIVE_KEY,JSON.stringify(archived.slice(0,limit)));return}
  catch(e){if(limit===0){setNote('Partie beendet, aber Archivspeicher ist voll. Bitte ein Backup erstellen.',true);return}}
 }
}

/* V5.47: eigene Partieende-Ansicht mit Stockfish-basiertem Game Review.
   Alle angezeigten Zugwerte stammen aus echten Analysen; keine fiktive Elo/Genauigkeit. */
let v547Screen=null,v547Current=null,v547Seq=0;
const V547_REVIEW_KEY='schach1001_game_reviews_v547';
function v547Ensure(){
 if(elem('v547Overlay'))return;
 const root=document.createElement('div');root.id='v547Overlay';root.className='v547Overlay';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Partie beendet und Partieanalyse');
 root.innerHTML='<div class="v547Dialog"><div class="v547Header"><button id="v547Close" type="button" aria-label="Schließen">←</button><b id="v547Title">Partieende</b><button id="v547Exit" type="button" aria-label="Schließen">✕</button></div><div id="v547Content" class="v547Content"></div></div>';
 document.body.append(root);
 elem('v547Close').onclick=()=>v547Close();elem('v547Exit').onclick=()=>v547Close();
 root.addEventListener('click',e=>{const b=e.target.closest('button[data-v547]');if(!b)return;
  const kind=b.dataset.v547;
  if(kind==='review'){v547OpenReview();if(!v547Current?.items)v547RunReview();}
  if(kind==='analyze')v547RunReview();
  if(kind==='moves')v547OpenInAnalysis(0);
  if(kind==='replay')v547Close();
  if(kind==='rematch'){v547Close();gameNew();}
  if(kind==='new'){v547Close();gameNew();}
  if(kind==='back'){v547ShowEnd();}
  if(kind==='move'){v547OpenInAnalysis(Number(b.dataset.index)||0)};
 });
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();v547Close();}});
}
function v547Close(){++v547Seq;if(v547Current)v547Current.reviewing=false;const root=elem('v547Overlay');if(root)root.hidden=true;document.body.classList.remove('v547Open');}
function v547Open(){v547Ensure();elem('v547Overlay').hidden=false;document.body.classList.add('v547Open')}
function v547Winner(result,side,mode){if(!result||result.startsWith('Remis'))return false;const white=result.startsWith('Weiß gewinnt'),black=result.startsWith('Schwarz gewinnt');return mode==='computer'?(side==='w'?white:black):(white||black)}
function v547ResultCause(text){return /Zeit/i.test(text)?'durch Zeitüberschreitung':/Matt/i.test(text)?'durch Schachmatt':/aufgegeben|gibt auf/i.test(text)?'durch Aufgabe':text.startsWith('Remis')?'Partie unentschieden':'Partie beendet'}
function v547CoachPraise(text,won,draw){
 if(draw)return 'Die Partie endete remis. Stockfish prüft jetzt, welche Chancen beide Seiten hatten und welche Züge entscheidend waren.';
 if(!won)return /Zeit/i.test(text)?'Die Zeit war diesmal entscheidend. Stockfish prüft deine Züge und zeigt bessere Fortsetzungen.':/Matt/i.test(text)?'Du wurdest mattgesetzt. Wir untersuchen, wo du den Angriff hättest verhindern können.':'Auch aus einer Niederlage lässt sich lernen: Stockfish untersucht die kritischen Züge.';
 if(/Zeit/i.test(text))return 'Dein Gegner hat seine Bedenkzeit überschritten. Die Analyse zeigt dir zusätzlich deine Stärken am Brett.';
 if(/Matt/i.test(text))return 'Du hast deinen Gegner mattgesetzt. Stockfish prüft den Angriff und die kritischen Entscheidungen.';
 return 'Gute Partie! Stockfish prüft jetzt, welche Züge besonders stark waren.';
}
function v547WinDone(){
 // Auch nach Niederlagen, Remis und Zeitverlust muss die Partieanalyse erscheinen.
 if(!gameResult||isTraining()||setup.mode==='analysis')return;
 if(v547Current?.id===sessionId&&v547Current?.shown)return;
 const archive=v532GetArchive().find(g=>g.id===sessionId);
 v547Current={id:sessionId,shown:true,at:new Date().toISOString(),result:gameResult,score:resultCode(gameResult),side:setup.side,opponent:setup.mode==='computer'?'Stockfish · Profil '+setup.elo:'Gegenspieler',moves:record.map(r=>({...r})),archive,points:summaryStore.trainingRating||null,pointDelta:(summaryStore.trainingRating||0)-(v547BeforeRating??(summaryStore.trainingRating||0)),items:null,reviewing:false};
 const completed=v547Current;
 v547ShowEnd();
 // Ergebnisansicht nicht überspringen; Stockfish berechnet die Bewertung im Hintergrund.
 setTimeout(()=>{if(v547Current===completed&&completed.shown&&!elem('v547Overlay')?.hidden&&!completed.reviewing)v547RunReview();},400);
}
let v547BeforeRating=null;
function v547ShowEnd(){
 if(!v547Current)return;v547Open();v547Screen='end';elem('v547Title').textContent='Partie beendet';
 const s=v547Current,score=s.score,reason=v547ResultCause(s.result),delta=s.pointDelta;
 const draw=s.result.startsWith('Remis'),won=v547Winner(s.result,s.side,s.archive?.mode||setup.mode),headline=draw?'Remis!':won?'Du hast gewonnen!':'Du hast verloren.';
 const rating=Number.isFinite(s.points)&&s.points?'<div class="v547Training"><strong>♜ '+s.points+'</strong><span>Trainingspunkte'+(delta>0?' · +'+delta:delta<0?' · '+delta:'')+'</span><small>Lokales Training, kein offizielles Elo</small></div>':'';
 const cached=v547ReadCached(),done=!!(s.items?.length===s.moves.length&&s.moves.length)||(cached?.items?.length===s.moves.length&&s.moves.length>0);
 elem('v547Content').innerHTML='<section class="v547Victory"><p class="v547Kicker">SCHACH 1001+ PRO</p><h1>'+escapeHtml(headline)+'</h1><p class="v547Reason">'+escapeHtml(reason)+'</p><div class="v547Versus"><div><div class="v547BadgePiece">♟</div><strong>Du</strong></div><span class="v547Vs">'+escapeHtml(score)+'</span><div><div class="v547BadgePiece v547Opp">♟</div><strong>'+escapeHtml(s.opponent)+'</strong></div></div><div class="v547Twins"><button data-v547="rematch">↻ Revanche</button><button data-v547="new">♟ Neue Partie</button></div></section>'+rating+
 '<section class="v547Coach"><div class="v547Avatar" aria-hidden="true">♟</div><p><strong>Dein Schach-Coach</strong><span>'+escapeHtml(v547CoachPraise(s.result,won,draw))+'</span></p></section>'+
 '<div class="v547MiniSummary"><div><strong>'+s.moves.length+'</strong><small>Halbzüge</small></div><div><strong>'+escapeHtml(s.score)+'</strong><small>Ergebnis</small></div><div><strong>★</strong><small>'+(done?'Review fertig':'Analyse läuft')+'</small></div></div><div class="v547Progress" id="v547AutoProgress" role="status" aria-live="polite">'+(done?'Stockfish-Analyse abgeschlossen.':s.reviewing?'Stockfish wertet deine Partie aus …':'Stockfish startet automatisch …')+'</div><button class="v547Primary" data-v547="review">★ '+(done?'Fertige Partieanalyse öffnen':'Partieanalyse ansehen')+'</button><p class="v547Disclaimer">Stockfish analysiert deine Züge automatisch. Bei der Auswertung werden Genauigkeit und Zugurteile geschätzt – keine offiziellen Chess.com-Daten.</p>';
 elem('v547Content').scrollTop=0;
}
function v547ReadCached(){try{const all=JSON.parse(localStorage.getItem(V547_REVIEW_KEY)||'{}');return all[v547Current.id]||null}catch(_){return null}}
function v547SaveReview(report){try{const all=JSON.parse(localStorage.getItem(V547_REVIEW_KEY)||'{}');all[v547Current.id]=report;const archive=v532GetArchive();const keys=new Set(archive.slice(0,24).map(x=>String(x.id)));keys.add(v547Current.id);for(const k of Object.keys(all))if(!keys.has(k))delete all[k];localStorage.setItem(V547_REVIEW_KEY,JSON.stringify(all))}catch(_){/* Existing games remain intact on storage pressure. */}}
function v547Counts(items,side){const map={Best:0,Excellent:0,Good:0,Inaccuracy:0,Mistake:0,Blunder:0};for(const x of items||[])if(x.side===side&&Object.prototype.hasOwnProperty.call(map,x.kind))map[x.kind]++;return map}
function v547Accuracy(items,side){let losses=(items||[]).filter(x=>x.side===side).map(x=>x.loss);return losses.length?v57Accuracy(losses)?.accuracy:null}
function v547Grade(loss,best){if(best)return {kind:'Best',de:'Bester Zug',color:'#81bb52'};if(loss<=35)return{kind:'Excellent',de:'Sehr gut',color:'#9dcb71'};if(loss<=85)return{kind:'Good',de:'Gut',color:'#afc98c'};if(loss<=170)return{kind:'Inaccuracy',de:'Ungenau',color:'#f1cf50'};if(loss<=300)return{kind:'Mistake',de:'Fehler',color:'#f4a366'};return{kind:'Blunder',de:'Patzer',color:'#e86c63'}}
function v547Graph(items){if(!items?.length)return '<div class="v547GraphEmpty">Bewertungsverlauf erscheint nach der Stockfish-Auswertung.</div>';
 const pts=[items[0].before,...items.map(x=>x.after)].filter(Number.isFinite),n=pts.length,w=490,h=126,pad=13;
 if(n<2)return '';
 const co=pts.map((v,i)=>[pad+i*(w-2*pad)/(n-1),h/2-(h/2-9)*Math.tanh(v/400)]);
 const area=co.map(p=>p.map(x=>x.toFixed(1)).join(',')).join(' ');
 return '<svg viewBox="0 0 '+w+' '+h+'" class="v547Graph" role="img" aria-label="Stockfish-Bewertungsverlauf. Oberhalb der Mittellinie ist Weiß besser, unterhalb Schwarz"><rect width="'+w+'" height="'+h+'" fill="#3a4140"/><rect y="'+h/2+'" width="'+w+'" height="'+h/2+'" fill="#edeedc"/><path d="M0 '+h/2+' H'+w+'" stroke="#a2aba1" stroke-width="1"/>'+
 '<polyline fill="none" stroke="#7ecc63" stroke-width="3" stroke-linejoin="round" points="'+area+'"/>'+co.map(([x,y],i)=>'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(i%5===0?3.5:1.4)+'" fill="'+(i%5===0?'#e6d65d':'#9cd47a')+'"/>').join('')+'</svg>';
}
function v547OpenReview(){
 if(!v547Current)return;v547Open();v547Screen='review';elem('v547Title').textContent='Partieanalyse';const s=v547Current,cached=v547ReadCached();if(!s.items&&cached?.items?.length===s.moves.length)s.items=cached.items;
 const items=s.items||[],w=v547Counts(items,'w'),b=v547Counts(items,'b'),aw=v547Accuracy(items,'w'),ab=v547Accuracy(items,'b');
 const complete=items.length===s.moves.length&&items.length>0;
 const cats=[['Brillant','Brilliant','‼','Nicht separat ermittelt'],['Stark','Great','!','Nicht separat ermittelt'],['Bester Zug','Best','★'],['Sehr gut','Excellent','●'],['Gut','Good','✓'],['Buchzug','Book','▣','Nicht separat ermittelt'],['Ungenau','Inaccuracy','?!'],['Fehler','Mistake','?'],['Patzer','Blunder','??']];
 const grid=cats.map(([label,key,ico,unknown])=>'<div class="v547Row"><span>'+label+'</span><b>'+(!complete?'–':unknown?'–':w[key]||0)+'</b><span class="v547Category '+key+'">'+ico+'</span><b>'+(!complete?'–':unknown?'–':b[key]||0)+'</b></div>').join('');
 const who=s.side==='w'?'Weiß':'Schwarz',opp=s.side==='w'?'Schwarz':'Weiß';
 elem('v547Content').innerHTML='<div class="v547ReviewHero"><div class="v547Coach"><div class="v547Avatar">♟</div><p><strong>Dein Schach-Coach</strong><span>'+escapeHtml(complete?'Die Stockfish-Auswertung ist fertig. Wähle „Züge durchgehen“, um deine Entscheidungen am Brett zu verstehen.':'Hier siehst du deine Partie. Starte die Auswertung, damit Stockfish die Zugqualität tatsächlich berechnet.')+'</span></p></div>'+v547Graph(items)+'</div>'+ 
 '<div class="v547ReviewHead"><b>Auswertung der Partie</b><small>'+s.moves.length+' Halbzüge · '+escapeHtml(s.score)+'</small></div><div class="v547Players"><div><small>Weiß '+(who==='Weiß'?'(Du)':'')+'</small><strong>'+(aw===null?'–':aw.toFixed(0)+' %')+'</strong></div><div><small>Schwarz '+(who==='Schwarz'?'(Du)':'')+'</small><strong>'+(ab===null?'–':ab.toFixed(0)+' %')+'</strong></div></div><p class="v547Disclaimer">Genauigkeit = eigene Stockfish-Schätzung, nicht die offizielle Chess.com-Berechnung. „Brillant“, „Stark“ und „Buchzug“ werden nicht ohne eigene Kriterien behauptet.</p><div class="v547Categories"><div class="v547Row v547CategoryHead"><span>Kategorie</span><b>Weiß</b><span></span><b>Schwarz</b></div>'+grid+'</div>'+
 '<div id="v547Progress" class="v547Progress" role="status" aria-live="polite">'+(complete?'Analyse abgeschlossen':s.reviewing?'Stockfish arbeitet …':'Noch nicht analysiert')+'</div><button class="v547Primary" data-v547="'+(complete?'moves':'analyze')+'">'+(complete?'★ Review am großen Brett':'★ Auswertung mit Stockfish starten')+'</button><div class="v547SmallActions"><button data-v547="moves">Zum Analysebrett</button><button data-v547="back">Zurück zum Ergebnis</button></div>';
 elem('v547Content').scrollTop=0;
}
async function v547RunReview(){
 const s=v547Current;if(!s||s.reviewing)return;
 if(typeof window.analyzeFen!=='function'){const p=elem('v547Progress')||elem('v547AutoProgress');if(p)p.textContent='Stockfish ist derzeit nicht verfügbar. Du kannst die Analyse später erneut starten.';return}
 const ticket=++v547Seq;s.reviewing=true;v551PauseRequested=false;const rows=s.moves.map(x=>({...x})),total=rows.length,items=v551TakePartial(s);let previousAnalysis=null,previousFen=null;
 const main=elem('v547Content').querySelector('[data-v547="analyze"]');if(main){main.disabled=true;main.textContent='Analyse läuft …'}
 const reportProgress=(message)=>{const p=elem(v547Screen==='review'?'v547Progress':'v547AutoProgress');if(p)p.textContent=message};
 reportProgress('Stockfish wertet 0 / '+total+' Halbzüge aus …');
 try{
  for(let i=items.length;i<total;i++){
   if(ticket!==v547Seq||v547Current!==s)break;
   if(v551PauseRequested){v551KeepPartial(s,items);s.reviewing=false;reportProgress("Analyse pausiert bei "+items.length+" / "+total+" Halbzügen. Mit Fortsetzen weiterrechnen.");return;}
   const r=rows[i];if(!r.before||!r.after||!r.uci)throw Error('Für Zug '+(i+1)+' fehlen gespeicherte Stellungen.');
   // Jede Folgestellung ist zugleich Ausgangsstellung des nächsten Zugs.
   const bef=previousFen===r.before?previousAnalysis:await window.analyzeFen(r.before,v551Prefs.depth);
   if(ticket!==v547Seq||v547Current!==s)break;
   const final=outcome(fromFen(r.after));
   // Matt und Patt als objektive Endstellungen behandeln: Engine liefert dort oft keinen Bestzug.
   const endedWhite=final?.startsWith('Weiß gewinnt'),endedBlack=final?.startsWith('Schwarz gewinnt');
   const endedDraw=final?.startsWith('Remis');
   const aft=endedWhite||endedBlack?{scoreType:'mate',score:fromFen(r.after).turn===(endedWhite?W:B)?1:-1}:endedDraw?{scoreType:'cp',score:0}:await window.analyzeFen(r.after,v551Prefs.depth);
   if(ticket!==v547Seq||v547Current!==s)break;
   previousAnalysis=aft;previousFen=r.after;
   const before=sfWhiteScore(r.before,bef),reportedAfter=sfWhiteScore(r.after,aft);
   const after=Number.isFinite(reportedAfter)?reportedAfter:final?.startsWith('Weiß gewinnt')?30000:final?.startsWith('Schwarz gewinnt')?-30000:final?.startsWith('Remis')?0:null;
   if(!Number.isFinite(before)||!Number.isFinite(after)||!bef?.bestmove)throw Error('Stockfish hat bei Zug '+(i+1)+' keine gültige Bewertung geliefert.');
   const side=fromFen(r.before).turn,loss=Math.max(0,Math.round(side===W?before-after:after-before));
   const kind=v547Grade(loss,String(bef.bestmove)===r.uci);
   items.push({i,side,loss,before,after,uci:r.uci,move:deSan(r.san||r.uci),kind:kind.kind});
   reportProgress('Stockfish wertet '+(i+1)+' / '+total+' Halbzüge aus …');
  }
  if(ticket!==v547Seq||v547Current!==s)return;
  if(!items.length)throw Error('Keine Zugbewertung vorhanden.');
  s.items=items;v551ClearPartial(s);
  v547SaveReview({items,at:new Date().toISOString()});s.reviewing=false;
  if(v547Screen==='review')v547OpenReview();else{reportProgress('Stockfish-Analyse abgeschlossen: '+total+' Züge bewertet.');const btn=elem('v547Content')?.querySelector('[data-v547="review"]');if(btn)btn.textContent='★ Fertige Partieanalyse öffnen';}
 }catch(err){if(ticket===v547Seq){s.reviewing=false;reportProgress('Analyse unvollständig: '+(err?.message||'Stockfish nicht erreichbar')+'. Bitte erneut starten.');const button=elem('v547Content').querySelector('[data-v547="analyze"]');if(button){button.disabled=false;button.textContent='Erneut versuchen';}}}
}
function v547OpenInAnalysis(i){const s=v547Current;if(!s)return;v547Close();elem('navAnalysis')?.click();
 if(v532GetArchive().some(g=>g.id===s.id)){v539Source('archive');const sel=elem('v539GameChoice');if(sel)sel.value=s.id;v539LoadArchive();if(v539.archiveRecords.length){v529PickRecord(Math.min(Math.max(0,i),v539.archiveRecords.length-1))}}else {v539Source('current');v525ReviewRefresh();if(record.length)v529PickRecord(Math.min(Math.max(0,i),record.length-1))}
 // V5.50: Review getrennt von der langen Analyse-Seite anzeigen.
 v550OpenReview();
}

function archiveGame(){if(!gameResult||isTraining()||setup.mode==='analysis')return;
 v532SaveFinishedGame();
 if(hasSessionStored()){v547WinDone();return;}
 summaryStore.games.unshift({id:sessionId,at:new Date().toISOString(),mode:setup.mode,time:chosenTime().title,opponent:setup.mode==='computer'?'Computer '+setup.elo:'Mensch',side:setup.side,result:gameResult,score:resultCode(gameResult),moves:record.length,fen:toFen(pos)});
 v547BeforeRating=Number(summaryStore.trainingRating)||1000;v57TrainingRating(summaryStore.games[0]);v58AdaptiveAfterGame();summaryStore.games=summaryStore.games.slice(0,250);persistProfile();if(elem('statsContent'))renderProfile();v547WinDone();
}
function claimableDraw(){let reasons=[];if(pos.half>=100)reasons.push('50-Züge-Regel');
 const key=(fen)=>fen.split(' ').slice(0,4).join(' '),all=[startFen,...record.map(m=>m.after)].map(key),now=key(toFen(pos));
 if(all.filter(x=>x===now).length>=3)reasons.push('dreifache Stellungswiederholung');return reasons;
}
function legalDrawState(){const key=(fen)=>fen.split(' ').slice(0,4).join(' '),all=[startFen,...record.map(m=>m.after)].map(key),now=key(toFen(pos));
 if(all.filter(x=>x===now).length>=5)return 'Remis durch fünffache Stellungswiederholung';
 if(pos.half>=150)return 'Remis durch 75-Züge-Regel';return null;
}
function resign(){if(gameResult||isTraining()||setup.mode==='analysis')return;
 if(!confirm('Partie wirklich aufgeben?'))return;gameResult=(setup.mode==='computer'?setup.side:pos.turn)==='w'?'Schwarz gewinnt – Weiß gibt auf':'Weiß gewinnt – Schwarz gibt auf';token++;busy=false;clock.active=null;persist();archiveGame();render();setNote(gameResult,true)}
function claimDraw(){if(gameResult)return;const reasons=claimableDraw();if(!reasons.length){setNote('Noch keine beanspruchbare Remisregel erfüllt.',true);return}
 gameResult='Remis: '+reasons.join(', ');token++;clock.active=null;persist();archiveGame();render();setNote(gameResult)}
function offerDraw(){if(gameResult||isTraining()||setup.mode==='analysis')return;
 if(setup.mode==='free'){if(confirm('Nimmt der Gegenspieler das Remisangebot an?')){gameResult='Remis durch Vereinbarung';clock.active=null;archiveGame();persist();render()}}
 else setNote('Gegen den Computer: Ein Remisangebot ist hier nicht implementiert. Nutze „Remis beanspruchen“, wenn eine Regel erfüllt ist.');}
function toPGN(){let outcomeVal=resultCode(gameResult);let header=`[Event "Schach 1001+ Pro"]\n[Site "Android / Offline"]\n[Date "${new Date().toISOString().slice(0,10).replaceAll('-','.')}"]\n[White "${setup.mode==='computer'&&setup.side==='b'?'Computer':'Spieler Weiß'}"]\n[Black "${setup.mode==='computer'&&setup.side==='w'?'Computer':'Spieler Schwarz'}"]\n[Result "${outcomeVal}"]\n\n`;
 let body='';for(let i=0;i<record.length;i++){if(i%2===0)body+=(Math.floor(i/2)+1)+'. ';body+=record[i].san+' ';}
 return header+body+outcomeVal+'\n';}
async function exportPGN(){const pgn=toPGN();try{const blob=new Blob([pgn],{type:'application/x-chess-pgn'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='schach1001-partie-'+new Date().toISOString().slice(0,10)+'.pgn';document.body.appendChild(link);link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000);link.remove();setNote('PGN-Export gestartet.');}
 catch(e){try{await navigator.clipboard.writeText(pgn);setNote('PGN-Züge in die Zwischenablage kopiert.')}catch(_){setNote('PGN-Export nicht verfügbar.',true)}}}
function sfCoachHTML(r,beforeEval,afterEval,bestUci,loss){
 // Erklärungen basieren auf tatsächlich gespieltem Zug, Brettgeometrie und Stockfish-Bewertung.
 // Die verbale Idee ist eine regelbasierte Einordnung, keine zweite Engine-Evaluation.
 const before=fromFen(r.before),after=fromFen(r.after),actor=before.turn;
 const all=legal(before),played=all.find(m=>moveUci(m)===r.uci);
 const strongest=all.find(m=>moveUci(m)===bestUci);
 const ideal=strongest?deSan(notation(before,strongest,all)):String(bestUci||'').toUpperCase();
 const label=r.uci===bestUci?'Bester Zug':loss<=35?'Sehr gut':loss<=85?'Ungenauigkeit':loss<=200?'Fehler':'Patzer';
 const level=loss<=35?'good':loss<=85?'warn':loss<=200?'bad':'verybad';
 const type=(played?.piece||before.board[r.f]||'p').toUpperCase();
 const figure=nm[type]||'Figur',from=sq(r.f),to=sq(r.t),pieceAfter=after.board[r.t];
 let positives=[];
 if(r.san.includes('#'))positives.push('Schachmatt: Der gegnerische König hat keine legale Verteidigung.');
 else if(r.san.includes('+'))positives.push('Du gibst Schach. Der Gegner muss zuerst das Schach abwehren.');
 if(played?.capture)positives.push('Du schlägst '+(nm[played.capture.toUpperCase()]||'eine Figur')+' auf '+to+'. Prüfe, ob ein Rückschlag möglich ist.');
 if(played?.castle)positives.push('Die Rochade bringt deinen König aus der Brettmitte und verbindet häufig deine Türme.');
 if(played?.promo)positives.push('Dein Bauer wird auf '+to+' umgewandelt.');
 if(type==='P'&&!played?.capture){
  if(['d4','e4','d5','e5'].includes(to))positives.push('Der Bauer besetzt das Zentrum und kontrolliert von dort die beiden diagonalen Felder vor sich.');
  else if(['c4','f4','c5','f5'].includes(to))positives.push('Der Bauernvorstoß unterstützt den Kampf um zentrale Felder.');
  else positives.push('Du veränderst die Bauernstruktur. Achte darauf, welche Felder der Bauer danach kontrolliert.');
 }
 if((type==='N'||type==='B')&&((actor===W&&['1'].includes(from[1]))||(actor===B&&from[1]==='8'))){
  positives.push('Du entwickelst deinen '+figure.toLowerCase()+' von der Grundreihe und bringst ihn aktiver ins Spiel.');
 }
 if(type==='N'&&['c3','f3','c6','f6','d4','e4','d5','e5'].includes(to))positives.push('Der Springer greift von hier aus wichtige zentrale Felder an.');
 if(type==='Q'&&before.full<=5&&!r.san.includes('#'))positives.push('Die Dame wird früh aktiv. Prüfe, ob der Gegner sie mit Tempo angreifen kann.');
 if(type==='R'&&!played?.capture)positives.push('Ein Turm wirkt auf Reihen und Linien; prüfe, ob diese frei oder noch durch Bauern blockiert sind.');
 if(['N','B','R','Q','P'].includes(type)){const attacks=pseudo(after,actor).filter(x=>x.f===r.t&&x.capture&&x.capture.toLowerCase()!=='p');const goals=new Set(attacks.map(x=>x.t));if(goals.size>=2)positives.push('Achtung: Die gezogene Figur greift gleich mehrere gegnerische Figuren an. Prüfe, ob ein Doppelangriff entsteht.');}
 if(!positives.length)positives.push('Die '+figure.toLowerCase()+' zieht von '+from+' nach '+to+'. Dadurch verändern sich ihre Angriffslinien und Deckungen.');
 const opponentCaptures=legal(after).filter(m=>m.t===r.t&&m.capture);
 const risks=[];
 if(opponentCaptures.length){
  const defended=squareAttacked(after,r.t,actor);
  risks.push('Die gezogene Figur auf '+to+' kann vom Gegner unmittelbar geschlagen werden'+(defended?'; sie ist aber durch mindestens eine eigene Figur gedeckt.':', ohne dass sie dort von einer eigenen Figur gedeckt ist.') );
 }
 if(!risks.length&&r.san.includes('+'))risks.push('Nach deinem Schachgebot ist der Gegner am Zug. Beachte seine mögliche Abwehr und Gegentaktik.');
 if(!risks.length)risks.push('Prüfe vor dem nächsten Zug ungeschützte Figuren, mögliche Schachgebote und gegnerische Schlagzüge.');
 const why=r.uci===bestUci?'Stockfish wählt bei der aktuellen Suchtiefe denselben Zug. Du hast damit seine bevorzugte Fortsetzung gefunden.':loss<=35?'Stockfish sieht nur einen sehr kleinen Unterschied zur stärksten Fortsetzung. Das ist eine solide praktische Wahl.':loss<=85?'Dein Zug ist spielbar, aber Stockfish findet eine präzisere Fortsetzung. Achte auf Tempo und Figurenaktivität.':loss<=200?'Dein Zug verschlechtert die Bewertung spürbar. Eine stärkere Fortsetzung hätte mehr Möglichkeiten erhalten.':'Dein Zug verschlechtert die Stellung deutlich. Suche vor dem Ziehen besonders nach Drohungen und taktischen Antworten.';
 let plan;
 if(r.san.includes('#'))plan='Die Partie ist durch Matt beendet. Schau dir an, welche Fluchtfelder dem König genommen wurden.';
 else if(inCheck(after,after.turn))plan='Beobachte zunächst, wie der Gegner das Schach abwehrt. Berechne erst danach deine nächste Idee.';
 else if(opponentCaptures.length)plan='Prüfe nach der gegnerischen Antwort, ob du eine Figur zurückgewinnen kannst oder die Stellung vereinfachen solltest.';
 else if(before.full<8)plan='Entwickle weitere Leichtfiguren, kontrolliere das Zentrum und sichere deinen König – ohne die Figuren ungedeckt zu lassen.';
 else plan='Nach der gegnerischen Antwort: Zuerst Schachgebote, Schlagzüge und unmittelbare Drohungen prüfen. Dann den Plan festlegen.';
 const brief=(label==='Bester Zug'?'Stockfish bestätigt deinen Zug.':label+' laut Stockfish.')+' '+(positives[0]||'Prüfe die Stellung.');
 const alternative=r.uci!==bestUci?'Bei gleicher Stellung bevorzugt Stockfish '+ideal+' statt '+deSan(r.san)+'.':null;
 return {label,level,loss,ideal,bestUci,brief,why,positives:positives.join(' '),risks:risks.join(' '),plan,alternative,source:'Stockfish 19 Lite'};
}
function displayStockfishScore(fen,result){const cp=sfWhiteScore(fen,result);return cp===null?'–':Math.abs(cp)>=29000?'Mattansage':fmtEval(cp);}
function evalTimeline(sfValues){let data=sfValues;if(data.length<2)return '';
 const width=520,height=126,pad=12,points=data.map((v,i)=>{const x=pad+i*(width-2*pad)/(data.length-1);const y=height/2-Math.tanh(v/400)*(height/2-pad);return [x,y]});
 return `<svg viewBox="0 0 ${width} ${height}" class="analysisGraph" role="img" aria-label="Stockfish-Stellungsbewertung"><line x1="0" y1="${height/2}" x2="${width}" y2="${height/2}" stroke="#64716e" stroke-dasharray="4 5"/><polyline fill="none" stroke="#9cdda8" stroke-width="3" stroke-linejoin="round" points="${points.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ')}"/></svg>`;
}
async function renderMoveReview(){
 const el=elem('moveReview');if(!el)return;
 if(!record.length){el.textContent='Spiele zuerst ein paar Züge.';return;}
 const snapshot=record.slice(),version=analysisSequence;
 if(typeof window.analyzeFen!=='function'){el.textContent='Stockfish-Modul fehlt. Keine Analyse möglich.';return;}
 el.textContent='Stockfish analysiert die Partie …';
 try{
  const scorePath=[],classes={good:0,warn:0,bad:0,verybad:0},lines=[],losses=[];
  for(let i=0;i<snapshot.length;i++){
   if(version!==analysisSequence)return;
   const r=snapshot[i];
   el.textContent='Stockfish bewertet Zug '+(i+1)+' von '+snapshot.length+' …';
   const bef=await window.analyzeFen(r.before,9),aft=await window.analyzeFen(r.after,9);
   if(!bef?.bestmove||!aft?.bestmove)throw new Error('Für Zug '+(i+1)+' fehlt eine Engine-Antwort');
   const b=sfWhiteScore(r.before,bef),a=sfWhiteScore(r.after,aft);
   if(b===null||a===null)throw new Error('Stockfish hat keine Bewertung geliefert');
   const mover=fromFen(r.before).turn;
   const loss=Math.max(0,Math.round((mover===W?b-a:a-b)));
   const review=sfCoachHTML(r,b,a,bef.bestmove,loss);r.coach=review;v57RememberMistake(r);if(setup.mode!=='computer'||mover===setup.side)losses.push(loss);
   classes[review.level]++;
   if(!scorePath.length)scorePath.push(b);scorePath.push(a);
   lines.push('<div class="reviewMove"><span>'+(Math.floor(i/2)+1)+(i%2?'…':'.')+' '+escapeHtml(deSan(r.san))+'</span><strong class="'+review.level+'">'+escapeHtml(review.label)+'</strong><small>'+escapeHtml(review.why)+'</small></div>');
  }
  if(version!==analysisSequence)return;
  // Only save reviewed results if the ongoing game has not changed.
  for(let i=0;i<snapshot.length;i++){if(record[i]===snapshot[i]&&snapshot[i].coach)record[i].coach=snapshot[i].coach;}
  persist();refreshCoach();renderPlyHistory();v514UpdateGameSummary();
  const accuracy=v57Accuracy(losses);if(accuracy){if(!Array.isArray(summaryStore.accuracyHistory))summaryStore.accuracyHistory=[];summaryStore.accuracyHistory=summaryStore.accuracyHistory.filter(x=>x.id!==sessionId);summaryStore.accuracyHistory.push({id:sessionId,day:new Date().toISOString().slice(0,10),accuracy:accuracy.accuracy,average:accuracy.average});summaryStore.accuracyHistory=summaryStore.accuracyHistory.slice(-100)}
 el.innerHTML='<p class="quiet">Alle Zugbewertungen stammen von Stockfish 19 Lite.</p>'+(accuracy?'<p><strong>Geschätzte Genauigkeit: '+accuracy.accuracy+' %</strong> · Ø Verlust '+(accuracy.average/100).toFixed(2)+' Bauerneinheiten/Zug (eigene Formel, nicht offizielle Chess.com-Genauigkeit).</p>':'')+evalTimeline(scorePath)+
   '<p class="reviewTotals">'+classes.good+' gute/beste · '+classes.warn+' Ungenauigkeiten · '+classes.bad+' Fehler · '+classes.verybad+' Patzer</p><div class="moveReviewList">'+lines.join('')+'</div>';
  summaryStore.studyChecks++;persistProfile();v57UpdateReplayCount();v57RenderDashboard();
 }catch(e){el.textContent=stockfishUnavailable(e)}
}
async function stockfishReview(){
 const el=elem('sfReview');if(!el)return;
 if(!record.length){el.textContent='Spiele zuerst eine Partie.';return;}
 el.textContent='Stockfish prüft die letzten Züge …';
 if(typeof window.analyzeFen!=='function'){el.textContent='Stockfish-Modul fehlt.';return;}
 try{
  const entries=record.slice(-12),list=[];
  for(let i=0;i<entries.length;i++){
   const r=entries[i];el.textContent='Stockfish: Zug '+(i+1)+' von '+entries.length+' …';
   const res=await window.analyzeFen(r.after,10);
   list.push(deSan(r.san)+': '+displayStockfishScore(r.after,res)+' | Nächster Bestzug '+res.bestmove.toUpperCase());
  }
  el.innerHTML='<strong>Stockfish 19 Lite – letzte '+entries.length+' Halbzüge:</strong><div class="sfMoveLines">'+list.map(s=>'<div>'+escapeHtml(s)+'</div>').join('')+'</div>';
 }catch(e){el.textContent=stockfishUnavailable(e)}
}
function postMoveCoach(){
 if(!coachVisible()){refreshCoach();return;}
 const current=record.at(-1);if(!current){refreshCoach();return;}
 const requestVersion=coachSequence;
 current.coach=null;refreshCoach();
 (async()=>{
  if(typeof window.analyzeFen!=='function'){current.coach={label:'Stockfish nicht verfügbar',why:'Die Engine konnte nicht geladen werden; keine Ersatzbewertung.',source:'none'};if(record.includes(current))refreshCoach();return;}
  try{
   const b=await window.analyzeFen(current.before,9);
   const a=await window.analyzeFen(current.after,9);
   if(!record.includes(current)||!coachVisible()||requestVersion!==coachSequence||!b?.bestmove||!a?.bestmove)return;
   const oldScore=sfWhiteScore(current.before,b),newScore=sfWhiteScore(current.after,a);
   if(oldScore===null||newScore===null)throw new Error('Keine Engine-Bewertung');
   const mover=fromFen(current.before).turn;
   const loss=Math.max(0,Math.round(mover===W?oldScore-newScore:newScore-oldScore));
   current.coach=sfCoachHTML(current,oldScore,newScore,b.bestmove,loss);v57RememberMistake(current);
   if(toFen(pos)===current.after){
    sfPositionScore={fen:current.after,whiteCp:newScore};
    updateSideEvaluation(newScore);
   }
   persist();refreshCoach();renderPlyHistory();v514UpdateGameSummary();v517UpdateReview();v58CoachBar();v57NarrateLatest();
  }catch(e){
   if(!record.includes(current)||!coachVisible()||requestVersion!==coachSequence)return;
   current.coach={label:'Stockfish nicht verfügbar',why:stockfishUnavailable(e),source:'none'};
   refreshCoach();
  }
 })();
}


let v532Viewed=null,v532Ply=0;
function v532GamePgn(g){
 const result=g.score||'*',date=(g.at||'').slice(0,10).replaceAll('-','.');
 const white=g.side==='b'?'Computer':'Spieler',black=g.side==='w'?'Computer':'Spieler';
 const head='[Event "Schach 1001+ Pro"]\n[Date "'+date+'"]\n[White "'+white+'"]\n[Black "'+black+'"]\n[Result "'+result+'"]\n\n';
 let body='';(g.san||[]).forEach((san,i)=>{if(i%2===0)body+=(Math.floor(i/2)+1)+'. ';body+=san+' '});
 return head+body+result+'\n';
}
function v532Download(g){
 const blob=new Blob([v532GamePgn(g)],{type:'application/x-chess-pgn'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Schach-Partie-'+(g.at||'').slice(0,10)+'.pgn';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
let v535ArchiveTrial=false,v535ArchiveMoves=[],v535ArchiveSelected=-1;
function v545FenBoard(fen){
 if(typeof fen!=='string'||!fen.trim())return null;
 try{return fromFen(fen)}catch(_){return null}
}
function v545SamePosition(a,b){return !!a&&!!b&&a.board.join('')===b.board.join('')&&a.turn===b.turn}
function v535ArchivePosition(g){
 // Eine gespeicherte Zugfolge darf nie still abbrechen und dabei "42 / 42" melden.
 let p=fromFen(startFen),last=null,applied=0,invalidAt=-1,source='moves';
 const moves=Array.isArray(g.uci)?g.uci:[],wanted=Math.max(0,Math.min(v532Ply,moves.length));
 const snapshots=Array.isArray(g.positions)?g.positions:null;
 for(let i=0;i<wanted;i++){
  const u=moves[i],m=legal(p).find(x=>moveUci(x)===u);
  if(!m){invalidAt=i;break}
  p=move(p,m);last=m;applied++;
 }
 // Alte Archive speichern die Endstellung separat. Stimmen die nachgespielten Züge
 // nicht überein, zeige die echte gespeicherte Endstellung statt eine falsche Rekonstruktion.
 let mismatch=false;
 const snapshot=v545FenBoard(snapshots?.[wanted]);
 if(snapshot&&(!v545SamePosition(p,snapshot)||applied!==wanted)){
  p=snapshot;source='snapshot';mismatch=true;applied=wanted;last=null;
 }
 const final=v545FenBoard(g.finalFen);
 if(wanted===moves.length&&final&&(!v545SamePosition(p,final)||applied!==wanted)){
  p=final;source='final';mismatch=true;applied=wanted;last=null;
 }
 if(!snapshot&&wanted===0&&moves.length===0&&final){p=final;source='final';applied=0;}
 const base={p,last,applied,invalidAt,source,mismatch};
 if(v535ArchiveTrial&&applied===wanted){
  for(const u of v535ArchiveMoves){const m=legal(p).find(x=>moveUci(x)===u);if(!m)break;p=move(p,m);last=m;}
 }
 return {...base,p,last};
}
function v532RenderArchive(){
 const container=elem('statsContent');if(!container)return;
 let wrap=elem('v532Archive');if(wrap)wrap.remove();const oldViewer=elem('v532Viewer');if(oldViewer)oldViewer.remove();document.body.classList.remove('v535ArchiveOpen');v532Viewed=null;v535ArchiveTrial=false;v535ArchiveMoves=[];v535ArchiveSelected=-1;
 wrap=document.createElement('section');wrap.id='v532Archive';wrap.className='card statSection';
 const games=v532GetArchive();
 wrap.innerHTML='<h3>♟ Beendete Partien – Archiv</h3><p class="quiet">Nach Spielende automatisch gespeichert. Jede Partie lässt sich ansehen und als PGN exportieren. Die alten Ergebnis-Einträge ohne Zugfolge bleiben in deiner bisherigen Statistik.</p>'+
 (games.length?'<div class="v532ArchiveList">'+games.map(g=>'<div class="v532ArchiveEntry"><div><strong>'+escapeHtml((g.at||'').slice(0,16).replace('T',' · '))+'</strong><small>'+escapeHtml(g.opponent)+' · '+escapeHtml(g.score)+' · '+(g.uci||[]).length+' Halbzüge</small></div><button type="button" data-view="'+escapeHtml(g.id)+'">Ansehen</button><button type="button" data-pgn="'+escapeHtml(g.id)+'">PGN</button></div>').join('')+'</div>':'<p>Noch keine vollständige Partie archiviert. Neue beendete Partien erscheinen automatisch hier.</p>')+
 '<div id="v532Viewer" hidden></div>';
 container.appendChild(wrap);
 const viewer=elem('v532Viewer');document.body.appendChild(viewer);
 const handleArchiveClick=e=>{
  const btn=e.target.closest('button');if(!btn)return;
  const all=v532GetArchive(),id=btn.dataset.view||btn.dataset.pgn;
  if(id){const g=all.find(x=>x.id===id);if(!g)return;if(btn.dataset.pgn){v532Download(g);return;}v532Viewed=g;v532Ply=0;v535ArchiveTrial=false;v535ArchiveMoves=[];v535ArchiveSelected=-1;document.body.classList.add('v535ArchiveOpen');v532DrawArchive();return;}
  if(!v532Viewed)return;
  if(btn.dataset.try){v535ArchiveTrial=true;v535ArchiveMoves=[];v535ArchiveSelected=-1;v532DrawArchive();return;}
  if(btn.dataset.reset){v535ArchiveTrial=false;v535ArchiveMoves=[];v535ArchiveSelected=-1;v532DrawArchive();return;}
  if(btn.dataset.undo){v535ArchiveMoves.pop();v535ArchiveSelected=-1;v532DrawArchive();return;}
  if(btn.dataset.sq!==undefined){if(!v535ArchiveTrial)return;const i=Number(btn.dataset.sq),position=v535ArchivePosition(v532Viewed).p;
    if(v535ArchiveSelected>=0){const chosen=legal(position).filter(m=>m.f===v535ArchiveSelected&&m.t===i);if(chosen.length){const m=chosen.find(m=>!m.promo||m.promo==='q')||chosen[0];if(v535ArchiveMoves.length<50)v535ArchiveMoves.push(moveUci(m));v535ArchiveSelected=-1;v532DrawArchive();return;}}
    v535ArchiveSelected=position.board[i]&&color(position.board[i])===position.turn?i:-1;v532DrawArchive();return;}
  if(btn.dataset.step){v535ArchiveTrial=false;v535ArchiveMoves=[];v535ArchiveSelected=-1;v532Ply=Math.max(0,Math.min(v532Viewed.uci.length,v532Ply+Number(btn.dataset.step)));}

  if(btn.dataset.first){v535ArchiveTrial=false;v535ArchiveMoves=[];v535ArchiveSelected=-1;v532Ply=0;}
  if(btn.dataset.last){v535ArchiveTrial=false;v535ArchiveMoves=[];v535ArchiveSelected=-1;v532Ply=v532Viewed.uci.length;}
  if(btn.dataset.close){v532Viewed=null;v535ArchiveTrial=false;document.body.classList.remove('v535ArchiveOpen');elem('v532Viewer').hidden=true;return;}
  v532DrawArchive();
 };wrap.addEventListener('click',handleArchiveClick);viewer.addEventListener('click',handleArchiveClick);
}
function v532DrawArchive(){
 const out=elem('v532Viewer'),g=v532Viewed;if(!out||!g)return;
 const archiveState=v535ArchivePosition(g),{p,last,applied,invalidAt,source,mismatch}=archiveState,moves=g.uci||[];
 let html='<div class="v532ArchiveHead"><div><small>PARTIEARCHIV · '+(v535ArchiveTrial?'EIGENE VARIANTE':'ORIGINALPARTIE')+'</small><b>'+escapeHtml(g.result)+'</b></div><button type="button" data-close="1">✕ Schließen</button></div>';
 html+='<div class="v535ArchiveCoach">'+(v535ArchiveTrial?'Du kannst beide Seiten frei ziehen. Die Originalpartie wird nicht verändert.':(v532Ply===0?'Ausgangsstellung. Gehe mit ▶ Zug für Zug vorwärts oder mit ⏭ direkt zur Endstellung.':'Wähle den nächsten Zug oder starte eine eigene Fortsetzung vom aktuellen Brett.'))+'</div>';
 if(invalidAt>=0||mismatch){
  const available=(source==='snapshot'?'gespeicherte Originalstellung':source==='final'?'gespeicherte Endstellung':null);
  html+='<div class="v545ArchiveWarning" role="status">⚠ Die Zugfolge und die gespeicherte Stellung stimmen nicht vollständig überein. '+(available?'Angezeigt wird die '+available+'.':'Die Wiedergabe konnte nur '+applied+' von '+v532Ply+' Zügen rekonstruieren. Fehlende Positionen werden nicht erfunden.')+'</div>';
 }

 html+='<div class="v532Board" aria-label="Partiebrett nach '+v532Ply+' Halbzügen">';
 const plans=v535ArchiveTrial?legal(p):[];
 for(let i=0;i<64;i++){
  const c=p.board[i],light=(Math.floor(i/8)+i%8)%2===0;
  html+='<button type="button" data-sq="'+i+'" aria-label="'+sq(i)+'" class="v532Square '+(light?'light':'dark')+(last&&(i===last.f||i===last.t)?(v535ArchiveTrial?' planned':' last'):'')+(i===v535ArchiveSelected?' selected':'')+'">'+
    (c?'<img src="./theme_pieces/'+imgMap[c]+'" alt="'+escapeHtml(nm[c.toUpperCase()]||'Figur')+'"/>':'')+
    (v535ArchiveSelected>=0&&plans.some(m=>m.f===v535ArchiveSelected&&m.t===i)?'<span class="v535ArchDot"></span>':'')+'</button>';
 }
 html+='</div><div class="v535ArchiveStatus">'+(source==='moves'?applied:v532Ply)+' / '+moves.length+' Halbzüge'+(v535ArchiveTrial?' · '+v535ArchiveMoves.length+' eigene Varianten-Züge':'')+'</div>';
 html+='<div class="v532ArchiveControls"><button title="Erster Zug" data-first="1">⏮</button><button title="Zurück" data-step="-1">◀</button><button title="Weiter" data-step="1">▶</button><button title="Letzter Zug" data-last="1">⏭</button></div>';
 html+='<div class="v535ArchiveActions">'+(v535ArchiveTrial?'<button data-undo="1" '+(!v535ArchiveMoves.length?'disabled':'')+'>↶ Variante zurück</button><button data-reset="1">↩ Originalpartie</button>':'<button data-try="1">♟ Ab hier vorausspielen</button>')+'</div>';
 out.innerHTML=html;out.hidden=false;
}

function renderProfile(){const el=elem('statsContent');if(!el)return;
 if(gameResult)v532SaveFinishedGame();
 let solved=0,hints=0,best=0,errors=0;try{const p=JSON.parse(localStorage.getItem('schach1001-v1'))||{};solved=Object.keys(p.solved||{}).length;hints=p.hints||0;best=p.best||0;errors=p.errors||0}catch(_){}
 const games=summaryStore.games||[],wins=games.filter(g=>g.score===(g.side==='w'?'1-0':'0-1')&&g.mode==='computer').length,draws=games.filter(g=>g.score==='1/2-1/2').length;
 const train=Object.entries(summaryStore.openings||{}).map(([id,n])=>`<div class="statsLine">${escapeHtml(OPENINGS[id]?.name||id)} <strong>${n}×</strong></div>`).join('')||'<p>Noch keine Eröffnung abgeschlossen.</p>';
 el.innerHTML=`<div class="gameTitle"><h2>📊 Deine Schachentwicklung</h2><p>Alle Daten bleiben lokal auf diesem Gerät.</p></div><div class="statTiles"><div><strong>${solved}/1041</strong><span>Rätsel gelöst</span></div><div><strong>${best}</strong><span>Beste Serie</span></div><div><strong>${games.length}</strong><span>Partien beendet</span></div><div><strong>${wins}</strong><span>Computersiege</span></div><div><strong>${draws}</strong><span>Remispartien</span></div><div><strong>${errors}</strong><span>Rätselfehler</span></div></div><div class="card statSection"><h3>Rätsel-Fortschritt</h3><div class="bar"><div style="width:${Math.max(0,Math.min(100,solved/1041*100))}%"></div></div><p>${(solved/1041*100).toFixed(1)} % geschafft · ${hints} Tipps genutzt</p></div><div class="card statSection"><h3>Eröffnungstrainer</h3>${train}</div><div class="card statSection"><h3>Partien</h3><div class="savedGames">${games.slice(0,15).map((g,i)=>`<button type="button" class="v544GameEntry" data-v544-game="${i}" aria-label="Partie vom ${escapeHtml((g.at||'').slice(0,10))}, ${escapeHtml(g.opponent||'Computer')}, Ergebnis ${escapeHtml(g.score||'?')}, analysieren"><span>${escapeHtml((g.at||'').slice(0,10))} · ${escapeHtml(g.opponent||'Computer')}</span><b>${escapeHtml(g.score||'–')}</b><span class="v544Chevron" aria-hidden="true">›</span></button>`).join('')||'<p>Noch keine abgeschlossene Partie.</p>'}</div></div><p class="quiet">Elo-Zahlen sind keine offiziellen Wertungen. Statistiken werden nicht auf Server übertragen.</p>`;
 const gamesPanel=el.querySelector('.savedGames');
 if(gamesPanel)gamesPanel.addEventListener('click',e=>{
  const button=e.target.closest('button[data-v544-game]');if(!button)return;
  v544OpenGameAnalysis(Number(button.dataset.v544Game));
 });
 v57RenderDashboard();v532RenderArchive();
}
/* V5.44 – Statistikpartien per Berührung öffnen, ohne fremde Spielstände zu verändern. */
function v544OpenGameAnalysis(index){
 const g=(summaryStore.games||[])[index];if(!g)return;
 const archived=v532GetArchive().find(x=>String(x.id)===String(g.id)&&Array.isArray(x.uci));
 // Die vorhandene Analysenavigation verwenden, statt ein zweites Brett oder neue Daten anzulegen.
 const navigate=elem('navAnalysis');if(navigate)navigate.click();
 if(archived){
  v539Source('archive');
  const pick=elem('v539GameChoice');if(pick)pick.value=String(archived.id);
  v539LoadArchive();
  if(v539.archiveGame&&v539.archiveRecords.length){v529PickRecord(0);v539AnalyzeShown()}
  else if(v539.archiveGame)v529Msg('Die Partie wurde geladen, enthält aber keine Züge. Du kannst die Stellung prüfen.');
  const target=elem('v539Picker');if(target)target.scrollIntoView({block:'start',behavior:'instant'});
  return;
 }
 // Alte Statistik-Resultate enthalten nicht immer die Zugliste. Vorhandene Endstellung nutzbar machen.
 v539Source('free');
 const warning='Für diese ältere Partie ist kein vollständiger Zugverlauf gespeichert. '+
  'Du kannst nur die damalige Endstellung frei mit Stockfish analysieren.';
 try{
  if(typeof g.fen!=='string'||!g.fen.trim())throw Error('Keine Endstellung verfügbar');
  v529.request++;v529.position=fromFen(g.fen);v529.index=-1;v529.history=[];
  v529.last=null;v529.mainLast=null;v529.selected=-1;v529.hintStep=0;v529.hintMove=null;
  v529SetMode('trial');v529Draw();v529Msg(warning);
  const state=elem('v539SourceStatus');if(state)state.textContent='Ältere Partie '+String(g.at||'').slice(0,10)+': Endstellung ohne Zugverlauf geladen.';
  v539AnalyzeShown();
 }catch(_){v529Msg('Für diese ältere Partie wurden nur Datum und Ergebnis gespeichert. '+
  'Eine nachträgliche Zug-für-Zug-Analyse ist ohne Partieaufzeichnung nicht möglich.');
  const state=elem('v539SourceStatus');if(state)state.textContent='Partie '+String(g.at||'').slice(0,10)+': Keine gespeicherte Zugfolge oder Endstellung.';
 }
 const target=elem('v539Picker');if(target)target.scrollIntoView({block:'start',behavior:'instant'});
}
function addPuzzlesAdaptive(puzzles){const card=document.createElement('div');card.className='adaptiveBar';card.innerHTML='<strong>🎯 Adaptives Taktiktraining</strong><div class="adaptButtons"><button type="button" class="btn" id="adaptiveWeak">Fehler wiederholen</button><button type="button" class="btn" id="adaptiveNew">Neues ungelöstes Rätsel</button></div><span id="adaptiveInfo">Dein Training orientiert sich an deinen bisherigen Versuchen.</span>';
 puzzles.prepend(card);
 elem('adaptiveWeak').onclick=()=>{try{const all=typeof PUZZLES!=='undefined'?PUZZLES:[];const misses=all.filter(p=>!state.solved[p.id]&&state.attempts[p.id]>0);if(!misses.length){elem('adaptiveInfo').textContent='Keine ungelösten Fehlversuche vorhanden.';return}misses.sort((a,b)=>(state.attempts[b.id]||0)-(state.attempts[a.id]||0));state.current=misses[0].id;save();render();elem('adaptiveInfo').textContent='Wiederholung von Rätsel '+state.current+'.';}catch(e){elem('adaptiveInfo').textContent='Training konnte nicht gestartet werden.'}};
 elem('adaptiveNew').onclick=()=>{try{const all=typeof PUZZLES!=='undefined'?PUZZLES:[];const pool=all.filter(p=>!state.solved[p.id]);if(!pool.length){elem('adaptiveInfo').textContent='Alle Rätsel gelöst.';return}const candidates=pool.slice(0,200);state.current=candidates[Math.floor(Math.random()*candidates.length)].id;save();render();elem('adaptiveInfo').textContent='Neues Rätsel '+state.current+'.';}catch(e){elem('adaptiveInfo').textContent='Training konnte nicht gestartet werden.'}};
}
// V5.7 extensions. Runs inside the existing game closure; old storage keys remain unchanged.
const V57_KEY='schach1001_preferences_v57';
let v57prefs={voice:false,rate:1,variants:false,vibrate:false,boardScale:100};
try{v57prefs={...v57prefs,...JSON.parse(localStorage.getItem(V57_KEY)||'{}')}}catch(_){}
 v57prefs.voiceMode=['aus','kurz','ausfuehrlich'].includes(v57prefs.voiceMode)?v57prefs.voiceMode:(v57prefs.voice?'kurz':'aus');
const v57savePrefs=()=>{try{localStorage.setItem(V57_KEY,JSON.stringify(v57prefs))}catch(_){}};
function v512SyncVoiceUI(){
 const b=elem('homeVoiceToggle'),t=elem('v57Voice'),note=elem('homeVoiceNote'),h=elem('homeVoiceSwitch');
 if(b){b.setAttribute('aria-pressed',String(!!v57prefs.voice));b.textContent=v57prefs.voice?'🔊 Coach-Stimme AN':'🔇 Coach-Stimme AUS';b.classList.toggle('enabled',!!v57prefs.voice)}
 if(h){h.checked=!!v57prefs.voice;h.setAttribute('aria-checked',String(!!v57prefs.voice))}
 if(t)t.checked=!!v57prefs.voice;const mode=elem('v514VoiceMode');if(mode)mode.value=v57prefs.voice?v57prefs.voiceMode:'aus';
 if(note)note.textContent=v57prefs.voice?'Sprachausgabe eingeschaltet':'Sprachausgabe ausgeschaltet';
}
function v512SetVoice(enabled){
 v57prefs.voice=!!enabled;v57prefs.voiceMode=enabled?(v57prefs.voiceMode==='aus'?'kurz':v57prefs.voiceMode):'aus';v57savePrefs();if(!enabled){v57StopSpeech();v59VoiceMessage('Sprach-Coach ausgeschaltet.')}else v59VoiceMessage('Sprach-Coach eingeschaltet.');
 v512SyncVoiceUI();
}

let v57VoiceLast='',v57Replay=null,v57ReplayPicked=-1,v57HintLevel=0,v57OpeningBase='italian';
let v59Audio=null;
function v59VoiceMessage(text){const node=elem('v59VoiceStatus');if(node)node.textContent=text;}
function v59VoiceKind(){
 const c=record.at(-1)?.coach;
 if(!c)return 'bereit';
 return ({'Bester Zug':'bester-zug','Sehr gut':'sehr-gut','Ungenauigkeit':'ungenau','Fehler':'fehler','Patzer':'patzer'})[c.label]||'zug-geprueft';
}
function v59SpeakFallback(){
 try{
  if(v59Audio){v59Audio.pause();v59Audio.currentTime=0;}
  const kind=v59VoiceKind();v59Audio=new Audio('./voice/'+kind+'.mp3');v59Audio.volume=1;
  v59Audio.onerror=()=>v59VoiceMessage('Audiodatei kann nicht abgespielt werden. Bitte Medienlautstärke prüfen.');
  const result=v59Audio.play();if(result?.then)result.then(()=>v59VoiceMessage('Offline-Sprachansage läuft (Kurzfassung).')).catch(e=>v59VoiceMessage('Audio blockiert: Tippe auf 🔊 Testton. '+e.message));
  return true;
 }catch(e){v59VoiceMessage('Audioausgabe nicht möglich: '+e.message);return false;}
}
function v57Speak(text){
 if(!v57prefs.voice)return; if(!window.__schachPuzzlesVisible&&!coachVisible())return;
 const clean=String(text).replace(/\s+/g,' ').slice(0,1100);
 // Native Android-TTS kann in einer späteren Android-Hülle über AndroidTTS eingebunden werden.
 if(window.AndroidTTS&&typeof window.AndroidTTS.speak==='function'){
  try{window.AndroidTTS.speak(clean,Number(v57prefs.rate)||1);v59VoiceMessage('Android-Sprachausgabe gestartet.');return;}catch(_){}
 }
 if(/\bwv\b|; wv\)|Android.*Version\//i.test(navigator.userAgent)&&!window.AndroidTTS){v59SpeakFallback();return;}
 if('speechSynthesis' in window&&typeof SpeechSynthesisUtterance==='function'){
  try{
   speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(clean);u.lang='de-DE';u.rate=Math.max(.7,Math.min(1.4,Number(v57prefs.rate)||1));
   const voices=speechSynthesis.getVoices();const german=voices.find(v=>/^de[-_]/i.test(v.lang));if(german)u.voice=german;
   u.onerror=()=>v59SpeakFallback();speechSynthesis.speak(u);v59VoiceMessage('Deutsche Systemstimme angefordert.');return;
  }catch(_){}
 }
 v59SpeakFallback();
}
window.SchachCoachSpeech={
 sayPuzzle(text){if(!v57prefs.voice)return;v57VoiceLast='';v57Speak(text);},
 enabled(){return !!v57prefs.voice;},
 stop(){v57StopSpeech();}
};
function v57StopSpeech(){if(window.AndroidTTS?.stop)try{window.AndroidTTS.stop()}catch(_){};if('speechSynthesis' in window)try{speechSynthesis.cancel()}catch(_){};if(v59Audio){v59Audio.pause();v59Audio.currentTime=0;}}
function v57NarrateLatest(){const last=record.at(-1);if(!last?.coach||last.coach.source==='none')return;
 const c=last.coach;const text=v57prefs.voiceMode==='kurz'?('Zug '+deSan(last.san)+'. '+c.label+'. '+(c.brief||c.why||'')):('Zug '+deSan(last.san)+'. '+c.label+'. '+c.why+' '+c.positives+' Achtung: '+c.risks+' Nächster Plan: '+c.plan);
 if(text===v57VoiceLast)return;v57VoiceLast=text;v57Speak(text);
}
function v57ErrorCategory(r){const p=fromFen(r.before),after=fromFen(r.after);let captured=legal(after).some(m=>m.t===r.t&&m.capture);
 if(captured)return 'Figurensicherheit';if(r.san.includes('+'))return 'Schach und Gegenschach';
 if(p.full<=10)return 'Eröffnungsentwicklung';if(r.san.includes('x'))return 'Schlagzug berechnen';return 'Stellungsplanung';}
function v57RememberMistake(r){if((setup.mode==='computer'&&r?.actor==='Computer')||!r?.coach||r.coach.source!=='Stockfish 19 Lite'||r.coach.loss<75||!r.coach.bestUci)return;
 const item={id:r.before+'|'+r.uci,fen:r.before,uci:r.uci,best:r.coach.bestUci,label:r.coach.label,loss:r.coach.loss,category:v57ErrorCategory(r),date:new Date().toISOString().slice(0,10)};
 if(!Array.isArray(summaryStore.learningErrors))summaryStore.learningErrors=[];
 const previous=summaryStore.learningErrors.find(x=>x.id===item.id);if(previous){item.stage=previous.stage||0;item.nextDue=previous.nextDue;item.reviews=previous.reviews||0;}summaryStore.learningErrors=summaryStore.learningErrors.filter(x=>x.id!==item.id);summaryStore.learningErrors.unshift(item);summaryStore.learningErrors=summaryStore.learningErrors.slice(0,80);
 persistProfile();v57UpdateReplayCount();}
function v57CoachLearningTip(){
 const t=Array.isArray(summaryStore.learningErrors)?summaryStore.learningErrors:[];
 if(!t.length)return 'Dein erster persönlicher Trainingsschwerpunkt entsteht nach der Stockfish-Analyse einiger Züge.';
 let groups={};for(const e of t){groups[e.category]=(groups[e.category]||0)+1}
 const [topic,count]=Object.entries(groups).sort((a,b)=>b[1]-a[1])[0];
 const guidance={'Figurensicherheit':'Vor jedem Zug fragen: Kann der Gegner die gezogene Figur sofort schlagen?','Eröffnungsentwicklung':'Erst Figuren entwickeln, Zentrum kontrollieren und den König sichern.','Schach und Gegenschach':'Schachgebote, Schlagzüge und Drohungen für beide Seiten prüfen.','Schlagzug berechnen':'Auch nach einem Schlagzug die möglichen Rückschläge zählen.','Stellungsplanung':'Jede gegnerische Drohung prüfen, bevor du deinen eigenen Plan ausführst.'};
 return `Persönlicher Schwerpunkt: ${topic} (${count} wiederkehrende Fälle). ${guidance[topic]||''}`;
}
function v57AugmentCoach(){const detail=elem('gameCoachExpanded');if(!detail||!coachVisible())return;
 const old=detail.querySelector('.v57personal');if(old)old.remove();
 const tip=document.createElement('p');tip.className='v57personal';tip.textContent=v57CoachLearningTip();detail.appendChild(tip);
}
// V5.21: Personal mistake replay with opt-in, staged hints. No existing training data is overwritten.
const V521_TIPS_KEY='schach1001_v521_error_tips';
let v521ShowTips=true;
try{v521ShowTips=localStorage.getItem(V521_TIPS_KEY)!=='off'}catch(_){}
function v521TipsEnabled(){return v521ShowTips;}
function v521Errors(){return Array.isArray(summaryStore.learningErrors)?summaryStore.learningErrors.filter(e=>e&&typeof e.fen==='string'&&typeof e.best==='string'):[];}
function v521RefreshPicker(){
 const select=elem('v521ErrorSelect'),next=elem('v57ReplayNext'),due=elem('v521DueStart');
 if(!select)return;
 const errors=v521Errors(),old=select.value;
 select.replaceChildren();
 for(const [index,e] of errors.entries()){
  const o=document.createElement('option');o.value=String(index);
  o.textContent=(index+1)+'. '+(e.label||'Fehler')+' · '+(e.category||'Stellungsplanung')+' · '+(e.date||'unbekannt');
  select.append(o);
 }
 if(errors.length){select.value=[...select.options].some(x=>x.value===old)?old:'0';}
 else {const o=document.createElement('option');o.textContent='Noch keine analysierten Fehler';o.value='';select.append(o);}
 if(next)next.disabled=!errors.length;
 if(due)due.disabled=!errors.length;
 const start=elem('v521PickStart');if(start)start.disabled=!errors.length;
 const note=elem('v521ErrorSummary');if(note){
  const dueCount=v58DueErrors().length;
  note.textContent=errors.length?errors.length+' persönliche Fehler gespeichert · '+dueCount+' zur Wiederholung fällig. Wähle einen Fehler aus deinen eigenen analysierten Partien.':
  'Noch keine eigenen Stockfish-Fehler gespeichert. Spiele eine Partie und öffne Training → Analyse → „Partie mit Stockfish analysieren“. Danach erscheinen die trainierbaren Stellungen hier.';
 }
}
function v521RefreshReplay(){
 const replay=elem('v57Replay'),hint=elem('v57ReplayHint'),status=elem('v521TrainingState');
 if(hint){hint.disabled=!v521ShowTips||!v57Replay||v57Replay.solved||v57HintLevel>=2;hint.textContent='💡 '+(v57HintLevel===0?'1. Figur zeigen':v57HintLevel===1?'2. Zug zeigen':'Zug bereits gezeigt');}
 if(status)status.textContent=v57Replay?('Deine Versuche: '+v57Replay.tries+' · Hilfestufe: '+v57HintLevel+'/2'+(v57Replay.solved?' · Stellung gelöst':' · Dein Zug')):'Wähle eine Stellung und versuche, den besten Zug zu finden.';
 if(replay&&!replay.hidden&&v57Replay){const sel=elem('v521ErrorSelect'),i=v521Errors().findIndex(e=>e.id===v57Replay.item.id);if(sel&&i>=0)sel.value=String(i);}
}
function v521WrongGuess(){
 if(!v57Replay)return;
 if(v521ShowTips&&v57HintLevel<2){v57ReplayHint();}
 else if(!v521ShowTips){elem('v57ReplayResult').textContent='❌ Nicht der von Stockfish ermittelte beste Zug. Versuche es erneut – Tipps sind ausgeschaltet.';}
 v521RefreshReplay();
}
function v521Solved(independent){
 const status=elem('v57ReplayResult');
 if(status)status.textContent+=' '+(independent?'Ohne Hilfe gelöst – nächstes Wiederholungsintervall freigeschaltet.':'Mit weiteren Versuchen oder Tipps gelöst – zur Festigung morgen erneut üben.');
 v521RefreshPicker();v521RefreshReplay();
}
function v521Init(){
 const replay=elem('v57Replay'),count=elem('v57ReplayCount');if(!replay||!count)return;
 const controls=document.createElement('section');controls.id='v521ReplayControls';controls.className='v521ReplayControls';
 controls.innerHTML='<h4>🔁 Eigene Fehler erneut spielen</h4><p class="v521HintInfo">Das Übungsbrett ist unabhängig von deiner laufenden Partie. Die Stellungen stammen ausschließlich aus deinen echten Stockfish-Analysen.</p>'+
 '<label class="v521SelectLabel" for="v521ErrorSelect">Fehler aus deinen Partien auswählen</label><select id="v521ErrorSelect" aria-label="Gespeicherten Fehler auswählen"></select>'+
 '<div class="v521Actions"><button type="button" id="v521PickStart">♟ Ausgewählten Fehler spielen</button><button type="button" id="v521DueStart">↻ Fälligen Fehler üben</button><button type="button" id="v521GoAnalysis">🔎 Partie analysieren</button></div>'+
 '<div class="v521ToggleRow"><div><b>💡 Tipps beim falschen Zug</b><small>1. Richtige Figur auf dem Brett zeigen · 2. Zug mit grünem Pfeil zeigen.</small></div><label class="v521Switch" aria-label="Coach-Tipps für Fehlertraining ein- oder ausschalten"><input id="v521TipsSwitch" type="checkbox" role="switch" aria-label="Coach-Tipps automatisch nach falschen Zügen geben"><span class="v521Track"></span></label></div>'+
 '<p id="v521ErrorSummary" class="v521HintInfo" role="status"></p>';
 count.insertAdjacentElement('afterend',controls);
 const state=document.createElement('p');state.id='v521TrainingState';state.className='v521HintInfo';state.setAttribute('role','status');
 replay.querySelector('#v57ReplayResult').before(state);
 // A compact German coach bubble sits directly above the replay board.
 const bubble=document.createElement('div');bubble.id='v522CoachHint';bubble.className='v522CoachHint';bubble.hidden=true;
 bubble.innerHTML='<span class="v522CoachAvatar" aria-hidden="true">🧠</span><div class="v522CoachBubble"><strong id="v522CoachStage">Tipp</strong><p id="v522CoachText"></p></div>';
 elem('v57ReplayBoard').before(bubble);
 const oldHint=elem('v57ReplayHint');oldHint.textContent='💡 Tipp 1 zeigen';
 oldHint.addEventListener('click',()=>v521RefreshReplay());
 const toggle=elem('v521TipsSwitch');toggle.checked=v521ShowTips;
 toggle.onchange=()=>{
  v521ShowTips=toggle.checked;
  try{localStorage.setItem(V521_TIPS_KEY,v521ShowTips?'on':'off')}catch(_){}
  if(!v521ShowTips&&v57Replay&&!v57Replay.solved){v57HintLevel=0;elem('v57ReplayResult').textContent='Tipps deaktiviert. Finde den besten Zug ohne weitere Hilfe.';v57DrawReplay();}
  v521RefreshReplay();
 };
 elem('v521PickStart').onclick=()=>{const item=v521Errors()[Number(elem('v521ErrorSelect').value)];if(item)v57OpenReplay(item);};
 elem('v521DueStart').onclick=()=>{const due=v58DueErrors().filter(e=>e&&e.fen&&e.best),list=due.length?due:v521Errors();if(list.length)v57OpenReplay(list[0]);};
 elem('v521GoAnalysis').onclick=()=>elem('v516Analysis')?.click();
 elem('v57ReplayNext').textContent='Nächsten persönlichen Fehler spielen →';
 elem('v57ReplayClose').addEventListener('click',()=>{v521RefreshReplay()});
 const css=document.createElement('style');css.id='v521Styles';css.textContent=`
 .v521ReplayControls{padding:14px;margin:10px 0;border:1px solid #526b57;border-radius:13px;background:#1e2a23;color:#e9f4e6}
 .v521ReplayControls h4{margin:0 0 6px;font-size:17px}
 .v521HintInfo{color:#bccdc1;font-size:12px;line-height:1.5;margin:8px 0 12px}
 .v521SelectLabel{display:block;font-weight:750;font-size:13px;margin-bottom:6px}
 #v521ErrorSelect{display:block;width:100%;max-width:100%;color:#fff;background:#27332d;border:1px solid #698470;border-radius:10px;padding:12px 9px;font-size:14px;min-height:46px}
 .v521Actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
 .v521Actions button{background:#3b6242;border:1px solid #7fac7c;border-radius:10px;color:#f0fcec;min-height:47px;font-size:12px;font-weight:750;padding:7px 4px}
 .v521Actions button:last-child{grid-column:span 2;background:#293b31}
 .v521Actions button:disabled,#v57ReplayHint:disabled{opacity:.5;cursor:not-allowed}
 .v521ToggleRow{display:flex;align-items:center;gap:14px;justify-content:space-between;background:#2a3930;padding:12px;border-radius:10px;border:1px solid #435d48}
 .v521ToggleRow b{display:block;font-size:14px}.v521ToggleRow small{display:block;color:#c0d1c3;font-size:12px;margin-top:5px;line-height:1.4}
 .v521Switch{position:relative;display:inline-flex;flex-shrink:0;width:54px;height:32px;align-items:center;cursor:pointer}
 .v521Switch input{position:absolute;opacity:0;width:54px;height:32px;margin:0}
 .v521Track{display:block;background:#69726c;width:54px;height:30px;border-radius:20px;transition:background .15s;position:relative}
 .v521Track:before{content:'';position:absolute;left:4px;top:4px;border-radius:50%;height:22px;width:22px;background:white;transition:transform .15s}
 .v521Switch input:checked+.v521Track{background:#569c61}.v521Switch input:checked+.v521Track:before{transform:translateX(24px)}
 .v521Switch input:focus-visible+.v521Track{outline:3px solid #bde9c4;outline-offset:2px}
 #v57Replay #v57ReplayResult{line-height:1.55;font-size:14px;min-height:48px}
 #v57ReplayBoard{position:relative}
 #v57ReplayBoard .v57square.v522PieceHint{background:#43a48e!important;box-shadow:inset 0 0 0 3px #eaffcb;z-index:1;position:relative}
 #v57ReplayBoard .v57square.v522TargetHint{background:#cfdf67!important}
 #v57ReplayBoard .v522HintArrow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;overflow:visible}
 .v522CoachHint[hidden]{display:flex!important;visibility:hidden!important;pointer-events:none}
 .v522CoachHint{display:flex;align-items:end;gap:9px;margin:12px auto 6px;width:100%;max-width:410px;min-height:75px}
 .v522CoachAvatar{flex-shrink:0;font-size:29px;background:#2b3932;border:1px solid #526c5c;border-radius:50%;width:47px;height:47px;display:grid;place-items:center}
 .v522CoachBubble{flex:1;background:#f7f8f4;color:#202923;border-radius:13px;padding:10px 13px;position:relative;box-shadow:0 2px 8px #0004}
 .v522CoachBubble:before{content:'';position:absolute;left:-7px;bottom:16px;border:7px solid transparent;border-right-color:#f7f8f4;border-left:0}
 .v522CoachBubble strong{font-size:14px}.v522CoachBubble p{margin:3px 0 0;font-size:14px;line-height:1.45}
 @media(max-width:500px){.v522CoachHint{max-width:335px}}
 
 `;
 document.head.append(css);
 v521RefreshPicker();v521RefreshReplay();
 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {
  v521Mistakes:()=>v521Errors().map(e=>({...e})),v521HintsEnabled:()=>v521ShowTips,
  v521Start:()=>{const item=v521Errors()[0];if(item)v57OpenReplay(item)},
  v521Current:()=>v57Replay?{id:v57Replay.item.id,tries:v57Replay.tries,hintLevel:v57HintLevel,solved:v57Replay.solved}:null,
  v521RefreshPicker
 });
}

function v57OpenReplay(item){
 const box=elem('v57Replay');if(!box)return;
 try{const position=fromFen(item.fen);if(!legal(position).find(m=>moveUci(m)===item.best))throw new Error('Ungültige Musterstellung');
 v57Replay={item,position,solved:false,tries:0};v57ReplayPicked=-1;v57HintLevel=0;
 box.hidden=false;elem('v57ReplayResult').textContent='Dein alter Fehler: '+item.label+'. Finde diesmal eine stärkere Fortsetzung. Noch keine Lösung eingeblendet.';
 v57DrawReplay();v521RefreshReplay();}catch(e){box.hidden=false;elem('v57ReplayResult').textContent='Diese Stellung kann nicht erneut geladen werden.';v521RefreshReplay();}
}
function v57DrawReplay(){const board=elem('v57ReplayBoard');if(!board||!v57Replay)return;board.innerHTML='';
 const p=v57Replay.position;let selection=v57ReplayPicked;
 const best=v57Replay.item.best,origin=idx(best.slice(0,2)),target=idx(best.slice(2,4));
 const stage=!v57Replay.solved&&v521ShowTips?v57HintLevel:0;
 const coach=elem('v522CoachHint');if(coach){coach.hidden=stage===0;
  if(stage){elem('v522CoachStage').textContent=stage===1?'💡 Tipp 1 · Richtige Figur':'💡 Tipp 2 · Der Zug';
   const name=nm[p.board[origin]?.toUpperCase()]||'Figur';
   elem('v522CoachText').textContent=stage===1?'Schau dir den '+name+' auf '+sq(origin)+' an. Welches Feld ist am stärksten?':'Ziehe den '+name+' von '+sq(origin)+' nach '+sq(target)+'. Folge dem grünen Pfeil.';
  }}
 for(let i=0;i<64;i++){
 const cell=document.createElement('button');cell.type='button';cell.className='v57square '+((Math.floor(i/8)+i%8)%2?'dark':'light')+(selection===i?' selected':'');
 if(stage>=1&&i===origin)cell.classList.add('v522PieceHint');
 if(stage>=2&&i===target)cell.classList.add('v522TargetHint');
 cell.setAttribute('aria-label',sq(i));const pc=p.board[i];if(pc){const img=document.createElement('img');img.src='./theme_pieces/'+imgMap[pc];img.alt=(isW(pc)?'Weißer ':'Schwarzer ')+nm[pc.toUpperCase()];cell.appendChild(img)}
 cell.onclick=()=>{
  if(v57Replay.solved)return;
  if(selection>=0){const all=legal(p);let m=all.find(m=>m.f===selection&&m.t===i);if(m){const u=moveUci(m);v57Replay.tries++;if(u===v57Replay.item.best){v57Replay.solved=true;v57Replay.position=move(p,m);elem('v57ReplayResult').textContent='✔ Richtig! '+deSan(notation(p,m,all))+' war der beste Stockfish-Zug. Du hast den Fehler selbst korrigiert.';v57ReplayPicked=-1;
    summaryStore.replayed=(summaryStore.replayed||0)+1;const independent=v57HintLevel===0&&v57Replay.tries===1;v58MarkReplay(independent);persistProfile();v57DrawReplay();v521Solved(independent);return;}
   elem('v57ReplayResult').textContent='Noch nicht. Prüfe Schachgebote, Schlagzüge und Drohungen. Die Partie bleibt unverändert.';v58MarkReplay(false);v57ReplayPicked=-1;v57DrawReplay();v521WrongGuess();return;}}
  v57ReplayPicked=pc&&color(pc)===p.turn?i:-1;v57DrawReplay();
 };board.appendChild(cell);
 }
 if(stage>=2&&origin>=0&&target>=0){
   const x=i=>((i%8)*100+50),y=i=>(Math.floor(i/8)*100+50);
   const x1=x(origin),y1=y(origin),x2=x(target),y2=y(target),dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;
   const ex=x2-dx/len*28,ey=y2-dy/len*28;
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 800 800');svg.setAttribute('aria-hidden','true');svg.classList.add('v522HintArrow');
   const ns='http://www.w3.org/2000/svg',defs=document.createElementNS(ns,'defs'),marker=document.createElementNS(ns,'marker'),path=document.createElementNS(ns,'path');
   marker.id='v522GreenArrowHead';marker.setAttribute('markerWidth','8');marker.setAttribute('markerHeight','8');marker.setAttribute('refX','5');marker.setAttribute('refY','3');marker.setAttribute('orient','auto');
   path.setAttribute('d','M0,0 L0,6 L6,3 z');path.setAttribute('fill','#a6dc43');marker.append(path);defs.append(marker);svg.append(defs);
   const line=document.createElementNS(ns,'line');line.setAttribute('x1',x1);line.setAttribute('y1',y1);line.setAttribute('x2',ex);line.setAttribute('y2',ey);
   line.setAttribute('stroke','#a6dc43');line.setAttribute('stroke-width','19');line.setAttribute('stroke-linecap','round');line.setAttribute('opacity','.9');line.setAttribute('marker-end','url(#v522GreenArrowHead)');svg.append(line);board.append(svg);
 }
}
function v57UpdateReplayCount(){const el=elem('v57ReplayCount');if(el)el.textContent=(summaryStore.learningErrors||[]).length+' analysierte Fehler zum Nachspielen';v521RefreshPicker();}
function v57ReplayHint(){
 if(!v57Replay||v57Replay.solved)return;
 if(!v521TipsEnabled()){elem('v57ReplayResult').textContent='Tipps sind ausgeschaltet. Aktiviere den Schalter für Hilfe.';return;}
 const m=legal(v57Replay.position).find(x=>moveUci(x)===v57Replay.item.best);if(!m)return;
 v57HintLevel=Math.min(2,v57HintLevel+1);
 const pc=v57Replay.position.board[m.f],piece=nm[pc.toUpperCase()]||'Figur';
 elem('v57ReplayResult').textContent=v57HintLevel===1?'Hinweis 1: Die richtige Figur ist farbig markiert. Finde selbst ihr Zielfeld.':
 'Hinweis 2: Der grüne Pfeil zeigt den Zug von '+sq(m.f)+' nach '+sq(m.t)+'. Versuche den Zug auf dem Brett.';
 v57DrawReplay();v521RefreshReplay();
}
async function v57GameHint(){v57HintLevel=Math.min(3,v57HintLevel+1);const el=elem('v57GameHintText');if(!el)return;
 if(v57HintLevel===1){el.textContent='Stufe 1 · Idee: Was droht der Gegner? Prüfe Schachs, Schlagzüge und ungeschützte Figuren.';return;}
 const fen=toFen(pos);try{
  el.textContent='Stockfish prüft die Stellung …';const a=await window.analyzeFen(fen,10);if(fen!==toFen(pos))return;
  const m=legal(pos).find(x=>moveUci(x)===a.bestmove);if(!m)throw Error('Kein legaler Zug');
  el.textContent=v57HintLevel===2?'Stufe 2 · Figur: Beachte den '+nm[pos.board[m.f].toUpperCase()]+' auf '+sq(m.f)+'.':'Stufe 3 · Bester Zug: '+deSan(notation(pos,m,legal(pos)))+' ('+sq(m.f)+'–'+sq(m.t)+').';
 }catch(e){el.textContent='Stockfish ist nicht verfügbar. Es wird kein Ersatz-Zug erfunden.';}
}
function v57NewDaily(){const day=new Date().toISOString().slice(0,10),p=JSON.parse(localStorage.getItem('schach1001-v1')||'{}');
 if(!summaryStore.daily||summaryStore.daily.day!==day){summaryStore.daily={day,puzzles:Object.keys(p.solved||{}).length,openings:Object.values(summaryStore.openings||{}).reduce((a,b)=>a+b,0),analyses:summaryStore.studyChecks||0};persistProfile();}
 return summaryStore.daily;}
function v57TrainingRating(g){
 if(g.mode!=='computer')return;const opp=Math.max(400,Math.min(2800,Number(setup.elo)||1000)),before=Number(summaryStore.trainingRating)||1000;
 const actual=g.score===(setup.side===W?'1-0':'0-1')?1:g.score==='1/2-1/2'?.5:0;
 const expected=1/(1+Math.pow(10,(opp-before)/400));summaryStore.trainingRating=Math.round(Math.min(2400,Math.max(100,before+24*(actual-expected))));summaryStore.ratedGames=(summaryStore.ratedGames||0)+1;
}
function v57Accuracy(losses){if(!losses.length)return null;const avg=losses.reduce((a,b)=>a+b,0)/losses.length;
 // Transparent non-official heuristic; not the Chess.com accuracy formula.
 return {accuracy:Math.round(Math.max(0,Math.min(100,100*Math.exp(-avg/270)))),average:Math.round(avg)};
}
function v57RenderDashboard(){const el=elem('statsContent');if(!el)return;
 const old=elem('v57Dashboard');if(old)old.remove();
 const d=v57NewDaily();let p={};try{p=JSON.parse(localStorage.getItem('schach1001-v1')||'{}')}catch(_){};
 const solved=Object.keys(p.solved||{}).length,openings=Object.values(summaryStore.openings||{}).reduce((a,b)=>a+b,0);
 const a=summaryStore.accuracyHistory||[],recent=a.slice(-6),today=[{name:'Ein neues Rätsel lösen',ok:solved>d.puzzles},{name:'Eine Eröffnung trainieren',ok:openings>d.openings},{name:'Eine Partie analysieren',ok:(summaryStore.studyChecks||0)>d.analyses}];
 const panel=document.createElement('section');panel.id='v57Dashboard';panel.className='card statSection';
 panel.innerHTML='<h3>🏅 Lokales Trainingsrating</h3><p><b>'+(summaryStore.trainingRating||1000)+'</b> Trainingspunkte · '+(summaryStore.ratedGames||0)+' Computerpartien. Kein offizielles Elo, Computerstärken sind Schätzungen.</p>'+
 '<h3>🎯 Herausforderungen heute</h3>'+today.map(t=>'<p>'+(t.ok?'✅':'○')+' '+escapeHtml(t.name)+'</p>').join('')+
 '<h3>📊 Genauigkeit nach Stockfish-Analyse</h3><p>'+ (recent.length?recent.map(x=>escapeHtml(x.day)+' · '+x.accuracy+' % (Schätzwert)').join(' · '):'Noch keine vollständige Partieanalyse.')+'</p>'+
 '<h3>🧠 Häufigste Fehler</h3><p>'+escapeHtml(v57CoachLearningTip())+'</p><p class="quiet">Die Genauigkeit ist ein transparenter eigener Schätzwert aus Bewertungsverlusten, keine offizielle Messung.</p>';
 el.appendChild(panel);
}
function v57Snapshot(){const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^schach1001[-_]/.test(k)&&k!=='schach1001_backup_autosave_v57'&&k!=='schach1001_autorecovery_v58'&&k!=='schach1001_backup_pre515')data[k]=localStorage.getItem(k)}return {app:'Schach 1001+ Pro',version:57,created:new Date().toISOString(),data};}
function v57Checksum(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
function v57ExportBackup(){try{
 const snap=v57Snapshot(),payload=JSON.stringify(snap.data);snap.checksum=v57Checksum(payload);const encoded=JSON.stringify(snap,null,2);
 if(JSON.parse(encoded).checksum!==v57Checksum(JSON.stringify(JSON.parse(encoded).data)))throw Error('Rückleseprüfung fehlgeschlagen');
 const a=document.createElement('a');a.download='Schach1001-Backup-'+new Date().toISOString().slice(0,10)+'.json';a.href=URL.createObjectURL(new Blob([encoded],{type:'application/json'}));document.body.appendChild(a);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);a.remove();elem('v57BackupStatus').textContent='Backup erfolgreich erzeugt und auf Lesbarkeit geprüft: '+Object.keys(snap.data).length+' Datensätze.';
 }catch(e){elem('v57BackupStatus').textContent='Backup fehlgeschlagen: '+e.message}}
async function v57ImportBackup(file){if(!file)return;
 try{if(file.size>6*1024*1024)throw Error('Datei zu groß');const b=JSON.parse(await file.text());
 if(b.app!=='Schach 1001+ Pro'||!b.data||typeof b.data!=='object'||!Object.keys(b.data).length)throw Error('Kein gültiges Schach-Backup');
 if(b.checksum!==v57Checksum(JSON.stringify(b.data)))throw Error('Prüfsumme falsch, Datei verändert oder beschädigt');
 const keys=Object.keys(b.data);if(keys.some(k=>!/^schach1001[-_]/.test(k)||typeof b.data[k]!=='string'))throw Error('Unerlaubte oder ungültige Backup-Daten');
 for(const k of ['schach1001-v1','schach1001_analysis_v2','schach1001_profile_v4','schach1001_preferences_v57'])if(k in b.data)JSON.parse(b.data[k]);
 if(!confirm('Backup importieren? Vorhandene Schach-Daten mit denselben Schlüsseln werden ersetzt.'))return;
 const before=v57Snapshot();try{localStorage.setItem('schach1001_backup_autosave_v57',JSON.stringify(before.data))}catch(_){}
 for(const k of keys)localStorage.setItem(k,b.data[k]);elem('v57BackupStatus').textContent='Backup importiert. App wird neu geladen.';window.location.reload();
 }catch(e){elem('v57BackupStatus').textContent='Import abgelehnt: '+e.message}}
function v57Init(){
 // No eager voice permission: speech only on user opt-in, engine only when requested.
 const speech=elem('v57Voice'),rate=elem('v57VoiceRate');if(speech){speech.checked=!!v57prefs.voice;speech.disabled=false;speech.onchange=()=>v512SetVoice(speech.checked)};
 if(rate){rate.value=v57prefs.rate;rate.onchange=()=>{v57prefs.rate=Number(rate.value);v57savePrefs()}};
 const testVoice=elem('v59TestVoice');if(testVoice)testVoice.onclick=()=>v59SpeakFallback();
 const vibrate=elem('v57Vibrate');if(vibrate){vibrate.checked=v57prefs.vibrate;vibrate.onchange=()=>{v57prefs.vibrate=vibrate.checked;v57savePrefs()}};
 const scale=elem('v57BoardScale');if(scale){scale.value=v57prefs.boardScale;scale.oninput=()=>{v57prefs.boardScale=Number(scale.value);document.documentElement.style.setProperty('--chessScale',v57prefs.boardScale/100);elem('v57BoardScaleValue').textContent=v57prefs.boardScale+' %';v57savePrefs()};scale.oninput()}
 elem('v57GameHint').onclick=v57GameHint;
 elem('v57ReplayNext').onclick=()=>{const list=v521Errors();if(!list.length){elem('v57ReplayCount').textContent='Noch keine eigenen Fehler gespeichert. Analysiere deine Partie mit Stockfish.';return;}const next=v57Replay?Math.max(0,list.findIndex(x=>x.id===v57Replay.item.id)+1)%list.length:0;v57OpenReplay(list[next]);};
 elem('v57ReplayHint').onclick=v57ReplayHint;
 elem('v57ReplayClose').onclick=()=>{elem('v57Replay').hidden=true;v57Replay=null};v57UpdateReplayCount();
 elem('v57OpeningVariants').checked=!!v57prefs.variants;elem('v57OpeningVariants').onchange=e=>{v57prefs.variants=e.target.checked;v57savePrefs();v57OpeningBase=openingId;trainingMessage()};
 elem('v57ExportBackup').onclick=v57ExportBackup;elem('v57ImportBackup').onchange=e=>{v57ImportBackup(e.target.files[0]);e.target.value=''};
 window.addEventListener('pagehide',()=>{persist();persistProfile();v57StopSpeech()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();v57StopSpeech()}});
 v57RenderDashboard();
}
function v57OpeningOptions(){if(!v57prefs.variants)return [opening()];
 const current=record.map(r=>r.uci),base=OPENINGS[v57OpeningBase]||opening();
 return Object.entries(OPENINGS).filter(([id,o])=>o.side===base.side&&(o.group===base.group||o.uci.slice(0,4).join()===base.uci.slice(0,4).join())&&current.every((u,i)=>o.uci[i]===u)&&o.uci.length>current.length).map(([id,o])=>({...o,id}));
}

const V57_HTML=`<section class="card extraPanel" id="v57TrainingPanel"><h3>🎓 Lernmodus · Drei Hilfestufen</h3><p class="quiet">Die Lösung erscheint erst bei Hinweis 3. Stockfish 19 Lite bleibt die einzige Quelle für Zugempfehlungen.</p><div class="toolButtons"><button type="button" class="btn" id="v57GameHint">💡 Nächster Hinweis</button></div><p id="v57GameHintText" class="v57hint">Hinweis 1: Idee · Hinweis 2: Figur · Hinweis 3: Zug</p></section>
<section class="card extraPanel"><h3>♟ Eigene Fehler nachspielen</h3><p id="v57ReplayCount" class="quiet">Noch keine Fehler bewertet.</p><div class="toolButtons"><button type="button" class="btn primary" id="v57ReplayNext">Fehlertraining starten / Nächster</button></div><div id="v57Replay" hidden><div id="v57ReplayBoard" class="v57ReplayBoard" aria-label="Übungsbrett ohne Einfluss auf die laufende Partie"></div><p id="v57ReplayResult" class="v57hint" aria-live="polite"></p><div class="toolButtons"><button type="button" class="btn" id="v57ReplayHint">Nächster Tipp</button><button type="button" class="btn" id="v57ReplayClose">Schließen</button></div></div></section>
<section class="card extraPanel"><h3>🎛 Bedienung & deutscher Sprach-Coach</h3><div class="v57setting"><label><input type="checkbox" id="v57Voice"> Zugerklärungen auf Deutsch vorlesen</label><label>Tempo <select id="v57VoiceRate"><option value="0.8">Langsam</option><option value="1">Normal</option><option value="1.2">Schnell</option></select></label></div><div class="v57setting"><button type="button" class="btn" id="v59TestVoice">🔊 Deutsche Sprachansage testen</button><span id="v59VoiceStatus" role="status" aria-live="polite">Falls Android keine Browser-Sprachausgabe unterstützt, wird eine mitgelieferte deutsche Kurzansage abgespielt. Die ausführliche Erklärung bleibt als Text.</span></div><div class="v57setting"><label><input type="checkbox" id="v57Vibrate"> Kurzes Vibrationsfeedback nach Zügen</label></div><div class="v57setting"><label for="v57BoardScale">Brettgröße <strong id="v57BoardScaleValue">100 %</strong></label><input type="range" id="v57BoardScale" min="70" max="100" step="5" value="100"></div><p class="quiet">Deutsche Kurzansagen funktionieren offline. Vollständige Textvorlesung setzt System-TTS bzw. eine native Android-TTS-Anbindung voraus.</p></section>
<section class="card extraPanel"><h3>💾 Sicherung & Datenübernahme</h3><p class="quiet">Exportiert Rätselstand, laufende Partie, Uhren, Eröffnungen, Coach-Fehler, Rating und Einstellungen als JSON. Import kann bestehende Daten überschreiben.</p><div class="toolButtons"><button type="button" id="v57ExportBackup" class="btn primary">Backup exportieren</button><label class="v57ImportLabel">Backup importieren<input type="file" id="v57ImportBackup" accept="application/json,.json" hidden></label></div><p id="v57BackupStatus" class="quiet" role="status">Daten bleiben auf dem Gerät. Speicherstände werden nach jedem Zug gesichert.</p></section>`;
const PRO_GAME_HTML=`<div id="openingTrainer" class="card extraPanel" hidden><h3>📘 Eröffnungstrainer · 47 Varianten</h3><div class="gameConfig"><label>Eröffnung<select id="openingPick" aria-label="Eröffnung auswählen"></select></label><button type="button" id="openingRestart" class="btn">↻ Übung neu starten</button></div><label class="v57Variants"><input type="checkbox" id="v57OpeningVariants"> Gegnerische Antworten und passende Abzweigungen aus den 47 vorhandenen Varianten üben</label><div id="openingGuidance" class="gameText">Lerne eine Zugfolge und ihren strategischen Zweck.</div></div>
<div class="card extraPanel" id="gameCoachPanel"><h3>🧠 Deutscher Schach-Coach</h3><div id="gameCoachText" class="gameText">Entwickle deine Figuren und kontrolliere das Zentrum.</div><button type="button" class="btn" id="gameBest" hidden>🔍 Besten Zug neu berechnen</button><div class="gameBestReadout" id="gameBestReadout" role="status" aria-live="polite" hidden></div><div id="gameCoachHistory" class="gameCoachHistory"></div><p class="quiet">Zugbewertungen und bester Zug kommen immer von Stockfish 19 Lite (offline). Ist Stockfish nicht erreichbar, erfolgt keine Ersatzbewertung.</p></div>
<div class="card extraPanel"><h3>📈 Partieanalyse</h3><div class="toolButtons"><button type="button" class="btn" id="gameReview">Mit Stockfish bewerten</button><button type="button" class="btn" id="gameSfReview">Mit Stockfish prüfen</button><button type="button" class="btn" id="gameExport">PGN exportieren</button></div><div id="moveReview"></div><div id="sfReview" class="quiet"></div></div>
<div class="card extraPanel"><h3>♜ Turnierregeln & Partieabschluss</h3><div class="toolButtons"><button type="button" class="btn warn" id="gameResign">Aufgeben</button><button type="button" class="btn" id="gameOffer">Remis anbieten</button><button type="button" class="btn" id="gameClaim">Remis beanspruchen</button></div><small>Schachmatt, Patt, Dreifachwiederholung, 50-Züge-Regel, Zeitüberschreitung und PGN.</small></div>`;

/* V5.8: Erweiterte Profiwerkzeuge. Innerhalb der Spiel-IIFE, getrennte Lernbretter.
   Alte Schlüssel schach1001-v1 / schach1001_analysis_v2 / schach1001_profile_v4 bleiben unverändert. */
const V58_KEY='schach1001_preferences_v58';
let v58prefs={depth:12,lines:3,theme:'klassisch',animation:240,adaptive:false,style:'ausgeglichen',autosave:true};
try{v58prefs={...v58prefs,...JSON.parse(localStorage.getItem(V58_KEY)||'{}')}}catch(_){}
const v58SavePrefs=()=>{try{localStorage.setItem(V58_KEY,JSON.stringify(v58prefs))}catch(_){}};
const v58DAY=86400000;
function v58Today(){return new Date().toISOString().slice(0,10)}
function v58NextDate(n){let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function v58Escape(s){return escapeHtml(String(s||''))}
function v58Board(b,container,click,focus){const root=elem(container);if(!root)return;
 root.innerHTML='';root.className='v57ReplayBoard v58SubBoard';
 for(let i=0;i<64;i++){const cell=document.createElement('div');cell.className='v57square '+((Math.floor(i/8)+i%8)%2===0?'light':'dark');cell.dataset.i=i;
 if(i===focus)cell.classList.add('picked');const pc=b.board[i];
 if(pc){let img=document.createElement('img');img.className='gamePiece';img.src='./theme_pieces/'+imgMap[pc];img.alt=(isW(pc)?'Weiße ':'Schwarze ')+nm[pc.toUpperCase()];img.draggable=false;cell.append(img)}
 if(click)cell.onclick=()=>click(i);root.append(cell);
 }
}
function v58SanNormalize(x){return String(x||'').replace(/^0-0-0$/i,'O-O-O').replace(/^0-0$/i,'O-O').replace(/[!?+#]+/g,'').replace(/e\.?p\.?$/i,'').replace(/\s/g,'').toLowerCase()}
function v58TokenizePGN(text){
 const tags={};text=String(text||'');if(text.length>750000)throw new Error('PGN ist zu groß (maximal 750 KB)');
 text=text.replace(/^\s*\[([^\]\s]+)\s+"((?:\\.|[^"\\])*)"\s*\]\s*$/gm,(_,k,v)=>{tags[k]=v.replace(/\\"/g,'"');return ''});
 // Entfernt verschachtelte Varianten, Kommentare, NAGs und Zeilenkommentare.
 let clean='',depth=0,curly=false,line=false;for(let i=0;i<text.length;i++){let c=text[i];if(line){if(c==='\n')line=false;continue}if(curly){if(c==='}')curly=false;continue}if(c===';'){line=true;continue}if(c==='{'){curly=true;continue}if(c==='('){depth++;continue}if(c===')'){depth=Math.max(0,depth-1);continue}if(depth===0)clean+=c;}
 clean=clean.replace(/\$\d+/g,' ').replace(/\d+\.(?:\.\.)?/g,' ');
 return {tags,tokens:clean.split(/\s+/).map(s=>s.trim()).filter(Boolean).filter(s=>!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(s))};
}
let v58Import=null,v58ImportIndex=0;
function v58ParsePGN(text){let {tags,tokens}=v58TokenizePGN(text),p=tags.SetUp==='1'&&tags.FEN?fromFen(tags.FEN):fromFen(startFen);
 let positions=[toFen(p)], moves=[];if(!tokens.length)throw new Error('Die PGN-Datei enthält keine Züge.');
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i];if(!token||/^\d+\.?$/.test(token))continue;
  const all=legal(p),norm=v58SanNormalize(token),m=all.find(m=>v58SanNormalize(notation(p,m,all))===norm||moveUci(m)===norm);
  if(!m)throw new Error('PGN-Zug '+(i+1)+' „'+token+'“ passt nicht zur Stellung.');
  moves.push({uci:moveUci(m),san:notation(p,m,all)});p=move(p,m);positions.push(toFen(p));
  if(moves.length>400)throw new Error('Maximal 400 Halbzüge pro importierter Partie.');
 }
 return {tags,moves,positions};
}
function v58ImportDraw(){if(!v58Import)return;const n=Math.max(0,Math.min(v58ImportIndex,v58Import.moves.length));v58ImportIndex=n;
 v58Board(fromFen(v58Import.positions[n]),'v58ImportBoard');
 elem('v58ImportStatus').textContent='Zug '+n+' von '+v58Import.moves.length+(n?' · '+deSan(v58Import.moves[n-1].san):' · Ausgangsstellung')+' · läuft unabhängig von deiner Partie.';
 elem('v58ImportPrev').disabled=n===0;elem('v58ImportNext').disabled=n===v58Import.moves.length;
}
async function v58ImportAnalysis(){if(!v58Import)return;const fen=v58Import.positions[v58ImportIndex],out=elem('v58ImportAnalysis');out.textContent='Stockfish analysiert den importierten Zug …';
 try{const a=await window.analyzeFen(fen,v58prefs.depth,v58prefs.lines);out.textContent='Stockfish '+a.depth+' Halbzüge tief · '+displayStockfishScore(fen,a)+' · '+(a.variants||[]).map(x=>'Variante '+x.rank+': '+x.pv.slice(0,5).join(' → ')).join(' | ')}catch(e){out.textContent=stockfishUnavailable(e)}
}
function v58LoadPGN(text){try{v58Import=v58ParsePGN(text);v58ImportIndex=0;v58ImportDraw();elem('v58ImportAnalysis').textContent='PGN eingelesen. Für Stockfish-Analyse den Knopf drücken.';elem('v58ImportName').textContent='Import: '+v58Escape(v58Import.tags.Event||'Unbenannte Partie')+' · '+v58Import.moves.length+' Halbzüge.';
 }catch(e){elem('v58ImportStatus').textContent='Importfehler: '+e.message}}
const V58_ENDINGS=[
 {id:'queen',name:'Damenmatt · König an den Rand',fen:'7k/8/5K2/4Q3/8/8/8/8 w - - 0 1',goal:'Setze mit Dame und König matt. Begrenze die Fluchtfelder; vermeide Patt.',tip:'Die Dame schneidet Linien ab. Dein König muss beim Matt unterstützen.'},
 {id:'rook',name:'Turmmatt · Abschneiden',fen:'7k/8/4K3/8/8/8/4R3/8 w - - 0 1',goal:'Setze mit dem Turm matt. Dränge den schwarzen König an den Brettrand.',tip:'Halte deinen Turm geschützt und nutze deinen König, um den Raum des Gegners zu verkleinern.'},
 {id:'opposition',name:'Opposition · König und Bauer',fen:'8/8/4k3/8/4K3/8/4P3/8 w - - 0 1',goal:'Führe den Bauern nach vorne. Lerne, wann die Könige einander gegenüberstehen.',tip:'Der König gehört vor den Bauern. Achte darauf, wer bei direkter Opposition ziehen muss.'},
 {id:'passed',name:'Freibauer · Umwandlung',fen:'8/7k/8/4P1K1/8/8/8/8 w - - 0 1',goal:'Versuche deinen Freibauern sicher zur Umwandlung zu führen.',tip:'Unterstütze den Bauern mit dem König und rechne, ob der Gegner ihn aufhalten kann.'}
];
/* V5.24 – selbständiges animiertes Endspielbrett (keine Änderung der laufenden Partie). */
const V524_END_SETTINGS='schach1001_endgame_ui_v524';
let v524EndUI={lastMove:true,legalDots:true};
try{v524EndUI={...v524EndUI,...JSON.parse(localStorage.getItem(V524_END_SETTINGS)||'{}')}}catch(_){}
function v524EndSave(){try{localStorage.setItem(V524_END_SETTINGS,JSON.stringify(v524EndUI))}catch(_){}}
let v58End=null,v58EndPicked=-1,v58EndBusy=false,v58EndToken=0;
function v58EndStart(id){
 const item=V58_ENDINGS.find(x=>x.id===id)||V58_ENDINGS[0];
 v58EndToken++;v58EndBusy=false;v58EndPicked=-1;
 v58End={item,pos:fromFen(item.fen),history:[],moves:[],lastMove:null,completed:false};
 v58EndDraw();
}
function v524EndControls(){
 const toggle=elem('v524EndLast'),dots=elem('v524EndDots'),undo=elem('v524EndUndo');
 if(toggle){toggle.setAttribute('aria-pressed',String(v524EndUI.lastMove));toggle.textContent=v524EndUI.lastMove?'🟨 Letzten Zug: AN':'⬜ Letzten Zug: AUS'}
 if(dots){dots.setAttribute('aria-pressed',String(v524EndUI.legalDots));dots.textContent=v524EndUI.legalDots?'● Zugpunkte: AN':'○ Zugpunkte: AUS'}
 if(undo)undo.disabled=!v58End?.history.length;
 const moves=elem('v524EndMoves');
 if(moves&&v58End){
  const last=v58End.moves.slice(-8);
  moves.textContent=last.length?'Zugverlauf: '+last.map((m,i)=>((v58End.moves.length-last.length+i)%2===0?'Weiß ':'Schwarz ')+m.san).join(' · '):'Noch kein Zug gespielt';
 }
}
function v58EndDraw(){
 if(!v58End)return;
 const {item,pos:p}=v58End,result=outcome(p);
 if(result&&result.startsWith('Weiß gewinnt')&&!v58End.completed){v58End.completed=true;v515RecordEndgame(item.id)}
 v58Board(p,'v58EndBoard',v58EndClick,v58EndPicked);
 const root=elem('v58EndBoard');
 root.setAttribute('aria-label','Endspiel-Übungsbrett, '+(p.turn==='w'?'Weiß':'Schwarz')+' am Zug');
 if(v524EndUI.lastMove&&v58End.lastMove){
  for(const [cls,n] of [['v524EndFrom',v58End.lastMove.f],['v524EndTo',v58End.lastMove.t]])root.querySelector('.v57square[data-i="'+n+'"]')?.classList.add(cls);
 }
 if(inCheck(p,p.turn)){
  const k=p.board.indexOf(p.turn==='w'?'K':'k');
  root.querySelector('.v57square[data-i="'+k+'"]')?.classList.add('v524EndCheck');
 }
 if(v524EndUI.legalDots&&p.turn==='w'&&v58EndPicked>=0){
  for(const m of legal(p).filter(m=>m.f===v58EndPicked)){
   root.querySelector('.v57square[data-i="'+m.t+'"]')?.classList.add(m.capture?'v524EndCapture':'v524EndLegal');
  }
 }
 root.querySelectorAll('.v57square').forEach(cell=>{
  const i=Number(cell.dataset.i),pc=p.board[i];
  cell.setAttribute('role','button');cell.setAttribute('tabindex',p.turn==='w'?'0':'-1');
  cell.setAttribute('aria-label',sq(i)+(pc?' '+(isW(pc)?'weißer ':'schwarzer ')+nm[pc.toUpperCase()]:' leer'));
  cell.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();v58EndClick(i)}};
 });
 elem('v58EndStatus').textContent=result||item.goal+(p.turn==='w'?' · Du bist am Zug.':' · Gegner denkt …');
 elem('v58EndTip').textContent=item.tip;
 v524EndControls();v525EndRefresh();
}
function v524EndAnimate(m,pc,ref){
 const root=elem('v58EndBoard');
 const from=root?.querySelector('.v57square[data-i="'+m.f+'"]');
 const dest=root?.querySelector('.v57square[data-i="'+m.t+'"]');
 const destImage=dest?.querySelector('img');
 if(!root||!from||!dest||!pc||!destImage||!root.isConnected||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
 const ms=Math.max(110,Math.min(500,Number(v58prefs.animation)||240));
 const boardRect=root.getBoundingClientRect(),r1=from.getBoundingClientRect(),r2=dest.getBoundingClientRect();
 if(!r1.width||!r2.width)return Promise.resolve();
 const fly=document.createElement('img');
 fly.src='./theme_pieces/'+imgMap[pc];fly.alt='Figurenanimation';fly.setAttribute('aria-hidden','true');
 Object.assign(fly.style,{position:'absolute',left:(r1.left-boardRect.left)+'px',top:(r1.top-boardRect.top)+'px',width:r1.width+'px',height:r1.height+'px',objectFit:'contain',pointerEvents:'none',zIndex:'9',willChange:'transform'});
 destImage.style.visibility='hidden';root.append(fly);
 return new Promise(resolve=>{
  let done=false;
  const finish=()=>{if(done)return;done=true;fly.remove();destImage.style.visibility='';resolve()};
  const dx=r2.left-r1.left,dy=r2.top-r1.top;
  if(fly.animate){
   try{const a=fly.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d('+dx+'px,'+dy+'px,0)'}],{duration:ms,easing:'cubic-bezier(.22,.8,.24,1)',fill:'forwards'});
    a.onfinish=finish;a.oncancel=finish;
    setTimeout(finish,ms+160);
   }catch(_){finish()}
  }else{
   fly.style.transition='transform '+ms+'ms cubic-bezier(.22,.8,.24,1)';
   requestAnimationFrame(()=>{fly.style.transform='translate3d('+dx+'px,'+dy+'px,0)'});
   setTimeout(finish,ms+60);
  }
 });
}
async function v524EndApply(m,ref){
 const p=ref.pos,pc=p.board[m.f],san=deSan(notation(p,m,legal(p))),fen=toFen(p);
 ref.history.push(fen);ref.moves.push({f:m.f,t:m.t,san});ref.lastMove={f:m.f,t:m.t};
 ref.pos=move(p,m);v58EndPicked=-1;
 v58EndDraw();
 await v524EndAnimate(m,pc,ref);
}
async function v58EndClick(i){
 if(!v58End||v58EndBusy||v58End.pos.turn!=='w'||outcome(v58End.pos))return;
 const ref=v58End,p=ref.pos,all=legal(p);
 if(v58EndPicked>=0){
  const options=all.filter(m=>m.f===v58EndPicked&&m.t===i),chosen=options.find(m=>m.promo==='q')||options[0];
  if(chosen){
   v58EndBusy=true;const token=++v58EndToken;
   await v524EndApply(chosen,ref);
   if(token!==v58EndToken||v58End!==ref)return;
   if(!outcome(ref.pos))await v58EndReply(ref,token);
   if(token===v58EndToken&&v58End===ref){v58EndBusy=false;v58EndDraw()}
   return;
  }
 }
 v58EndPicked=p.board[i]&&color(p.board[i])==='w'?i:-1;
 v58EndDraw();
}
async function v58EndReply(ref=v58End,token=v58EndToken){
 if(!ref||ref!==v58End||ref.pos.turn!=='b'||outcome(ref.pos))return;
 const fen=toFen(ref.pos);
 elem('v58EndStatus').textContent='Stockfish verteidigt die Stellung …';
 try{
  const r=await window.analyzeFen(fen,Math.min(v58prefs.depth,12));
  if(token!==v58EndToken||v58End!==ref)return;
  const m=legal(ref.pos).find(x=>moveUci(x)===r.bestmove);
  if(!m)throw new Error('Keine legale Antwort');
  await v524EndApply(m,ref);
 }catch(e){if(token===v58EndToken&&v58End===ref)elem('v58EndTip').textContent=stockfishUnavailable(e)}
}
function v524EndUndo(){
 if(!v58End||!v58End.history.length)return;
 ++v58EndToken;v58EndBusy=false;v58EndPicked=-1;
 // Nach einem schwarzen Antwortzug beide Halbzüge zurücknehmen, sodass wieder Weiß zieht.
 while(v58End.history.length){
  v58End.pos=fromFen(v58End.history.pop());v58End.moves.pop();
  if(v58End.pos.turn==='w')break;
 }
 const last=v58End.moves.at(-1);
 v58End.lastMove=last?{f:last.f,t:last.t}:null;
 v58EndDraw();
}
function v524EndInit(){
 const root=elem('v58EndBoard');if(!root||elem('v524EndLast'))return;
 const tools=document.createElement('div');tools.className='v524EndTools';
 tools.innerHTML='<button id="v524EndLast" type="button" aria-pressed="true">🟨 Letzten Zug: AN</button><button id="v524EndDots" type="button" aria-pressed="true">● Zugpunkte: AN</button><button id="v524EndUndo" type="button">↶ Zug zurück</button>';
 root.before(tools);
 const log=document.createElement('p');log.id='v524EndMoves';log.className='v524EndMoves';log.setAttribute('aria-live','polite');root.after(log);
 elem('v524EndLast').onclick=()=>{v524EndUI.lastMove=!v524EndUI.lastMove;v524EndSave();v58EndDraw()};
 elem('v524EndDots').onclick=()=>{v524EndUI.legalDots=!v524EndUI.legalDots;v524EndSave();v58EndDraw()};
 elem('v524EndUndo').onclick=v524EndUndo;
 v58EndDraw();
}

function v58DueErrors(){const today=v58Today();return (summaryStore.learningErrors||[]).filter(x=>!x.nextDue||x.nextDue<=today).sort((a,b)=>(a.nextDue||'').localeCompare(b.nextDue||'')||b.loss-a.loss)}
function v58RepeatStatus(){const node=elem('v58RepeatStatus');if(node)node.textContent=v58DueErrors().length+' Fehler jetzt fällig · '+(summaryStore.learningErrors||[]).length+' gespeichert. Intervalle 1, 3, 7, 14 und 30 Tage.';}
function v58MarkReplay(solved){if(!v57Replay)return;const id=v57Replay.item.id;const x=(summaryStore.learningErrors||[]).find(x=>x.id===id);if(!x)return;
 const next=solved?Math.min(5,(x.stage||0)+1):0;x.stage=next;x.lastPractice=v58Today();x.nextDue=v58NextDate(solved?[0,1,3,7,14,30][next]:1);x.reviews=(x.reviews||0)+1;
 persistProfile();v58RepeatStatus();
}
function v58DueReplay(){const due=v58DueErrors();if(!due.length){elem('v57ReplayCount').textContent='Heute keine Fehler fällig. Gut gelernt!';return}v57OpenReplay(due[0]);}
function v58Theme(){const themes={klassisch:['#eeeed2','#779556'],holz:['#f1d4a6','#a8744b'],nacht:['#e1e4e8','#5d7082'],kontrast:['#fff','#52725e']};const pair=themes[v58prefs.theme]||themes.klassisch;
 document.documentElement.style.setProperty('--v58light',pair[0]);document.documentElement.style.setProperty('--v58dark',pair[1]);window.__v58AnimMs=Number(v58prefs.animation)||240;
}
function v58CoachBar(){const dock=elem('gameCoachDock');if(!dock)return;let label=elem('v58CoachInsight');if(!label){label=document.createElement('div');label.id='v58CoachInsight';label.className='v58CoachInsight';dock.querySelector('.gameCoachDockHead').after(label)}
 const c=record.at(-1)?.coach;
 if(!coachVisible()){label.textContent='Coach pausiert';return;}
 if(!c){label.textContent='Tipp: Prüfe nach jedem gegnerischen Zug Schach, Schlagzüge und Drohungen.';return;}
 label.textContent=c.source==='none'?'Engine nicht verfügbar':(c.label||'Zug geprüft')+' · '+(c.positives||c.why||'').slice(0,150);
}
function v58AutoBackup(){if(!v58prefs.autosave)return;try{const snap=v57Snapshot();localStorage.setItem('schach1001_autorecovery_v58',JSON.stringify({data:snap.data,checksum:v57Checksum(JSON.stringify(snap.data)),created:new Date().toISOString()}));
 }catch(e){/* lokale Quotenfehler blockieren niemals Schachzüge */}}
function v58RestoreAuto(){try{const raw=localStorage.getItem('schach1001_autorecovery_v58');if(!raw)throw Error('Noch keine automatische Sicherung');let b=JSON.parse(raw);if(v57Checksum(JSON.stringify(b.data))!==b.checksum)throw Error('Prüfsumme falsch');
 if(!confirm('Automatische Sicherung vom '+b.created+' wiederherstellen? Laufende Daten werden überschrieben.'))return;
 const before=v57Snapshot(),keys=Object.keys(b.data);localStorage.setItem('schach1001_backup_autosave_v57',JSON.stringify(before.data));for(let k of keys)if(/^schach1001[-_]/.test(k)&&typeof b.data[k]==='string')localStorage.setItem(k,b.data[k]);location.reload();
 }catch(e){elem('v58RestoreStatus').textContent='Wiederherstellung: '+e.message}}
function v58MovePV(fen,pv){let p=fromFen(fen),out=[];for(let uci of pv.slice(0,10)){
 const all=legal(p),m=all.find(x=>moveUci(x)===uci);if(!m)break;out.push(deSan(notation(p,m,all)));p=move(p,m);
 }return out.join(' ')}
let v58AnalyzeId=0;
async function v58ProAnalyze(){const node=elem('v58ProResults'),fen=toFen(pos),id=++v58AnalyzeId;
 node.textContent='Stockfish berechnet '+v58prefs.lines+' Variante(n) mit Tiefe '+v58prefs.depth+' …';
 try{const result=await window.analyzeFen(fen,v58prefs.depth,v58prefs.lines);
 if(id!==v58AnalyzeId||fen!==toFen(pos)){node.textContent='Stellung wurde geändert. Bitte erneut analysieren.';return;}
 const lines=(result.variants||[]).slice(0,v58prefs.lines);
 if(!lines.length){node.textContent='Stockfish lieferte keine Hauptvariante.';return}
 node.innerHTML='<strong>Stockfish 19 Lite · Tiefe '+result.depth+'</strong><p>Stellungsbewertung: '+v58Escape(displayStockfishScore(fen,result))+'</p>'+lines.map(x=>'<div class="v58CoachDetail"><b>Variante '+x.rank+':</b> '+v58Escape(v58MovePV(fen,x.pv))+' <small>('+v58Escape(x.scoreType==='mate'?'Matt in '+x.score:(x.score/100).toFixed(2))+' aus Sicht der Seite am Zug)</small></div>').join('');
 }catch(e){if(id===v58AnalyzeId)node.textContent=stockfishUnavailable(e)}
}
function v58StyledMove(p,defaultMove){
 // Tendenz innerhalb vergleichbar starker lokaler Kandidaten, kein garantierter Stil.
 try{const options=localCandidates(p).items.slice(0,12);if(!options.length)return defaultMove;
 const max=options[0].value,style=v58prefs.style;
 const finalists=options.filter(x=>max-x.value<=Math.max(80,220-(setup.elo-400)/12));
 finalists.sort((a,b)=>{
  function pref(x){const m=x.m,n=move(p,m),center=3.5-Math.abs(m.t%8-3.5), check=inCheck(n,n.turn);
   const threat=squareAttacked(n,m.t,n.turn)?1:0,guard=squareAttacked(n,m.t,p.turn)?1:0;
   return x.value+(style==='aktiv'?(m.capture?45:0)+(check?38:0)+center*4:style==='taktisch'?(m.capture?70:0)+(check?72:0)+center*2:style==='defensiv'?(guard?58:0)-threat*115-(check?4:0):style==='solide'?(guard?33:0)-threat*95:(guard?16:0)-threat*65-(check?5:0));
  }return pref(b)-pref(a)});
 return finalists[0]?.m||defaultMove;
 }catch(_){return defaultMove}
}
function v58AdaptiveAfterGame(){if(!v58prefs.adaptive||setup.mode!=='computer')return;const last=summaryStore.games?.[0];if(!last||!last.score)return;
 const playerWin=last.score===(setup.side==='w'?'1-0':'0-1'),draw=last.score==='1/2-1/2';const delta=draw?0:playerWin?100:-100;
 setup.elo=Math.max(400,Math.min(2800,Math.round((setup.elo+delta)/200)*200));persist();if(elem('gameElo'))elem('gameElo').value=setup.elo;
}
function v58Init(){
 const tools=document.createElement('section');tools.id='v58Features';tools.className='v58Features';
 tools.innerHTML=`<section class="card extraPanel"><h3>🔬 Stockfish-Profi-Analyse (offline)</h3><div class="v58Tools"><label>Suchtiefe <select id="v58Depth"><option value="8">8 · schnell</option><option value="12">12 · normal</option><option value="16">16 · gründlich</option><option value="20">20 · sehr gründlich</option></select></label><label>Varianten <select id="v58Lines"><option value="1">Beste</option><option value="2">Top 2</option><option value="3">Top 3</option></select></label></div><button class="btn primary" id="v58Analyze">Stellung mit Stockfish prüfen</button><div class="v58Output" id="v58ProResults" aria-live="polite">Die Analyse verrät nur auf Knopfdruck den besten Zug. Bestzug-Pfeile bleiben separat schaltbar.</div></section>
 <section class="card extraPanel"><h3>📥 PGN-Partien importieren</h3><p class="quiet">Importiert Standard-PGN mit SAN-Zügen und optional einer Startstellung. Deine laufende Partie wird nicht überschrieben.</p><label class="btn v57ImportLabel">PGN-Datei wählen<input id="v58PgnFile" type="file" accept=".pgn,.txt,text/plain,application/x-chess-pgn" hidden></label><textarea id="v58PgnText" rows="3" maxlength="750000" placeholder="Oder PGN-Züge hier einfügen" style="width:100%;margin-top:12px"></textarea><button class="btn" id="v58PgnPaste">PGN-Text laden</button><p id="v58ImportName" class="quiet"></p><div id="v58ImportBoard"></div><p id="v58ImportStatus" class="quiet"></p><div class="toolButtons"><button class="btn" id="v58ImportPrev">◀</button><button class="btn" id="v58ImportNext">▶</button><button class="btn" id="v58ImportAnalyze">Mit Stockfish analysieren</button></div><div id="v58ImportAnalysis" class="v58Output"></div></section>
 <section class="card extraPanel"><h3>♚ Endspielschule</h3><label>Übung auswählen <select id="v58EndSelect">${V58_ENDINGS.map(e=>'<option value="'+e.id+'">'+v58Escape(e.name)+'</option>').join('')}</select></label><div id="v58EndBoard"></div><p id="v58EndStatus" class="v58Output"></p><p id="v58EndTip" class="quiet"></p><button class="btn" id="v58EndReset">Erneut üben</button></section>
 <section class="card extraPanel"><h3>🧩 Spaced Repetition · Fehler</h3><p id="v58RepeatStatus" class="quiet"></p><button class="btn primary" id="v58DueStart">Fälligen Fehler wiederholen</button><p class="quiet">Eine richtige Lösung verlängert das Intervall, ein Fehlversuch beginnt wieder bei einem Tag. Der normale Fehlertrainer bleibt vorhanden.</p></section>
 <section class="card extraPanel"><h3>📖 Eröffnungen wiederholen</h3><p id="v58OpeningDue" class="quiet"></p><button class="btn" id="v58OpeningStart">Fällige Variante starten</button></section>
 <section class="card extraPanel"><h3>🎨 Spielgefühl & Gegner</h3><div class="v58Tools"><label>Brett <select id="v58Theme"><option value="klassisch">Grün / Creme</option><option value="holz">Holz</option><option value="nacht">Blau / Grau</option><option value="kontrast">Kontrast</option></select></label><label>Figurenanimation <select id="v58Speed"><option value="140">Schnell</option><option value="240">Flüssig</option><option value="400">Langsam</option></select></label><label>Computerstil <select id="v58Style"><option value="ausgeglichen">Ausgeglichen</option><option value="aktiv">Aktiv</option><option value="solide">Solide</option></select></label></div><label><input type="checkbox" id="v58Adaptive"> Gegnerstärke nach abgeschlossenen Computerpartien anpassen (± 200 Richtwert-Elo)</label><p class="quiet">Die Computerstärke ist eine Näherung, kein offiziell kalibriertes Elo. Spielstil ist eine Trainingspräferenz, keine separate Engine-Persönlichkeit.</p></section>
 <section class="card extraPanel"><h3>🛡 Stabilität & Sicherung</h3><label><input type="checkbox" id="v58AutoSave"> Automatische lokale Wiederherstellungskopie erstellen</label><div class="toolButtons"><button class="btn" id="v58Restore">Automatische Sicherung zurückspielen</button><button class="btn" id="v58Check">Selbsttest</button></div><p id="v58RestoreStatus" class="quiet"></p><p class="quiet">Für geräteübergreifende Übernahme bitte zusätzlich „Backup exportieren“ verwenden. Diese Version behält die bisherigen Datenschlüssel und dieselbe Android-Paketkennung.</p></section>`;
 elem('gameContent').append(tools);
 elem('v58Depth').value=v58prefs.depth;elem('v58Lines').value=v58prefs.lines;elem('v58Depth').onchange=e=>{v58prefs.depth=+e.target.value;v58SavePrefs()};elem('v58Lines').onchange=e=>{v58prefs.lines=+e.target.value;v58SavePrefs()};elem('v58Analyze').onclick=v58ProAnalyze;
 elem('v58PgnFile').onchange=async e=>{const f=e.target.files?.[0];if(f){if(f.size>750000){elem('v58ImportStatus').textContent='PGN zu groß.';return;}v58LoadPGN(await f.text())}e.target.value=''};
 elem('v58PgnPaste').onclick=()=>v58LoadPGN(elem('v58PgnText').value);
 elem('v58ImportPrev').onclick=()=>{v58ImportIndex--;v58ImportDraw()};elem('v58ImportNext').onclick=()=>{v58ImportIndex++;v58ImportDraw()};elem('v58ImportAnalyze').onclick=v58ImportAnalysis;
 elem('v58EndSelect').onchange=e=>v58EndStart(e.target.value);elem('v58EndReset').onclick=()=>v58EndStart(elem('v58EndSelect').value);v58EndStart('queen');v524EndInit();
 elem('v58DueStart').onclick=v58DueReplay;v58RepeatStatus();
 elem('v58OpeningStart').onclick=()=>{const due=v58OpeningDue();if(!due.length){elem('v58OpeningDue').textContent='Heute keine Variante fällig.';return}openingId=due[0].id;v57OpeningBase=openingId;setup.mode='opening';setup.side=opening().side;setup.time='none';elem('openingPick').value=openingId;gameNew();elem('v58OpeningDue').textContent='Gestartet: '+opening().name;window.scrollTo?.({top:0,behavior:'smooth'})};
 v58OpeningStatus();
 elem('v58Theme').value=v58prefs.theme;elem('v58Speed').value=v58prefs.animation;elem('v58Style').value=v58prefs.style;elem('v58Adaptive').checked=!!v58prefs.adaptive;
 elem('v58Theme').onchange=e=>{v58prefs.theme=e.target.value;v58SavePrefs();v58Theme()};elem('v58Speed').onchange=e=>{v58prefs.animation=+e.target.value;v58SavePrefs();v58Theme();localStorage.setItem('schach1001_animation_v514',e.target.value);const q=elem('v514Speed');if(q)q.value=e.target.value};
 elem('v58Style').onchange=e=>{v58prefs.style=e.target.value;v58SavePrefs()};elem('v58Adaptive').onchange=e=>{v58prefs.adaptive=e.target.checked;v58SavePrefs()};v58Theme();
 elem('v58AutoSave').checked=!!v58prefs.autosave;elem('v58AutoSave').onchange=e=>{v58prefs.autosave=e.target.checked;v58SavePrefs();if(v58prefs.autosave)v58AutoBackup()};
 elem('v58Restore').onclick=v58RestoreAuto;elem('v58Check').onclick=()=>{try{const p=fromFen(startFen),valid=legal(p).length===20,keys=['schach1001-v1','schach1001_analysis_v2','schach1001_profile_v4'],count=keys.filter(k=>localStorage.getItem(k)).length;
 elem('v58RestoreStatus').textContent='Selbsttest: '+(valid?'Schachregeln OK':'Regelprüfung fehlgeschlagen')+' · '+count+' bestehende Speicherbereiche · Stockfish-Binärdaten '+(window.__STOCKFISH_OFFLINE_WASM_B64?'vorhanden':'fehlen')+'.';
 }catch(e){elem('v58RestoreStatus').textContent='Selbsttest fehlgeschlagen: '+e.message}};
 const old=elem('gameCoachDock').querySelector('.gameCoachDockHead');old.insertAdjacentHTML('beforeend','<span class="v58CoachVersion">Coach</span>');
 v58CoachBar();v58AutoBackup();window.addEventListener('pagehide',v58AutoBackup);
}
function v58OpeningDue(){const data=summaryStore.openingSR||{};return Object.entries(OPENINGS).filter(([id])=>summaryStore.openings?.[id]&&(!data[id]||data[id].next<=v58Today())).map(([id,o])=>({id,o}));}
function v58OpeningStatus(){const node=elem('v58OpeningDue');if(node)node.textContent=v58OpeningDue().length+' zuvor gelernte Eröffnungen zur Wiederholung fällig.';}
function v58OpeningDone(){const id=openingId;summaryStore.openingSR??={};const old=summaryStore.openingSR[id]||{stage:0};const stage=Math.min(5,old.stage+1);summaryStore.openingSR[id]={stage,next:v58NextDate([0,1,3,7,14,30][stage])};persistProfile();v58OpeningStatus();}

function v514UpdateGameSummary(){
 const el=elem('v514ReportText');if(!el)return;
 const total=record.length,done=record.filter(r=>r.coach?.source==='Stockfish 19 Lite');
 const player=done.filter(r=>setup.mode!=='computer'||r.actor!=='Computer');
 const labels={};for(const r of player)labels[r.coach.label]=(labels[r.coach.label]||0)+1;
 const losses=player.map(r=>r.coach.loss).filter(Number.isFinite);
 const accuracy=losses.length?v57Accuracy(losses):null;
 el.innerHTML='<div class="v514ReportMetrics"><span><strong>'+total+'</strong> Halbzüge</span><span><strong>'+done.length+' / '+total+'</strong> bewertet</span><span><strong>'+(accuracy?accuracy.accuracy+' %':'–')+'</strong> geschätzte Genauigkeit</span></div>'+
  '<p>'+(gameResult?'<strong>Partie beendet: '+escapeHtml(gameResult)+'.</strong> ':'')+'Stockfish-Zugurteile: '+(player.length?Object.entries(labels).map(([k,v])=>escapeHtml(k)+': '+v).join(' · '):'Noch keine Bewertung; du kannst jederzeit die vollständige Analyse starten.')+'</p>'+
  (done.length<total?'<small>Es liegen noch unbewertete Züge vor; die Prozentzahl berücksichtigt nur analysierte eigene Züge.</small>':'');
 v517UpdateReview();
}
/* V5.25 – additive training extensions. Existing saved state and keys are not reset. */
const V525_PREF='schach1001_v525_options';
let v525Options={haptic:true,autoAdvice:true,reducedAnimation:false};
try{v525Options={...v525Options,...JSON.parse(localStorage.getItem(V525_PREF)||'{}')}}catch(_){}
const v525Save=()=>{try{localStorage.setItem(V525_PREF,JSON.stringify(v525Options))}catch(_){}};
let v525EndGuide={fen:'',step:0,move:null};
function v525EndResetIfNew(){
 if(!v58End)return;
 const fen=toFen(v58End.pos);
 if(v525EndGuide.fen!==fen)v525EndGuide={fen,step:0,move:null};
}
function v525EndMark(){
 const root=elem('v58EndBoard');if(!root)return;
 root.querySelectorAll('.v525Target,.v525From,.v525Arrow').forEach(n=>{if(n.classList.contains('v525Arrow'))n.remove();else n.classList.remove('v525Target','v525From')});
 const m=v525EndGuide.move;if(!m||!v525EndGuide.step)return;
 const start=root.querySelector('.v57square[data-i="'+m.f+'"]'),end=root.querySelector('.v57square[data-i="'+m.t+'"]');
 start?.classList.add('v525From');
 if(v525EndGuide.step<2||!start||!end)return;
 end.classList.add('v525Target');
 const a=start.getBoundingClientRect(),b=end.getBoundingClientRect(),r=root.getBoundingClientRect();
 if(!r.width||!r.height)return;
 const x1=a.left+a.width/2-r.left,y1=a.top+a.height/2-r.top,x2=b.left+b.width/2-r.left,y2=b.top+b.height/2-r.top;
 const el=document.createElementNS('http://www.w3.org/2000/svg','svg');el.classList.add('v525Arrow');el.setAttribute('viewBox','0 0 '+r.width+' '+r.height);el.setAttribute('aria-hidden','true');
 el.innerHTML='<defs><marker id="v525Head" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#76dc70"/></marker></defs>';
 const line=document.createElementNS('http://www.w3.org/2000/svg','line');for(const [n,v] of [['x1',x1],['y1',y1],['x2',x2],['y2',y2]])line.setAttribute(n,v);
 line.setAttribute('stroke','#76dc70');line.setAttribute('stroke-width',Math.max(6,a.width*.12));line.setAttribute('stroke-opacity','.85');line.setAttribute('marker-end','url(#v525Head)');el.append(line);root.append(el);
}
function v525EndRefresh(){
 if(!elem('v525EndStep'))return;
 v525EndResetIfNew();v525EndMark();
 const label=elem('v525EndStep');label.textContent=v525EndGuide.step===0?'Noch kein Tipp verwendet. Erst selbst nach einem guten Zug suchen.':v525EndGuide.step===1?'Tipp 1: Die richtige Figur ist grün markiert. Finde das Zielfeld.':'Tipp 2: Der grüne Pfeil zeigt Start- und Zielfeld.';
}
async function v525EndHint(){
 const label=elem('v525EndStep');if(!v58End||!label)return;
 if(v58End.pos.turn!=='w'||outcome(v58End.pos)){label.textContent='Warte auf deinen Zug oder starte eine neue Endspielübung.';return}
 const fen=toFen(v58End.pos);v525EndResetIfNew();
 if(!v525EndGuide.move){
  label.textContent='Stockfish berechnet eine Empfehlung …';
  try{
   const result=await window.analyzeFen(fen,Math.min(12,Math.max(7,v58prefs.depth)));
   if(!v58End||toFen(v58End.pos)!==fen)return;
   const m=legal(v58End.pos).find(m=>moveUci(m)===result.bestmove);
   if(!m)throw Error('Keine legale Engine-Empfehlung');
   v525EndGuide.move=m;
  }catch(e){label.textContent='Tipp nicht verfügbar: '+(e.message||'Stockfish ist nicht bereit');return}
 }
 v525EndGuide.step=Math.min(2,v525EndGuide.step+1);v525EndRefresh();
}
async function v525EndDemo(){
 const label=elem('v525EndStep');if(!v58End||v58EndBusy||v58End.pos.turn!=='w'){if(label)label.textContent='Bitte warten, bis du am Zug bist.';return}
 if(!v525EndGuide.move)await v525EndHint();
 if(!v525EndGuide.move||!v58End)return;
 const ref=v58End,m=v525EndGuide.move;const tok=++v58EndToken;v58EndBusy=true;
 await v524EndApply(m,ref);
 if(tok===v58EndToken&&v58End===ref&&!outcome(ref.pos))await v58EndReply(ref,tok);
 if(tok===v58EndToken&&v58End===ref){v58EndBusy=false;v58EndDraw();}
}
function v525EndInit(){
 const root=elem('v58EndBoard');if(!root||elem('v525EndCoach'))return;
 const section=document.createElement('section');section.id='v525EndCoach';section.className='v525Feature';
 section.innerHTML='<strong>♚ Endspielschule 2.0</strong><p>Ziehe selbst oder lerne einen Musterzug gegen Stockfish. Die laufende Partie bleibt unverändert.</p><div class="v525Buttons"><button id="v525EndHint" type="button">💡 Tipp: Figur → Zug</button><button id="v525EndDemo" type="button">▶ Musterzug animieren</button></div><p id="v525EndStep" class="v525Status" aria-live="polite">Noch kein Tipp verwendet.</p>';
 root.before(section);
 elem('v525EndHint').onclick=v525EndHint;elem('v525EndDemo').onclick=v525EndDemo;
 v525EndRefresh();
}
/* V5.39 – Wechsel zwischen freier Analyse und gespeicherten Partien. */
function v539BuildArchive(g){
 let p=fromFen(startFen),rows=[];
 if(!Array.isArray(g?.uci))return [];
 for(const raw of g.uci.slice(0,450)){
  const all=legal(p),m=all.find(x=>moveUci(x)===String(raw).toLowerCase());
  if(!m)throw new Error('Die gespeicherte Zugfolge enthält einen ungültigen Zug.');
  const before=toFen(p),san=notation(p,m,all);p=move(p,m);
  rows.push({uci:moveUci(m),before,after:toFen(p),san,f:m.f,t:m.t,coach:null});
 }
 return rows;
}
async function v539AnalyzeShown(){
 if(!v529.position){v529Msg('Wähle zuerst eine Stellung.');return}
 const fen=toFen(v529.position),ticket=++v529.request;
 v529Msg('Stockfish bewertet die angezeigte Stellung …');
 try{
  if(typeof window.analyzeFen!=='function')throw Error('Stockfish ist nicht geladen');
  const out=await window.analyzeFen(fen,12);
  if(ticket!==v529.request||fen!==toFen(v529.position))return;
  const score=sfWhiteScore(fen,out),moveLabel=out?.bestmove?out.bestmove:'nicht verfügbar';
  v529Msg('Stockfish: '+(Number.isFinite(score)?fmtEval(score)+' aus Weiß-Sicht. ':'Bewertung nicht verfügbar. ')+
    'Beste Fortsetzung: '+moveLabel+'. Du kannst alternativ selbst weiterziehen oder „Tipp“ wählen.');
 }catch(e){if(ticket===v529.request)v529Msg(stockfishUnavailable(e))}
}
function v539RefreshGames(){
 const select=elem('v539GameChoice');if(!select)return;
 const prev=select.value;select.replaceChildren();
 const games=v532GetArchive().filter(g=>Array.isArray(g.uci));
 if(!games.length){const opt=document.createElement('option');opt.value='';opt.textContent='Noch keine beendeten Partien gespeichert';select.append(opt);select.disabled=true;}
 else{
  select.disabled=false;
  for(const g of games){const opt=document.createElement('option');opt.value=String(g.id);const dt=String(g.at||'').slice(0,16).replace('T',' ');opt.textContent=(dt||'Partie')+' · '+String(g.opponent||'Gegner')+' · '+String(g.score||g.result||'')+' · '+g.uci.length+' Halbzüge';select.append(opt)}
  select.value=games.some(g=>String(g.id)===prev)?prev:games[0].id;
 }
 const load=elem('v539Load');if(load)load.disabled=!games.length;
}
function v539Source(source){
 if(!['free','archive','current'].includes(source))return;
 v539.source=source;v529.request++;v539.archiveRecords=[];v539.archiveGame=null;v539.archiveId='';
 const selector=elem('v539ArchivePick');if(selector)selector.hidden=source!=='archive';
 const state=elem('v539SourceStatus');
 for(const [id,name] of [['v539Free','free'],['v539Archived','archive'],['v539Current','current']]){const b=elem(id);if(b){b.classList.toggle('selected',source===name);b.setAttribute('aria-pressed',String(source===name))}}
 if(source==='free'){v539StartPosition('Freie Analyse: Ziehe Weiß und Schwarz selbst. Stockfish prüft deine Züge. Es wird keine Partie überschrieben.');if(state)state.textContent='Freies Brett · ohne Uhr · unabhängig von gespeicherten Partien';}
 if(source==='archive'){v539RefreshGames();v539StartPosition('Wähle eine beendete Partie und tippe auf „Partie laden“.');if(state)state.textContent='Archiv auswählen · Original bleibt geschützt';}
 if(source==='current'){v525ReviewRefresh();if(!record.length)v539StartPosition('Noch keine Züge in der aktuellen Partie.');if(state)state.textContent='Laufende Partie · '+record.length+' Halbzüge';}
 const btn=elem('v525AnalyzeGame');if(btn)btn.textContent=source==='current'?'🔎 Partie mit Stockfish analysieren':'🔎 Stellung mit Stockfish bewerten';
 if(source!=='current')v525ReviewRefresh();
}
function v539LoadArchive(){
 const id=elem('v539GameChoice')?.value,g=v532GetArchive().find(x=>String(x.id)===String(id));
 if(!g){v529Msg('Keine Partie ausgewählt. Beende zuerst eine Partie, damit sie gespeichert wird.');return}
 let rows;
 try{rows=v539BuildArchive(g)}catch(e){v529Msg('Archiv konnte nicht geladen werden: '+e.message);return}
 v539.archiveId=String(g.id);v539.archiveGame=g;v539.archiveRecords=rows;v529.request++;
 const status=elem('v539SourceStatus');if(status)status.textContent='Geladene Partie: '+(g.at||'').slice(0,16).replace('T',' ')+' · '+String(g.opponent||'Gegner')+' · '+String(g.result||g.score||'');
 if(rows.length)v525ReviewRefresh();else v539StartPosition('Die Partie enthält noch keine Spielzüge.');
 const b=elem('v539ArchivePick');if(b)b.dataset.loaded=v539.archiveId;
}
function v539Init(){
 const section=elem('v525Review'),stage=elem('v529Stage');if(!section||!stage||elem('v539Picker'))return;
 const pick=document.createElement('section');pick.id='v539Picker';pick.className='v539Picker';
 pick.innerHTML='<h3>♟ Analysemodus wählen</h3><div class="v539ModeBtns"><button id="v539Free" type="button">♟ Frei analysieren</button><button id="v539Archived" type="button">📚 Beendete Partie</button></div><div id="v539ArchivePick" hidden><label for="v539GameChoice">Gespeicherte Partie auswählen</label><select id="v539GameChoice" aria-label="Beendete Partie wählen"></select><button id="v539Load" type="button">Partie laden und ansehen</button></div><p id="v539SourceStatus" aria-live="polite"></p><button id="v539Current" class="v539Current" type="button">Aktuelle Partie analysieren</button>';
 stage.before(pick);
 elem('v539Free').onclick=()=>v539Source('free');elem('v539Archived').onclick=()=>v539Source('archive');elem('v539Current').onclick=()=>v539Source('current');elem('v539Load').onclick=v539LoadArchive;
 elem('v539GameChoice').onchange=()=>{const status=elem('v539SourceStatus');if(status)status.textContent='Tippe auf „Partie laden und ansehen“, um die Auswahl zu öffnen.';};
 const first=elem('v529Back'),last=elem('v529Forward');
 const reset=elem('v529Reset');if(reset)reset.textContent='↻ Stellung zurücksetzen';
 if(first)first.title='Vorheriger Zug der ausgewählten Partie';if(last)last.title='Nächster Zug der ausgewählten Partie';
 v539Source('free');
}

/* V5.29 – Interaktive Stockfish-Analyse, isoliert von der laufenden Partie. */
let v529ShownLength=-1;
const V534_COLOR_KEY='schach1001_v534_variation_colors';
let v534ColorsOn=true;
try{v534ColorsOn=localStorage.getItem(V534_COLOR_KEY)!=='off'}catch(_){}
if(document.body)document.body.classList.toggle('v534ColorsOn',v534ColorsOn);
function v534SetColors(enabled){
 v534ColorsOn=!!enabled;
 document.body.classList.toggle('v534ColorsOn',v534ColorsOn);
 try{localStorage.setItem(V534_COLOR_KEY,v534ColorsOn?'on':'off')}catch(_){}
 const input=elem('v534ColorToggle');if(input)input.checked=v534ColorsOn;
 v529Draw();
}
function v534QualityName(grade){
 if(grade==='Patzer'||grade==='Fehler')return 'bad';
 if(grade==='Bester Zug'||grade==='Sehr gut')return 'good';
 return 'trial';
}

/* V5.39: Drei getrennte Analysequellen. Archivdaten sind nur lesbar. */
const v539={source:'current',archiveId:'',archiveRecords:[],archiveGame:null};
function v539Records(){return v539.source==='archive'?v539.archiveRecords:v539.source==='free'?[]:record;}
function v539StartPosition(label){v546Cancel();
 const firstFen=v539Records()[0]?.before||startFen;
 v529.request++;v529.position=fromFen(firstFen);v529.index=-1;v529.history=[];v529.last=null;v529.mainLast=null;v529.selected=-1;v529.hintMove=null;v529.hintStep=0;v529.trialQuality='trial';
 v529SetMode(v539.source==='free'?'trial':'view');v529Msg(label||'Startstellung: Du kannst beide Seiten selbst ziehen und Stockfish-Tipps verwenden.');v529Draw();
 const count=elem('v529ReviewIndex');if(count)count.textContent='0 / '+v539Records().length;
}
const v529={index:-1,mode:'view',position:null,history:[],last:null,selected:-1,hintStep:0,hintMove:null,flip:false,request:0,drag:null,ignoreClickUntil:0,mainLast:null,trialQuality:'trial'};
/* V5.46: zugbezogener Coach, vom Brett-Layout entkoppelt. */
const v546Cache=new Map();let v546Ticket=0,v546Timer=null;
function v546Cancel(){++v546Ticket;clearTimeout(v546Timer)}
function v546Mate(cp){return Math.abs(cp)>=25000}
function v546Score(cp){return v546Mate(cp)?(cp>0?'Weiß setzt matt':'Schwarz setzt matt'):(cp>=0?'+':'−')+(Math.abs(cp)/100).toFixed(2).replace('.',',')}
function v546MoveName(uci){
 const t=String(uci||'');if(t.length<4)return 'nicht verfügbar';return t.slice(0,2)+'–'+t.slice(2,4);
}
function v546CoachForMove(index){
 v546Cancel();const ticket=v546Ticket,rows=v539Records(),r=rows[index];if(!r||!r.before||!r.after)return;
 const originalSource=v539.source,originalId=v539.archiveId,originalAfter=r.after;
 const stillCurrent=()=>ticket===v546Ticket&&v529.index===index&&v529.mode==='view'&&v539.source===originalSource&&v539.archiveId===originalId&&v529.position&&toFen(v529.position)===originalAfter&&v539Records()[index]===r;
 const cacheKey=r.before+'|'+r.after+'|'+r.uci, cached=v546Cache.get(cacheKey);
 const write=message=>{if(stillCurrent())v529Msg(message)};
 if(cached){write(cached);return}
 write((index+1)+'. '+deSan(r.san)+': Stockfish prüft diesen Zug und seine Alternative …');
 v546Timer=setTimeout(async()=>{
  if(!stillCurrent())return;
  if(typeof window.analyzeFen!=='function'){write('Stockfish nicht verfügbar: Der Zug kann nicht zuverlässig bewertet werden.');return}
  try{
   // Stockfish besitzt eine eigene Warteschlange; keine gleichzeitig startenden Suchaufträge.
   const before=await window.analyzeFen(r.before,Math.min(11,Math.max(8,Number(v536Prefs.coachDepth)||10)));
   if(!stillCurrent())return;
   const after=await window.analyzeFen(r.after,Math.min(11,Math.max(8,Number(v536Prefs.coachDepth)||10)));
   if(!stillCurrent())return;
   const cpBefore=sfWhiteScore(r.before,before),cpAfter=sfWhiteScore(r.after,after);
   if(!Number.isFinite(cpBefore)||!Number.isFinite(cpAfter))throw Error('unvollständige Stellungsbewertung');
   const side=fromFen(r.before).turn,rawLoss=side==='w'?cpBefore-cpAfter:cpAfter-cpBefore;
   const loss=Math.max(0,Math.round(rawLoss)),exactBest=String(before.bestmove||'')===String(r.uci||'');
   const grade=exactBest?'Bester Zug':loss<=40?'Sehr gut':loss<=85?'Gut':loss<=160?'Ungenauigkeit':loss<=300?'Fehler':'Patzer';
   const mover=side==='w'?'Weiß':'Schwarz';
   const legalBest=legal(fromFen(r.before)).some(x=>moveUci(x)===String(before.bestmove||''));
   const detail=exactBest?'Stockfish bevorzugt genau diese Fortsetzung.':
     legalBest?'Stockfish bevorzugt '+v546MoveName(before.bestmove)+' statt '+deSan(r.san)+'.':'Ein besserer Zug konnte nicht eindeutig zugeordnet werden.';
   const action=String(r.san||'').includes('#')?' Der Zug führt zu Schachmatt.':String(r.san||'').includes('+')?' Der Zug bietet Schach.':String(r.san||'').includes('x')?' Der Zug schlägt eine Figur.':'';
   const consequence=loss<=40?' Der Zug hält die Stellung gut im Rahmen der Engine-Bewertung.':loss<=85?' Ein etwas genauerer Zug war möglich.':loss<=160?' Dadurch verschlechtert sich die Stellung messbar.':' Die Stellung verschlechtert sich deutlich. Prüfe vor dem Zug gegnerische Schachs, Schlagzüge und Drohungen.';
   const tactical=v551TacticalConsequences(r);
   const message=(index+1)+'. '+deSan(r.san)+' – '+grade+'. '+mover+' verliert gegenüber der besten Fortsetzung '+(loss/100).toFixed(2).replace('.',',')+' Bauernpunkte. Bewertung vorher '+v546Score(cpBefore)+', nachher '+v546Score(cpAfter)+'. '+detail+action+consequence+tactical;
   v546Cache.set(cacheKey,message);if(v546Cache.size>160)v546Cache.delete(v546Cache.keys().next().value);
   write(message);
  }catch(err){write('Stockfish konnte '+deSan(r.san)+' nicht bewerten: '+(err.message||'Engine nicht verfügbar')+'. Keine erfundene Bewertung.')} 
 },150);
}

function v529RecMove(i){const r=v539Records()[i];if(!r)return null;return {f:Number.isInteger(r.f)?r.f:idx(String(r.uci||'').slice(0,2)),t:Number.isInteger(r.t)?r.t:idx(String(r.uci||'').slice(2,4))};}
function v529Msg(message){const el=elem('v529CoachText');if(el)el.textContent=message;}
function v529SetMode(mode){v529.mode=mode;const b=elem('v529Try');if(b)b.classList.toggle('on',mode==='trial');const label=elem('v529Mode');if(label)label.textContent=mode==='trial'?'Eigene Variante – orangefarbene Vorauszüge':'Originalpartie – gelbe Zugmarkierung';}
function v529PickRecord(index){
 const v546ScrollRoot=elem('gameContent'),v546ScrollBefore=v546ScrollRoot?.scrollTop;
 const rows=v539Records();if(!rows[index])return;v529.request++;v529.index=index;v529.position=fromFen(rows[index].after);v529.history=[];v529.last=v529RecMove(index);v529.mainLast=v529.last;v529.trialQuality='trial';v529.selected=-1;v529.hintStep=0;v529.hintMove=null;v529SetMode('view');v529Draw();
 const r=rows[index],grade=r.coach?.label,why=r.coach?.why;
 v529Msg((index+1)+'. Halbzug: '+deSan(r.san)+(grade?' – '+grade+'. ':' – noch nicht bewertet. ')+(why||'Du kannst den Zug ansehen oder vor diesem Zug selbst eine stärkere Fortsetzung suchen.'));
 v546CoachForMove(index);v551ReviewPick(index);
 const el=elem('v525ReviewDetail');if(el)el.textContent='Ausgewählter Zug: '+deSan(r.san)+(grade?' · '+grade:'');
 elem('v529ReviewIndex').textContent=(index+1)+' / '+rows.length;
 elem('v525MoveList')?.querySelectorAll('.v525Move').forEach((node,i)=>node.classList.toggle('v529Selected',Number(node.dataset.recordIndex)===index));
 if(v546ScrollRoot&&Number.isFinite(v546ScrollBefore))v546ScrollRoot.scrollTop=v546ScrollBefore;
}
function v529TryBefore(){v546Cancel();const r=v539Records()[v529.index];if(!r){if(v529.position)v529TryFromShown();return;}v529.request++;v529.position=fromFen(r.before);v529.history=[];v529.last=null;v529.mainLast=v529RecMove(v529.index-1);v529.trialQuality='trial';v529.selected=-1;v529.hintStep=0;v529.hintMove=null;v529SetMode('trial');v529Msg('Du bist am Zug. Versuche, anstelle von '+deSan(r.san)+' eine bessere Fortsetzung zu finden. Tipp 1 markiert nur die Figur.');v529Draw();}
function v529TryFromShown(){v546Cancel();if(!v529.position)return;v529.request++;v529.history=[];v529.mainLast=v529.last;v529.last=null;v529.trialQuality='trial';v529.selected=-1;v529.hintStep=0;v529.hintMove=null;v529SetMode('trial');v529Msg('Freie Analyse ab der angezeigten Stellung. Spiele legale Züge; Stockfish bewertet deine Varianten.');v529Draw();}
function v529PlyMove(from,to){v546Cancel();
 const p=v529.position;if(!p)return;const all=legal(p),candidates=all.filter(m=>m.f===from&&m.t===to);const m=candidates.find(x=>!x.promo||x.promo==='q')||candidates[0];if(!m)return;
 const before=toFen(p),san=notation(p,m,all);v529.history.push({before,last:v529.last,move:m,quality:'trial'});v529.position=move(p,m);v529.last={f:m.f,t:m.t};v529.trialQuality='trial';v529.selected=-1;v529.hintStep=0;v529.hintMove=null;
 const orig=elem('v529Board')?.querySelector('.v529Sq[data-i="'+m.f+'"]')?.getBoundingClientRect();v529Draw();
 const dest=elem('v529Board')?.querySelector('.v529Sq[data-i="'+m.t+'"] .v529Piece');
 if(orig&&dest&&typeof dest.animate==='function'){const target=dest.getBoundingClientRect();dest.animate([{transform:'translate('+(orig.left-target.left)+'px,'+(orig.top-target.top)+'px)'},{transform:'translate(0,0)'}],{duration:230,easing:'ease-out'});}
 const request=++v529.request,after=toFen(v529.position);
 v529Msg(deSan(san)+' gespielt. Stockfish bewertet deinen Zug …');
 (async()=>{try{
  if(typeof window.analyzeFen!=='function')throw Error('Stockfish ist nicht geladen');
  const [a,b]=await Promise.all([window.analyzeFen(before,9),window.analyzeFen(after,9)]);
  if(request!==v529.request)return;
  const initial=sfWhiteScore(before,a),result=sfWhiteScore(after,b);if(!Number.isFinite(initial)||!Number.isFinite(result)||!a?.bestmove)throw Error('Keine vollständige Engine-Bewertung');
  const side=fromFen(before).turn,loss=Math.max(0,Math.round((initial-result)*(side==='w'?1:-1))),best=String(a.bestmove).toLowerCase(),isBest=best===moveUci(m);
  const grade=isBest?'Bester Zug':loss<=30?'Sehr gut':loss<=95?'Ungenauigkeit':loss<=210?'Fehler':'Patzer';
  if(v529.history.length){const h=v529.history[v529.history.length-1];if(h&&toFen(v529.position)===after){h.quality=v534QualityName(grade);v529.trialQuality=h.quality;v529Draw();}}
  v529Msg(deSan(san)+' – '+grade+'. Stockfish: '+fmtEval(result)+' aus Sicht von Weiß. '+(isBest?'Du hast die bevorzugte Fortsetzung gefunden.': 'Bewertungsverlust ca. '+(loss/100).toFixed(2)+' Bauerneinheiten. Drücke „Tipp“, um den besten Zug zu sehen.'));
 }catch(e){if(request===v529.request)v529Msg(deSan(san)+' gespielt. '+stockfishUnavailable(e));}})();
}
function v529Click(idx0){
 if(Date.now()<v529.ignoreClickUntil)return;
 if(!v529.position)return;
 if(v529.mode==='view')v529TryFromShown();
 const p=v529.position,all=legal(p),chosen=v529.selected;
 if(chosen>=0&&all.some(m=>m.f===chosen&&m.t===idx0)){v529PlyMove(chosen,idx0);return;}
 if(p.board[idx0]&&color(p.board[idx0])===p.turn){v529.selected=idx0;v529Draw();return;}
 v529.selected=-1;v529Draw();
}
function v529Draw(){
 const root=elem('v529Board'),p=v529.position;if(!root||!p)return;
 const frag=document.createDocumentFragment(),moves=v529.mode==='trial'&&v529.selected>=0?legal(p).filter(x=>x.f===v529.selected):[];
 for(let view=0;view<64;view++){
  const i=v529.flip?63-view:view,pc=p.board[i],cell=document.createElement('div');cell.className='v529Sq '+((Math.floor(i/8)+i%8)%2===0?'light':'dark');cell.dataset.i=i;
  if(v529.mode==='trial'&&v534ColorsOn){
   if(v529.mainLast?.f===i)cell.classList.add('v534MainFrom');
   if(v529.mainLast?.t===i)cell.classList.add('v534MainTo');
   if(v529.last?.f===i)cell.classList.add('v534TrialFrom',v529.trialQuality==='bad'?'v534TrialBad':v529.trialQuality==='good'?'v534TrialGood':'v534TrialNeutral');
   if(v529.last?.t===i)cell.classList.add('v534TrialTo',v529.trialQuality==='bad'?'v534TrialBad':v529.trialQuality==='good'?'v534TrialGood':'v534TrialNeutral');
  } else {
   if(v529.last?.f===i)cell.classList.add('v529LastFrom');
   if(v529.last?.t===i)cell.classList.add('v529LastTo');
  }
  if(i===v529.selected)cell.classList.add('v529Picked');
  if(v529.hintStep>=1&&v529.hintMove?.f===i)cell.classList.add('v529HintFrom');
  if(v529.hintStep>=2&&v529.hintMove?.t===i)cell.classList.add('v529HintTo');
  if(pc&&pc.toLowerCase()==='k'&&color(pc)===p.turn&&inCheck(p,p.turn))cell.classList.add('v529Check');
  if(pc){const img=document.createElement('img');img.className='v529Piece';img.src='./theme_pieces/'+imgMap[pc];img.alt=(isW(pc)?'Weiße ':'Schwarze ')+nm[pc.toUpperCase()];img.draggable=false;cell.append(img);}
  if(moves.some(m=>m.t===i)){const dot=document.createElement('span');dot.className=pc?'v529Capture':'v529Dot';cell.append(dot)}
  if(view%8===0){const coord=document.createElement('span');coord.className='v529Coord v529Rank';coord.textContent=sq(i)[1];cell.append(coord)}
  if(view>=56){const coord=document.createElement('span');coord.className='v529Coord v529File';coord.textContent=sq(i)[0];cell.append(coord)}
  cell.addEventListener('click',()=>v529Click(i));frag.append(cell);
 }
 root.replaceChildren(frag);
 if(v529.hintStep>=2&&v529.hintMove){const m=v529.hintMove,xy=i=>{const x=i%8,y=Math.floor(i/8);return [(v529.flip?7-x:x)*100+50,(v529.flip?7-y:y)*100+50]};const [x1,y1]=xy(m.f),[x2,y2]=xy(m.t);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','v529Arrow');svg.setAttribute('viewBox','0 0 800 800');svg.setAttribute('aria-hidden','true');svg.innerHTML='<defs><marker id="v529Head" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5Z" fill="#83df75"/></marker></defs><line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#83df75" stroke-opacity=".84" stroke-width="17" stroke-linecap="round" marker-end="url(#v529Head)"/>';root.append(svg)}
 const status=elem('v529BoardStatus');if(status)status.textContent=(p.turn==='w'?'Weiß':'Schwarz')+' am Zug'+(inCheck(p,p.turn)?' – Schach!':'')+(outcome(p)?' · '+outcome(p):'');
}
function v529Back(){const rows=v539Records();if(!rows.length)return;if(v529.index<=0){v539StartPosition('Anfangsstellung der ausgewählten Partie.');return;}v529PickRecord(v529.index-1)}
function v529Forward(){const rows=v539Records();if(!rows.length)return;v529PickRecord(Math.min(rows.length-1,v529.index+1))}
function v529Undo(){v546Cancel();if(v529.mode!=='trial'||!v529.history.length){v529Msg('Kein eigener Analysezug zum Zurücknehmen.');return}const previous=v529.history.pop();v529.request++;v529.position=fromFen(previous.before);v529.last=previous.last;v529.trialQuality=v529.history.length?v529.history[v529.history.length-1].quality:'trial';v529.selected=-1;v529.hintStep=0;v529.hintMove=null;v529Msg('Analysezug zurückgenommen. Versuche eine andere Fortsetzung.');v529Draw()}
async function v529Hint(){
 if(!v529.position)return;
 if(v529.mode==='view')v529TryBefore();
 if(v529.hintMove){v529.hintStep=Math.min(2,v529.hintStep+1);v529ShowHint();return}
 const fen=toFen(v529.position),ticket=++v529.request;v529Msg('Stockfish sucht den besten Zug …');
 try{if(typeof window.analyzeFen!=='function')throw Error('Engine nicht verfügbar');const r=await window.analyzeFen(fen,9);if(ticket!==v529.request||fen!==toFen(v529.position))return;
  const m=legal(v529.position).find(x=>moveUci(x)===r.bestmove);if(!m)throw Error('Kein legaler Bestzug zurückgegeben');
  v529.hintMove=m;v529.hintStep=1;v529ShowHint();
 }catch(e){if(ticket===v529.request)v529Msg(stockfishUnavailable(e))}
}
function v529ShowHint(){const m=v529.hintMove;if(!m)return;const kind=nm[(v529.position.board[m.f]||'').toUpperCase()]||'Figur';v529Msg(v529.hintStep===1?'Tipp 1: '+kind+' auf '+sq(m.f)+' ist markiert. Finde nun selbst das richtige Zielfeld.':'Tipp 2: Der grüne Pfeil zeigt '+sq(m.f)+' → '+sq(m.t)+'. Versuche den Zug selbst.');v529Draw();}
function v529Initialize(){
 const section=elem('v525Review'),old=elem('v525ReviewBoard');if(!section||!old||elem('v529Stage'))return;
 const stage=document.createElement('div');stage.id='v529Stage';stage.className='v529Stage';
 stage.innerHTML='<div class="v529Coach"><div class="v529Avatar" aria-hidden="true"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="34" fill="#8eaa75"/><path d="M13 65q2-23 23-23t23 23" fill="#315c4b"/><circle cx="36" cy="30" r="18" fill="#e9be92"/><path d="M18 28q1-27 24-21q14 3 12 24q-6-8-14-14q-9 10-22 11" fill="#473625"/><circle cx="29" cy="30" r="2"/><circle cx="43" cy="30" r="2"/><path d="M29 39q7 6 14 0" fill="none" stroke="#684331" stroke-width="2"/></svg></div><div class="v529Bubble"><strong>Dein Stockfish-Trainer</strong><p id="v529CoachText" aria-live="polite">Wähle einen Zug aus deiner Partie.</p></div></div><div class="v529BoardMeta"><span id="v529Mode">Partie ansehen</span><strong id="v529BoardStatus">Weiß am Zug</strong></div><div class="v534Legend"><span><i class="v534LegendMain"></i>Original</span><span><i class="v534LegendTrial"></i>Variante</span><span><i class="v534LegendBad"></i>Fehler</span><label><input type="checkbox" id="v534ColorToggle" checked> Farben</label></div><div id="v529Board" class="v529Board" role="group" aria-label="Interaktives Schach-Analysebrett"></div><div class="v529Toolbar"><button id="v529Hint" type="button">💡 Tipp</button><button id="v529Try" type="button">♟ Selbst ausprobieren</button><button id="v529Undo" type="button">↶ Zurücknehmen</button></div><div class="v529Foot"><button id="v529Back" type="button" aria-label="Vorheriger Partiezug">❮ Zurück</button><span id="v529ReviewIndex">0 / 0</span><button id="v529Forward" type="button" aria-label="Nächster Partiezug">Weiter ❯</button></div><div class="v529Extra"><button id="v529Reset" type="button">↻ Originalstellung</button><button id="v529Flip" type="button">⇅ Brett drehen</button></div>';
 old.replaceWith(stage);const detail=elem('v525ReviewDetail');if(detail)detail.hidden=true;
 // Trainer und Brett stehen vor der bewerteten Zugliste.
 const list=elem('v525MoveList');list?.before(stage);
 elem('v534ColorToggle').checked=v534ColorsOn;elem('v534ColorToggle').onchange=e=>v534SetColors(e.target.checked);document.body.classList.toggle('v534ColorsOn',v534ColorsOn);
 elem('v529Try').onclick=v529TryBefore;elem('v529Hint').onclick=v529Hint;elem('v529Undo').onclick=v529Undo;elem('v529Back').onclick=v529Back;elem('v529Forward').onclick=v529Forward;v550InstallJumpButtons();
 elem('v529Reset').onclick=()=>{if(v539.source==='free'||v529.index<0)v539StartPosition('Startstellung wiederhergestellt.');else v529PickRecord(v529.index)};elem('v529Flip').onclick=()=>{v529.flip=!v529.flip;v529Draw()};
 const root=elem('v529Board');root.addEventListener('pointerdown',e=>{const cell=e.target.closest('.v529Sq');if(!cell)return;const i=Number(cell.dataset.i),pc=v529.position?.board[i];if(pc&&color(pc)===v529.position.turn)v529.drag={from:i,x:e.clientX,y:e.clientY};});
 root.addEventListener('pointerup',e=>{const d=v529.drag;v529.drag=null;if(!d||Math.hypot(e.clientX-d.x,e.clientY-d.y)<14)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.v529Sq');if(!target||!root.contains(target))return;if(v529.mode==='view')v529TryFromShown();v529.ignoreClickUntil=Date.now()+350;v529PlyMove(d.from,Number(target.dataset.i));});
}

/* V5.50 – unabhängige Review-Ansicht direkt am großen Brett. */
let v550Anchor=null;
function v550InstallJumpButtons(){
 const foot=elem('v529Back')?.parentElement;
 if(!foot||elem('v550First'))return;
 const first=document.createElement('button');first.type='button';first.id='v550First';first.textContent='⏮ Anfang';first.setAttribute('aria-label','Direkt zur Anfangsstellung');first.onclick=()=>v539StartPosition('Anfangsstellung. Mit Weiter spielst du den ersten Zug ab.');
 const last=document.createElement('button');last.type='button';last.id='v550Last';last.textContent='Ende ⏭';last.setAttribute('aria-label','Direkt zum letzten Zug');last.onclick=()=>{const rows=v539Records();if(rows.length)v529PickRecord(rows.length-1);else v539StartPosition('Startstellung – noch keine Partiezüge vorhanden.');};
 foot.prepend(first);foot.append(last);
}
function v550EnsureReview(){
 if(elem('v550Overlay'))return;
 const root=document.createElement('div');root.id='v550Overlay';root.className='v550Overlay';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Interaktive Partieanalyse am großen Brett');
 root.innerHTML='<header class="v550Head"><button type="button" id="v550Exit">← Zur Analyse</button><strong>Partie-Review</strong><button type="button" id="v550More" aria-label="Weitere Brettoptionen">⋯</button></header><div id="v550Body" class="v550Body"></div>';
 document.body.append(root);
 elem('v550Exit').onclick=v550CloseReview;
 elem('v550More').onclick=()=>root.classList.toggle('v550ShowMore');
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();v550CloseReview();}});
}
function v550OpenReview(){
 const section=elem('v525Review');if(!section)return;
 v550InstallJumpButtons();v550EnsureReview();
 const root=elem('v550Overlay');if(!v550Anchor){v550Anchor=document.createComment('Review-Platzhalter');section.parentNode?.insertBefore(v550Anchor,section);}
 elem('v550Body').append(section);v551ReviewControls();root.hidden=false;root.classList.remove('v550ShowMore');document.body.classList.add('v550ReviewOpen');elem('v550Body').scrollTop=0;
}
function v550CloseReview(){
 v551StopAutoplay();const root=elem('v550Overlay'),section=elem('v525Review');if(!root||root.hidden)return;
 if(v550Anchor?.parentNode&&section)v550Anchor.replaceWith(section);
 v550Anchor=null;root.hidden=true;root.classList.remove('v550ShowMore');document.body.classList.remove('v550ReviewOpen');
 // Andere Bereiche und bereits gespeicherte Partien bleiben unverändert.
}
function v525ReviewPosition(i){
 if(elem('v529Board')){v529PickRecord(i);return;}
 const r=v539Records()[i];if(!r)return;
 try{
  const p=fromFen(r.before),m=legal(p).find(m=>moveUci(m)===r.uci),after=m?move(p,m):p;
  v58Board(after,'v525ReviewBoard');
  const root=elem('v525ReviewBoard');if(root&&m){root.querySelector('.v57square[data-i="'+m.f+'"]')?.classList.add('v525From');root.querySelector('.v57square[data-i="'+m.t+'"]')?.classList.add('v525Target')}
  elem('v525ReviewDetail').textContent=(i+1)+'. Halbzug · '+deSan(r.san)+' · '+(r.coach?.label||'Noch nicht mit Stockfish bewertet')+'. '+(r.coach?.why||'Wähle „Partie analysieren“, um den Zug bewerten zu lassen.');
 }catch(e){elem('v525ReviewDetail').textContent='Stellung konnte nicht angezeigt werden: '+e.message}
}
function v525ReviewRefresh(){
 const list=elem('v525MoveList');if(!list)return;
 list.replaceChildren();const rows=v539Records(),data=rows.slice(-100);
 if(!data.length){list.textContent=v539.source==='free'?'Freie Analyse: Ziehe eine Figur, um eine eigene Variante zu untersuchen.':'Noch keine Züge vorhanden. Wähle eine gespeicherte Partie oder starte eine neue.';return}
 const offset=rows.length-data.length;
 for(const [n,r] of data.entries()){
  const i=offset+n,loss=Number(r.coach?.loss),severity=!Number.isFinite(loss)?'pending':loss<40?'good':loss<110?'warn':loss<260?'bad':'blunder';
  const button=document.createElement('button');button.type='button';button.className='v525Move v525-'+severity;
  button.textContent=(i+1)+'. '+deSan(r.san)+' '+(r.coach?.label||'…');button.title='Stellung und Coach-Bewertung anzeigen';button.dataset.recordIndex=i;button.onclick=()=>v525ReviewPosition(i);
  list.append(button);
 }
 v525ReviewPosition(rows.length-1);
}
function v525ReviewInit(){
 const analysis=elem('v514Report')||elem('moveReview');if(!analysis||elem('v525Review'))return;
 const section=document.createElement('section');section.id='v525Review';section.className='v525Feature';
 section.innerHTML='<strong>📊 Zug-für-Zug-Analyse</strong><p>Tippe auf einen Zug, um die Stellung und das Stockfish-Urteil zu sehen. Keine offizielle Chess.com-Genauigkeitsberechnung.</p><div class="v525Buttons"><button id="v525RefreshReview" type="button">↻ Zugverlauf aktualisieren</button><button id="v525AnalyzeGame" type="button">🔎 Partie mit Stockfish analysieren</button></div><div id="v525MoveList" class="v525MoveList"></div><div id="v525ReviewBoard" class="v58SubBoard v525MiniBoard"></div><p id="v525ReviewDetail" class="v525Status" aria-live="polite"></p>';
 analysis.append(section);
 v529Initialize();
 elem('v525RefreshReview').onclick=v525ReviewRefresh;
 elem('v525AnalyzeGame').onclick=async()=>{const b=elem('v525AnalyzeGame');b.disabled=true;b.textContent='Stockfish analysiert …';try{if(v539.source==='current')await stockfishReview();else await v539AnalyzeShown()}finally{b.disabled=false;b.textContent='🔎 '+(v539.source==='current'?'Partie mit Stockfish analysieren':'Stellung mit Stockfish bewerten');if(v539.source==='current')v525ReviewRefresh()}};
 v525ReviewRefresh();
}
function v525PuzzleInit(){
 const select=elem('themeFilter');if(!select||elem('v525Motifs'))return;
 const wrapper=document.createElement('div');wrapper.id='v525Motifs';wrapper.className='v525Feature';
 const title=document.createElement('strong');title.textContent='🧩 Themen-Training';wrapper.append(title);
 const buttons=document.createElement('div');buttons.className='v525Buttons';
 for(const name of ['Alle Motive','Gabel','Spieß','Fesselung','Matt in 1','Matt in 2','Abzug']){
  if(![...select.options].some(o=>o.value===name))continue;
  const button=document.createElement('button');button.type='button';button.textContent=name;
  button.onclick=()=>{select.value=name;select.dispatchEvent(new Event('change',{bubbles:true}));wrapper.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===button)))};
  buttons.append(button);
 }
 wrapper.append(buttons);
 const note=document.createElement('p');note.className='v525Status';note.textContent='Tipp 1 markiert die Figur, Tipp 2 zeigt den Pfeil. Gelöste Aufgaben und Wiederholungen bleiben gespeichert.';
 wrapper.append(note);select.parentElement.after(wrapper);
}
function v525OpeningInit(){
 const root=elem('openingTrainer');if(!root||elem('v525OpeningNote'))return;
 const note=document.createElement('div');note.id='v525OpeningNote';note.className='v525Feature';
 note.innerHTML='<strong>📚 Eröffnungstrainer 2.0</strong><p>Wiederhole fällige Varianten. Fehlerfreie Wiederholungen erhöhen das Intervall; dein bisheriger Lernstand bleibt erhalten.</p><div class="v525Buttons"><button id="v525OpeningDue" type="button">🔁 Fällige Varianten anzeigen</button></div><p id="v525OpeningStatus" class="v525Status"></p>';
 root.append(note);
 elem('v525OpeningDue').onclick=()=>{
  const due=v58OpeningDue();const out=elem('v525OpeningStatus');
  out.textContent=due.length?due.slice(0,8).map(x=>x.o.name||x.o.title||x.id).join(' · '):'Heute keine bereits gelernten Varianten fällig. Übe eine neue Eröffnung.';
 };
}
function v525StatsInit(){
 const root=elem('statsContent');if(!root||elem('v525Stats'))return;
 const section=document.createElement('section');section.id='v525Stats';section.className='v525Feature';section.innerHTML='<strong>📈 Dein Trainingsfokus</strong><p>Die Empfehlungen basieren auf deinen lokal gespeicherten Fehlern und Trainingseinheiten.</p><div id="v525StatsText"></div><div class="v525Buttons"><button id="v525StatsRefresh" type="button">↻ Statistik aktualisieren</button></div>';
 root.prepend(section);elem('v525StatsRefresh').onclick=v525StatsRefresh;v525StatsRefresh();
}
function v525StatsRefresh(){
 const el=elem('v525StatsText');if(!el)return;
 const due=v58DueErrors().length,openDue=v58OpeningDue().length,games=(summaryStore.games||[]).length;
 const summary=summaryStore.accuracyHistory||[];const last=summary.slice(-10);
 const bar=document.createElement('div');bar.className='v525History';bar.setAttribute('aria-label','Geschätzte Genauigkeit letzter Analysen');
 for(const x of last){const b=document.createElement('div');const a=Math.min(100,Math.max(0,Number(x.accuracy)||0));b.className='v525HistoryBar';b.style.height=Math.max(10,a)+'%';b.title=(x.day||'Analyse')+': '+a+' %';bar.append(b)}
 el.replaceChildren();const text=document.createElement('p');text.className='v525Status';text.textContent=`${games} gespeicherte Partien · ${due} fällige Fehler · ${openDue} fällige Eröffnungen.`;el.append(text);
 if(last.length){el.append(bar);const cap=document.createElement('small');cap.textContent='Geschätzte Genauigkeit nach Stockfish-Analyse (nicht Chess.com).';el.append(cap)}
 const tip=document.createElement('p');tip.textContent=due?'Dein Fokus: Eigene Fehler erneut lösen.':openDue?'Dein Fokus: Bereits gelernte Eröffnungen festigen.':'Dein Fokus: Drei Taktikrätsel und ein Endspiel trainieren.';el.append(tip);
}
function v525CoachInit(){
 const root=elem('v517Coach');if(!root||elem('v525CoachPrompt'))return;
 const section=document.createElement('div');section.id='v525CoachPrompt';section.className='v525Feature';
 section.innerHTML='<strong>🧠 Coach 3.0 · Denkfrage</strong><p>Bevor du einen Tipp öffnest: Ist dein König sicher? Welche Figuren sind ungedeckt? Gibt es Schach, Schlagzug oder Drohung?</p><div class="v525Buttons"><button id="v525CoachWhy" type="button">❓ Meinen Fehler erklären</button><button id="v525CoachTry" type="button">↩ Noch einmal versuchen</button></div><p id="v525CoachQuestion" class="v525Status"></p>';
 root.append(section);
 elem('v525CoachWhy').onclick=()=>{const coach=window.ChessAnalysisQA;coach?.v517CoachExplain?.();const reply=elem('v517CoachReply');elem('v525CoachQuestion').textContent=reply?.textContent?.trim()||'Spiele einen Zug und starte die Stockfish-Analyse.'};
 elem('v525CoachTry').onclick=()=>{const coach=window.ChessAnalysisQA;coach?.v517CoachRetry?.();const reply=elem('v517CoachReply');elem('v525CoachQuestion').textContent=reply?.textContent?.trim()||'Keine wiederholbare Fehlstellung gefunden.'};
}
function v525SafetyInit(){
 const root=elem('v514BackupInfo')?.parentElement||elem('v515Quick');if(!root||elem('v525Safety'))return;
 const section=document.createElement('section');section.id='v525Safety';section.className='v525Feature';
 section.innerHTML='<strong>🛡 Update & Datensicherheit</strong><p>Spielstände bleiben im gleichen lokalen Speicher. Exportiere vor App-Updates eine Sicherung; die App fragt nie nach deinem privaten Signaturschlüssel.</p><div class="v525Buttons"><button id="v525Export" type="button">⬇ Backup als JSON exportieren</button><button id="v525Haptic" type="button">📳 Haptik testen</button></div><p id="v525SafetyStatus" class="v525Status" aria-live="polite"></p>';
 root.append(section);
 elem('v525Export').onclick=()=>{v57ExportBackup();elem('v525SafetyStatus').textContent=elem('v57BackupStatus')?.textContent||'Prüfe deinen Download-Ordner.'};
 elem('v525Haptic').onclick=()=>{
  const node=elem('v525SafetyStatus');
  try{v518TestHaptic();node.textContent='Test ausgelöst. Ob dein Vibrationsmotor reagiert, lässt sich nur auf deinem Smartphone prüfen. Kontrolliere bei Bedarf Samsung-Systemvibration und die App-Einstellung.'}
  catch(e){node.textContent='Vibration fehlgeschlagen: '+e.message}
 };
}
function v525OpponentInit(){
 for(const id of ['v58Style','v515StyleQuick']){
  const select=elem(id);if(!select)continue;
  for(const [value,label] of [['taktisch','Taktisch'],['defensiv','Defensiv']]){
   if(![...select.options].some(o=>o.value===value)){const o=document.createElement('option');o.value=value;o.textContent=label;select.add(o)}
  }
  select.value=v58prefs.style;
 }
}
function v525Init(){
 v525OpponentInit();v525EndInit();v525ReviewInit();v525PuzzleInit();v525OpeningInit();v525StatsInit();v525CoachInit();v525SafetyInit();
 // Mobile interaction: prevent unnecessary scroll jumps from button focus.
 document.querySelectorAll('.v525Feature button').forEach(b=>b.addEventListener('pointerdown',()=>{if(document.activeElement===b)b.blur()},{passive:true}));
 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {v525EndHint,v525EndDemo,v525ReviewRefresh,v525StatsRefresh,v525OpeningDue:v58OpeningDue,v525Options:()=>({...v525Options})});
}

function init(){
 const top=document.querySelector('.app>.top'),main=document.querySelector('.app');if(!top||!main)return;
 top.innerHTML=`<div class="v512Brand"><span class="v512Logo" aria-hidden="true">♞</span><div><h1>Schach 1001+ Pro</h1><p>Üben · Spielen · Besser werden</p></div></div><button type="button" id="homeVoiceToggle" class="v512VoiceTop" aria-label="Coach-Sprachausgabe ein- oder ausschalten" aria-pressed="false">🔇 Coach-Stimme AUS</button><span class="v512OldPuzzleBadge" id="pnum" hidden>Rätsel 1</span>`;
 const modes=document.createElement('nav');modes.className='modeTabs';modes.innerHTML='<button type="button" id="tabPuzzle" class="on">♟ 1.041 Rätsel</button><button type="button" id="tabGame">♚ Spielen & Analyse</button>';top.after(modes);
 const puzzles=document.createElement('div');puzzles.id='puzzleContent';const children=Array.from(main.children);for(const node of children){if(node===top||node===modes)continue;puzzles.appendChild(node)}main.appendChild(puzzles);
 const game=document.createElement('section');game.id='gameContent';game.hidden=true;
 game.innerHTML=`
 <div class="gameTitle"><h2>Spielen & Analysieren</h2><p>Spiele gegen den Computer, lokal zu zweit oder analysiere frei. Für jede Zugbewertung und jeden Bestzug wird ausschließlich Stockfish 19 Lite (offline) verwendet.</p></div>
 <div class="gameConfig">
 <label>Spielmodus<select id="gameMode"><option value="computer">Gegen Computer</option><option value="free">Zwei Spieler (lokal)</option><option value="analysis">Analysebrett</option><option value="opening">Eröffnungstrainer</option></select></label>
 <label id="engineField">Computergegner (Analyse immer Stockfish)<select id="gameEngine"><option value="local">Offline-Spielgegner</option><option value="stockfish">Stockfish 19 Lite (offline)</option></select></label>
 <label id="gameSideField">Deine Farbe<select id="gameSide"><option value="w">Weiß</option><option value="b">Schwarz</option></select></label>
 <label id="eloField">Computerstärke <strong id="eloValue">≈ 1000 Elo</strong><input id="gameElo" type="range" min="400" max="2800" step="200" value="1000"/><small>Ab 2000: echte Stockfish-Engine mit deutlich steigender Rechenzeit. Elo nur Stärkeprofil, kein gemessenes Rating.</small><div id="v514EloPresets" class="v514Presets"><button type="button" data-elo="400">Einsteiger</button><button type="button" data-elo="800">Leicht</button><button type="button" data-elo="1200">Mittel</button><button type="button" data-elo="1600">Schwer</button><button type="button" data-elo="2000">Experte</button><button type="button" data-elo="2400">Meister</button><button type="button" data-elo="2800">Elite (Stockfish)</button></div></label>
 </div>
 <details id="clockSettings" class="clockSettings card"><summary class="timeSummary">⏱ Spielzeit <strong id="timeSummaryValue">10 Min.</strong><span>Ändern</span></summary><div class="timeInner"><div class="timeHeading"><h3>⏱ Spielzeit einstellen</h3><small>Nur für Partien – keine Uhr bei Rätseln</small></div>
 ${timeOptions('Ohne Zeitdruck','∞',['none'])}
 ${timeOptions('Bullet · sehr schnell','⚡',['b1','b11','b21'])}
 ${timeOptions('Blitz','⚡',['b3','b32','b5','b55','b52'])}
 ${timeOptions('Schnellschach','⏱',['r10','r105','r1510','r20','r30','r60'])}
 ${timeOptions('Tagespartien (offline)','☀',['d1','d2','d3','d5','d7','d14'])}
 <div class="timeGroup"><h4>⚙ Eigene Zeit</h4><button type="button" class="timePreset customPreset" data-time="custom">Benutzerdefiniert</button>
 <div id="customTime" class="customTime" hidden><label>Startzeit <span>Minuten</span><input type="number" id="customMin" min="1" max="120" inputmode="numeric" value="10"></label><label>Bonus pro Zug <span>Sekunden</span><input type="number" id="customInc" min="0" max="60" inputmode="numeric" value="0"></label><button id="customApply" type="button" class="btn primary">Zeit übernehmen</button></div></div>
 <div class="timeSelected">Gewählt: <strong id="customLabel">10 Min.</strong><small>Eine geänderte Zeit startet eine neue Partie.</small></div></div></details>
 <div class="gameColumns"><section class="card gameBoardPanel"><div class="gameBoardMeta"><strong id="gameTurn">Weiß am Zug</strong><span id="gameEval" class="gameEvalHeadline" aria-label="Stellungsbewertung">– (Stockfish)</span><span id="gameThinking">Analyse: Stockfish 19 Lite</span></div>
 <div id="gameClocks" class="gameClocks"><div class="gameClock" id="gameClockB"><span>● Schwarz</span><strong>10:00</strong></div><div class="gameClock" id="gameClockW"><span>○ Weiß</span><strong>10:00</strong></div></div>
 <div id="gameCoachDock" class="gameCoachDock" aria-label="Schach-Coach während der Partie">
  <div class="gameCoachDockHead"><strong>🧠 Dein Coach</strong><button type="button" role="switch" aria-checked="true" aria-label="Coach einschalten oder ausschalten" id="gameCoachToggle" class="bestToggle on">● Coach: EIN</button></div>
  <details id="gameCoachDetails" class="gameCoachDetails"><summary id="gameCoachCompact" aria-live="polite">Coach bereit · Tippe für die Erklärung</summary><div id="gameCoachExpanded" class="gameCoachExpanded"></div></details>
 </div>
 <div id="gamePremoveRow" role="status" aria-live="polite"><span id="gamePremoveText">Vorabzug bereit.</span><button type="button" class="btn" id="gamePremoveCancel">✕ Vorabzug löschen</button></div><div class="gameBoardFrame"><div id="gameEvalRail" class="gameEvalRail" role="meter" aria-label="Stockfish-Stellungsbewertung: unten Weiß, oben Schwarz" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="Noch keine Stockfish-Bewertung"><div id="gameEvalFill" class="gameEvalRailWhite"></div><div class="gameEvalRailMid"></div><span class="gameEvalRailMark black" aria-hidden="true">S</span><span class="gameEvalRailMark white" aria-hidden="true">W</span></div><div id="gameBoard" class="gameBoard" aria-label="Schachbrett mit 8 mal 8 Feldern"></div></div>
 <section class="gameHistory" aria-label="Gespielte Züge und Zugnavigation">
  <header class="gameHistoryTop"><strong>♟ Zugverlauf</strong><small id="gameReviewStatus" role="status">● Live</small><button type="button" class="historyExpand" id="gameHistoryToggle" aria-expanded="false">Alle Züge ▾</button></header>
  <nav class="gameHistoryControl" aria-label="Durch Partie navigieren"><button id="gameHistoryStart" type="button" aria-label="Zum Partiebeginn">⏮</button><button id="gameHistoryPrev" type="button" aria-label="Vorheriger Zug">◀</button><div id="gameRecentMoves" class="gameRecentMoves" aria-label="Letzte Spielzüge"></div><button id="gameHistoryNext" type="button" aria-label="Nächster Zug">▶</button><button id="gameHistoryLive" type="button" aria-label="Zur aktuellen Stellung">Live ↪</button></nav>
  <div id="gameFullMoveList" hidden><div id="gameMoves" class="gameMoves">Noch keine Züge.</div></div>
 </section>
 <div id="gameNotice" class="gameNotice">Figuren mit dem Finger ziehen oder Start- und Zielfeld antippen.</div>
 <div class="gameButtons"><button class="btn primary" id="gameNew">Neue Partie</button><button class="btn" id="gameUndo">↶ Zurück</button><button class="btn" id="gameFlip">↻ Brett drehen</button><button class="btn warn" id="gameAnalyze">🔍 Analysieren</button><button class="btn" id="v514ArrowButton" type="button" aria-pressed="false">➜ Stockfish-Pfeil</button></div><div class="bestToggleRow"><button type="button" id="gameBestToggle" class="bestToggle" role="switch" aria-checked="false" aria-label="Besten Zug anzeigen">○ Bester Zug: AUS</button><small id="gameBestToggleStatus">Zugvorschläge verborgen – Coach und Stellungsbewertung bleiben aktiv.</small></div><div class="gameTopAnalysis" id="gameTopAnalysis" role="status" aria-live="polite">Stockfish zeigt die Bewertung. Der beste Zug ist verborgen.</div>
 </section><aside class="card gameSidePanel"><h3>Stellungsdetails</h3><p class="gameDisclaimer">Die Stockfish-Bewertung steht jetzt links neben dem Brett: Schwarz oben, Weiß unten.</p>
 <div id="gameAnalysis" class="gameText">Stockfish analysiert die Stellung. Zugvorschläge sind standardmäßig ausgeschaltet.</div><p class="gameDisclaimer">Elo-Anzeige nur als grober Vergleich: Die lokale Engine ist nicht offiziell Elo-getestet. Tagespartien funktionieren offline auf demselben Gerät. Bei der Bauernumwandlung kannst du zwischen Dame, Turm, Läufer und Springer wählen.</p></aside></div>`;
 main.appendChild(game);
 game.querySelector('.gameColumns').insertAdjacentHTML('afterend','<section class="card v514Report" id="v514Report" aria-live="polite"><h3>📊 Partieverlauf &amp; Zugbewertungen</h3><div id="v514ReportText">Noch keine Züge bewertet.</div><button type="button" id="v514ReviewNow" class="btn primary">Partie mit Stockfish analysieren</button><small>Genauigkeit ist eine Schätzung. Die vollständige Bewertung erfolgt erst nach dem Antippen und benötigt je nach Partielänge Zeit.</small></section>');
 // Dynamic premove messages must never push the chessboard up or down.
 const stableBoard=game.querySelector('.gameBoardFrame');
 const premoveBar=game.querySelector('#gamePremoveRow');
 if(stableBoard&&premoveBar)stableBoard.after(premoveBar);
 // Shared setting for live games and puzzles. Existing preferences/data are untouched.
 const markerSetting=document.createElement('div');markerSetting.className='v513MoveSetting';
 markerSetting.innerHTML='<label for="gameLastMoveToggle"><span>🟨 Letzten Zug markieren</span><small>Start- und Zielfeld · wie Chess.com</small></label><label class="v512SwitchWrap"><input type="checkbox" id="gameLastMoveToggle" role="switch" aria-label="Letzten Zug hervorheben"><span class="v512SwitchTrack"></span></label>';
 game.querySelector('.gameBoardFrame').after(markerSetting);
 markerSetting.insertAdjacentHTML('afterend','<div class="v514QuickSettings"><label>Figurenanimation <select id="v514Speed"><option value="140">Schnell</option><option value="240">Flüssig</option><option value="400">Langsam</option></select></label><small>Änderung gilt auch für Rätsel.</small></div>');
 const v514Speed=elem('v514Speed');v514Speed.value=String(v58prefs.animation);v514Speed.onchange=e=>{v58prefs.animation=Number(e.target.value);v58SavePrefs();v58Theme();localStorage.setItem('schach1001_animation_v514',e.target.value);const other=elem('v58Speed');if(other)other.value=e.target.value};
 function syncLastMoveSetting(){const c=elem('gameLastMoveToggle');if(c)c.checked=!!window.SchachLastMove?.enabled();}
 elem('gameLastMoveToggle').addEventListener('change',e=>window.SchachLastMove.set(e.target.checked));
 window.addEventListener('schach1001-lastmove-changed',()=>{syncLastMoveSetting();boardRenderKey='';render()});
 syncLastMoveSetting();
 const options=document.createElement('details');options.className='v510Settings';options.innerHTML='<summary>⚙ Partie einrichten <small id="gameModeBadge">Gegen Computer · 10 Min.</small><span>Ändern</span></summary>';
 game.querySelector('.gameTitle').after(options);options.append(game.querySelector('.gameConfig'),game.querySelector('#clockSettings'));
 const sidebar=game.querySelector('.gameSidePanel');const detailFold=document.createElement('details');detailFold.className='v510DeepAnalysis';detailFold.innerHTML='<summary>🔍 Ausführliche Stellungsanalyse</summary>';
 while(sidebar.firstChild)detailFold.appendChild(sidebar.firstChild);sidebar.appendChild(detailFold);
 game.querySelector('.gameColumns').insertAdjacentHTML('afterend',PRO_GAME_HTML+V57_HTML);
 // Make rarely used advanced tools collapsible without moving or destroying their state/handlers.
 for(const card of Array.from(game.querySelectorAll('.extraPanel'))){
  if(card.id==='gameCoachPanel'||card.id==='openingTrainer')continue;
  const title=card.querySelector('h3');if(!title)continue;
  const detail=document.createElement('details');detail.className='v512Fold';
  const summary=document.createElement('summary');summary.textContent=title.textContent;detail.appendChild(summary);
  title.remove();const content=document.createElement('div');content.className='v512FoldContent';
  while(card.firstChild)content.appendChild(card.firstChild);
  detail.appendChild(content);card.appendChild(detail);
 }
 elem('gameTopAnalysis').insertAdjacentHTML('afterend','<div class="v57nearCoachHint">Lerntipps über die Schaltfläche „Nächster Hinweis“ – ohne automatisch den besten Zug zu verraten.</div>');
 const coachHead=elem('gameCoachDock').querySelector('.gameCoachDockHead');coachHead.insertAdjacentHTML('beforeend','<button type="button" class="btn v57SpeakButton" id="v57SpeakNow" title="Aktuelle Erklärung vorlesen">🔊</button>');elem('v57SpeakNow').onclick=()=>{if(!v57prefs.voice){v512SetVoice(true);}v57VoiceLast='';v57Speak(record.at(-1)?.coach?(v57prefs.voiceMode==='kurz'?(deSan(record.at(-1).san)+'. '+record.at(-1).coach.label+'. '+record.at(-1).coach.brief):(deSan(record.at(-1).san)+'. '+record.at(-1).coach.why+' '+record.at(-1).coach.plan)):'Noch keine Coach-Erklärung vorhanden.')};
 elem('v57SpeakNow').insertAdjacentHTML('afterend','<label class="v514VoiceLabel">Coach-Ton <select id="v514VoiceMode" aria-label="Coach Sprachmodus"><option value="aus">Aus</option><option value="kurz">Kurz</option><option value="ausfuehrlich">Ausführlich</option></select></label>');elem('v514VoiceMode').onchange=e=>{const mode=e.target.value;v57prefs.voiceMode=mode;v57prefs.voice=mode!=='aus';v57savePrefs();if(mode==='aus')v57StopSpeech();v512SyncVoiceUI();};v512SyncVoiceUI();
 elem('v57SpeakNow').title='Deutsche Coach-Ansage abspielen oder wiederholen';elem('v57SpeakNow').setAttribute('aria-label','Letzte Coach-Erklärung vorlesen oder wiederholen');
 game.insertAdjacentHTML('beforeend','<div class="promotionBackdrop" id="promotionPicker" hidden><div class="promotionDialog"><h3>Bauer umwandeln</h3><p>Wähle deine neue Figur:</p><div class="promotionOptions"></div><button type="button" class="btn" id="promotionCancel">Abbrechen</button></div></div>');
 elem('promotionCancel').onclick=()=>{elem('promotionPicker').hidden=true};
 modes.insertAdjacentHTML('beforeend','<button type="button" id="tabStats">📊 Statistik</button>');
 const statsView=document.createElement('section');statsView.id='statsContent';statsView.hidden=true;main.appendChild(statsView);
 // Calm start dashboard; all counters are read from existing local storage, never reset.
 const home=document.createElement('section');home.id='homeContent';home.className='v512Home';home.hidden=true;
 home.innerHTML=`
 <div class="v512Welcome"><div><span class="v512Eyebrow">DEIN SCHACHTRAINING</span><h2>Bereit für den nächsten Zug?</h2><p>Wähle eine Partie, löse Rätsel oder arbeite mit deinem deutschen Coach.</p></div></div>
 <button type="button" class="v512Hero" id="homePlay"><span class="v512HeroText"><small>♟ SPIELEN</small><strong>Spielen &amp; analysieren</strong><span>Gegen Computer, lokal oder freies Analysebrett</span></span><span class="v512HeroPiece" aria-hidden="true">♞</span><span class="v512HeroArrow" aria-hidden="true">›</span></button>
 <div class="v512HomeGrid"><button type="button" id="homePuzzle" class="v512Tile"><span class="v512TileIcon" aria-hidden="true">🧩</span><strong>Rätsel lösen</strong><small id="homePuzzleCount">1.041 Schachaufgaben</small></button><button type="button" id="homeStats" class="v512Tile"><span class="v512TileIcon" aria-hidden="true">📈</span><strong>Fortschritt</strong><small>Statistik & Training</small></button></div>
 <section class="v512StatsSection"><header><h3>Deine Statistik</h3><button type="button" id="homeStatsMore" class="v512TextAction">Alle anzeigen ›</button></header><div class="v512StatGrid"><div class="v512Stat"><span>♟</span><strong id="homeSolved">0</strong><small>Rätsel gelöst</small></div><div class="v512Stat"><span>🔥</span><strong id="homeStreak">0</strong><small>Aktuelle Serie</small></div><div class="v512Stat"><span>🏆</span><strong id="homeBest">0</strong><small>Beste Serie</small></div></div><div class="v512Progress"><div><span>Rätsel-Fortschritt</span><b id="homeProgressText">0 / 1.041</b></div><div class="v512ProgressBar"><span id="homeProgressBar"></span></div></div></section>
 <section class="v512VoiceCard"><div class="v512VoiceTitle"><div><h3>🧠 Deutscher Coach</h3><p>Erklärungen und Tipps auf Wunsch vorlesen lassen.</p></div><label class="v512SwitchWrap" title="Sprachausgabe"><input id="homeVoiceSwitch" type="checkbox" role="switch" aria-label="Coach-Sprachausgabe aktivieren"><span class="v512SwitchTrack"></span></label></div><div class="v512VoiceFoot"><span id="homeVoiceNote">Sprachausgabe ausgeschaltet</span><button type="button" id="homeGoCoach" class="v512TextAction">Zum Coach ›</button></div></section>`;
 home.insertAdjacentHTML('beforeend',`<details class="v514Backups"><summary>💾 Fortschritt sichern &amp; wiederherstellen</summary><p>Deine bisherigen Partien, Rätsel und Coach-Einstellungen bleiben lokal erhalten. Für ein Gerätewechsel-Backup erst eine Datei exportieren.</p><div class="v514BackupActions"><button type="button" id="v514Export" class="btn primary">Backup exportieren</button><label class="btn">Backup importieren<input type="file" id="v514Import" accept=".json,application/json" hidden></label></div><small id="v514BackupInfo">Lokale Sicherungen aktiviert</small></details>`);
 main.appendChild(home);
 const bottom=document.createElement('nav');bottom.className='v512BottomNav';bottom.setAttribute('aria-label','Hauptnavigation');
 bottom.innerHTML=`<button type="button" id="navHome"><span>⌂</span><small>Start</small></button><button type="button" id="navGame"><span>♟</span><small>Spielen</small></button><button type="button" id="navAnalysis"><span>⌕</span><small>Analyse</small></button><button type="button" id="navStats"><span>▥</span><small>Statistik</small></button>`;
 main.appendChild(bottom);
 elem('navGame').insertAdjacentHTML('afterend','<button type="button" id="navTraining"><span>♜</span><small>Training</small></button>');
  elem('navTraining').insertAdjacentHTML('afterend','<button type="button" id="navOnline"><span>🌐</span><small>Online</small></button>');
  elem('navOnline').onclick=()=>{window.location.href='online.html'};
 const renderHome=()=>{
  let progress={};try{progress=JSON.parse(localStorage.getItem('schach1001-v1')||'{}')}catch(_){}
  const solved=Object.keys(progress.solved||{}).filter(k=>Number(k)>=1&&Number(k)<=1041).length;
  const streak=Math.max(0,Number(progress.streak)||0),best=Math.max(0,Number(progress.best)||0);
  elem('homeSolved').textContent=solved;elem('homeStreak').textContent=streak;elem('homeBest').textContent=best;
  elem('homeProgressText').textContent=solved+' / 1.041';elem('homeProgressBar').style.width=(solved/1041*100)+'%';
  elem('homePuzzleCount').textContent=(1041-solved)+' Aufgaben offen';
 };
 addPuzzlesAdaptive(puzzles);
 // Sortierte Eröffnungen für Weiß und Schwarz, inklusive Systematik und ECO-Kennung.
 const selectOpen=elem('openingPick');
 const groups=[['w','Eröffnungen für Weiß'],['b','Verteidigungen für Schwarz']];
 for(const [side,title] of groups){
   const items=Object.entries(OPENINGS).filter(([id,o])=>o.side===side).sort((a,b)=>a[1].group.localeCompare(b[1].group,'de')||a[1].name.localeCompare(b[1].name,'de'));
   const byGroup=new Map();for(const [id,o] of items){if(!byGroup.has(o.group))byGroup.set(o.group,[]);byGroup.get(o.group).push([id,o]);}
   for(const [category,entries] of byGroup){const og=document.createElement('optgroup');og.label=title+' · '+category;
     for(const [id,o] of entries){const option=document.createElement('option');option.value=id;option.textContent=o.name+' ('+o.eco+')';og.appendChild(option);}selectOpen.appendChild(og);}
 }
 selectOpen.value=openingId;
 elem('openingPick').onchange=e=>{openingId=e.target.value;v57OpeningBase=openingId;v538Start();};
 elem('openingRestart').onclick=()=>{openingId=v57OpeningBase;elem('openingPick').value=openingId;v538Start();};
 elem('gamePremoveCancel').onclick=()=>clearPremove('Vorabzug gelöscht.');
 elem('gameHistoryStart').onclick=()=>setReviewPly(0);
 elem('gameHistoryPrev').onclick=()=>changeReviewPly(-1);
 elem('gameHistoryNext').onclick=()=>changeReviewPly(1);
 elem('gameHistoryLive').onclick=()=>setReviewPly(null);
 elem('gameHistoryToggle').onclick=()=>{const target=elem('gameFullMoveList');target.hidden=!target.hidden;elem('gameHistoryToggle').textContent=target.hidden?'Alle Züge ▾':'Liste schließen ▴';elem('gameHistoryToggle').setAttribute('aria-expanded',String(!target.hidden))};
 elem('gameMoves').addEventListener('click',event=>{const btn=event.target.closest('[data-review-ply]');if(btn)setReviewPly(Number(btn.dataset.reviewPly))});
 elem('gameRecentMoves').addEventListener('click',event=>{const btn=event.target.closest('[data-review-ply]');if(btn)setReviewPly(Number(btn.dataset.reviewPly))});
 elem('v514ArrowButton').onclick=()=>setBestVisibility(!bestVisible());elem('gameBest').onclick=analyze;elem('gameBestToggle').onclick=()=>setBestVisibility(!bestVisible());elem('gameCoachToggle').onclick=()=>setCoachVisibility(!coachVisible());elem('gameReview').onclick=renderMoveReview;
 elem('v514ReviewNow').onclick=renderMoveReview;elem('gameSfReview').onclick=stockfishReview;elem('gameExport').onclick=exportPGN;
 elem('gameResign').onclick=resign;elem('gameOffer').onclick=offerDraw;elem('gameClaim').onclick=claimDraw;
 v57Init();v58Init();v512SyncVoiceUI();
 elem('gameEngine').onchange=e=>{setup.engine=e.target.value;persist();render();if(setup.engine==='stockfish')setNote('Stockfish ist lokal installiert und benötigt keine Internetverbindung.');};
 renderProfile();
 // V5.16: dedicated training navigation. Keep exactly one board and all existing storage keys.
 const V516_MATCH_KEY='schach1001_v516_saved_match';
 let v516Tool='opening';
 let v516BigBoard=false;
 try{v516BigBoard=localStorage.getItem('schach1001_v516_big_board')==='on'}catch(_){}
 function v516ApplyPage(page){
  if(page==='game'&&setup.mode==='opening'){
   try{const snap=JSON.parse(localStorage.getItem(V516_MATCH_KEY)||'null');
    if(snap&&snap.fen&&Array.isArray(snap.record)){
     clearFlights();token++;busy=false;picked=-1;reviewPly=null;boardRenderKey='';
     pos=fromFen(snap.fen);record=snap.record;setup={...setup,...snap.setup};flip=!!snap.flip;
     clock=snap.clock||newClock();gameResult=snap.gameResult||null;premove=snap.premove||null;premovePlan=premove?[premove]:[];
     persist();localStorage.removeItem(V516_MATCH_KEY);
    }
   }catch(_){}
  }
  const training=page==='training'||page==='analysis';game.dataset.v516Area=training?'training':'play';game.dataset.v526Page=page; document.body.classList.toggle('v526LargeBoard',page==='game'&&v516BigBoard&&!v517Prefs.focus);
  game.classList.toggle('v516Large',!training&&v516BigBoard);
  const toggle=elem('v516BigBoard');if(toggle){toggle.setAttribute('aria-pressed',String(!training&&v516BigBoard));toggle.textContent=v516BigBoard?'◱ Normales Brett':'⛶ Großes Brett'}
  const trainHead=elem('v516TrainingHead');if(trainHead)trainHead.hidden=page!=='training'; const analysisHead=elem('v526AnalysisHead');if(analysisHead)analysisHead.hidden=page!=='analysis';
  if(page==='analysis')v516SetTool('analysis',false); else if(page==='training')v516SetTool(v516Tool,false);
   v533OpeningHintPaint();
  v517SyncFocus(page);
 }
 function v516SetTool(tool,start){
  v516Tool=tool;
  for(const [t,id] of [['opening','v516Opening'],['endgame','v516Endgame'],['replay','v516Replay'],['analysis','v516Analysis']]){
   const b=elem(id);if(b){b.classList.toggle('on',t===tool);b.setAttribute('aria-pressed',String(t===tool))}
  }
  game.dataset.v516Tool=tool;
  game.querySelectorAll('.extraPanel').forEach(c=>c.classList.remove('v516ActiveTool'));
  const mark=id=>{const el=elem(id);const panel=el?.closest('.extraPanel');if(panel){panel.classList.add('v516ActiveTool');const fold=panel.querySelector('details.v512Fold');if(fold)fold.open=true;}return panel};
  const note=elem('v516TrainingNote');
  if(tool==='opening'){
   mark('openingTrainer');
   if(start)v538Start();
   if(note)note.textContent='Eigenes Eröffnungsbrett ohne Zeitlimit. Deine laufende Partie bleibt unverändert.';
  }else if(tool==='endgame'){
   mark('v58EndBoard');if(note)note.textContent='Übe auf dem eigenen Endspielbrett – ohne die laufende Partie zu überschreiben.';
  }else if(tool==='replay'){
   mark('v57Replay');if(note)note.textContent='Wiederhole deine analysierten Fehler auf einem getrennten Übungsbrett.';
  }else{
   mark('v58PgnText');mark('moveReview');if(note)note.textContent='Importiere eine PGN-Partie oder öffne die Partieanalyse – dein reguläres Spiel bleibt gespeichert.';
  }
  const startBtn=elem('v516StartOpening');if(startBtn)startBtn.hidden=tool!=='opening'||!!elem('v538Board');
  const analysis=elem('v514Report');if(analysis)analysis.classList.toggle('v516ActiveReport',tool==='analysis');
 }
 function v516Init(){
  const title=game.querySelector('.gameTitle');
  const boardPanel=game.querySelector('.gameBoardPanel');
  const board=game.querySelector('.gameBoardFrame');
  const meta=game.querySelector('.gameBoardMeta');
  // Place the actual interactive board ahead of voice coach, long controls, trainer and analytics.
  meta.after(board);
  title.querySelector('h2').textContent='Spielen';title.querySelector('p').textContent='Deine Partie – alles Weitere findest du in den eigenen Bereichen.';
  const top=document.createElement('div');top.className='v516TopBar';top.innerHTML='<strong>♟ Deine Partie</strong><button id="v516BigBoard" type="button" aria-pressed="false" title="Schachbrett in maximaler Breite anzeigen">⛶ Großes Brett</button>';
  title.after(top,game.querySelector('.gameColumns'));
  game.querySelector('.gameButtons').insertAdjacentHTML('afterbegin','<button id="v516RegularGame" type="button" class="btn" title="Neue normale Partie gegen Computer beginnen">♟ Neue normale Partie</button>');
  elem('v516RegularGame').onclick=()=>{setup.mode='computer';if(setup.time==='none')setup.time='r10';gameNew();};
  elem('v516BigBoard').onclick=()=>{v516BigBoard=!v516BigBoard;try{localStorage.setItem('schach1001_v516_big_board',v516BigBoard?'on':'off')}catch(_){}v516ApplyPage('game');boardRenderKey='';render();};
  const training=document.createElement('section');training.className='v516TrainingHead';training.id='v516TrainingHead';training.hidden=true;
  training.innerHTML='<div class="v516TrainingTitle"><h2>📚 Dein Training</h2><p>Eröffnungen, Endspiele, Fehlertraining und Analysen – unabhängig von der normalen Spielansicht.</p></div><div class="v516ToolTabs" role="group" aria-label="Training auswählen"><button id="v516Opening" type="button">📖 Eröffnungen</button><button id="v516Endgame" type="button">♚ Endspiele</button><button id="v516Replay" type="button">↩ Fehler</button><button id="v516Puzzles" type="button">🧩 Rätsel</button></div><p class="v516TrainingNote" id="v516TrainingNote"></p><button class="v516StartOpening" id="v516StartOpening" type="button">♟ Eröffnung am Brett starten</button>';
  game.prepend(training);
  elem('v516Opening').onclick=()=>v516SetTool('opening',false);
  elem('v516StartOpening').onclick=()=>{v516SetTool('opening',true);elem('v538Board')?.scrollIntoView({block:'nearest',behavior:'instant'});};
  elem('v516Endgame').onclick=()=>v516SetTool('endgame',false);
  elem('v516Replay').onclick=()=>v516SetTool('replay',false);
  elem('v516Puzzles').onclick=()=>goPage('puzzles');
  // All existing shortcuts go to the dedicated training area, not the cluttered game page.
  const openTraining=(which,autostart=false)=>{goPage('training');v516SetTool(which,autostart);};
  for(const id of ['v515GoOpening','v515GameOpenings'])elem(id).onclick=()=>openTraining('opening',true);
  for(const id of ['v515GoEndgame','v515GameEnd'])elem(id).onclick=()=>openTraining('endgame');
  for(const id of ['v515GoReplay','v515GameReplay'])elem(id).onclick=()=>openTraining('replay');
  for(const id of ['v515GameReview','v515GamePGN'])elem(id).onclick=()=>goPage('analysis');
  elem('homeGoCoach').onclick=()=>{goPage('game');const d=elem('gameCoachDetails');if(d)d.open=true;elem('gameCoachDock')?.scrollIntoView({behavior:'smooth',block:'center'});};
  window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {v516ShowTraining:which=>openTraining(which||'opening'),v516BigBoard:()=>v516BigBoard});
 }
 // V5.17: Uncluttered full-board mode, interactive coaching, review and reliable existing-data migration.
 let v517Audio=null;
 function v517Tone(check=false){
  if(!v517Prefs.sounds)return;
  try{
   const AudioContext=window.AudioContext||window.webkitAudioContext;
   if(!AudioContext)return;
   v517Audio??=new AudioContext();
   if(v517Audio.state==='suspended')v517Audio.resume().catch(()=>{});
   const osc=v517Audio.createOscillator(),amp=v517Audio.createGain();
   osc.type='sine';osc.frequency.value=check?690:410;
   amp.gain.setValueAtTime(0.0001,v517Audio.currentTime);
   amp.gain.exponentialRampToValueAtTime(0.065,v517Audio.currentTime+.008);
   amp.gain.exponentialRampToValueAtTime(0.0001,v517Audio.currentTime+.12);
   osc.connect(amp);amp.connect(v517Audio.destination);
   osc.start();osc.stop(v517Audio.currentTime+.13);
  }catch(_){}
 }
 // Prefer the Android-native View.performHapticFeedback bridge. Browser vibration is only a fallback.
 function v518TriggerHaptic(reason='move'){
  if(!v517Prefs.haptic)return {ok:false,reason:'disabled',backend:'none'};
  let nativeError='';
  try{
   if(window.NativeHaptics && typeof window.NativeHaptics.nativeHaptic==='function'){
    const ok=window.NativeHaptics.nativeHaptic(reason==='test'?2:1)===true;
    if(ok)return {ok:true,reason:'native',backend:'android'};
    nativeError='android-no-vibrator';
   } else nativeError='bridge-unavailable';
  }catch(err){nativeError='android-error';}
  // Fallback on systems that do not expose our Android bridge.
  try{
   if(typeof navigator.vibrate==='function'){
    const ok=navigator.vibrate(reason==='test'?[160,100,160]:55)===true;
    return {ok,reason:ok?'browser':'browser-blocked',backend:'webview',nativeError};
   }
  }catch(err){return {ok:false,reason:'browser-error',backend:'webview',nativeError};}
  return {ok:false,reason:'unavailable',backend:'none',nativeError};
 }
 function v518TestHaptic(){
  const status=elem('v518HapticStatus');
  if(!v517Prefs.haptic){if(status)status.textContent='Vibration ist AUS. Aktiviere den Schalter und teste erneut.';return;}
  const r=v518TriggerHaptic('test');
  if(!status)return;
  status.textContent=r.reason==='native'?'Android-Vibrationsdienst wurde ausgelöst. Hast du den Impuls gespürt?':
   r.nativeError==='android-no-vibrator'?'Android meldet keinen verfügbaren Vibrationsmotor. Prüfe die Systemeinstellungen.':
   r.reason==='browser'?'Nur Browser-Vibration verfügbar. Auf diesem Gerät kann sie trotz Rückgabe „erfolgreich“ stumm bleiben.':
   r.nativeError==='android-error'?'Fehler beim nativen Vibrationsaufruf. Bitte Screenshot schicken.':
   'Vibrationsaufruf fehlgeschlagen. Prüfe Samsung Einstellungen → Töne und Vibration → Systemvibration.';
 }
 v517AfterMove=function(m,human){
  if(human)v517Tone(inCheck(pos,pos.turn));
  const status=elem('v517SaveStatus');if(status)status.textContent='✓ Partie gespeichert · '+new Date().toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'});
  if(human)v518TriggerHaptic('move');
  v517UpdateReview();
 }
 function v517SyncFocus(page){
  // V5.43: Nur noch „Großes Brett“ steuert die Brettgröße.
  // Entferne auch gespeicherte alte Fullscreen-Zustände nach einem Update.
  v517Prefs.focus=false;
  document.body.classList.remove('v517FocusMode');
  game.classList.remove('v517Focus');
  game.classList.toggle('v516Large',page==='game'&&v516BigBoard);
 }
 v517UpdateReview=function(){
  const node=elem('v517MiniReview');if(!node)return;
  const rated=record.filter(r=>r.coach?.source==='Stockfish 19 Lite');
  const human=rated.filter(r=>r.actor==='Mensch'||setup.mode!=='computer');
  const accuracy=v57Accuracy(human.map(r=>r.coach.loss).filter(Number.isFinite));
  const latest=rated.slice(-14);
  let html='<div class="v517ReviewMetrics"><span><b>'+rated.length+' / '+record.length+'</b> Züge bewertet</span><span><b>'+(accuracy?accuracy.accuracy+' %':'–')+'</b> geschätzte Genauigkeit</span></div>';
  if(latest.length){html+='<div class="v517MoveBars" aria-label="Stockfish-Zugbewertungen der zuletzt analysierten Züge">'+latest.map(r=>{
    const loss=Math.max(0,Number(r.coach.loss)||0),severity=loss<40?'good':loss<110?'warn':loss<260?'bad':'blunder';
    return '<div class="v517Bar '+severity+'" style="height:'+Math.max(12,Math.min(100,100-loss/6))+'%" title="'+escapeHtml(deSan(r.san)+' · '+r.coach.label+' · Verlust '+(loss/100).toFixed(2)+' Bauerneinheiten')+'"></div>';
   }).join('')+'</div><p class="v517Tiny">Die Balken zeigen Zugqualität anhand von Stockfish-Bewertungsverlusten, keinen offiziellen Chess.com-Wert.</p>';}
  else html+='<p class="v517Tiny">Nach dem Zug oder der Partienanalyse erscheinen hier echte Engine-Urteile.</p>';
  node.innerHTML=html;
 }
 function v517CoachExplain(){
  const node=elem('v517CoachReply'),r=[...record].reverse().find(x=>x.actor==='Mensch'&&x.coach)||record.at(-1);
  if(!r){node.textContent='Spiele zuerst einen Zug.';return;}
  if(!r.coach){node.textContent='Stockfish prüft diesen Zug noch. Tippe danach erneut auf „Warum?“. ';return;}
  if(r.coach.source==='none'){node.textContent=r.coach.why;return;}
  node.textContent=deSan(r.san)+' · '+r.coach.label+'. '+r.coach.why+' '+(r.coach.risks||'')+' '+(r.coach.plan||'');
 }
 function v517CoachBest(){
  const node=elem('v517CoachReply'),r=[...record].reverse().find(x=>x.actor==='Mensch'&&x.coach?.bestUci)||record.at(-1);
  if(!r?.coach?.bestUci){node.textContent='Noch kein bester Zug ermittelt. Die Engine-Analyse muss abgeschlossen sein.';return;}
  try{
   const before=fromFen(r.before),all=legal(before),m=all.find(x=>moveUci(x)===r.coach.bestUci);
   if(!m)throw Error('Zug ist für diese Stellung nicht legal');
   node.textContent='In der Stellung vor '+deSan(r.san)+' empfahl Stockfish '+deSan(notation(before,m,all))+' ('+sq(m.f)+' → '+sq(m.t)+'). Wechsle bei Bedarf in den Zugrückblick.';
   const ix=record.indexOf(r);setReviewPly(ix);boardRenderKey='';render();
   for(const i of [m.f,m.t])elem('gameBoard')?.querySelector('.gameSq[data-i="'+i+'"]').classList.add('v517HintSquare');
  }catch(e){node.textContent='Bestzug konnte nicht dargestellt werden: '+e.message;}
 }
 function v517CoachRetry(){
  const node=elem('v517CoachReply'),r=[...record].reverse().find(x=>x.actor==='Mensch'&&x.coach?.bestUci&&x.coach.loss>=40);
  if(!r){node.textContent='Noch kein trainierbarer Fehler vorhanden. Spiele und analysiere einige Züge.';return;}
  const item={id:r.before+'|'+r.uci,fen:r.before,uci:r.uci,best:r.coach.bestUci,label:r.coach.label,loss:r.coach.loss,category:v57ErrorCategory(r),date:v515Day()};
  goPage('training');v516SetTool('replay',false);v57OpenReplay(item);
  elem('v57Replay')?.scrollIntoView({block:'center',behavior:'smooth'});
 }
 function v517Stats(){
  const root=elem('v515Dashboard');if(!root)return;
  let el=elem('v517Stats');if(!el){el=document.createElement('section');el.id='v517Stats';el.className='v517Stats';root.append(el);}
  const games=(summaryStore.games||[]).slice(-14),reviews=(summaryStore.accuracyHistory||[]).slice(-14);
  const solved=(()=>{try{return Object.keys(JSON.parse(localStorage.getItem('schach1001-v1')||'{}').solved||{}).length}catch(_){return 0}})();
  const total=Math.max(1,solved);let r=0;for(const item of summaryStore.learningErrors||[])r+=Number(item.reviews)||0;
  const mean=reviews.length?Math.round(reviews.reduce((n,it)=>n+(Number(it.accuracy)||0),0)/reviews.length):null;
  el.innerHTML='<h3>📅 Deine letzten Trainingswerte</h3><div class="v517ReviewMetrics"><span><b>'+games.length+'</b> letzte Partien</span><span><b>'+solved+'</b> gelöste Rätsel</span><span><b>'+r+'</b> Fehlerwiederholungen</span><span><b>'+(mean===null?'–':mean+' %')+'</b> mittlere analysierte Genauigkeit</span></div>'+
   (reviews.length?'<div class="v517StatTrend">'+reviews.map(v=>'<div title="'+escapeHtml(v.day+' · '+v.accuracy+' %')+'" style="height:'+Math.max(5,Math.min(100,Number(v.accuracy)||0))+'%"></div>').join('')+'</div><p class="v517Tiny">Deine letzten '+reviews.length+' gespeicherten Analysen (nicht offizielle Genauigkeit).</p>':'<p class="v517Tiny">Analysiere Partien, um einen persönlichen Verlauf zu erhalten.</p>');
 }
 function v517Init(){
  // Keep training separate: add only concise controls above the chessboard.
  const top=game.querySelector('.v516TopBar');
  // V5.43: Kein zweiter Vollbild-Schalter; „Großes Brett“ genügt.
  const line=document.createElement('div');line.id='v517PlayPrefs';line.className='v517PlayPrefs';
  line.innerHTML='<label><input id="v517Dots" type="checkbox"> Zugpunkte</label><label><input id="v517Sounds" type="checkbox"> Sounds</label><label><input id="v517Haptic" type="checkbox"> Vibration</label><button type="button" id="v518HapticTest" class="v518HapticTest">Android-Vibration testen</button><span id="v517SaveStatus" role="status" aria-live="polite">✓ Automatisches Speichern aktiv</span>';
  game.querySelector('.gameBoardFrame').after(line);
  line.insertAdjacentHTML('afterend','<div id="v518HapticStatus" class="v517Tiny" aria-live="polite"></div>');
  const coach=document.createElement('section');coach.id='v517Coach';coach.className='v517Coach';
  coach.innerHTML='<h3>🧠 Frag deinen Coach</h3><div class="v517CoachBtns"><button id="v517Why" type="button">Warum?</button><button id="v517Best" type="button">Bester Zug</button><button id="v517Retry" type="button">Nochmal versuchen</button></div><p id="v517CoachReply" role="status" aria-live="polite" style="padding:12px 13px;background:#16231c;border:1px solid #506c55;border-radius:12px;min-height:48px;">Stockfish erklärt dir nach einem Zug seine Bewertung.</p>';
  game.querySelector('.gameHistory').before(coach);
  const review=document.createElement('section');review.id='v517MiniReviewWrap';review.className='v517MiniReviewWrap';review.innerHTML='<h3>📊 Zugqualität</h3><div id="v517MiniReview"></div><button id="v517ReviewFull" type="button">Ausführliche Partienanalyse öffnen</button>';
  game.querySelector('.gameHistory').after(review);
  const training=elem('v516TrainingHead');training.insertAdjacentHTML('beforeend','<section class="v517OpeningToday"><h3>🗓 Eröffnungswiederholung</h3><p id="v517OpeningInfo"></p><button type="button" id="v517OpeningRepeat">Nächste fällige Variante üben</button></section>');
  const initCheck=(id,key,cb)=>{const x=elem(id);x.checked=!!v517Prefs[key];x.onchange=()=>{v517Prefs[key]=x.checked;v517SavePrefs();cb?.(x.checked)}};
  if(elem('v57Vibrate')){elem('v57Vibrate').checked=!!v517Prefs.haptic;elem('v57Vibrate').addEventListener('change',()=>{v517Prefs.haptic=!!elem('v57Vibrate').checked;elem('v517Haptic').checked=v517Prefs.haptic;v517SavePrefs();});}
  initCheck('v517Dots','legalDots',()=>{boardRenderKey='';render()});
  initCheck('v517Sounds','sounds');
  initCheck('v517Haptic','haptic',on=>{v58prefs.vibrate=on;v58SavePrefs();v57prefs.vibrate=on;v57savePrefs();if(elem('v57Vibrate'))elem('v57Vibrate').checked=on;if(elem('v518HapticStatus'))elem('v518HapticStatus').textContent=on?'Vibration aktiv. Mit „Vibration testen“ prüfen.':'Vibration ausgeschaltet.';});
  elem('v518HapticTest').onclick=v518TestHaptic;
  // Alter Vollbild-Handler entfernt.
  elem('v517Why').onclick=v517CoachExplain;
  elem('v517Best').onclick=v517CoachBest;
  elem('v517Retry').onclick=v517CoachRetry;
  elem('v517ReviewFull').onclick=()=>{goPage('analysis');renderMoveReview();};
  elem('v517OpeningRepeat').onclick=()=>{
   const due=v58OpeningDue();if(!due.length){elem('v517OpeningInfo').textContent='Keine gelernte Eröffnung ist heute fällig. Wähle eine neue Variante.';v516SetTool('opening',false);return;}
   openingId=due[0].id;elem('openingPick').value=openingId;
   v516SetTool('opening',true);
   elem('v517OpeningInfo').textContent='Gestartet: '+due[0].o.name;
  };
  // Bind current counts when entering training; original spaced-repetition store remains untouched.
  const oldOpen=elem('v516Opening').onclick;
  elem('v516Opening').onclick=()=>{oldOpen();v517ShowOpening()};
  function v517ShowOpening(){const due=v58OpeningDue();elem('v517OpeningInfo').textContent=due.length?due.length+' gelernte Varianten fällig. Nächste: '+due[0].o.name:'Heute keine gelernte Variante zur Wiederholung fällig.';}
  v517ShowOpening();v517UpdateReview();v517Stats();v517SyncFocus('game');
  // Disable full-board focus outside the game; never change the saved user preference.
  window.addEventListener('pagehide',()=>{try{persist();v58AutoBackup()}catch(_){}});
  window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {
   v517Preferences:()=>({...v517Prefs}),v517UpdateReview,v517Stats,v517CoachExplain,v517CoachBest,v517CoachRetry,
   v517SyncFocus:()=>v517SyncFocus('game')
  });
 }
 let v526SettingsCache=null;
 function v526Init(){
  // Dedicated Analysis page; original engine, review and PGN elements are reused.
  const analysisHead=document.createElement('section');analysisHead.id='v526AnalysisHead';analysisHead.className='v526AnalysisHead';analysisHead.hidden=true;
  analysisHead.innerHTML='<h2>🔍 Partieanalyse</h2><p>Züge bewerten, Fehler verstehen und PGN-Partien importieren. Unabhängig vom laufenden Spiel.</p><div class="v526AnalActions"><button type="button" id="v526ReviewNow">Stockfish-Analyse starten</button><button type="button" id="v526PGNFocus">PGN importieren</button><button type="button" id="v526PGNExport">PGN exportieren</button></div>';
  game.prepend(analysisHead);
  elem('v526ReviewNow').onclick=()=>{renderMoveReview();elem('v525Review')?.scrollIntoView({block:'start',behavior:'smooth'})};
  elem('v526PGNFocus').onclick=()=>{const d=elem('v58PgnText');const panel=d?.closest('.extraPanel');panel?.querySelector('details.v512Fold')?.setAttribute('open','');panel?.scrollIntoView({block:'start',behavior:'smooth'});d?.focus({preventScroll:true})};
  elem('v526PGNExport').onclick=exportPGN;
  // Organize all lengthy options in a single collapsed area. Moving nodes preserves handlers.
  const boardPanel=game.querySelector('.gameBoardPanel'),frame=elem('gameBoard')?.closest('.gameBoardFrame');
  const primary=document.createElement('div');primary.className='v526QuickActions';primary.id='v526QuickActions';
  primary.innerHTML='<button id="v526New" type="button">♟ Neue Partie</button><button id="v526Undo" type="button">↶ Zurück</button><button id="v526Flip" type="button">↻ Drehen</button>';
  frame?.after(primary);
  elem('v526New').onclick=()=>elem('gameNew')?.click();
  elem('v526Undo').onclick=()=>elem('gameUndo')?.click();
  elem('v526Flip').onclick=()=>elem('gameFlip')?.click();
  const advanced=document.createElement('details');advanced.className='v526Advanced';advanced.id='v526Advanced';
  advanced.innerHTML='<summary>⚙ Coach, Brett & Einstellungen <span>Öffnen</span></summary><div class="v526AdvancedBody"></div>';
  boardPanel.append(advanced);const holder=advanced.querySelector('.v526AdvancedBody');
  for(const id of ['gameCoachDock','v517Coach','v517MiniReviewWrap','v517PlayPrefs','v518HapticStatus','v513MoveSetting','v514QuickSettings']){
   const e=elem(id);if(e)holder.append(e);
  }
  for(const selector of ['.v513MoveSetting','.v514QuickSettings','.gameButtons','.bestToggleRow','.gameTopAnalysis','.v57nearCoachHint','.gameNotice']){
   const e=boardPanel.querySelector(selector);if(e)holder.append(e);
  }
  // Collect independent security settings in one recognizable place.
  const prefs=document.createElement('div');prefs.id='v526Settings';prefs.className='v526Settings';
  prefs.innerHTML='<h3>⚙ Einstellungen & Datensicherung</h3><p>Spielstände und Training bleiben lokal gespeichert. Vor dem Wechsel des Handys Backup exportieren.</p>';
  elem('statsContent')?.append(prefs);v526SettingsCache=prefs;
  const card=home.querySelector('.v512VoiceCard');if(card)prefs.append(card);
  const backup=home.querySelector('.v514Backups');if(backup)prefs.append(backup);
  // Easy return to the dedicated learning area from the puzzles screen.
  const puzzleNav=document.createElement('div');puzzleNav.id='v526PuzzleNav';puzzleNav.className='v526PuzzleNav';
  puzzleNav.innerHTML='<button type="button" id="v526BackTraining">← Training</button><strong>🧩 Taktikrätsel</strong>';
  puzzles.prepend(puzzleNav);
  elem('v526BackTraining').onclick=()=>goPage('training');
  // Opening lessons are the only feature allowed to open the main playboard for rehearsal.
  window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {v526OpenAnalysis:()=>goPage('analysis'),v526OpenTraining:()=>goPage('training'),v526BigBoard:()=>v516BigBoard});
 }
 function show(page){const isGame=page==='game'||page==='training'||page==='analysis',isStats=page==='stats',isHome=page==='home',isPuzzle=page==='puzzles';
 const oldScreen=game.dataset.v526Page;
 if(oldScreen==='game'&&page!=='game'&&clock.started&&!gameResult){updateClock();clock.lastAt=Date.now()}
 if(page==='game'&&oldScreen!=='game'&&clock.started&&!gameResult)clock.lastAt=Date.now();
 window.__schachPuzzlesVisible=isPuzzle;
 game.hidden=!isGame;puzzles.hidden=!isPuzzle;statsView.hidden=!isStats;home.hidden=!isHome;
 elem('tabGame').classList.toggle('on',isGame);elem('tabPuzzle').classList.toggle('on',isPuzzle);elem('tabStats').classList.toggle('on',isStats);
 for(const [p,id] of [['home','navHome'],['game','navGame'],['training','navTraining'],['analysis','navAnalysis'],['stats','navStats']]){
  const tab=elem(id);tab.classList.toggle('active',page===p||(p==='training'&&page==='puzzles'));tab.setAttribute('aria-current',page===p||(p==='training'&&page==='puzzles')?'page':'false');
 }
 v516ApplyPage(page);
 if(isGame){if(page==='game')updateClock();render();if(page==='analysis'&&record.length!==v529ShownLength){v525ReviewRefresh();v529ShownLength=record.length;}if(page==='game'&&setup.mode==='computer'&&pos.turn!==setup.side&&!busy&&!gameResult)scheduleComputer()}
 if(isStats){renderProfile();v515RenderDashboard();v517Stats();v525StatsInit();if(v526SettingsCache)statsView.append(v526SettingsCache);}if(isHome){renderHome();v515RenderPlan();}
 if(!isGame&&!isPuzzle)v57StopSpeech();
 v555OnPage(page);
 try{localStorage.setItem('schach1001_page',page)}catch(_){}
 }
 const goPage=page=>{show(page);window.scrollTo({top:0,behavior:'instant'})};
 elem('navHome').onclick=()=>goPage('home');elem('navGame').onclick=()=>goPage('game');elem('navTraining').onclick=()=>goPage('training');elem('navAnalysis').onclick=()=>goPage('analysis');elem('navStats').onclick=()=>goPage('stats');
 elem('homePlay').onclick=()=>goPage('game');elem('homePuzzle').onclick=()=>goPage('puzzles');
 elem('homeStats').onclick=elem('homeStatsMore').onclick=()=>goPage('stats');
 elem('homeGoCoach').onclick=()=>{goPage('game');const d=elem('gameCoachDetails');if(d)d.open=true;};
 elem('homeVoiceToggle').onclick=()=>v512SetVoice(!v57prefs.voice);
 elem('homeVoiceSwitch').onchange=e=>v512SetVoice(e.target.checked);
 v515Init(goPage,home,game);
 v516Init();
 v517Init();
 v521Init();v525Init();v526Init();v533OpeningHintInit();v536Init();v537Init();v538Init();v539Init();v540DockEndgame();v541TimePickerInit();v551Init();
 elem('v514Export').onclick=()=>{v57ExportBackup();elem('v514BackupInfo').textContent=elem('v57BackupStatus')?.textContent||'Backup erstellt.'};elem('v514Import').onchange=async e=>{const file=e.target.files?.[0];if(file){await v57ImportBackup(file);elem('v514BackupInfo').textContent=elem('v57BackupStatus')?.textContent||'Import geprüft.'}e.target.value=''};
 v512SyncVoiceUI();
 elem('tabPuzzle').onclick=()=>goPage('puzzles');elem('tabGame').onclick=()=>goPage('game');elem('tabStats').onclick=()=>goPage('stats');elem('gameNew').onclick=gameNew;elem('gameUndo').onclick=undo;
 elem('gameFlip').onclick=()=>{clearFlights();flip=!flip;persist();render()};elem('gameAnalyze').onclick=analyze;
 elem('gameMode').onchange=e=>{setup.mode=e.target.value;if(setup.mode==='opening'){setup.side=opening().side;setup.time='none'}else if(setup.mode==='analysis'){setup.time='none'}else if(setup.time==='none')setup.time='r10';gameNew()};
 elem('gameSide').onchange=e=>{setup.side=e.target.value;flip=false;gameNew()};
 document.querySelectorAll('#v514EloPresets [data-elo]').forEach(b=>b.onclick=()=>{setup.elo=+b.dataset.elo;persist();render();setNote('Neue Gegnerstärke übernommen: ungefähr '+setup.elo+' (nicht offiziell Elo-kalibriert).')});
 elem('gameElo').oninput=e=>{setup.elo=+e.target.value;elem('eloValue').textContent='≈ '+setup.elo+' Elo';persist()};
 document.querySelectorAll('.timePreset').forEach(b=>b.onclick=()=>{if(setup.mode==='analysis')return;setup.time=b.dataset.time;gameNew();if(setup.time!=='custom')elem('clockSettings').open=false});
 elem('customApply').onclick=()=>{setup.customMin=Math.max(1,Math.min(120,Math.round(+elem('customMin').value||10)));setup.customInc=Math.max(0,Math.min(60,Math.round(+elem('customInc').value||0)));setup.time='custom';gameNew();elem('clockSettings').open=false};
 v555Init(goPage);
 bindDrag();render();refreshCoach();let saved='';try{saved=localStorage.getItem('schach1001_page')}catch(_){}show(saved==='training'?'training':saved==='game'?'game':saved==='stats'?'stats':saved==='puzzles'?'puzzles':'home');
 timerHandle=setInterval(()=>{if(!elem('gameContent').hidden&&game.dataset.v526Page==='game'&&!document.body.classList.contains('v555Setup')&&isTimed()){updateClock();paintClock()}},100);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateClock();paintClock()}});
}
// Nur für eigene Tests, enthält keine Nutzerinformationen.
window.ChessAnalysisQA={setReviewPly,changeReviewPly,getReviewPly:()=>reviewPly,canQueuePremove,queuePremove,executePremove,getPremove:()=>premove,clearPremove,getPremovePlan:()=>premovePlan.slice(),projectedPremovePosition,v59SpeakFallback,fromFen,toFen,legal,move,inCheck,idx,sq,think,outcome,startFen,evalWhite,chosenTime,fmtTime,getState:()=>({pos,record,setup,clock,gameResult}),coachVisible,setCoachVisibility,v532EnginePlan,v532GetArchive,v532SaveFinishedGame,v532GamePgn,v57Snapshot,v57Checksum,v57Accuracy,v57OpeningOptions,v57OpenReplay,v57Speak,v57TrainingRating};

/* V5.15 user-facing enhancements. All earlier localStorage keys are preserved. */
const V515_DAY_KEY='schach1001_v515_daily', V515_PREFS_KEY='schach1001_v515_preferences';
let v515Preferences={liveEval:false};
try{v515Preferences={...v515Preferences,...JSON.parse(localStorage.getItem(V515_PREFS_KEY)||'{}')}}catch(_){}
function v515Day(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function v515PuzzleCount(){try{return Object.keys(JSON.parse(localStorage.getItem('schach1001-v1')||'{}').solved||{}).length}catch(_){return 0}}
function v515OpeningCount(){return Object.values(summaryStore.openings||{}).reduce((a,b)=>a+(Number(b)||0),0)}
function v515EndgameCount(){return (summaryStore.endgameHistory||[]).length}
function v515ReplayCount(){return Number(summaryStore.replayed)||0}
function v515ReadPlan(){let data;try{data=JSON.parse(localStorage.getItem(V515_DAY_KEY)||'null')}catch(_){}
 if(!data||data.day!==v515Day()){
  data={day:v515Day(),baseline:{puzzles:v515PuzzleCount(),openings:v515OpeningCount(),endgames:v515EndgameCount(),replays:v515ReplayCount()}};
  try{localStorage.setItem(V515_DAY_KEY,JSON.stringify(data))}catch(_){}
 }return data;
}
function v515Tasks(){const b=v515ReadPlan().baseline;
 return [{id:'puzzle',title:'3 neue Rätsel lösen',current:Math.max(0,v515PuzzleCount()-b.puzzles),goal:3,action:'puzzle'},
  {id:'opening',title:'1 Eröffnungsvariante üben',current:Math.max(0,v515OpeningCount()-b.openings),goal:1,action:'opening'},
  {id:'endgame',title:'1 Endspiel gewinnen',current:Math.max(0,v515EndgameCount()-b.endgames),goal:1,action:'endgame'},
  {id:'repeat',title:'1 eigenen Fehler richtig wiederholen',current:Math.max(0,v515ReplayCount()-b.replays),goal:1,action:'repeat'}];
}
function v515ProtectUpgrade(){
 const backupKey='schach1001_backup_pre515';
 try{
  const prior=localStorage.getItem(backupKey);
  if(prior){const b=JSON.parse(prior);if(b.checksum!==v57Checksum(JSON.stringify(b.data)))throw Error('Vorheriges Sicherungsabbild ist beschädigt');return true;}
  const snapshot=v57Snapshot(),serialized=JSON.stringify(snapshot.data);
  localStorage.setItem(backupKey,JSON.stringify({created:new Date().toISOString(),checksum:v57Checksum(serialized),data:snapshot.data}));
  return localStorage.getItem(backupKey)!==null;
 }catch(e){const n=elem('v515EngineStatus');if(n)n.textContent='Automatische Zusatzsicherung fehlgeschlagen: '+e.message+'. Bitte Backup exportieren.';return false}
}
function v515RecordEndgame(id){summaryStore.endgameHistory??=[];summaryStore.endgameHistory.push({id,day:v515Day(),at:new Date().toISOString()});summaryStore.endgameHistory=summaryStore.endgameHistory.slice(-180);persistProfile();v515RenderPlan();}
function v515RenderPlan(){const panel=elem('v515Daily');if(!panel)return;
 const tasks=v515Tasks(),complete=tasks.filter(x=>x.current>=x.goal).length;
 const list=elem('v515PlanItems');list.replaceChildren();
 for(const task of tasks){const line=document.createElement('li');line.className=task.current>=task.goal?'completed':'';
  const label=document.createElement('span');label.textContent=(task.current>=task.goal?'✓ ':'○ ')+task.title;
  const status=document.createElement('strong');status.textContent=Math.min(task.current,task.goal)+' / '+task.goal;
  line.append(label,status);list.append(line);
 }
 elem('v515PlanBar').style.width=(complete/4*100)+'%';elem('v515PlanCount').textContent=complete+' von 4 Tageszielen · etwa 10–15 Minuten';
 const insight=elem('v515PersonalTip');if(insight){const due=v58DueErrors();const next=v58OpeningDue();
  const advice=due.length?due.length+' persönliche Fehler zur Wiederholung fällig.':next.length?next.length+' bereits gelernte Eröffnungen zur Wiederholung fällig.':'Tipp: Suche bei jedem Zug zunächst nach Schachs, Schlägen und Drohungen.';
  insight.textContent=advice;
 }
}
function v515RenderDashboard(){const root=elem('statsContent');if(!root)return;let node=elem('v515Dashboard');if(!node){node=document.createElement('section');node.id='v515Dashboard';node.className='v515Panel';root.prepend(node)}
 const now=Date.now(),games=summaryStore.games||[],review=summaryStore.accuracyHistory||[];
 const daysAgo=(iso)=>{const n=Date.parse(iso);return Number.isFinite(n)?(now-n)/86400000:9999};
 const summary=[7,30,90].map(days=>{const recentGames=games.filter(g=>daysAgo(g.at)<=days&&daysAgo(g.at)>=0);const accuracy=review.filter(g=>daysAgo(g.day)<=days&&daysAgo(g.day)>=0);const mean=accuracy.length?Math.round(accuracy.reduce((a,g)=>a+(Number(g.accuracy)||0),0)/accuracy.length)+' %':'–';return {days,count:recentGames.length,accuracy:mean}});
 node.innerHTML='<h3>📈 Deine Entwicklung</h3><div class="v515MetricRow">'+summary.map(x=>'<div><b>'+x.count+'</b> Partien / '+x.days+' Tage<br>Genauigkeit: '+x.accuracy+'</div>').join('')+'</div><p>Die Genauigkeit ist nur für mit Stockfish analysierte Partien verfügbar und wird nach unserer eigenen Formel geschätzt.</p><h3>🧠 Persönlicher Coach</h3><p>'+escapeHtml(v57CoachLearningTip())+'</p><p>Eröffnungswiederholungen fällig: '+v58OpeningDue().length+' · Fehlerwiederholungen fällig: '+v58DueErrors().length+' · Endspiele geschafft: '+v515EndgameCount()+'</p>';
}
let v515EvalSeq=0;
function v515AfterMove(){if(!v515Preferences.liveEval)return;const fen=toFen(pos),ticket=++v515EvalSeq;
 setTimeout(async()=>{if(ticket!==v515EvalSeq||toFen(pos)!==fen)return;
 if(sfPositionScore?.fen===fen){updateSideEvaluation(sfPositionScore.whiteCp);return;}
 const status=elem('v515EngineStatus');if(status)status.textContent='Stockfish bewertet die Stellung …';
 try{const a=await window.analyzeFen(fen,8);if(ticket!==v515EvalSeq||fen!==toFen(pos))return;
 const cp=sfWhiteScore(fen,a);if(cp===null)throw Error('Engine ohne Bewertung');sfPositionScore={fen,whiteCp:cp};updateSideEvaluation(cp);
 if(status)status.textContent='Echte Stockfish-Bewertung: '+fmtEval(cp)+' (Weiß-Sicht) · Tiefe '+a.depth;
 }catch(e){if(ticket===v515EvalSeq&&status)status.textContent=stockfishUnavailable(e)}
 },900);
}
function v515Init(goPage,home,game){
 const panel=document.createElement('section');panel.id='v515Daily';panel.className='v515Panel';
 panel.innerHTML='<h2>🎯 Dein täglicher Schachplan</h2><p id="v515PlanCount">Trainiere täglich 10–15 Minuten</p><div class="v515Bar"><div id="v515PlanBar"></div></div><ul id="v515PlanItems" class="v515PlanItems"></ul><p class="v515Status" id="v515PersonalTip"></p><div class="v515Actions"><button type="button" id="v515GoPuzzle" class="v515Lead">🧩 Rätsel</button><button type="button" id="v515GoOpening">📚 Eröffnung</button><button type="button" id="v515GoEndgame">♚ Endspiel</button><button type="button" id="v515GoReplay">↩ Fehler üben</button></div>';
 home.append(panel);
 const buttons=document.createElement('section');buttons.id='v515Quick';buttons.className='v515Panel';
 buttons.innerHTML='<h3>⚙️ Training &amp; Analyse</h3><div class="v515Actions"><button id="v515GameOpenings" type="button">📖 Eröffnungstrainer</button><button id="v515GameEnd" type="button">♚ Endspiele</button><button id="v515GameReplay" type="button">↩ Fehler wiederholen</button><button id="v515GameReview" type="button">📊 Partie analysieren</button><button id="v515GamePGN" type="button">📥 PGN importieren</button><button id="v515GameExport" type="button">📤 PGN exportieren</button><button id="v515GameBackup" type="button">🛡 Backup exportieren</button><button id="v515GameStats" type="button">📈 Fortschritt</button></div><div class="v515Inline"><label class="v515Switch"><input id="v515LiveEval" type="checkbox">Live-Bewertung mit Stockfish</label><label for="v515StyleQuick">Gegnerstil <select id="v515StyleQuick"><option value="ausgeglichen">Ausgeglichen</option><option value="aktiv">Aktiv</option><option value="solide">Solide</option></select></label></div><p class="v515Status" id="v515EngineStatus">Live-Bewertung ist optional und kann den Akku stärker beanspruchen. Gegnerstil wirkt beim lokalen Gegner.</p>';
 const controls=elem('v514Report');if(controls)controls.before(buttons);else game.prepend(buttons);
 const showTool=(id)=>{goPage(id==='v58PgnText'?'analysis':'training');const tool=elem(id);if(!tool)return;const detail=tool.closest('.extraPanel')||tool;detail.scrollIntoView({behavior:'smooth',block:'start'});if(id==='v58EndBoard')elem('v58EndSelect')?.focus({preventScroll:true});};
 const startOpening=()=>{goPage('training');setup.mode='opening';setup.side=opening().side;setup.time='none';gameNew();elem('openingTrainer')?.scrollIntoView({behavior:'smooth',block:'center'});};
 const doReplay=()=>{goPage('training');const due=v58DueErrors();if(due.length)v57OpenReplay(due[0]);else if((summaryStore.learningErrors||[]).length)v57OpenReplay(summaryStore.learningErrors[0]);else setNote('Noch kein analysierter eigener Fehler. Spiele eine Partie und lasse sie von Stockfish analysieren.');elem('v57Replay')?.scrollIntoView({behavior:'smooth',block:'center'});};
 elem('v515GoPuzzle').onclick=()=>goPage('puzzles');elem('v515GoOpening').onclick=startOpening;elem('v515GoEndgame').onclick=()=>showTool('v58EndBoard');elem('v515GoReplay').onclick=doReplay;
 elem('v515GameOpenings').onclick=startOpening;elem('v515GameEnd').onclick=()=>showTool('v58EndBoard');elem('v515GameReplay').onclick=doReplay;elem('v515GameReview').onclick=()=>{goPage('analysis');renderMoveReview()};
 elem('v515GamePGN').onclick=()=>showTool('v58PgnText');elem('v515GameExport').onclick=exportPGN;elem('v515GameBackup').onclick=v57ExportBackup;elem('v515GameStats').onclick=()=>goPage('stats');
 elem('v515LiveEval').checked=v515Preferences.liveEval;
 elem('v515LiveEval').onchange=e=>{v515Preferences.liveEval=e.target.checked;localStorage.setItem(V515_PREFS_KEY,JSON.stringify(v515Preferences));v515EvalSeq++;
  elem('v515EngineStatus').textContent=v515Preferences.liveEval?'Live-Bewertung aktiviert. Die nächste Stellung wird von Stockfish geprüft.':'Live-Bewertung ausgeschaltet.';
  if(v515Preferences.liveEval)v515AfterMove();};
 elem('v515StyleQuick').value=v58prefs.style;
 elem('v515StyleQuick').onchange=e=>{v58prefs.style=e.target.value;v58SavePrefs();elem('v58Style').value=e.target.value};
 elem('v58Style').addEventListener('change',e=>{elem('v515StyleQuick').value=e.target.value});
 v515RenderPlan();v515RenderDashboard();v515ProtectUpgrade();
 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {v515ReadPlan,v515Tasks,v515RenderPlan,v515RenderDashboard,v515AfterMove,v515ParsePGN:v58ParsePGN,v515ImportPGN:v58LoadPGN,v515Endgame:(id)=>v58EndStart(id)});
}

/* V5.36: additive modules only; existing save keys and chess rules remain intact. */
const V536_VARIANTS='schach1001_saved_variants_v536',V536_PREFS='schach1001_ui_prefs_v536';
let v536Prefs={board:'klassisch',coachDepth:10,archiveQuery:'',archiveResult:'alle',archiveOrder:'neu'};
try{Object.assign(v536Prefs,JSON.parse(localStorage.getItem(V536_PREFS)||'{}'))}catch(_){}
function v536PersistPrefs(){try{localStorage.setItem(V536_PREFS,JSON.stringify(v536Prefs))}catch(_){}}
function v536Variants(){try{const x=JSON.parse(localStorage.getItem(V536_VARIANTS)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}}
function v536SaveVariants(rows){localStorage.setItem(V536_VARIANTS,JSON.stringify(rows.slice(-80)))}
function v536ApplyBoard(){document.body.classList.remove('v536BoardBlue','v536BoardWood');if(v536Prefs.board==='blau')document.body.classList.add('v536BoardBlue');if(v536Prefs.board==='holz')document.body.classList.add('v536BoardWood')}
function v536Text(el,msg){if(el)el.textContent=msg}
function v536ArchiveFilter(){const root=elem('v532Archive');if(!root)return;
 const entries=[...root.querySelectorAll('.v532ArchiveEntry')],games=v532GetArchive();let count=0;
 entries.forEach((node,i)=>{const g=games[i];if(!g)return;const hit=(!v536Prefs.archiveQuery||[g.opponent,g.result,g.score,g.at].join(' ').toLocaleLowerCase('de').includes(v536Prefs.archiveQuery))&&(v536Prefs.archiveResult==='alle'||g.score===v536Prefs.archiveResult);const extra=v551ArchiveMatches(g);node.hidden=!(hit&&extra);if(hit&&extra)count++});
 v536Text(elem('v536ArchiveCount'),count+' von '+entries.length+' Partien');
}
function v536ArchiveToolbar(){const archive=elem('v532Archive');if(!archive||archive.querySelector('#v536ArchiveTools'))return;
 const panel=document.createElement('div');panel.id='v536ArchiveTools';panel.className='v536Box';
 panel.innerHTML='<strong>🔎 Archiv durchsuchen</strong><div class="v536Controls"><label>Suche <input id="v536ArchiveSearch" type="search" placeholder="Datum, Gegner, Ergebnis" autocomplete="off"></label><label>Ergebnis <select id="v536ArchiveResult"><option value="alle">Alle</option><option value="1-0">1–0</option><option value="0-1">0–1</option><option value="1/2-1/2">Remis</option></select></label></div><small id="v536ArchiveCount" aria-live="polite"></small>';
 const list=archive.querySelector('.v532ArchiveList');if(list)list.before(panel);else archive.append(panel);
 const input=elem('v536ArchiveSearch'),res=elem('v536ArchiveResult');input.value=v536Prefs.archiveQuery;res.value=v536Prefs.archiveResult;
 input.addEventListener('input',()=>{v536Prefs.archiveQuery=input.value.trim().toLocaleLowerCase('de');v536PersistPrefs();v536ArchiveFilter()});
 res.addEventListener('change',()=>{v536Prefs.archiveResult=res.value;v536PersistPrefs();v536ArchiveFilter()});v536ArchiveFilter();
}
function v536ArchiveExtras(){const viewer=elem('v532Viewer');if(!viewer||viewer.hidden||!v532Viewed||viewer.querySelector('#v536ArchiveExtras'))return;
 const box=document.createElement('div');box.id='v536ArchiveExtras';box.className='v536Box v536ViewerExtras';
 box.innerHTML='<strong>♟ Varianten & Stockfish</strong><div class="v536Controls"><button type="button" id="v536ArchiveAnalyze">Stellung analysieren</button><button type="button" id="v536ArchiveWhy">Coach: Warum?</button><button type="button" id="v536ArchiveSave">Variante speichern</button><button type="button" id="v536ArchiveLoad">Gespeicherte Variante öffnen</button></div><label>Varianten <select id="v536ArchiveVariants"><option value="">– Variante wählen –</option></select></label><p class="v536Status" id="v536ArchiveFeedback" aria-live="polite">Die Originalpartie bleibt immer unverändert.</p>';
 viewer.append(box);
 const variants=v536Variants().filter(x=>x.gameId===v532Viewed.id),select=elem('v536ArchiveVariants');
 for(const x of variants){const opt=document.createElement('option');opt.value=x.id;opt.textContent=x.name+' · '+x.uci.length+' Halbzüge';select.append(opt)}
 elem('v536ArchiveSave').disabled=!(v535ArchiveTrial&&v535ArchiveMoves.length);
 elem('v536ArchiveSave').onclick=()=>{if(!v535ArchiveTrial||!v535ArchiveMoves.length)return;const name=prompt('Name der Variante', 'Variante '+(variants.length+1));if(name===null)return;
 const clean=name.trim().slice(0,55)||'Meine Variante';const rows=v536Variants();rows.push({id:'v'+Date.now(),gameId:v532Viewed.id,ply:v532Ply,uci:v535ArchiveMoves.slice(),name:clean,at:new Date().toISOString()});
 try{v536SaveVariants(rows);v536Text(elem('v536ArchiveFeedback'),'Variante „'+clean+'“ gespeichert. Die Originalpartie ist unverändert.');const opt=document.createElement('option');opt.value=rows.at(-1).id;opt.textContent=clean+' · '+v535ArchiveMoves.length+' Halbzüge';select.append(opt)}catch(e){v536Text(elem('v536ArchiveFeedback'),'Speichern fehlgeschlagen: '+e.message)}};
 elem('v536ArchiveLoad').onclick=()=>{const x=v536Variants().find(z=>z.id===select.value&&z.gameId===v532Viewed.id);if(!x){v536Text(elem('v536ArchiveFeedback'),'Wähle zuerst eine gespeicherte Variante.');return}
 v532Ply=x.ply;v535ArchiveTrial=true;v535ArchiveMoves=[];v535ArchiveSelected=-1;let p=fromFen(startFen);
 for(let i=0;i<x.ply;i++){const m=legal(p).find(m=>moveUci(m)===v532Viewed.uci[i]);if(!m)break;p=move(p,m)}
 for(const u of x.uci){const m=legal(p).find(m=>moveUci(m)===u);if(!m)break;v535ArchiveMoves.push(u);p=move(p,m)}
 v532DrawArchive();v536Text(elem('v536ArchiveFeedback'),'Variante „'+x.name+'“ geöffnet. Du kannst weiterziehen.')};
 elem('v536ArchiveWhy').onclick=async()=>{
  const feedback=elem('v536ArchiveFeedback');if(!v535ArchiveTrial||!v535ArchiveMoves.length){v536Text(feedback,'Spiele zuerst in „Ab hier vorausspielen“ einen eigenen Alternativzug.');return}
  const snapshot=v532Viewed.id+'_'+v532Ply+'_'+v535ArchiveMoves.join(',');v536Text(feedback,'Coach 4.0 vergleicht deinen Zug mit Stockfish …');
  try{
   const p=fromFen(startFen);let b=p;
   for(let i=0;i<v532Ply;i++){const m=legal(b).find(x=>moveUci(x)===v532Viewed.uci[i]);if(!m)throw Error('Archivzug ungültig');b=move(b,m)}
   for(const u of v535ArchiveMoves.slice(0,-1)){const m=legal(b).find(x=>moveUci(x)===u);if(!m)throw Error('Variantenfortsetzung ungültig');b=move(b,m)}
   const u=v535ArchiveMoves.at(-1),m=legal(b).find(m=>moveUci(m)===u);if(!m)throw Error('Variante ungültig');const after=move(b,m);
   const [best,played]=await Promise.all([window.analyzeFen(toFen(b),v536Prefs.coachDepth),window.analyzeFen(toFen(after),v536Prefs.coachDepth)]);
   if(!v532Viewed||snapshot!==v532Viewed.id+'_'+v532Ply+'_'+v535ArchiveMoves.join(','))return;
   const first=sfWhiteScore(toFen(b),best),second=sfWhiteScore(toFen(after),played);
   const cp=(first!==null&&second!==null)?Math.max(0,Math.round(b.turn==='w'?first-second:second-first)):null;
   const verdict=u===best.bestmove?'Das war der bevorzugte Zug der Engine.':cp===null?'Eine verlässliche numerische Einstufung ist nicht möglich.':cp<35?'Die Bewertung bleibt nahezu gleich.':cp<100?'Diese Alternative verschlechtert die Stellung etwas.':cp<220?'Diese Alternative kostet spürbar Stellungsvorteil.':'Diese Alternative verliert laut Engine erheblich an Stellungswert.';
   const caution=inCheck(after,after.turn)?' Der gegnerische König steht im Schach.':'';
   v536Text(feedback,'Coach 4.0: '+verdict+(cp===null?'':' Bewertungsverlust ungefähr '+(cp/100).toFixed(2)+' Bauern.')+' Bessere Fortsetzung: '+best.bestmove+'.'+caution);
  }catch(e){v536Text(feedback,'Coach konnte nicht auswerten: '+e.message)}
 };
 elem('v536ArchiveAnalyze').onclick=async()=>{
 const status=elem('v536ArchiveFeedback'),snapshot=v532Viewed.id+'_'+v532Ply+'_'+v535ArchiveMoves.join(',');v536Text(status,'Stockfish berechnet die Stellung …');
 if(typeof window.analyzeFen!=='function'){v536Text(status,'Stockfish ist nicht verfügbar.');return}
 try{const {p}=v535ArchivePosition(v532Viewed),fen=toFen(p);const a=await window.analyzeFen(fen,v536Prefs.coachDepth);
 if(!v532Viewed||snapshot!==v532Viewed.id+'_'+v532Ply+'_'+v535ArchiveMoves.join(','))return;
 const cp=sfWhiteScore(fen,a),best=a.bestmove?('Bester Zug: '+a.bestmove.slice(0,2)+' → '+a.bestmove.slice(2,4)):'Kein Zug verfügbar';
 const check=inCheck(p,p.turn)?' Dein König steht im Schach.':'';
 v536Text(status,'Stockfish 19 Lite · Tiefe '+(a.depth||'?')+' · '+best+(cp===null?'':' · Bewertung aus Weiß-Sicht '+(cp/100).toFixed(2))+'.'+check);
 }catch(e){v536Text(status,'Analyse nicht möglich: '+e.message)}
 };
}
function v536DrawPremoves(){const text=elem('gamePremoveText');if(!text)return;let host=elem('v536PremovePanel');if(!host){host=document.createElement('div');host.id='v536PremovePanel';host.className='v536Box';text.after(host)}
 const plan=premovePlan.slice();host.hidden=setup.mode!=='computer'||!plan.length;if(host.hidden)return;
 host.replaceChildren();const headline=document.createElement('strong');headline.textContent='↪ Geplante Zugfolge ('+plan.length+'/6)';host.append(headline);
 const row=document.createElement('div');row.className='v536PlanItems';plan.forEach((m,i)=>{const b=document.createElement('span');b.className='v536PlanMove';b.textContent=(i+1)+'. '+sq(m.f)+' → '+sq(m.t);row.append(b)});host.append(row);
 const actions=document.createElement('div');actions.className='v536Controls';const last=document.createElement('button');last.textContent='Letzten entfernen';last.disabled=!plan.length;last.onclick=()=>{const restore=plan.slice(0,-1);clearPremove();restore.forEach(x=>queuePremove(x.f,x.t));};const clear=document.createElement('button');clear.textContent='Alle löschen';clear.onclick=()=>clearPremove();actions.append(last,clear);host.append(actions);
 const board=elem('gameBoard');if(!board)return;
 let layer=board.querySelector('#v536PlanArrows');if(!layer){layer=document.createElementNS('http://www.w3.org/2000/svg','svg');layer.id='v536PlanArrows';layer.setAttribute('viewBox','0 0 800 800');layer.setAttribute('preserveAspectRatio','none');layer.classList.add('v536PlanArrows');board.append(layer)}layer.replaceChildren();
 const orientation=flip?setup.side!=='w':setup.side==='w';
 const coords=i=>{const visual=orientation?i:63-i;return {x:(visual%8+.5)*100,y:(Math.floor(visual/8)+.5)*100}};
 plan.forEach((m,i)=>{const a=coords(m.f),b=coords(m.t),line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);line.setAttribute('stroke',i%2?'#d47b58':'#f3bc69');line.setAttribute('stroke-width','10');line.setAttribute('stroke-linecap','round');line.setAttribute('opacity','.7');layer.append(line);
 const label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('x',b.x);label.setAttribute('y',b.y);label.setAttribute('font-size','34');label.setAttribute('font-weight','900');label.setAttribute('fill','#fff');label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','middle');label.textContent=String(i+1);layer.append(label)});
}
function v536ProtectUpgrade(){
 const key='chess_v536_preupdate_snapshot';
 try{
  if(localStorage.getItem(key))return true;
  const snapshot=v57Snapshot(),data=JSON.stringify(snapshot.data),packed=JSON.stringify({at:new Date().toISOString(),checksum:v57Checksum(data),data:snapshot.data});
  localStorage.setItem(key,packed);
  const read=JSON.parse(localStorage.getItem(key));
  if(read.checksum!==v57Checksum(JSON.stringify(read.data)))throw Error('Prüfsumme stimmt nicht');
  return true;
 }catch(e){try{localStorage.removeItem(key)}catch(_){};return false}
}
function v536RestorePreupgrade(){const status=elem('v536BackupStatus');
 try{const raw=localStorage.getItem('chess_v536_preupdate_snapshot');if(!raw)throw Error('Kein Snapshot vorhanden');const s=JSON.parse(raw);
 if(s.checksum!==v57Checksum(JSON.stringify(s.data)))throw Error('Sicherung beschädigt');
 if(!confirm('Daten vor V5.36 wiederherstellen? Das ersetzt aktuelle Einträge. Zuerst ein aktuelles Backup exportieren.'))return;
 for(const [key,value] of Object.entries(s.data))if(/^schach1001[-_]/.test(key)&&typeof value==='string')localStorage.setItem(key,value);
 window.location.reload();
 }catch(e){v536Text(status,'Wiederherstellung nicht möglich: '+e.message)}
}
function v536SafetyCheck(){const msg=elem('v536BackupStatus');try{const b=v57Snapshot(),serialized=JSON.stringify(b.data);const size=new Blob([serialized]).size;
 const keyCount=Object.keys(b.data).length,archive=v532GetArchive().length,variants=v536Variants().length;
 v536Text(msg,'Prüfung OK: '+keyCount+' Datensätze, '+archive+' archivierte Partien, '+variants+' gespeicherte Varianten, '+Math.round(size/1024)+' KB. Lokale Daten unverändert. Für Geräteschutz zusätzlich Backup exportieren.');
 }catch(e){v536Text(msg,'Datensicherung prüfen: '+e.message)}}
function v536TrainingExtras(){const anchor=elem('v525EndCoach')||elem('v58EndBoard');if(!anchor||elem('v536EndLessons'))return;
 const section=document.createElement('section');section.id='v536EndLessons';section.className='v536Box';
 section.innerHTML='<strong>♜ Endspielschule 3.0 · Lernpfade</strong><p>Wähle ein Thema. Die vorhandenen Figurentipps, Pfeile und Musterzüge bleiben aktiv.</p><div class="v536Controls" id="v536EndButtons"></div><p id="v536EndStatus" class="v536Status"></p>';
 const parent=elem('v525EndCoach');if(parent)parent.after(section);else anchor.before(section);
 const choices=[['queen','Damenmatt'],['rook','Turmmatt'],['opposition','Opposition'],['passed','Freibauer']];for(const [id,title] of choices){const b=document.createElement('button');b.type='button';b.textContent=title;b.onclick=()=>{v58EndStart(id);v536Text(elem('v536EndStatus'),'Kapitel „'+title+'“ gestartet. Nutze Tipp 1 für die Figur, Tipp 2 für den Zug.');};elem('v536EndButtons').append(b)}
 v536Text(elem('v536EndStatus'),'Bisher abgeschlossene Übungen: '+(summaryStore.endgameHistory||[]).length);
 const opening=elem('openingTrainer');if(opening&&!elem('v536OpeningNote')){const note=document.createElement('section');note.id='v536OpeningNote';note.className='v536Box';note.innerHTML='<strong>📚 Eröffnungstrainer 3.0</strong><p>Nutze „Gegnerische Antworten und Abzweigungen üben“ und die Wiederholung gelernter Varianten. Fehlerhafte Züge können erneut trainiert werden.</p><button id="v536OpeningRepeat" type="button">Fällige Variante üben</button><small id="v536OpeningDue"></small>';opening.append(note);
 elem('v536OpeningRepeat').onclick=()=>{const due=v58OpeningDue();if(!due.length){v536Text(elem('v536OpeningDue'),'Heute keine gelernte Variante fällig.');return}elem('openingPick').value=due[0].id;elem('openingPick').dispatchEvent(new Event('change',{bubbles:true}));v536Text(elem('v536OpeningDue'),'Wiederhole '+due[0].o.name+'.')};
 v536Text(elem('v536OpeningDue'),v58OpeningDue().length+' Wiederholungen fällig.');}
}
function v536DashboardExtras(){const root=elem('statsContent');if(!root||elem('v536Dashboard'))return;
 const panel=document.createElement('section');panel.id='v536Dashboard';panel.className='v536Box';
 panel.innerHTML='<strong>🧠 Training, Stil & Datensicherheit</strong><div class="v536Controls"><button id="v536Errors" type="button">Eigene Fehler trainieren</button><button id="v536BackupCheck" type="button">Backup prüfen</button><button id="v536BackupExport" type="button">Backup exportieren</button><button id="v536Restore" type="button">Vor-Update-Sicherung</button></div><p id="v536ErrorCount" class="v536Status"></p><p id="v536BackupStatus" class="v536Status"></p><div class="v536Controls"><label>Brettfarben <select id="v536BoardStyle"><option value="klassisch">Klassisch</option><option value="blau">Blau</option><option value="holz">Holz</option></select></label><label>Analyse-Tiefe <select id="v536Depth"><option value="8">8 · schnell</option><option value="10">10 · normal</option><option value="14">14 · gründlich</option></select></label></div><small>Computerstärke bis 2800 ist ein Stockfish-Stärkeprofil, kein unabhängig gemessener Elo-Wert.</small>';
 root.prepend(panel);elem('v536BoardStyle').value=v536Prefs.board;elem('v536Depth').value=String(v536Prefs.coachDepth);
 elem('v536BoardStyle').onchange=e=>{v536Prefs.board=e.target.value;v536PersistPrefs();v536ApplyBoard()};
 elem('v536Depth').onchange=e=>{v536Prefs.coachDepth=Number(e.target.value);v536PersistPrefs()};
 elem('v536Errors').onclick=()=>{const mistakes=v521Errors();if(!mistakes.length){v536Text(elem('v536ErrorCount'),'Noch keine eigenen Fehler: Analysiere zuerst eine Partie.');return}v57OpenReplay(mistakes[0]);if(typeof window.ChessAnalysisQA?.v516ShowTraining==='function')window.ChessAnalysisQA.v516ShowTraining('replay');elem('v57Replay')?.scrollIntoView({block:'center'});};
 elem('v536BackupCheck').onclick=v536SafetyCheck;elem('v536BackupExport').onclick=v57ExportBackup;elem('v536Restore').onclick=v536RestorePreupgrade;
 v536Text(elem('v536ErrorCount'),'Eigene Fehlstellungen für Wiederholungen: '+v521Errors().length+'.');
}
function v536Init(){
 const safety=v536ProtectUpgrade();v536ApplyBoard();v536DashboardExtras();v536TrainingExtras();v536ArchiveToolbar();if(!safety)v536Text(elem('v536BackupStatus'),'Automatische Vor-Update-Sicherung nicht möglich: Bitte manuell Backup exportieren.');
 const oldArchiveDraw=v532DrawArchive;v532DrawArchive=function(){oldArchiveDraw();v536ArchiveExtras()};
 const oldArchiveRender=v532RenderArchive;v532RenderArchive=function(){oldArchiveRender();v536ArchiveToolbar()};
 const oldRender=render;render=function(){oldRender();v536DrawPremoves()};
 const oldProfile=renderProfile;renderProfile=function(){oldProfile();v536DashboardExtras();v536ArchiveToolbar();v536Text(elem('v536ErrorCount'),'Eigene Fehlstellungen für Wiederholungen: '+v521Errors().length)};
 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{},{v536GetVariants:v536Variants,v536CheckBackup:()=>{v536SafetyCheck();return elem('v536BackupStatus')?.textContent},v536BoardStyle:v=>{v536Prefs.board=v;v536PersistPrefs();v536ApplyBoard()}});
}


/* V5.37: Zeitloser Eröffnungstrainer Weiß/Schwarz + Stockfish-Punkteanzeige in der interaktiven Analyse. */
const V537_SIDE_KEY='schach1001_v537_opening_side';
let v537OpeningSide='w',v537OpeningOptions=[],v537LastFen='',v537EvalTicket=0,v537EvalTimer=null,v537LastScore=null;
try{v537OpeningSide=localStorage.getItem(V537_SIDE_KEY)==='b'?'b':'w'}catch(_){}
function v537FilterOpenings(side,preferred=null,start=false){
 const pick=elem('openingPick');if(!pick||!v537OpeningOptions.length)return;
 side=side==='b'?'b':'w';v537OpeningSide=side;
 try{localStorage.setItem(V537_SIDE_KEY,side)}catch(_){}
 const list=v537OpeningOptions.filter(x=>OPENINGS[x.id]?.side===side);
 if(!list.length)return;
 const candidate=list.some(x=>x.id===preferred)?preferred:(list.some(x=>x.id===openingId)?openingId:list[0].id);
 const changed=candidate!==openingId || setup.mode==='opening'&&setup.side!==side;
 const groups=new Map();for(const x of list){if(!groups.has(x.group))groups.set(x.group,[]);groups.get(x.group).push(x)}
 const frag=document.createDocumentFragment();for(const [group,items] of groups){const optgroup=document.createElement('optgroup');optgroup.label=group;for(const item of items){const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.title;optgroup.append(opt)}frag.append(optgroup)}
 pick.replaceChildren(frag);pick.value=candidate;
 openingId=candidate;v57OpeningBase=candidate;
 for(const key of ['w','b']){const btn=elem('v537Side'+key);if(btn){const on=side===key;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));}}
 const info=elem('v537OpeningSideInfo');if(info)info.textContent=(side==='w'?'Weiß eröffnet':'Schwarz verteidigt')+' · '+list.length+' Varianten · ohne Zeitdruck';
 const heading=elem('v538SideHeading');if(heading)heading.textContent=side==='w'?'Weiße Eröffnungen':'Schwarze Eröffnungen';
 if(elem('v538Board')&&!start)v538Start();
 if(start && elem('v538Board'))v538Start();
}
function v537SyncOpeningSide(){
 const target=OPENINGS[openingId]?.side||v537OpeningSide;
 if(target!==v537OpeningSide||elem('openingPick')?.value!==openingId)v537FilterOpenings(target,openingId,false);
}
function v537RenderOpeningSelection(){
 const openingRoot=elem('openingTrainer'),pick=elem('openingPick');if(!openingRoot||!pick||elem('v537OpeningSelector'))return;
 const opts=[...pick.querySelectorAll('option')];v537OpeningOptions=opts.map(opt=>({id:opt.value,title:opt.textContent,group:opt.parentElement?.label.replace(/^.*? · /,'')||'Weitere Eröffnungen'}));
 const selector=document.createElement('section');selector.id='v537OpeningSelector';selector.className='v537OpeningSelector';
 selector.innerHTML='<div class="v537Heading">♟ Deine Eröffnungsfarbe <small>Keine Uhr · kein Zeitlimit</small></div><div class="v537Sides" role="group" aria-label="Eröffnungen nach Farbe"><button type="button" id="v537Sidew" aria-pressed="false">♙ Weiß trainieren</button><button type="button" id="v537Sideb" aria-pressed="false">♟ Schwarz trainieren</button></div><p id="v537OpeningSideInfo" class="v537Small">Wähle eine Farbe und dann eine Eröffnung.</p>';
 const start=elem('v516StartOpening'),label=pick.closest('label');if(label)label.before(selector);else openingRoot.prepend(selector);
 elem('v537Sidew').onclick=()=>v537FilterOpenings('w',null,false);
 elem('v537Sideb').onclick=()=>v537FilterOpenings('b',null,false);
 const oldOnChange=pick.onchange;
 pick.onchange=(event)=>{v537OpeningSide=OPENINGS[event.target.value]?.side||v537OpeningSide;oldOnChange?.call(pick,event);v537FilterOpenings(v537OpeningSide,event.target.value,false)};
 const color=setup.mode==='opening'?(OPENINGS[openingId]?.side||'w'):v537OpeningSide;
 v537FilterOpenings(color,openingId,false);
 // Fällige Eröffnungen können für die andere Farbe sein: dort die passende Auswahl zuerst aufbauen.
 for(const id of ['v58OpeningStart','v536OpeningRepeat']){
  const btn=elem(id);if(!btn)continue;
  btn.onclick=()=>{const due=v58OpeningDue();const msg=elem(id==='v58OpeningStart'?'v58OpeningDue':'v536OpeningDue');
   if(!due.length){if(msg)msg.textContent='Heute keine gelernte Variante zur Wiederholung fällig.';return}
   const first=due[0];v537FilterOpenings(first.o.side,first.id,true);
   if(msg)msg.textContent='Wiederholung gestartet: '+first.o.name+' · ohne Zeitlimit.';
  };
 }
}
function v537CreateScore(){
 const stage=elem('v529Stage');if(!stage||elem('v537Score'))return;
 const score=document.createElement('section');score.id='v537Score';score.className='v537Score';score.setAttribute('aria-label','Stockfish-Punktebewertung der Stellung');
 score.innerHTML='<div class="v537ScoreHead"><strong>♟ Stockfish · Stellungsbewertung</strong><span id="v537ScoreDepth">Bereit</span></div><div class="v537ScoreMain"><span id="v537Leader">Noch keine Bewertung</span><strong id="v537ScorePoints" aria-live="polite">–</strong></div><div class="v537ScoreBar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="Noch keine Bewertung"><div id="v537ScoreWhite"></div></div><div class="v537Scale"><span>○ Weiß</span><span>● Schwarz</span></div><p id="v537ScoreDetail">Positive Punkte: Vorteil für Weiß. Negative Punkte: Vorteil für Schwarz. 1,00 Punkt entspricht ungefähr einem Bauern.</p>';
 const coach=stage.querySelector('.v529Coach');if(coach)coach.after(score);else stage.prepend(score);
}
function v537UpdateScore(){
 const box=elem('v537Score'),pos0=v529.position;if(!box||!pos0)return;
 const fen=toFen(pos0);if(v537LastFen===fen)return;
 v537LastFen=fen;v537LastScore=null;const ticket=++v537EvalTicket;
 const points=elem('v537ScorePoints'),leader=elem('v537Leader'),depth=elem('v537ScoreDepth'),info=elem('v537ScoreDetail'),meter=box.querySelector('.v537ScoreBar');
 points.textContent='…';leader.textContent='Stockfish berechnet …';depth.textContent='Warte auf Engine';info.textContent='Die Bewertung wird für die aktuelle Brettstellung ermittelt.';
 clearTimeout(v537EvalTimer);
 v537EvalTimer=setTimeout(async()=>{
  try{
   if(typeof window.analyzeFen!=='function')throw Error('Stockfish 19 Lite nicht verfügbar');
   const a=await window.analyzeFen(fen,Math.min(12,Math.max(8,Number(v536Prefs.coachDepth)||10)));
   if(ticket!==v537EvalTicket||fen!==toFen(v529.position))return;
   const cp=sfWhiteScore(fen,a);if(!Number.isFinite(cp))throw Error('Stockfish liefert noch keine Punktebewertung');
   v537LastScore={fen,cp,depth:a.depth||null};
   const isMate=Math.abs(cp)>25000,formatted=isMate?(cp>0?'Matt für Weiß':'Matt für Schwarz'):(cp>=0?'+':'−')+(Math.abs(cp)/100).toFixed(2).replace('.',',');
   points.textContent=formatted;
   const advantage=cp>25?'Weiß besser':cp< -25?'Schwarz besser':'Stellung ungefähr ausgeglichen';
   leader.textContent=advantage;depth.textContent='Tiefe '+(a.depth||'?')+' · offline';
   const percent=Math.max(5,Math.min(95,50+Math.tanh(cp/400)*43));
   elem('v537ScoreWhite').style.width=percent+'%';meter.setAttribute('aria-valuenow',String(Math.round(percent)));
   meter.setAttribute('aria-valuetext',advantage+' · '+formatted+' Punkte');
   info.textContent=isMate?'Stockfish meldet eine Mattbewertung.':advantage+' · Bewertung '+formatted+' Bauernpunkte aus Sicht von Weiß. Ein positiver Wert begünstigt Weiß, ein negativer Schwarz.';
  }catch(e){if(ticket===v537EvalTicket){points.textContent='–';leader.textContent='Bewertung nicht verfügbar';depth.textContent='Offline';info.textContent='Stockfish: '+(e.message||'Analyse nicht möglich')+'. Es wird kein erfundener Wert angezeigt.';}}
 },210);
}
function v537Init(){
 v537RenderOpeningSelection();v537CreateScore();
 const drawOld=v529Draw;v529Draw=function(){drawOld();v537UpdateScore()};
 v537UpdateScore();
 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {v537SelectOpeningSide:(color)=>v537FilterOpenings(color,null,false),v537GetScore:()=>v537LastScore,v537OpeningSide:()=>v537OpeningSide});
}


/* V5.38 – Eigenständiges Eröffnungsbrett, separates Spiel-/Analysebrett, Weiß/Schwarz. */
const v538={position:fromFen(startFen),ply:0,selected:-1,last:null,hint:0,active:false,nonce:0,finished:false,completedOnce:false,side:'w',line:'italian',history:[]};
function v538Current(){return OPENINGS[v538.line]||OPENINGS[openingId]}
function v538MoveExpected(){const line=v538Current();return line?.uci[v538.ply]||null}
function v538Candidates(){
 const prefix=v538.history.map(x=>x.uci);
 if(!v57prefs.variants)return [{id:v538.line,line:v538Current()}];
 const matches=Object.entries(OPENINGS).filter(([id,line])=>line.side===v538.side&&prefix.every((uci,i)=>line.uci[i]===uci)).map(([id,line])=>({id,line}));
 return matches.length?matches:[{id:v538.line,line:v538Current()}];
}
function v538ReadUci(p,uci){return legal(p).find(m=>moveUci(m)===uci)||null}
function v538SetMessage(msg){const x=elem('v538Status');if(x)x.textContent=msg}
function v538Draw(){
 const root=elem('v538Board');if(!root)return;
 const p=v538.position,opts=v538.selected>=0?legal(p).filter(x=>x.f===v538.selected):[];
 const isBlack=v538.side==='b',frag=document.createDocumentFragment();
 for(let view=0;view<64;view++){
  const i=isBlack?63-view:view,pc=p.board[i],sqEl=document.createElement('button');sqEl.type='button';sqEl.className='v538Sq '+((Math.floor(i/8)+i%8)%2===0?'light':'dark');sqEl.dataset.i=i;
  sqEl.setAttribute('aria-label',sq(i)+(pc?' '+(isW(pc)?'Weiße ':'Schwarze ')+(nm[pc.toUpperCase()]||'Figur'):' frei'));
  if(v538.last?.f===i)sqEl.classList.add('v538Last');if(v538.last?.t===i)sqEl.classList.add('v538Last');
  if(i===v538.selected)sqEl.classList.add('v538Selected');
  const hint=v538ReadUci(p,v538MoveExpected());
  if(v538.hint>=1&&hint?.f===i)sqEl.classList.add('v538HintFrom');
  if(v538.hint>=2&&hint?.t===i)sqEl.classList.add('v538HintTo');
  if(pc&&pc.toLowerCase()==='k'&&color(pc)===p.turn&&inCheck(p,p.turn))sqEl.classList.add('v538Check');
  if(pc){const pic=document.createElement('img');pic.src='./theme_pieces/'+imgMap[pc];pic.alt='';pic.className='v538Piece';pic.draggable=false;sqEl.append(pic)}
  if(opts.some(m=>m.t===i)){const dot=document.createElement('i');dot.className=pc?'v538Capture':'v538Dot';sqEl.append(dot)}
  if(view%8===0){const coord=document.createElement('span');coord.className='v538Coord v538Rank';coord.textContent=sq(i)[1];sqEl.append(coord)}
  if(view>=56){const coord=document.createElement('span');coord.className='v538Coord v538File';coord.textContent=sq(i)[0];sqEl.append(coord)}
  sqEl.onclick=()=>v538Click(i);frag.append(sqEl);
 }
 root.replaceChildren(frag);
 if(v538.hint>=2){const m=v538ReadUci(p,v538MoveExpected());if(m){const xy=i=>[(isBlack?7-i%8:i%8)*100+50,(isBlack?7-Math.floor(i/8):Math.floor(i/8))*100+50];const [x1,y1]=xy(m.f),[x2,y2]=xy(m.t);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 800 800');svg.setAttribute('class','v538Arrow');svg.setAttribute('aria-hidden','true');svg.innerHTML='<defs><marker id="v538ArrowTip" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5Z" fill="#37c47d"/></marker></defs><line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#37c47d" stroke-width="17" opacity=".8" stroke-linecap="round" marker-end="url(#v538ArrowTip)"/>';root.append(svg)}}
 const title=elem('v538BoardSide');if(title)title.textContent=(p.turn==='w'?'Weiß':'Schwarz')+' am Zug';
 const progress=elem('v538Progress');if(progress)progress.textContent=v538.ply+' / '+v538Current().uci.length+' Halbzüge';
 const step=elem('v538Step');if(step)step.style.width=Math.round(v538.ply/v538Current().uci.length*100)+'%';
 const next=elem('v538HintButton');if(next)next.textContent=v538.hint===0?'💡 Tipp: Figur':v538.hint===1?'➜ Tipp: Zugpfeil':'✓ Zug gezeigt';
}
function v538Advance(uci,auto=false,previousLine=v538.line){
 const m=v538ReadUci(v538.position,uci);
 if(!m){v538SetMessage('Dieser Zug ist in der gewählten Variante hier nicht legal.');return false}
 const before=toFen(v538.position);v538.position=move(v538.position,m);v538.last={f:m.f,t:m.t};v538.history.push({before,uci,previousLine});v538.ply++;v538.selected=-1;v538.hint=0;v538Draw();
 const line=v538Current(),tip=line.tips[v538.ply-1];
 if(v538.ply===line.uci.length){
  v538.finished=true;if(!v538.completedOnce){v551OpeningCountSuccess(v538.line);summaryStore.openings[v538.line]=(summaryStore.openings[v538.line]||0)+1;
  const previous=openingId;openingId=v538.line;v58OpeningDone();openingId=previous;
  persistProfile();v538.completedOnce=true;}v538SetMessage('✓ '+line.name+' erfolgreich geübt. Dein Lernfortschritt wurde erhalten.');
 }else v538SetMessage((auto?'Gegnerzug ausgeführt. ':'Dein Zug war richtig. ')+(tip||line.plan||'') );
 return true;
}
function v538Auto(){
 const serial=++v538.nonce;
 if(v538.finished||v538.position.turn===v538.side)return;
 v538SetMessage('Gegner antwortet …');
 setTimeout(()=>{if(serial!==v538.nonce||!v538.active||v538.finished)return;
  let next=v538MoveExpected(),oldLine=v538.line;const candidates=v538Candidates().filter(x=>x.line.uci[v538.ply]);if(v57prefs.variants&&candidates.length){const choice=candidates[Math.floor(Math.random()*candidates.length)];v538.line=choice.id;openingId=choice.id;const p=elem('openingPick');if(p)p.value=choice.id;next=choice.line.uci[v538.ply]}
  if(next&&v538Advance(next,true,oldLine)&&!v538.finished&&v538.position.turn!==v538.side)v538Auto();
 },350);
}
function v538Click(i){
 if(!v538.active||v538.finished)return;
 if(v538.position.turn!==v538.side)return;
 const pc=v538.position.board[i];
 if(v538.selected>=0){const moveChoice=legal(v538.position).find(m=>m.f===v538.selected&&m.t===i);
  if(moveChoice){const chosen=moveUci(moveChoice),oldLine=v538.line;const match=v538Candidates().find(x=>x.line.uci[v538.ply]===chosen);if(!match){v551OpeningCountError();v538SetMessage('Dieser Zug gehört nicht zu den passenden Eröffnungsvarianten. Probiere einen anderen Entwicklungszug.');v538.selected=-1;v538Draw();return}
   v538.line=match.id;openingId=match.id;const pick=elem('openingPick');if(pick)pick.value=match.id;
   v538Advance(chosen,false,oldLine);if(!v538.finished)v538Auto();return}
 }
 v538.selected=pc&&color(pc)===v538.side?i:-1;v538Draw();
}
function v538Start(){
 if(!elem('v538Board'))return;
 const picked=elem('openingPick')?.value||openingId;
 v538.line=OPENINGS[picked]?picked:openingId;v538.side=OPENINGS[v538.line].side;
 v538.position=fromFen(startFen);v538.ply=0;v538.selected=-1;v538.last=null;v538.hint=0;v538.finished=false;v538.completedOnce=false;v538.active=true;v538.history=[];v538.nonce++;
 openingId=v538.line;
 v538Draw();v538SetMessage('Ohne Uhr. '+v538Current().plan+' Wähle die richtige Figur.');
 if(v538.side==='b')v538Auto();
}
function v538Init(){
 const card=elem('openingTrainer');if(!card||elem('v538Board'))return;
 // Nach dem Farbwahlschalter, klar getrennt von den Brettflächen für Spielen und Stockfish-Analyse.
 const panel=document.createElement('section');panel.id='v538OpeningPractice';panel.className='v538OpeningPractice';
 panel.innerHTML='<header class="v538OpeningHeader"><strong id="v538SideHeading">Weiße Eröffnungen</strong><small>Eigenes Übungsbrett · ohne Timer</small></header><p class="v538Note">Diese Übung ist unabhängig von deiner laufenden Partie und deiner Stockfish-Analyse.</p><div class="v538BoardMeta"><span id="v538BoardSide">Weiß am Zug</span><span id="v538Progress">0 / 9 Halbzüge</span></div><div id="v538Board" class="v538Board" role="group" aria-label="Eigenständiges Brett für Eröffnungstraining"></div><div class="v538Bar"><div id="v538Step"></div></div><p class="v538Status" id="v538Status" aria-live="polite"></p><div class="v538Actions"><button id="v538HintButton" type="button">💡 Tipp: Figur</button><button id="v538Reset" type="button">↻ Neu starten</button><button id="v538Undo" type="button">↶ Zug zurück</button></div>';
 const guide=elem('openingGuidance');if(guide)guide.before(panel);else card.append(panel);
 const trainingHead=elem('v516TrainingHead');if(trainingHead)trainingHead.after(card);
 const due=document.querySelector('.v517OpeningToday');if(due)card.after(due);
 elem('v538HintButton').onclick=()=>{if(v538.finished)return;v538.hint=Math.min(2,v538.hint+1);v538Draw();v538SetMessage(v538.hint===1?'Tipp 1: Die richtige Figur wird grün markiert.':'Tipp 2: Der grüne Pfeil zeigt den nächsten Zug.')};
 elem('v538Reset').onclick=v538Start;
 elem('v538Undo').onclick=()=>{v538.nonce++;if(!v538.history.length){v538SetMessage('Noch kein Zug zum Zurücknehmen.');return}const n=v538.history.pop();v538.line=n.previousLine||v538.line;openingId=v538.line;const select=elem('openingPick');if(select)select.value=v538.line;v538.position=fromFen(n.before);v538.ply--;v538.finished=false;v538.selected=-1;v538.last=v538.history.length?(()=>{const t=v538.history.at(-1);const u=v538ReadUci(fromFen(t.before),t.uci);return u?{f:u.f,t:u.t}:null})():null;v538.hint=0;v538Draw();v538SetMessage('Letzten Zug zurückgenommen.');if(v538.position.turn!==v538.side)v538Auto();};
 const select=elem('openingPick');const onOld=select.onchange;select.onchange=e=>{onOld?.call(select,e);v538Start()};
 const restart=elem('openingRestart');if(restart)restart.onclick=v538Start;
 // Hauptbretter bleiben unverändert. Bisheriges gameBoard wird in Training/Analyse nur ausgeblendet.
 const side=OPENINGS[select.value]?.side||v537OpeningSide;v538Start();
 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {v538State:()=>({ply:v538.ply,fen:toFen(v538.position),side:v538.side,line:v538.line,boardId:'v538Board'}),v538Start,v538Click,v538Advance});
}


/* V5.40: kompakte Endspielsteuerung am Brett. Original-Buttons behalten ihre Handler. */
function v540DockEndgame(){
 const board=elem('v58EndBoard'),coach=elem('v525EndCoach'),lessons=elem('v536EndLessons');
 if(!board||!coach||!lessons||elem('v540EndDock'))return;
 const select=elem('v58EndSelect'),restart=elem('v58EndReset');
 const oldButtons=coach.querySelector('.v525Buttons'),step=elem('v525EndStep');
 if(!select||!restart||!oldButtons||!step)return;
 const dock=document.createElement('div');dock.id='v540EndDock';dock.className='v540EndDock';
 dock.innerHTML='<div class="v540DockHeader"><strong>♟ Endspiel am Brett</strong><span>Hilfe direkt beim Üben</span></div><div id="v540SelectRow" class="v540SelectRow"></div><div id="v540DockActions" class="v540DockActions"></div><div id="v540DockHint" class="v540DockHint" aria-live="polite"></div>';
 board.before(dock);
 const pickLabel=select.closest('label');
 if(pickLabel){pickLabel.classList.add('v540LessonPicker');elem('v540SelectRow').append(pickLabel)}
 const actions=elem('v540DockActions');
 actions.append(...Array.from(oldButtons.querySelectorAll('button')),restart);
 actions.querySelectorAll('button').forEach(btn=>btn.classList.add('v540DockButton'));
 restart.textContent='↻ Wiederholen';
 elem('v540DockHint').append(step);
 coach.hidden=true;lessons.hidden=true;
 // Beim Öffnen der Endspielübung bleiben Leiste und gesamtes Brett auf einem Bildschirm.
 const reveal=()=>setTimeout(()=>{if(elem('v540EndDock')?.getClientRects().length)elem('v540EndDock').scrollIntoView({block:'start',behavior:'instant'});},80);
 for(const id of ['v516Endgame','v515GoEndgame','v515GameEnd'])elem(id)?.addEventListener('click',reveal);

 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{},{v540EndDock:()=>Boolean(elem('v540EndDock')),v540EndControls:()=>Array.from(elem('v540DockActions')?.querySelectorAll('button')||[]).map(x=>x.id)});
}
window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {v515ReadPlan,v515Tasks,v515ParsePGN:v58ParsePGN,v515ImportPGN:v58LoadPGN});

/* V5.41: sichtbare Zeitwahl für normale Partien; Training bleibt ohne Uhr. */
function v541TimePickerInit(){
 const game=elem('gameContent'),board=elem('gameBoard'),clocks=elem('gameClocks');
 if(!game||!board||!clocks||elem('v541TimeOpen'))return;
 // Beide Uhren bleiben direkt beim Spielbrett und verschwinden nur bei 'Ohne Uhr'.
 const frame=board.closest('.gameBoardFrame');if(frame?.parentElement)frame.before(clocks);
 const strip=document.createElement('div');strip.className='v541TimeStrip';strip.id='v541TimeStrip';
 strip.innerHTML='<span class="v541TimeLabel">⏱ <strong id="v541CurrentTime">10 Min.</strong><small id="v541TimeKind">Zeitkontrolle</small></span><button type="button" id="v541TimeOpen">Spielzeit wählen <span aria-hidden="true">›</span></button>';
 const top=game.querySelector('.v516TopBar');if(top)top.after(strip);else game.querySelector('.gameBoardPanel')?.prepend(strip);
 const modal=document.createElement('div');modal.id='v541TimeModal';modal.className='v541TimeModal';modal.hidden=true;
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','v541Title');
 const group=(caption,items)=>'<section class="v541TimeGroup"><h3>'+caption+'</h3><div class="v541TimeTiles">'+items.map(id=>'<button type="button" class="v541TimeTile" data-v541-time="'+id+'" aria-pressed="false">'+TIME_CONTROLS[id].title+'</button>').join('')+'</div></section>';
 modal.innerHTML='<div class="v541TimeBackdrop" id="v541TimeBackdrop"></div><div class="v541TimeDialog">'
 +'<header class="v541TimeHeader"><button type="button" id="v541TimeClose" aria-label="Schließen">‹</button><strong id="v541Title">Spielzeit auswählen</strong><span>⏱</span></header>'
 +'<div class="v541TimeScroll">'
 +'<p class="v541TimeDesc">Wähle deine Bedenkzeit. Zeit gilt nur für normale Partien – Eröffnungen und Endspiele bleiben ohne Timer.</p>'
 +group('∞ Ohne Zeitdruck',['none'])
 +group('⚡ Bullet',['b1','b11','b21'])
 +group('⚡ Blitz',['b3','b32','b5','b55','b52'])
 +group('⏱ Rapid / Schnellschach',['r10','r1510','r30','r105','r20','r60'])
 +group('☀ Tagespartien · offline',['d1','d3','d7','d2','d5','d14'])
 +'<section class="v541TimeGroup"><h3>⚙ Eigene Zeit</h3><button type="button" class="v541TimeTile v541CustomPick" data-v541-time="custom" aria-pressed="false">Benutzerdefiniert</button>'
 +'<div class="v541Custom" id="v541Custom"><label>Startzeit <strong id="v541MinVal">10 Min.</strong><input id="v541Min" type="range" min="1" max="120" step="1" value="10" /></label><label>Bonus pro Zug <strong id="v541IncVal">0 Sek.</strong><input id="v541Inc" type="range" min="0" max="60" step="1" value="0" /></label></div></section>'
 +'<p class="v541TimeWarning">Hinweis: Beim Übernehmen wird eine <strong>neue Partie</strong> gestartet. Der vorherige laufende Spielstand wird ersetzt.</p></div>'
 +'<footer class="v541TimeFooter"><span id="v541Selected">10 Min.</span><button type="button" id="v541Apply">Zeit übernehmen &amp; neue Partie</button></footer></div>';
 document.body.append(modal);
 let selected='r10',focusReturn=null;
 const buttons=[...modal.querySelectorAll('[data-v541-time]')];
 const describe=id=>id==='custom'?(Math.round(+elem('v541Min').value)+' Min. + '+Math.round(+elem('v541Inc').value)+' Sek./Zug'):TIME_CONTROLS[id]?.title||'10 Min.';
 const sync=()=>{
  buttons.forEach(b=>{const on=b.dataset.v541Time===selected;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});
  elem('v541Custom').hidden=selected!=='custom';
  elem('v541MinVal').textContent=elem('v541Min').value+' Min.';elem('v541IncVal').textContent=elem('v541Inc').value+' Sek.';
  elem('v541Selected').textContent='Gewählt: '+describe(selected);
 };
 const update=()=>{
  const t=chosenTime();elem('v541CurrentTime').textContent=setup.time==='custom'?(setup.customMin+' + '+setup.customInc):t.title;
  elem('v541TimeKind').textContent=t.type==='none'?'Ohne Timer':t.type==='daily'?'pro Zug · offline':'pro Seite';
  const visible=(setup.mode==='computer'||setup.mode==='free');strip.hidden=!visible;
  if(elem('v541TimeOpen'))elem('v541TimeOpen').textContent='Zeit wählen ›';
 };
 const close=()=>{modal.hidden=true;document.body.classList.remove('v541DialogOpen');focusReturn?.focus({preventScroll:true})};
 const open=()=>{
  focusReturn=document.activeElement;selected=TIME_CONTROLS[setup.time]||setup.time==='custom'?setup.time:'r10';
  elem('v541Min').value=String(setup.customMin||10);elem('v541Inc').value=String(setup.customInc||0);
  sync();modal.hidden=false;document.body.classList.add('v541DialogOpen');elem('v541TimeClose').focus({preventScroll:true});
 };
 elem('v541TimeOpen').onclick=open;elem('v541TimeClose').onclick=close;elem('v541TimeBackdrop').onclick=close;
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
 buttons.forEach(b=>b.onclick=()=>{selected=b.dataset.v541Time;sync()});
 for(const id of ['v541Min','v541Inc'])elem(id).oninput=()=>{selected='custom';sync()};
 elem('v541Apply').onclick=()=>{
  // Änderungen nur nach ausdrücklicher Bestätigung; vorhandene Logik für Uhr und Speicherstand bleibt erhalten.
  const mode=(setup.mode==='computer'||setup.mode==='free')?setup.mode:'computer';
  setup.mode=mode;setup.time=selected;
  if(selected==='custom'){
   setup.customMin=Math.max(1,Math.min(120,Math.round(+elem('v541Min').value||10)));
   setup.customInc=Math.max(0,Math.min(60,Math.round(+elem('v541Inc').value||0)));
  }
  close();gameNew();update();elem('clockSettings')?.removeAttribute('open');
  setNote('Neue Partie: '+describe(selected)+'. '+(selected==='none'?'Ohne Zeitdruck.':'Uhr aktiv.'));
 };
 // Die Anzeige wird bei normalen Renders aktualisiert; Trainingsbretter nutzen eigene Zustände.
 const observer=new MutationObserver(()=>{if(!modal.hidden)return;update()});
 observer.observe(elem('timeSummaryValue'),{childList:true,subtree:true});
 update();
 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {v541TimeState:()=>({selected:setup.time,label:elem('v541CurrentTime')?.textContent,clock:saveClock()}),v541OpenTime:open});
}


function v551TacticalConsequences(r){
 try{const after=fromFen(r.after),enemyReplies=legal(after),priority={q:5,r:4,b:3,n:3,p:1};
  const captures=enemyReplies.filter(m=>m.capture&&m.capture.toLowerCase()!=='k').sort((a,b)=>(priority[(b.capture||'p').toLowerCase()]||0)-(priority[(a.capture||'p').toLowerCase()]||0));
  if(inCheck(after,after.turn))return ' Dein Zug setzt den Gegner ins Schach. Suche nach seinen legalen Ausweichmöglichkeiten.';
  const hit=captures.find(m=>['q','r'].includes((m.capture||'').toLowerCase()));
  if(hit)return ' Beachte: Der Gegner hat danach den legalen Schlagzug '+sq(hit.f)+'–'+sq(hit.t)+' gegen deinen '+(nm[(hit.capture||'P').toUpperCase()]||'Stein')+'. Prüfe die taktischen Folgen vor dem nächsten Zug.';
  if(r.san&&r.san.includes('x'))return ' Du hast Material geschlagen. Prüfe, ob die geschlagene Figur gedeckt war und ein Rückschlag droht.';
  if(captures.length)return ' Nach dem Zug sind gegnerische Schlagzüge möglich. Kontrolliere die ungedeckten Figuren.';
 }catch(_){}return '';
}
/* V5.51 — additive training improvements. The V5.50 coach/board/nav CSS is not changed. */
const V551_PREFS='schach1001_v551_prefs',V551_OPENING='schach1001_v551_opening',V551_PARTIAL='schach1001_v551_review_partial';
let v551Prefs={depth:12,autoplayMs:2500,stopErrors:true,adaptive:false,archiveElo:'alle',archiveOpening:'alle',openingAdaptive:true};
try{Object.assign(v551Prefs,JSON.parse(localStorage.getItem(V551_PREFS)||'{}'))}catch(_){}
const v551WritePrefs=()=>{try{localStorage.setItem(V551_PREFS,JSON.stringify(v551Prefs))}catch(_){}};
let v551AutoTimer=null,v551PauseRequested=false,v551LastReviewIndex=-1;
function v551StopAutoplay(){if(v551AutoTimer!==null){clearInterval(v551AutoTimer);v551AutoTimer=null}const b=elem('v551Autoplay');if(b)b.textContent='▶ Automatisch abspielen'}
function v551AnalysisItems(){
 const id=v539.source==='archive'?String(v539.archiveId):v539.source==='current'?String(sessionId):'';
 if(!id)return [];
 if(v547Current&&String(v547Current.id)===id&&Array.isArray(v547Current.items))return v547Current.items;
 try{const all=JSON.parse(localStorage.getItem(V547_REVIEW_KEY)||'{}');return Array.isArray(all[id]?.items)?all[id].items:[]}catch(_){return []}
}
function v551ReviewPick(i){v551LastReviewIndex=i;const b=elem('v551Retry');if(b){const item=v551AnalysisItems().find(x=>x.i===i);b.disabled=!item||item.loss<85;}
 const label=elem('v551CriticalStatus');if(label){const item=v551AnalysisItems().find(x=>x.i===i);label.textContent=item?'Zug '+(i+1)+' · '+(item.loss/100).toFixed(2).replace('.',',')+' Bauernpunkte Verlust · '+(v547Grade(item.loss,item.kind==='Best').de):'Stockfish-Zugauswertung abwarten.'}
}
function v551TakePartial(s){try{const p=JSON.parse(sessionStorage.getItem(V551_PARTIAL)||'null');if(p&&p.id===s.id&&p.depth===v551Prefs.depth&&Array.isArray(p.items)&&p.items.length<s.moves.length)return p.items}catch(_){}return []}
function v551KeepPartial(s,items){try{sessionStorage.setItem(V551_PARTIAL,JSON.stringify({id:s.id,depth:v551Prefs.depth,items}))}catch(_){}}
function v551ClearPartial(s){try{const p=JSON.parse(sessionStorage.getItem(V551_PARTIAL)||'null');if(p?.id===s.id)sessionStorage.removeItem(V551_PARTIAL)}catch(_){}}
function v551ReviewControls(){
 const container=elem('v550Body'),section=elem('v525Review');if(!container||!section)return;
 let panel=elem('v551ReviewExtras');if(!panel){panel=document.createElement('details');panel.id='v551ReviewExtras';panel.className='v551ReviewExtras';panel.innerHTML=`<summary>♟ Review-Werkzeuge · Fehler, Tempo & Stockfish</summary><div class="v551Tools">
 <button id="v551PreviousCritical" type="button">← Vorheriger Fehler</button><button id="v551NextCritical" type="button">Nächster Fehler →</button><button id="v551Retry" type="button">↶ Diesen Fehler neu lösen</button>
 <button id="v551Autoplay" type="button">▶ Automatisch abspielen</button><label>Tempo <select id="v551Tempo"><option value="1300">Schnell</option><option value="2500">Normal</option><option value="4500">Langsam</option></select></label>
 <label><input id="v551StopErrors" type="checkbox"> Bei Fehlern pausieren</label><label>Stockfish-Suchtiefe <select id="v551Depth"><option value="8">8 · schnell</option><option value="12">12 · gründlicher</option><option value="16">16 · langsam</option></select></label>
 <button id="v551PauseAnalysis" type="button">⏸ Analyse pausieren</button><button id="v551ResumeAnalysis" type="button">↻ Analyse fortsetzen</button></div><p id="v551CriticalStatus" aria-live="polite">Stockfish-Zugbewertung laden.</p>`;}
 const stage=elem('v529Stage');if(stage&&panel.parentNode!==stage)stage.append(panel);
 elem('v551Tempo').value=String(v551Prefs.autoplayMs);elem('v551Depth').value=String(v551Prefs.depth);elem('v551StopErrors').checked=v551Prefs.stopErrors;
 elem('v551Tempo').onchange=e=>{v551Prefs.autoplayMs=Number(e.target.value);v551WritePrefs();if(v551AutoTimer!==null){v551StopAutoplay();v551StartAutoplay()}};
 elem('v551Depth').onchange=e=>{v551Prefs.depth=Number(e.target.value);v551ClearPartial(v547Current||{});v551WritePrefs();elem('v551CriticalStatus').textContent='Neue Suchtiefe gilt für die nächste vollständige Stockfish-Auswertung.'};
 elem('v551StopErrors').onchange=e=>{v551Prefs.stopErrors=e.target.checked;v551WritePrefs()};
 elem('v551PreviousCritical').onclick=()=>v551GoCritical(-1);elem('v551NextCritical').onclick=()=>v551GoCritical(1);
 elem('v551Retry').onclick=()=>{const item=v551AnalysisItems().find(x=>x.i===v529.index);if(!item||item.loss<85){elem('v551CriticalStatus').textContent='Wähle zunächst eine mit Stockfish bewertete Ungenauigkeit oder einen Fehler.';return}v551StopAutoplay();v529TryBefore();elem('v551CriticalStatus').textContent='Spiele den besseren Zug selbst. Tipp 1 markiert die Figur, Tipp 2 den Zielfeld-Pfeil.'};
 elem('v551Autoplay').onclick=()=>v551AutoTimer!==null?v551StopAutoplay():v551StartAutoplay();
 elem('v551PauseAnalysis').onclick=()=>{v551PauseRequested=true;elem('v551CriticalStatus').textContent='Analyse wird nach dem aktuellen Zug pausiert.'};
 elem('v551ResumeAnalysis').onclick=()=>{if(!v547Current){elem('v551CriticalStatus').textContent='Wähle zuerst eine beendete Partie aus.';return}v551PauseRequested=false;v547RunReview()};
 v551ReviewPick(v529.index);
}
function v551GoCritical(dir){const a=v551AnalysisItems().filter(x=>x.loss>=85).sort((a,b)=>a.i-b.i),i=v529.index;
 if(!a.length){const el=elem('v551CriticalStatus');if(el)el.textContent='Keine berechneten kritischen Momente für diese Partie. Führe zuerst die Stockfish-Review durch.';return}
 const step=dir>0?a.find(x=>x.i>i):a.slice().reverse().find(x=>x.i<i);const next=step|| (dir>0?a[0]:a.at(-1));v529PickRecord(next.i)
}
function v551StartAutoplay(){if(v551AutoTimer!==null)return;const rows=v539Records();if(!rows.length)return;
 elem('v551Autoplay').textContent='⏸ Pause';if(v529.index<0)v539StartPosition('Partie wird automatisch abgespielt.');
 v551AutoTimer=setInterval(()=>{if(elem('v550Overlay')?.hidden){v551StopAutoplay();return}const index=v529.index+1;
 if(index>=v539Records().length){v551StopAutoplay();return}v529PickRecord(index);
 const item=v551AnalysisItems().find(x=>x.i===index);if(v551Prefs.stopErrors&&item&&item.loss>=85){v551StopAutoplay();const label=elem('v551CriticalStatus');if(label)label.textContent='Pause bei Fehler: '+(item.loss/100).toFixed(2).replace('.',',')+' Bauernpunkte Verlust. Versuch ihn erneut.'}
 },v551Prefs.autoplayMs);
}
function v551OpeningHistory(){try{const x=JSON.parse(localStorage.getItem(V551_OPENING)||'{}');return x&&typeof x==='object'?x:{}}catch(_){return {}}}
function v551OpeningRecord(id,kind){if(!id)return;const data=v551OpeningHistory(),r=data[id]||{mistakes:0,success:0};r[kind==='mistake'?'mistakes':'success']++;r.last=new Date().toISOString();data[id]=r;try{localStorage.setItem(V551_OPENING,JSON.stringify(data))}catch(_){} }
function v551OpeningCountError(){v551OpeningRecord(v538.line,'mistake')}
function v551OpeningCountSuccess(id){v551OpeningRecord(id,'success')}
function v551RecommendOpening(){const candidates=Object.keys(OPENINGS).filter(id=>OPENINGS[id].side===v537OpeningSide),history=v551OpeningHistory();return candidates.sort((a,b)=>((history[b]?.mistakes||0)*3-(history[b]?.success||0))-((history[a]?.mistakes||0)*3-(history[a]?.success||0)))[0]}
function v551OpeningInit(){const root=elem('v538OpeningPractice');if(!root||elem('v551OpeningRecommended'))return;
 const bar=document.createElement('div');bar.id='v551OpeningRecommended';bar.className='v551Simple';bar.innerHTML='<button type="button" id="v551OpeningStart">↻ Schwächste Eröffnung üben</button><small id="v551OpeningNote">Wiederholt besonders Varianten, bei denen du zuvor Fehler gemacht hast.</small>';root.append(bar);
 elem('v551OpeningStart').onclick=()=>{const id=v551RecommendOpening();if(!id)return;v537FilterOpenings(v537OpeningSide,id,true);elem('v551OpeningNote').textContent='Nächste Wiederholung: '+OPENINGS[id].name+' · ohne Timer.';};
}
function v551ArchiveMatches(g){const elo=String(g.elo||'');const opening=Array.isArray(g.san)?g.san[0]||'':'';
 return (v551Prefs.archiveElo==='alle'||elo===v551Prefs.archiveElo)&&(v551Prefs.archiveOpening==='alle'||(v551Prefs.archiveOpening==='e4'?/^e4\b/.test(opening):/^d4\b/.test(opening)));
}
function v551ArchiveInit(){const tools=elem('v536ArchiveTools');if(!tools||elem('v551ArchiveExtra'))return;
 const box=document.createElement('div');box.id='v551ArchiveExtra';box.className='v551ArchiveExtra';box.innerHTML='<label>Computerstärke <select id="v551ArchiveElo"><option value="alle">Alle</option></select></label><label>Erster Zug <select id="v551ArchiveOpening"><option value="alle">Alle</option><option value="e4">1. e4</option><option value="d4">1. d4</option></select></label>';
 tools.append(box);const sel=elem('v551ArchiveElo');for(const elo of [...new Set(v532GetArchive().map(x=>String(x.elo||'')).filter(Boolean))].sort((a,b)=>Number(a)-Number(b))){const opt=document.createElement('option');opt.value=elo;opt.textContent=elo+' Profil';sel.append(opt)}sel.value=v551Prefs.archiveElo;elem('v551ArchiveOpening').value=v551Prefs.archiveOpening;
 sel.onchange=e=>{v551Prefs.archiveElo=e.target.value;v551WritePrefs();v536ArchiveFilter()};elem('v551ArchiveOpening').onchange=e=>{v551Prefs.archiveOpening=e.target.value;v551WritePrefs();v536ArchiveFilter()};v536ArchiveFilter();
}
function v551ApplyAdaptiveOpponent(){if(!v551Prefs.adaptive||setup.mode!=='computer')return;
 const recent=(summaryStore.games||[]).filter(g=>g.mode==='computer').slice(0,8),played=recent.filter(g=>g.score==='1-0'||g.score==='0-1');if(played.length<3)return;
 const wins=played.filter(g=>(g.side==='w'&&g.score==='1-0')||(g.side==='b'&&g.score==='0-1')).length;const fraction=wins/played.length;
 const delta=fraction>=.7?100:fraction<=.3?-100:0;if(!delta)return;
 setup.elo=Math.max(400,Math.min(2800,Math.round((Number(setup.elo)+delta)/100)*100));
}
function v551AdaptiveInit(){const el=elem('eloField');if(!el||elem('v551Adaptive'))return;
 const label=document.createElement('label');label.id='v551Adaptive';label.className='v551Simple';label.innerHTML='<input type="checkbox" id="v551AdaptiveOn"> Computerstärke bei neuer Partie anpassen <small>(±100 nach den letzten Ergebnissen, max. 2800)</small>';el.append(label);
 elem('gameElo').step='100';elem('v551AdaptiveOn').checked=!!v551Prefs.adaptive;elem('v551AdaptiveOn').onchange=e=>{v551Prefs.adaptive=e.target.checked;v551WritePrefs()};
}
function v551CheckStorage(){const key='schach1001_v551_preupdate';try{if(localStorage.getItem(key))return;
 const b=v57Snapshot(),str=JSON.stringify(b.data),sum=v57Checksum(str),packed=JSON.stringify({at:new Date().toISOString(),checksum:sum,data:b.data});localStorage.setItem(key,packed);
 const parsed=JSON.parse(localStorage.getItem(key));if(v57Checksum(JSON.stringify(parsed.data))!==sum)throw Error('Backup-Prüfsumme');}catch(e){try{localStorage.removeItem(key)}catch(_){}}}
function v551Init(){v551CheckStorage();v551AdaptiveInit();v551OpeningInit();v551ArchiveInit();
 const old=v532RenderArchive;v532RenderArchive=function(){old();v551ArchiveInit()};
 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{},{v551Prefs:()=>({...v551Prefs}),v551OpeningHistory,v551ArchiveMatches,v551Critical:()=>v551AnalysisItems().filter(x=>x.loss>=85),v551StartAutoplay,v551StopAutoplay,v551ReviewControls});
}

/* Schach 1001+ Pro V5.53: additive upgrades; V5.50 sizing/navigation intentionally untouched. */
const V553_KEY='schach1001_v553_preferences';
let v553Prefs={pieces:'premium',board:'turnier',turbo:false,autoReview:true,opponentThink:'normal'};
try{const saved=JSON.parse(localStorage.getItem(V553_KEY)||'{}');if(saved&&typeof saved==='object')Object.assign(v553Prefs,saved)}catch(_){}
const v553Save=()=>{try{localStorage.setItem(V553_KEY,JSON.stringify(v553Prefs))}catch(_){}};
const v553PieceNames=new Set(['wK','wQ','wR','wB','wN','wP','bK','bQ','bR','bB','bN','bP']);
let v553PieceObserver=null;
function v553StylePieces(node=document){
 const nodes=[];
 if(node.nodeType===1&&node.matches?.('img[src*="theme_pieces/"],img[src*="pieces/"]'))nodes.push(node);
 if(node.querySelectorAll)nodes.push(...node.querySelectorAll('img[src*="theme_pieces/"],img[src*="pieces/"]'));
 for(const img of nodes){const match=(img.getAttribute('src')||'').match(/(?:theme_pieces|pieces)\/(w[KNBRQP]|b[KNBRQP])\.(?:svg|png)(?:\?.*)?$/);if(!match||!v553PieceNames.has(match[1]))continue;
  const expected=v553Prefs.pieces==='klassisch'?'./pieces/'+match[1]+'.svg':'./theme_pieces/'+match[1]+'.png';
  if(img.getAttribute('src')!==expected)img.setAttribute('src',expected);
 }
}
function v553ApplyLook(){
 document.body.classList.remove('v536BoardBlue','v536BoardWood','v553BoardTurnier','v553BoardMarmor','v553BoardNacht','v553BoardHolz','v553PiecesPremium','v553PiecesKontrast','v553PiecesClassic');
 const board={turnier:'v553BoardTurnier',marmor:'v553BoardMarmor',nacht:'v553BoardNacht',holz:'v553BoardHolz'}[v553Prefs.board]||'v553BoardTurnier';
 const pieces={premium:'v553PiecesPremium',kontrast:'v553PiecesKontrast',klassisch:'v553PiecesClassic'}[v553Prefs.pieces]||'v553PiecesPremium';
 document.body.classList.add(board,pieces);v553StylePieces();
}
function v553ScorePoints(){return v551AnalysisItems().filter(x=>Number.isFinite(x.after)&&Number.isInteger(x.i)).sort((a,b)=>a.i-b.i)}
function v553RenderChart(){
 const stage=elem('v553Chart');if(!stage)return;
 const rows=v553ScorePoints();stage.replaceChildren();
 const notice=elem('v553ChartNote');if(notice)notice.textContent=rows.length?'Tippe auf einen Punkt für Stellung, Bewertung und Coach-Erklärung. '+rows.length+' ausgewertete Halbzüge.':'Noch keine vollständige Stockfish-Auswertung. Analyse starten oder fortsetzen.';
 if(!rows.length)return;
 const w=520,h=118,p=15,n=rows.length,evalY=cp=>h/2-47*Math.tanh(cp/390);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.setAttribute('role','img');svg.setAttribute('aria-label','Interaktives Bewertungsdiagramm. Grün für starke Züge, Gelb für Ungenauigkeiten, Rot für Fehler.');
 const ns='http://www.w3.org/2000/svg',mk=(name,attributes)=>{const e=document.createElementNS(ns,name);Object.entries(attributes).forEach(([k,v])=>e.setAttribute(k,String(v)));return e};
 svg.append(mk('rect',{x:0,y:0,width:w,height:h,fill:'#263329',rx:8}),mk('line',{x1:p,y1:h/2,x2:w-p,y2:h/2,stroke:'#b1bcaa','stroke-width':1,'stroke-dasharray':'4 4'}));
 const pts=rows.map((r,i)=>({x:p+(n===1?.5:i/(n-1))*(w-2*p),y:evalY(r.after),item:r}));
 svg.append(mk('polyline',{fill:'none',stroke:'#e6efe3','stroke-width':2.2,'stroke-linejoin':'round',points:pts.map(t=>t.x.toFixed(2)+','+t.y.toFixed(2)).join(' ')}));
 for(const {x,y,item} of pts){const color=item.loss>=300?'#ef655f':item.loss>=170?'#efa15b':item.loss>=85?'#e2cd62':'#9cdc7a';const dot=mk('circle',{cx:x,cy:y,r:Math.max(4,Math.min(8,220/n)),fill:color,stroke:'#183021','stroke-width':.9,tabindex:0,role:'button','aria-label':'Halbzug '+(item.i+1)+' – '+v547Grade(item.loss,item.kind==='Best').de});
  dot.addEventListener('click',()=>{v551StopAutoplay();v529PickRecord(item.i);v553RenderChart();});dot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();dot.dispatchEvent(new Event('click'))}});svg.append(dot);
  if(v529.index===item.i)svg.append(mk('circle',{cx:x,cy:y,r:9,fill:'none',stroke:'#fff','stroke-width':2,'pointer-events':'none'}));
 }
 stage.append(svg);
}
function v553ExplainMove(i){
 const label=elem('v553CoachText');if(!label)return;
 const item=v551AnalysisItems().find(x=>x.i===i),r=v539Records()[i];
 if(!r){label.textContent='Wähle einen Zug aus der Originalpartie.';return;}
 if(!item){label.textContent='Zug '+(i+1)+' ('+deSan(r.san||r.uci)+'): noch nicht von Stockfish bewertet. Starte die vollständige Partieanalyse.';return;}
 const grade=v547Grade(item.loss,item.kind==='Best'),side=item.side==='w'?'Weiß':'Schwarz',from=Number.isFinite(item.before)?fmtEval(item.before):'–',to=Number.isFinite(item.after)?fmtEval(item.after):'–';
 let why='Die Engine bevorzugt diesen Zug in der untersuchten Stellung.';
 if(item.loss>=170)why='Der Zug verschlechtert die Stellung spürbar. Prüfe beim erneuten Versuch zuerst Schachgebote, Schlagzüge und direkte Drohungen.';
 else if(item.loss>=85)why='Es gab eine präzisere Fortsetzung. Überlege, welche Figuren ungedeckt stehen und wie du den gegnerischen Plan verhinderst.';
 else if(item.loss>=35)why='Der Zug ist spielbar, verschenkt aber einen kleinen Teil des Stellungsvorteils.';
 else if(item.loss>0)why='Du hast die Stellung weitgehend erhalten.';
 let tactical='';try{tactical=v551TacticalConsequences(r)}catch(_){}
 label.textContent=side+' · '+deSan(r.san||r.uci)+' · '+grade.de+'. Bewertungsverlust ca. '+(item.loss/100).toFixed(2).replace('.',',')+' Bauern. Vorher '+from+', danach '+to+'. '+why+tactical;
}
function v553ReviewExtras(){
 const panel=elem('v551ReviewExtras');if(!panel)return;
 if(!elem('v553ChartPanel')){
  const sec=document.createElement('section');sec.id='v553ChartPanel';sec.className='v553Addon';
  sec.innerHTML='<strong>📈 Interaktive Analyse-Grafik</strong><p id="v553ChartNote">Bewertungsverlauf laden …</p><div id="v553Chart" class="v553Chart" aria-label="Bewertungsdiagramm"></div><div id="v553CoachText" role="status" class="v553CoachText">Wähle einen analysierten Zug.</div><div class="v553Quick"><button id="v553ReviewHint" type="button">💡 Erst Figur, dann Zug</button><button id="v553ReviewRetry" type="button">↶ Fehler korrigieren</button></div>';
  panel.append(sec);
  elem('v553ReviewHint').onclick=()=>v529Hint();
  elem('v553ReviewRetry').onclick=()=>{const row=v551AnalysisItems().find(x=>x.i===v529.index);if(!row||row.loss<85){elem('v553CoachText').textContent='Für diese Stellung wurde kein relevanter Fehler gemessen. Wähle einen Fehler im Diagramm.';return}v551StopAutoplay();v529TryBefore();elem('v553CoachText').textContent='Spiele eine bessere Fortsetzung. Bei Tipp zuerst die Figur, danach den grünen Zugpfeil.';};
 }
 if(!elem('v553TurboRow')){
  const row=document.createElement('div');row.id='v553TurboRow';row.className='v553Quick';row.innerHTML='<label class="v553Label"><input id="v553Turbo" type="checkbox"> Stockfish-Turbo (Tiefe 20, höherer Akkuverbrauch)</label><button id="v553Again" type="button">↻ Neu analysieren</button>';
  panel.append(row);elem('v553Turbo').checked=v553Prefs.turbo;
  elem('v553Turbo').onchange=e=>{v553Prefs.turbo=e.target.checked;v553Save();v551Prefs.depth=e.target.checked?20:12;v551WritePrefs();elem('v551Depth').value=String(v551Prefs.depth);};
  elem('v553Again').onclick=()=>{if(!v547Current){elem('v553CoachText').textContent='Wähle zunächst eine archivierte Partie.';return}v547Current.items=null;v551ClearPartial(v547Current);v547RunReview();};
  const depth=elem('v551Depth');if(depth&&!depth.querySelector('option[value="20"]')){const opt=document.createElement('option');opt.value='20';opt.textContent='20 · Turbo / Akku';depth.append(opt)};if(depth)depth.value=String(v551Prefs.depth);
 }
 v553RenderChart();v553ExplainMove(v529.index);
}
function v553TrainingCard(){
 const root=elem('statsContent');if(!root||elem('v553TrainingCard'))return;
 const card=document.createElement('section');card.id='v553TrainingCard';card.className='card v553Addon';
 card.innerHTML='<strong>♟ Mein Trainingsfokus</strong><p id="v553TrainingSummary"></p><div class="v553Quick"><button id="v553TrainError" type="button">Fehler nochmals lösen</button><button id="v553TrainOpening" type="button">Schwächste Eröffnung üben</button></div><p id="v553TrainingMessage" aria-live="polite"></p><details><summary>🎨 Grafik & Brettdesign</summary><div class="v553Form"><label>Figuren <select id="v553Pieces"><option value="premium">Premium (klar & plastisch)</option><option value="klassisch">Klassisch (2D)</option><option value="kontrast">Hoher Kontrast</option></select></label><label>Brett <select id="v553Board"><option value="turnier">Turniergrün</option><option value="holz">Holz</option><option value="marmor">Marmor</option><option value="nacht">Premium Nacht</option></select></label></div></details><div class="v553Quick"><button id="v553Backup" type="button">🛡 Backup exportieren</button><button id="v553Verify" type="button">✓ Daten überprüfen</button></div><p id="v553SafeStatus" aria-live="polite"></p>';
 root.prepend(card);
 const errors=v521Errors();let history=v551OpeningHistory();const trials=Object.values(history).reduce((a,x)=>a+(x.mistakes||0),0);
 elem('v553TrainingSummary').textContent=errors.length+' gespeicherte eigene Fehler · '+trials+' Eröffnungsfehler · '+v532GetArchive().length+' archivierte Partien. Wiederhole zuerst den unsichersten Bereich.';
 elem('v553TrainError').onclick=()=>{if(!errors.length){elem('v553TrainingMessage').textContent='Noch keine gespeicherten Fehler. Analysiere zuerst eine Partie.';return}elem('navTraining')?.click();v57OpenReplay(errors[0]);elem('v553TrainingMessage').textContent='Fehlertraining geöffnet.';};
 elem('v553TrainOpening').onclick=()=>{const id=v551RecommendOpening();if(!id){elem('v553TrainingMessage').textContent='Keine Eröffnungsvariante vorhanden.';return}elem('navTraining')?.click();v537FilterOpenings(v537OpeningSide,id,true)};
 elem('v553Pieces').value=v553Prefs.pieces;elem('v553Board').value=v553Prefs.board;
 elem('v553Pieces').onchange=e=>{v553Prefs.pieces=e.target.value;v553Save();v553ApplyLook()};
 elem('v553Board').onchange=e=>{v553Prefs.board=e.target.value;v553Save();v553ApplyLook()};
 elem('v553Backup').onclick=()=>v57ExportBackup();
 elem('v553Verify').onclick=()=>{try{const snapshot=v57Snapshot(),keys=Object.keys(snapshot.data),arch=v532GetArchive();const bad=arch.filter(g=>Array.isArray(g.uci)&&g.uci.some(x=>typeof x!=='string')).length;elem('v553SafeStatus').textContent='Speicherprüfung: '+keys.length+' Datensätze, '+arch.length+' archivierte Partien, '+bad+' offensichtliche Zugformatfehler. Exportiere regelmäßig dein Backup.';}catch(e){elem('v553SafeStatus').textContent='Datenprüfung nicht möglich: '+e.message}};
}
function v553OpeningStats(){
 const el=elem('v551OpeningRecommended');if(!el)return;
 let note=elem('v553OpeningStats');if(!note){note=document.createElement('p');note.id='v553OpeningStats';note.className='v553OpeningStats';el.append(note)}
 const h=v551OpeningHistory(),ids=Object.keys(OPENINGS).filter(k=>OPENINGS[k].side===v537OpeningSide);
 const wins=ids.reduce((n,k)=>n+(h[k]?.success||0),0),miss=ids.reduce((n,k)=>n+(h[k]?.mistakes||0),0),weak=ids.filter(k=>(h[k]?.mistakes||0)>(h[k]?.success||0));
 note.textContent=(v537OpeningSide==='w'?'Weiße':'Schwarze')+' Eröffnungen: '+ids.length+' Varianten · '+wins+' erfolgreiche Übungen · '+miss+' Fehlversuche · '+weak.length+' besonders wiederholungsbedürftig.';
}
function v553OpponentControls(){
 const field=elem('eloField');if(!field||elem('v553ThinkBox'))return;
 const wrap=document.createElement('label');wrap.id='v553ThinkBox';wrap.className='v553Opponent';
 wrap.innerHTML='Stockfish-Bedenkzeit ab Profil 2000 <select id="v553Think"><option value="kurz">Kurz · schneller</option><option value="normal">Normal</option><option value="gruendlich">Gründlich · stärkere Suche</option></select><small>Verwendet echte Engine-Suchtiefe und Rechenzeit. Angezeigte Elo-Profile sind nicht offiziell gemessen.</small>';
 field.append(wrap);elem('v553Think').value=v553Prefs.opponentThink;
 elem('v553Think').onchange=e=>{v553Prefs.opponentThink=e.target.value;v553Save()};
}
function v553Init(){
 v553ApplyLook();v553TrainingCard();v553OpponentControls();v553OpeningStats();
 const planBefore=v532EnginePlan;
 v532EnginePlan=function(elo,remainingMs){const plan=planBefore(elo,remainingMs);if(!plan)return plan;
  const multiplier=v553Prefs.opponentThink==='gruendlich'?1.45:v553Prefs.opponentThink==='kurz'?.65:1;
  const bound=Number.isFinite(remainingMs)&&remainingMs>0?Math.max(250,Math.floor(remainingMs/18)):15000;
  return {...plan,depth:Math.min(22,Math.max(10,plan.depth+(v553Prefs.opponentThink==='gruendlich'?1:0))),movetime:Math.min(15000,bound,Math.max(250,Math.round(plan.movetime*multiplier)))};
 };
 const updateOpenings=v537FilterOpenings;v537FilterOpenings=function(...args){const out=updateOpenings(...args);v553OpeningStats();return out};
 const originalStats=renderProfile;renderProfile=function(){originalStats();v553TrainingCard()};
 // Separate cosmetics from game state; the observer only changes presentation assets.
 if(!v553PieceObserver&&window.MutationObserver){v553PieceObserver=new MutationObserver(changes=>{for(const x of changes){if(x.type==='childList'){for(const n of x.addedNodes)v553StylePieces(n);}else if(x.type==='attributes')v553StylePieces(x.target)}});v553PieceObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});}
 const previousControls=v551ReviewControls;v551ReviewControls=function(){previousControls();v553ReviewExtras()};
 const previousPick=v529PickRecord;v529PickRecord=function(i){previousPick(i);v553RenderChart();v553ExplainMove(i)};
 const previousOpen=v547ShowEnd;v547ShowEnd=function(){previousOpen();const content=elem('v547Content');if(!content||content.querySelector('#v553AfterMatch'))return;const note=document.createElement('p');note.id='v553AfterMatch';note.className='v553Postgame';note.textContent='Die Review wird nach jeder beendeten Partie mit Stockfish berechnet. Genauigkeit und Zugurteile erst nach abgeschlossener Auswertung ansehen.';content.append(note)};
 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{},{v553Prefs:()=>({...v553Prefs}),v553RenderChart,v553StylePieces,v553ReviewExtras,v553OpenReview:()=>v550OpenReview(),v553Verify:()=>elem('v553Verify')?.click()});
}
const v553PreviousInit=v551Init;
v551Init=function(){v553PreviousInit();v553Init()};


/* V5.55: Separate all match preferences from a scroll-locked chessboard screen. */
let v555Phase='setup',v555Inited=false,v555CurrentMode='computer',v555SelectedSide='w';
function v555OnPage(page){
 if(!v555Inited)return;
 const setupView=elem('v555Setup');
 if(page!=='game'){
  document.body.classList.remove('v555Setup','v555Playing');if(setupView)setupView.hidden=true;
  return;
 }
 if(v555Phase==='play'){
  document.body.classList.add('v555Playing');document.body.classList.remove('v555Setup');setupView.hidden=true;
 }else{
  document.body.classList.add('v555Setup');document.body.classList.remove('v555Playing');setupView.hidden=false;v555SyncSetup();
 }
}
function v555SyncSetup(){
 const mode=elem('v555Mode'),time=elem('v555Time'),side=elem('v555Side');if(!mode)return;
 mode.value=v555CurrentMode;time.value=setup.time in TIME_CONTROLS?setup.time:'r10';
 elem('v555Strength').value=String(setup.elo);
 elem('v555Pieces').value=v553Prefs.pieces;elem('v555Board').value=v553Prefs.board;
 const single=v555CurrentMode==='computer'||v555CurrentMode==='coach';
 const online=v555CurrentMode==='online';
 elem('v555StrengthField').hidden=!single;elem('v555EngineField').hidden=!single;
 elem('v559OnlineProfile').hidden=!online;
 elem('v559OnlineRating').hidden=!online;
 elem('v559OnlineType').hidden=!online;
 elem('v559ColourField').hidden=online;
 elem('v555Pieces').closest('label').hidden=online;
 elem('v555Time').closest('.v555SelectLine').hidden=online;
 document.querySelectorAll('#v555Setup [data-v555side]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v555side===v555SelectedSide)));
 const variant=elem('v558Variant')?.value||'standard';
 const onlyOnline=false; // All local variants launch through variant-offline.html in V5.62
 elem('v555SetNote').textContent=online
 ?'Deine Einstellungen sind übernommen. Suche einen Gegner oder erstelle eine private Partie mit QR-Code bzw. Einladungslink. Rating nur mit ausdrücklicher Auswahl.'
 :variant!=='standard'?'Diese Variante läuft vollständig offline. Gegen Bot, Coach und zwei Personen an einem Handy möglich; Analyse auf Variantenregeln abgestimmt.'
 :v555CurrentMode==='free'?'Zwei Personen spielen abwechselnd am selben Gerät.'
 :v555CurrentMode==='coach'?'Offline gegen Stockfish mit Trainer – ohne Internet.'
 :'Offline gegen Stockfish: wähle die Stärke und starte direkt auf dem lokalen Schachbrett.';
 const startBtn=elem('v555SetStart');
 startBtn.textContent=online?'🌐 Online-Partie öffnen':variant!=='standard'?'▶ Offline-Variante starten':'▶ Offline-Partie starten';
 startBtn.disabled=onlyOnline;
 const resume=elem('v555Resume');resume.classList.toggle('v555CanResume',record.length>0&&!gameResult);
 document.querySelectorAll('#v555Setup [data-v555mode]').forEach(b=>b.classList.toggle('v555Selected',b.dataset.v555mode===v555CurrentMode));
}
function v555GoSetup(){if(clock.started&&!gameResult)updateClock();v555Phase='setup';v555OnPage('game')}
function v555EnterPlay(){
 v555Phase='play';document.body.dataset.v555Side=setup.mode==='free'?'w':setup.side;
 elem('gameClockW').querySelector('span').textContent=setup.mode==='free'?'○ Weiß':(setup.side==='w'?'○ Du · Weiß':'○ Gegner · Weiß');
 elem('gameClockB').querySelector('span').textContent=setup.mode==='free'?'● Schwarz':(setup.side==='b'?'● Du · Schwarz':'● Gegner · Schwarz');
 if(clock.started&&!gameResult)clock.lastAt=Date.now();
 v555OnPage('game');boardRenderKey='';render();
}
function v559OpenOnline(){
 const variant=elem('v558Variant')?.value||'standard';
 const name=elem('v559OnlineName').value.trim().slice(0,32)||'Spieler';
 localStorage.setItem('schach1001_online_name',name);
 const rated=elem('v559Rated').checked;
 const type=variant==='simul'&&elem('v559MatchType').value==='quick'?'private':elem('v559MatchType').value;
 const board=elem('v555Board').value;
 const query=new URLSearchParams({fromapp:'1',mode:variant,name,rated:rated?'1':'0',match:type,board:board==='nacht'||board==='metal'?'gold-metal':'classic'});
 location.href='online.html?'+query.toString();
}
function v555Start(){
 const mode=elem('v555Mode').value;
 const variant=elem('v558Variant')?.value||'standard';
 if(mode==='online'){v559OpenOnline();return;}
 if(variant!=='standard'){
  // v5.60: local variant rules, coaching and analysis; never jump to online.
  const query=new URLSearchParams({mode:variant,enemy:mode==='free'?'free':mode==='coach'?'coach':'computer',
    elo:String(Number(elem('v555Strength').value)||1000),
    time:elem('v555Time').value,side:v555SelectedSide==='random'?(Math.random()<.5?'w':'b'):v555SelectedSide,
    coach:mode==='coach'?'1':'0',board:elem('v555Board').value});
  // Navigate only to the local, APK-bundled variant board. Never redirect to online.
  const destination='variant-offline.html?'+query.toString();
  const btn=elem('v555SetStart');
  if(btn){btn.disabled=true;btn.textContent='♟ Offline-Partie wird geöffnet …';}
  window.location.assign(destination);
  return;
 }
 setup.mode=mode==='free'?'free':'computer';setup.elo=Number(elem('v555Strength').value);
 setup.time=elem('v555Time').value;setup.engine='stockfish';
 setup.side=v555SelectedSide==='random'?(Math.random()<.5?'w':'b'):v555SelectedSide;
 flip=false;
 v553Prefs.pieces=elem('v555Pieces').value;v553Prefs.board=elem('v555Board').value;v553Save();v553ApplyLook();
 setCoachVisibility(mode==='coach');
 gameNew();v555EnterPlay();
}
function v555Init(goPage){
 if(v555Inited)return;v555Inited=true;
 const modal=document.createElement('section');modal.id='v555Setup';modal.hidden=true;
 modal.innerHTML=`<div class="v555SetInner"><header class="v555SetHead"><button class="v555Back" id="v555Back" type="button" aria-label="Zur Startseite">‹</button><strong>♟ Neue Partie <span class="v562Version">V5.64</span></strong></header>
 <div class="v555SelectLine"><span>⚡</span><label>Zeitkontrolle<select id="v555Time" aria-label="Zeitkontrolle"></select></label></div>
 <div class="v555Cards" hidden style="display:none!important" aria-hidden="true">
  <button type="button" class="v555Card v555Primary" id="v555Quick"><span>▶</span><span><b>Starten</b><small>Neue Partie mit gewählten Einstellungen</small></span><span class="v555Chevron">›</span></button>
  <button type="button" class="v555Card" id="v555Tournaments"><span>🏆</span><span><b>Turniere</b><small>Online-Turniere sind noch nicht angebunden</small></span><span class="v555Chevron">›</span></button>
  <button type="button" class="v555Card" data-v555mode="free"><span>👥</span><span><b>Gegen Freund spielen</b><small>Zwei Personen am selben Handy</small></span><span class="v555Chevron">›</span></button>
  <button type="button" class="v555Card" data-v555mode="computer"><span>🤖</span><span><b>Gegen Bots spielen</b><small>Offline-Gegner mit wählbarer Stärke</small></span><span class="v555Chevron">›</span></button>
  <button type="button" class="v555Card" data-v555mode="coach"><span>🧠</span><span><b>Coach spielen</b><small>Gegen Computer mit Trainer</small></span><span class="v555Chevron">›</span></button>
 </div>
 <details class="v555Options" id="v555Options" open><summary>⚙ Benutzerdefiniertes Spiel</summary>
  <button type="button" id="v558OnlineMenu" hidden style="display:none" class="v558OnlineMenu">🌐 Online spielen <small>Gegner suchen · Freunde einladen · QR-Code</small></button>
  <div class="v555OptionGrid">
  <label>Gegner<select id="v555Mode"><option value="computer">Computer (offline)</option><option value="free">Freund am Handy</option><option value="coach">Computer + Coach</option><option value="online">Online – Spieler suchen / Freund einladen</option></select></label>
  <label>Spielmodus <span class="v562Hint">15 Modi · offline spielbar</span><select id="v558Variant" aria-label="Schach-Spielmodus"><option value="standard">Klassisches Schach</option><option value="chess960">Schach960</option><option value="kingofthehill">King of the Hill</option><option value="threecheck">Three-Check</option><option value="antichess">Räuberschach / Antichess</option><option value="atomic">Atomschach</option><option value="horde">Horde</option><option value="racingkings">Racing Kings</option><option value="crazyhouse">Crazyhouse</option><option value="simul">Simultanschach</option><option value="blind1">Blindschach 1 – Leicht</option><option value="blind2">Blindschach 2 – Mittel</option><option value="blind3">Blindschach 3 – Schwer</option><option value="blind4">Blindschach 4 – Experte</option><option value="blind5">Blindschach 5 – Meister</option></select></label>
  <label class="v555Full" id="v559OnlineProfile" hidden>Dein Spielername<input id="v559OnlineName" maxlength="32" autocomplete="nickname" placeholder="Spielername"></label>
  <label id="v559OnlineType" hidden>Online-Partie<select id="v559MatchType"><option value="quick">Gegner suchen</option><option value="private">Privat – Freund einladen</option><option value="join">Code / QR beitreten</option></select></label>
  <label id="v559OnlineRating" hidden>Glicko-2 Rating <span class="v559RatingChoice"><input type="checkbox" id="v559Rated"> Gewertete Partie</span></label>
  <label id="v555StrengthField">Computerstärke<select id="v555Strength"><option value="400">Einsteiger · 400</option><option value="800">Leicht · 800</option><option value="1000">Standard · 1000</option><option value="1200">Mittel · 1200</option><option value="1600">Schwer · 1600</option><option value="2000">Experte · 2000</option><option value="2400">Meister · 2400</option><option value="2800">Elite · 2800</option></select></label>
  <label class="v555Full" id="v555EngineField">Engine <span>Stockfish 19 Lite · vollständig offline</span></label>
  <div class="v555Full"><div style="font-size:12px;margin-bottom:7px;color:#d1e1d0;font-weight:800">Ich spiele als</div><div class="v555SideRow"><button type="button" class="v555Choice" data-v555side="w">♔ Weiß</button><button type="button" class="v555Choice" data-v555side="random">⚄ Zufall</button><button type="button" class="v555Choice" data-v555side="b">♚ Schwarz</button></div></div>
  <label>Brettdesign<select id="v555Board"><option value="turnier">Turniergrün</option><option value="holz">Holz</option><option value="marmor">Marmor</option><option value="nacht">Premium Nacht</option></select></label>
  <label>Figurenstil<select id="v555Pieces"><option value="premium">Premium</option><option value="klassisch">Klassisch</option><option value="kontrast">Kontrast</option></select></label>
 </div><div id="v555SetNote" class="v555Info"></div><button type="button" id="v555SetStart">▶ Partie starten</button></details>
 <button type="button" class="v555Card" id="v555Local" hidden style="display:none;width:100%;margin-top:11px;text-align:left;padding:14px"><span>♟</span><span><b>Am Brett spielen</b><small>Offline zu zweit am Gerät</small></span><span class="v555Chevron">›</span></button>
 <button type="button" id="v555Resume">↪ Laufende Partie fortsetzen</button>
 </div>`;
 document.body.append(modal);
 const time=elem('v555Time');
 const items=['none','b1','b11','b21','b3','b32','b5','b52','r10','r105','r1510','r20','r30','r60','d1'];
 for(const id of items){if(!TIME_CONTROLS[id])continue;const o=document.createElement('option');o.value=id;o.textContent=TIME_CONTROLS[id].title;time.append(o)}
 const game=elem('gameContent'),header=document.createElement('div');header.id='v555PlayHeader';header.innerHTML='<button type="button" id="v555PlayBack" aria-label="Zur Partieauswahl">‹</button><strong>♟ Schach 1001+ Pro</strong>';game.prepend(header);
 const actions=document.createElement('div');actions.id='v555PlayActions';actions.innerHTML='<button type="button" id="v555Undo"><span>↶</span>Zug zurücknehmen</button><button type="button" id="v555Resign"><span>⚑</span>Aufgeben</button><button type="button" id="v555Draw"><span>♧</span>Remis anbieten</button>';
 elem('gameBoard').closest('.gameBoardPanel').append(actions);
 elem('v555Back').onclick=()=>goPage('home');elem('v555PlayBack').onclick=v555GoSetup;
 elem('v555Quick').onclick=v555Start;elem('v555SetStart').onclick=v555Start;
 window.addEventListener('pageshow',()=>{const btn=elem('v555SetStart');if(btn&&btn.disabled){btn.disabled=false;v555SyncSetup();}});
 elem('v555Resume').onclick=v555EnterPlay;
 elem('v555Local').onclick=()=>{v555CurrentMode='free';v555SyncSetup();elem('v555Options').open=true;elem('v555Options').scrollIntoView({block:'nearest'})};
 elem('v555Tournaments').onclick=()=>{v555CurrentMode='online';v555SyncSetup();v559OpenOnline()};
 elem('v558OnlineMenu').onclick=()=>{v555CurrentMode='online';v555SyncSetup();elem('v555Options').open=true;elem('v559OnlineProfile').scrollIntoView({block:'nearest',behavior:'smooth'});};
 elem('v559OnlineName').value=localStorage.getItem('schach1001_online_name')||'Spieler';
 elem('v559OnlineName').oninput=()=>localStorage.setItem('schach1001_online_name',elem('v559OnlineName').value.slice(0,32));
 elem('v559Rated').onchange=()=>localStorage.setItem('schach1001_online_rated',elem('v559Rated').checked?'1':'0');
 elem('v559Rated').checked=localStorage.getItem('schach1001_online_rated')==='1';
 elem('v559MatchType').onchange=()=>localStorage.setItem('schach1001_online_match',elem('v559MatchType').value);
 if(['quick','private','join'].includes(localStorage.getItem('schach1001_online_match')))elem('v559MatchType').value=localStorage.getItem('schach1001_online_match');
 const variantPicker=elem('v558Variant');
 const variantSaved=localStorage.getItem('schach1001_custom_variant_v558')||'standard';
 if([...variantPicker.options].some(o=>o.value===variantSaved))variantPicker.value=variantSaved;
 variantPicker.onchange=()=>{localStorage.setItem('schach1001_custom_variant_v558',variantPicker.value);v555SyncSetup()};
 elem('v555Mode').onchange=e=>{v555CurrentMode=e.target.value;v555SyncSetup()};
 modal.querySelectorAll('[data-v555mode]').forEach(b=>b.onclick=()=>{v555CurrentMode=b.dataset.v555mode;
  v555SyncSetup();elem('v555Options').open=true;elem('v555Options').scrollIntoView({block:'nearest',behavior:'instant'})});
 modal.querySelectorAll('[data-v555side]').forEach(b=>b.onclick=()=>{v555SelectedSide=b.dataset.v555side;v555SyncSetup()});
 time.onchange=()=>{setup.time=time.value;refreshTimePicker();persist()};
 elem('v555Undo').onclick=()=>elem('gameUndo')?.click();elem('v555Resign').onclick=()=>elem('gameResign')?.click();elem('v555Draw').onclick=()=>elem('gameOffer')?.click();
 window.ChessAnalysisQA=Object.assign(window.ChessAnalysisQA||{}, {v555OpenSetup:v555GoSetup,v555Start,v555EnterPlay,v555Phase:()=>v555Phase});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

