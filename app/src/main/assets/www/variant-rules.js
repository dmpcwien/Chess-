/* Schach Pro: self-contained chess variant rule engine. Offline; no network needed.
 * Includes local legal move generation for Standard, Chess960, KOTH, Three-check,
 * Antichess, Atomic, Horde, Racing Kings, Crazyhouse, Simul and Blindfold stages.
 */
(function(global){'use strict';
 const names={standard:'Klassisches Schach',chess960:'Schach960',kingofthehill:'King of the Hill',threecheck:'Three-Check',antichess:'Räuberschach',atomic:'Atomschach',horde:'Horde',racingkings:'Racing Kings',crazyhouse:'Crazyhouse',simul:'Simultanschach',blind1:'Blindschach 1',blind2:'Blindschach 2',blind3:'Blindschach 3',blind4:'Blindschach 4',blind5:'Blindschach 5'};
 const values={p:100,n:320,b:335,r:500,q:900,k:20000};
 const start='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
 const row=i=>Math.floor(i/8),file=i=>i%8,ix=(f,r)=>r*8+f,valid=(f,r)=>f>=0&&f<8&&r>=0&&r<8;
 const sq=i=>'abcdefgh'[file(i)]+(8-row(i)), fromSq=s=>/^[a-h][1-8]$/.test(s)?ix('abcdefgh'.indexOf(s[0]),8-Number(s[1])):-1;
 const side=p=>p===p.toUpperCase()?'w':'b',opp=c=>c==='w'?'b':'w',of=(p,c)=>p&&side(p)===c;
 const within=(a,b)=>Math.max(Math.abs(file(a)-file(b)),Math.abs(row(a)-row(b)))<=1;
 function clone(s){return {...s,b:s.b.slice(),promoted:s.promoted.slice(),pockets:{w:{...s.pockets.w},b:{...s.pockets.b}},castle:{w:{...s.castle.w},b:{...s.castle.b}},checks:{...s.checks},history:undefined};}
 function parseBoard(fen){const out=[];for(const rank of fen.split('/')){for(const ch of rank){if(/[1-8]/.test(ch))for(let i=0;i<Number(ch);i++)out.push(null);else if(/[PNBRQKpnbrqk]/.test(ch))out.push(ch);else throw Error('Ungültiges Schachfeld');}}if(out.length!==64)throw Error('Falsche Brettgröße');return out}
 function random960(){const xs=Array(8).fill(null);let choices=[0,2,4,6],p=choices[Math.floor(Math.random()*choices.length)];xs[p]='B';choices=[1,3,5,7];xs[choices[Math.floor(Math.random()*choices.length)]]='B';let open=xs.map((v,i)=>v?null:i).filter(v=>v!==null);p=open.splice(Math.floor(Math.random()*open.length),1)[0];xs[p]='Q';for(let t=0;t<2;t++){open=xs.map((v,i)=>v?null:i).filter(v=>v!==null);p=open.splice(Math.floor(Math.random()*open.length),1)[0];xs[p]='N'}open=xs.map((v,i)=>v?null:i).filter(v=>v!==null).sort((a,b)=>a-b);xs[open[0]]='R';xs[open[1]]='K';xs[open[2]]='R';return xs.join('')}
 function create(mode='standard'){
 if(!Object.hasOwn(names,mode))throw Error('Unbekannter Modus '+mode);
 let setup=start,castle={w:{k:63,q:56},b:{k:7,q:0}},back='RNBQKBNR';
 if(mode==='chess960'){back=random960();setup=back.toLowerCase()+'/pppppppp/8/8/8/8/PPPPPPPP/'+back;let ks=back.indexOf('K'),rooks=[...back].flatMap((p,i)=>p==='R'?[i]:[]);castle={w:{k:56+rooks.find(i=>i>ks),q:56+rooks.find(i=>i<ks)},b:{k:rooks.find(i=>i>ks),q:rooks.find(i=>i<ks)}};}
 if(mode==='horde')setup='rnbqkbnr/pppppppp/8/2PPPP2/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP';
 if(mode==='racingkings')setup='8/8/8/8/8/8/krbnNBRK/qrbnNBRQ';
 const s={b:parseBoard(setup),turn:'w',variant:mode,ep:-1,half:0,full:1,checks:{w:0,b:0},pockets:{w:{p:0,n:0,b:0,r:0,q:0},b:{p:0,n:0,b:0,r:0,q:0}},promoted:Array(64).fill(false),castle};
 if(['antichess','racingkings','horde','atomic'].includes(mode)){if(mode==='horde'){s.castle.w={k:null,q:null}}else if(mode==='atomic'){}else s.castle={w:{k:null,q:null},b:{k:null,q:null}}}
 return s;
 }
 function kingAt(s,c){return s.b.indexOf(c==='w'?'K':'k')}
 function attacked(s,target,by){if(target<0)return false;const x=file(target),y=row(target),b=s.b;
  const py=y+(by==='w'?1:-1);for(const dx of [-1,1])if(valid(x+dx,py)&&b[ix(x+dx,py)]===(by==='w'?'P':'p'))return true;
  for(const [dx,dy] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]])if(valid(x+dx,y+dy)&&of(b[ix(x+dx,y+dy)],by)&&b[ix(x+dx,y+dy)].toLowerCase()==='n')return true;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){let xx=x+dx,yy=y+dy,n=1;while(valid(xx,yy)){let q=b[ix(xx,yy)];if(q){if(of(q,by)){const t=q.toLowerCase();if(t==='q'||(n===1&&t==='k')||((dx===0||dy===0)&&t==='r')||(dx&&dy&&t==='b'))return true;}break;}xx+=dx;yy+=dy;n++}}
  return false;
 }
 function checked(s,c){const k=kingAt(s,c);if(k<0)return s.variant!=='horde'||c==='b';return attacked(s,k,opp(c))}
 function emitPseudo(s){const b=s.b,c=s.turn,m=[],variant=s.variant;const allowKingCapture=variant==='antichess';
  function push(fr,to,extra={}){if(to<0||to>=64)return;const hit=b[to];if(hit&&side(hit)===c)return;if(hit&&hit.toLowerCase()==='k'&&!allowKingCapture)return;m.push({from:fr,to,capture:hit||null,...extra})}
  for(let i=0;i<64;i++){const pc=b[i];if(!of(pc,c))continue;const t=pc.toLowerCase(),x=file(i),y=row(i);
   if(t==='p'){const d=c==='w'?-1:1,n=y+d;if(n<0||n>7)continue;const promote=n===0||n===7;
    function addPawn(to,meta){if(promote)for(const prom of variant==='antichess'?['q','r','b','n','k']:['q','r','b','n'])push(i,to,{...meta,promotion:prom});else push(i,to,meta);}
    if(!b[ix(x,n)]){addPawn(ix(x,n),{});if((c==='w'&&y===6)||(c==='b'&&y===1)){if(!b[ix(x,y+d*2)])push(i,ix(x,y+d*2),{double:true})}}
    for(const dx of [-1,1])if(valid(x+dx,n)){const to=ix(x+dx,n);if(b[to]&&side(b[to])!==c&&(allowKingCapture||b[to].toLowerCase()!=='k'))addPawn(to,{});if(to===s.ep&&!b[to])addPawn(to,{enpassant:true,capture:c==='w'?'p':'P'})}
    continue;
   }
   if(t==='n'||t==='k'){const offsets=t==='n'?[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    for(const [dx,dy] of offsets)if(valid(x+dx,y+dy))push(i,ix(x+dx,y+dy));}
   if('brq'.includes(t)){const dirs=t==='b'?[[1,1],[-1,1],[1,-1],[-1,-1]]:t==='r'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];for(const [dx,dy] of dirs){let xx=x+dx,yy=y+dy;while(valid(xx,yy)){const to=ix(xx,yy);if(b[to]){push(i,to);break;}push(i,to);xx+=dx;yy+=dy}}}
  }
  if(!['antichess','racingkings'].includes(variant)){
   const k=kingAt(s,c),home=c==='w'?7:0;
   if(k>=0&&row(k)===home&&!checked(s,c))for(const wing of ['k','q']){
    const r=s.castle[c][wing];if(r===null||r===undefined||b[r]!==(c==='w'?'R':'r'))continue;
    const kingTo=ix(wing==='k'?6:2,home),rookTo=ix(wing==='k'?5:3,home);
    const kMin=Math.min(file(k),file(kingTo)),kMax=Math.max(file(k),file(kingTo));
    const rMin=Math.min(file(r),file(rookTo)),rMax=Math.max(file(r),file(rookTo));
    let ok=true;
    for(let f=kMin;f<=kMax;f++){const q=ix(f,home);if(q!==k&&q!==r&&b[q]){ok=false;break;}if(attacked(s,q,opp(c))){ok=false;break;}}
    for(let f=rMin;f<=rMax;f++){const q=ix(f,home);if(q!==r&&q!==k&&b[q]){ok=false;break}}
    if(ok)m.push({from:k,to:kingTo,castle:wing,rookFrom:r,rookTo,capture:null});
   }
  }
  if(variant==='crazyhouse')for(const type of ['p','n','b','r','q'])if(s.pockets[c][type]>0)for(let i=0;i<64;i++)if(!b[i]&&(type!=='p'||(row(i)!==0&&row(i)!==7)))m.push({drop:type,to:i,capture:null});
  return m;
 }
 function apply(s,m){const n=clone(s),c=s.turn,b=n.b,old=s.b;let moving=m.drop?null:old[m.from],captured=m.capture||null;
  if(m.drop){if(n.pockets[c][m.drop]<=0)throw Error('Figur nicht in Reserve');n.pockets[c][m.drop]--;b[m.to]=c==='w'?m.drop.toUpperCase():m.drop;n.promoted[m.to]=false}
  else {
   const wasPromoted=n.promoted[m.from];n.promoted[m.from]=false;
   if(m.castle){b[m.from]=null;b[m.rookFrom]=null;b[m.to]=moving;b[m.rookTo]=c==='w'?'R':'r';n.promoted[m.to]=false;n.promoted[m.rookTo]=false}
   else{b[m.from]=null;b[m.to]=m.promotion?(c==='w'?m.promotion.toUpperCase():m.promotion):moving;n.promoted[m.to]=!!m.promotion||wasPromoted;}
   if(m.enpassant){const capIdx=m.to+(c==='w'?8:-8);captured=old[capIdx];b[capIdx]=null;n.promoted[capIdx]=false}
   if(s.variant==='crazyhouse'&&captured){const was=s.promoted[m.enpassant?m.to+(c==='w'?8:-8):m.to];const type=was?'p':captured.toLowerCase();if(type!=='k')n.pockets[c][type]=(n.pockets[c][type]||0)+1;}
   if(s.variant==='atomic'&&captured){const x=file(m.to),y=row(m.to);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(valid(x+dx,y+dy)){
      const i=ix(x+dx,y+dy),pc=b[i];if(pc&&(i===m.to||pc.toLowerCase()!=='p')){b[i]=null;n.promoted[i]=false;}}
   }
  }
  if(!m.drop){if(moving?.toLowerCase()==='k')n.castle[c]={k:null,q:null};for(const color of ['w','b'])for(const wing of ['k','q'])if([m.from,m.to].includes(n.castle[color][wing]))n.castle[color][wing]=null;}
  n.ep=m.double?m.from+(c==='w'?-8:8):-1;n.half=(m.drop||moving?.toLowerCase()==='p'||captured)?0:s.half+1;n.full=s.full+(c==='b'?1:0);n.turn=opp(c);
  if(s.variant==='threecheck'&&checked(n,n.turn))n.checks[c]++;
  return n;
 }
 function atomicThreat(s,c){const k=kingAt(s,c);if(k<0)return true;const target=s.b[k],other=opp(c);if(kingAt(s,other)<0)return false;
  const copy={...s,turn:other};const captures=emitPseudo(copy).filter(m=>m.capture&&!m.drop&&s.b[m.from]?.toLowerCase()!=='k');
  // An atomic king is also in check if it can be captured directly; king-vs-king
  // adjacency, however, is legal and must not create a false threat.
  const noEnemyKing=clone(s);noEnemyKing.b[kingAt(s,other)]=null;
  if(attacked(noEnemyKing,k,other))return true;
  return captures.some(m=>within(k,m.to)&&!within(kingAt(s,other),m.to));
 }
 function legal(s){let moves=emitPseudo(s);const v=s.variant,c=s.turn;
  if(v==='antichess'){const captures=moves.filter(x=>x.capture);return captures.length?captures:moves;}
  moves=moves.filter(m=>{
   if(v==='atomic'&&s.b[m.from]?.toLowerCase()==='k'&&m.capture)return false;
   const n=apply(s,m);
   if(v==='atomic')return kingAt(n,c)>=0&&!atomicThreat(n,c);
   if(v==='racingkings')return !checked(n,c)&&!checked(n,opp(c));
   if(v==='horde'&&c==='w')return true;
   return !checked(n,c);
  });
  return moves;
 }
 function result(s){const v=s.variant,white=s.b.some(p=>p&&side(p)==='w'),black=s.b.some(p=>p&&side(p)==='b');
  if(v==='threecheck'){if(s.checks.w>=3)return {winner:'w',reason:'Drei Schachgebote'};if(s.checks.b>=3)return {winner:'b',reason:'Drei Schachgebote'};}
  if(v==='kingofthehill'){for(const i of [27,28,35,36]){if(s.b[i]==='K')return {winner:'w',reason:'König im Zentrum'};if(s.b[i]==='k')return {winner:'b',reason:'König im Zentrum'}}}
  if(v==='horde'){if(!white)return {winner:'b',reason:'Horde besiegt'};if(!black)return {winner:'w',reason:'Schwarze Armee besiegt'}}
  if(v==='atomic'){if(kingAt(s,'w')<0)return {winner:'b',reason:'König explodiert'};if(kingAt(s,'b')<0)return {winner:'w',reason:'König explodiert'}}
  if(v==='racingkings'){const a=kingAt(s,'w'),b=kingAt(s,'b');if(a>=0&&row(a)===0&&b>=0&&row(b)===0)return {winner:null,reason:'Beide Könige am Ziel'};if(b>=0&&row(b)===0)return {winner:'b',reason:'Zielreihe erreicht'};if(a>=0&&row(a)===0&&s.turn==='w')return {winner:'w',reason:'Zielreihe erreicht'};}
  const ms=legal(s);if(v==='antichess'){if(!s.b.some(p=>of(p,s.turn))||!ms.length)return {winner:s.turn,reason:'Alle Figuren abgegeben / kein Zug'};return null;}
  if(!ms.length){if(checked(s,s.turn))return {winner:opp(s.turn),reason:'Schachmatt'};if(v==='horde')return {winner:opp(s.turn),reason:'Kein legaler Zug'};return {winner:null,reason:'Patt'};}
  if(s.half>=150)return {winner:null,reason:'75-Züge-Regel'};
  return null;
 }
 function evaluate(s,perspective){const v=s.variant,over=resultQuick(s);if(over)return over.winner===null?0:over.winner===perspective?30000:-30000;
 let material=0;for(let i=0;i<64;i++){const pc=s.b[i];if(!pc)continue;let val=values[pc.toLowerCase()]||0;
  if(v==='antichess')val=-val;
  if(v==='racingkings'&&pc.toLowerCase()==='k')val+=(7-row(i))*450;
  if(v==='kingofthehill'&&pc.toLowerCase()==='k')val+=300-Math.min(...[27,28,35,36].map(t=>Math.abs(file(i)-file(t))+Math.abs(row(i)-row(t))))*60;
  if(v==='horde'&&pc.toLowerCase()==='p')val*=0.5;
  material+=(side(pc)==='w'?1:-1)*val;
 }
 if(v==='threecheck')material+=(s.checks.w-s.checks.b)*450;
 if(v==='crazyhouse')for(const c of ['w','b'])for(const [piece,num] of Object.entries(s.pockets[c]))material+=(c==='w'?1:-1)*num*values[piece]*0.9;
 return perspective==='w'?material:-material;
 }
 function resultQuick(s){const v=s.variant;
 if(v==='atomic'){if(kingAt(s,'w')<0)return {winner:'b'};if(kingAt(s,'b')<0)return {winner:'w'}}
 if(v==='horde'){if(!s.b.some(p=>of(p,'w')))return {winner:'b'};if(!s.b.some(p=>of(p,'b')))return {winner:'w'}}
 if(v==='threecheck'){if(s.checks.w>=3)return {winner:'w'};if(s.checks.b>=3)return {winner:'b'}}
 if(v==='kingofthehill'){for(const i of [27,28,35,36]){if(s.b[i]==='K')return {winner:'w'};if(s.b[i]==='k')return {winner:'b'}}}
 if(v==='racingkings'){const w=kingAt(s,'w'),b=kingAt(s,'b');if(w>=0&&row(w)===0&&b>=0&&row(b)===0)return {winner:null};if(b>=0&&row(b)===0)return {winner:'b'};if(w>=0&&row(w)===0&&s.turn==='w')return {winner:'w'}}
 if(v==='antichess'&&!s.b.some(p=>of(p,s.turn)))return {winner:s.turn};return null;
 }
 function best(s,depth=2,limit=2000){let nodes=0;function solve(state,d,alpha,beta){nodes++;const finished=resultQuick(state);if(finished)return finished.winner===null?0:finished.winner===state.turn?30000:-30000;
  if(d<=0||nodes>limit)return evaluate(state,state.turn);
  let moves=legal(state);if(!moves.length){const end=result(state);return end?.winner===null?0:end?.winner===state.turn?29000:-29000;}
  moves.sort((a,b)=>(b.capture?values[b.capture.toLowerCase()]||0:0)-(a.capture?values[a.capture.toLowerCase()]||0:0));let value=-1e9;
  for(const move of moves){const val=-solve(apply(state,move),d-1,-beta,-alpha);value=Math.max(val,value);alpha=Math.max(alpha,value);if(alpha>=beta||nodes>limit)break;}return value;
 }
 let moves=legal(s),ranked=[];
 for(const move of moves){const next=apply(s,move),value=-solve(next,Math.max(0,depth-1),-31000,31000);ranked.push({move,value});if(nodes>limit&&ranked.length>=8)break;}
 ranked.sort((a,b)=>b.value-a.value);
 return {best:ranked[0]||null,ranked,nodes};
 }
 function moveName(m){return m.drop?m.drop.toUpperCase()+'@'+sq(m.to):sq(m.from)+sq(m.to)+(m.promotion||'')}
 function fen(s){let board='';for(let y=0;y<8;y++){let count=0;for(let x=0;x<8;x++){let p=s.b[ix(x,y)];if(!p)count++;else{if(count)board+=count,count=0;board+=p}}if(count)board+=count;if(y<7)board+='/'}
  const castle=['w','b'].flatMap(c=>['k','q'].flatMap(wing=>s.castle[c][wing]!=null?[(c==='w'?(wing==='k'?'K':'Q'):(wing==='k'?'k':'q'))]:[]));
  return board+' '+s.turn+' '+(castle.length?castle.join(''):'-')+' '+(s.ep<0?'-':sq(s.ep))+' '+s.half+' '+s.full;
 }
 global.VariantChess={names,create,legal,apply,result,checked,atomicThreat,evaluate,best,moveName,fen,sq,fromSq,clone};
})(typeof window!=='undefined'?window:globalThis);
