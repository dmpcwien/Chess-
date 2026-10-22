/* Offline user interface for Schach Pro chess variants, v5.60. */
(()=>{'use strict';
const E=window.VariantChess,$=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const mode=Object.hasOwn(E.names,params.get('mode'))?params.get('mode'):'kingofthehill';
const setup={mode,enemy:params.get('enemy')==='free'?'free':'computer',coach:params.get('enemy')==='coach'||params.get('coach')==='1',elo:Math.max(400,Math.min(2800,Number(params.get('elo'))||1000)),side:params.get('side')==='b'?'b':'w',time:params.get('time')||'r10'};
const symbols={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
let boards=[],active=0,selected=-1,selectedDrop=null,flipped=setup.enemy!=='free'&&setup.side==='b',busy=false,analysisOpen=false;
const simCount=mode==='simul'?Math.min(5,Math.max(2,Number(params.get('boards'))||3)):1;
const clockRule={bullet1:60000,b1:60000,b2:120000,b3:180000,blitz3:180000,blitz5:300000,r10:600000,r15:900000,r30:1800000,c60:3600000,unlimited:0,none:0};
const timeBase=clockRule[setup.time]??600000;
function state(){return boards[active]}
function fresh(){return {game:E.create(mode==='simul'?'standard':mode),history:[],positions:[],clock:{w:timeBase,b:timeBase,last:Date.now()},winner:null}}
function save(){try{const serial=boards.map(({game,history,positions,clock,winner})=>({game,history,positions,clock,winner}));localStorage.setItem('schachpro_v560_'+mode,JSON.stringify({boards:serial,active,setup,flipped}));}catch(e){console.warn('Speichern momentan nicht möglich',e)}}
function init(){
 $('variantName').textContent=E.names[mode];$('matchLabel').textContent=setup.enemy==='free'?'Zwei Spieler an einem Handy':setup.coach?'Gegen Bot mit Coach':'Offline gegen Computer · '+setup.elo;
 if(mode.startsWith('blind'))$('blindInputRow').classList.remove('hide');
 if(mode==='crazyhouse')$('pockets').classList.remove('hide');
 $('goBack').onclick=()=>{save();location.href='index.html'};
 $('newGame').onclick=()=>{if(confirm('Neue Partie starten? Der bisherige Spielverlauf dieser Partie wird zurückgesetzt.')){boards[active]=fresh();selected=-1;save();render();maybeBot()}};
 $('undo').onclick=()=>{if(!state().history.length||busy)return;let steps=setup.enemy==='free'?1:2;while(steps-->0&&state().history.length){const prior=state().positions.pop();state().game=prior;state().history.pop()}state().winner=null;selected=-1;save();render()};
 $('flip').onclick=()=>{flipped=!flipped;renderBoard()};
 $('toggleCoach').onclick=()=>{setup.coach=!setup.coach;$('coachPanel').classList.toggle('hide',!setup.coach);$('toggleCoach').textContent=setup.coach?'🧠 Coach: AN':'🧠 Coach: AUS';$('toggleCoach').classList.toggle('gold',setup.coach);save();if(setup.coach)showPositionCoach()};
 $('toggleAnalysis').onclick=()=>{analysisOpen=!analysisOpen;$('analysisPanel').classList.toggle('hide',!analysisOpen);$('toggleAnalysis').classList.toggle('gold',analysisOpen);if(analysisOpen)review()};
 $('analyzePosition').onclick=showPositionCoach;
 $('copyMoves').onclick=async()=>{const text=state().history.map((item,i)=>((i%2===0?Math.floor(i/2)+1+'. ':'')+item.uci)).join(' ');try{await navigator.clipboard.writeText(text);alert('Züge kopiert')}catch(_){prompt('Züge kopieren:',text)}};
 $('blindPlay').onclick=()=>{const raw=$('blindInput').value.trim().toLowerCase();const m=E.legal(state().game).find(m=>E.moveName(m)===raw);if(!m){setStatus('Ungültiger Blindzug. Bitte z. B. e2e4 eingeben.');return;}playMove(m);$('blindInput').value=''};
 $('blindInput').onkeydown=e=>{if(e.key==='Enter')$('blindPlay').click()};
 $('cancelPromotion').onclick=()=>$('promotionDialog').classList.add('hide');
 const saved=localStorage.getItem('schachpro_v560_'+mode);if(saved){try{const d=JSON.parse(saved);if(d.setup?.mode===mode&&d.setup?.enemy===setup.enemy&&Array.isArray(d.boards)&&d.boards.length&&d.boards.every(item=>Array.isArray(item.game?.b)&&item.game.b.length===64&&Array.isArray(item.history))){boards=d.boards;active=Math.max(0,Math.min(d.active||0,boards.length-1));flipped=!!d.flipped;}}catch(_){}}
 if(!boards.length)boards=Array.from({length:simCount},fresh);
 $('coachPanel').classList.toggle('hide',!setup.coach);$('toggleCoach').textContent=setup.coach?'🧠 Coach: AN':'🧠 Coach: AUS';$('toggleCoach').classList.toggle('gold',setup.coach);
 render();maybeBot();setInterval(tickClock,600);
}
function setStatus(t){$('status').textContent=t}
function tickClock(){if(timeBase===0||busy)return;const entry=state();if(entry.winner)return;const c=entry.game.turn;if(setup.enemy!=='free'&&c!==setup.side&&busy)return;const now=Date.now(),elapsed=now-entry.clock.last;entry.clock.last=now;entry.clock[c]=Math.max(0,entry.clock[c]-elapsed);if(entry.clock[c]===0){entry.winner={winner:c==='w'?'b':'w',reason:'Zeitüberschreitung'};save();render()}else renderClock();}
function fmt(ms){if(!timeBase)return 'Ohne Uhr';let s=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function renderClock(){const {game,clock}=state();$('timeW').textContent=fmt(clock.w);$('timeB').textContent=fmt(clock.b);$('clockW').classList.toggle('active',game.turn==='w');$('clockB').classList.toggle('active',game.turn==='b')}
function isHuman(){return setup.enemy==='free'||state().game.turn===setup.side}
function render(){const {game,history,winner}=state();const res=winner||E.result(game);if(res){state().winner=res}
 renderBoard();renderClock();
 const turn=game.turn==='w'?'Weiß / Gold':'Schwarzmetall';
 setStatus(res?(res.winner===null?'Remis':'🏆 '+(res.winner==='w'?'Weiß':'Schwarz')+' gewinnt')+' · '+res.reason:(busy?'🤖 Computer überlegt …':turn+' am Zug')+(E.checked(game,game.turn)&&!['antichess','racingkings'].includes(mode)?' · Schach!':''));
 $('history').textContent=history.length?history.map((m,i)=>((i%2===0?Math.floor(i/2)+1+'. ':'')+m.uci+(i%2===1?'   ':'  '))).join(''):'Noch keine Züge.';
 if(mode==='crazyhouse')renderPockets();
 if(mode==='chess960')renderCastles();
 if(mode==='simul')renderTabs();
 if(analysisOpen)review();
 $('undo').disabled=!history.length||busy;save();
}
function renderTabs(){const holder=$('simulTabs');holder.classList.remove('hide');holder.replaceChildren();boards.forEach((game,i)=>{const button=document.createElement('button');button.className='btn'+(i===active?' gold':'');button.textContent='Brett '+(i+1)+(game.winner?' ✓':'');button.onclick=()=>{if(busy)return;active=i;selected=-1;render();maybeBot()};holder.append(button)})}
function visible(pc){if(!pc)return 'empty';const n=Number(mode.slice(-1));if(!mode.startsWith('blind'))return 'normal';if(n===5)return 'empty';const p=pc.toLowerCase();if(n===1)return 'bn'.includes(p)?'disc':'normal';if(n===2)return 'bnr'.includes(p)?'disc':'normal';if(n===3)return p==='p'?'normal':'disc';return 'disc'}
function renderBoard(){const {game,winner}=state(),b=$('board'),moves=!winner&&!busy&&isHuman()?E.legal(game):[];b.replaceChildren();const order=flipped?[...Array(64).keys()].reverse():[...Array(64).keys()];
 for(let i=0;i<64;i++){const x=order[i],p=game.b[x],button=document.createElement('button');const f=x%8,r=Math.floor(x/8);button.type='button';button.className='sq '+((f+r)%2?'dark':'light')+(selected===x?' selected':'')+(p?' occupied':'');
  if(!mode.startsWith('blind')&&moves.some(m=>m.to===x&&(selected===m.from||selectedDrop===m.drop)))button.classList.add('target');
  const visibility=visible(p);if(visibility==='normal'){const el=document.createElement('span');el.className='piece '+(p===p.toUpperCase()?'gold':'black');el.textContent=symbols[p];button.append(el);}else if(visibility==='disc'){const el=document.createElement('span');el.className='disc '+(p===p.toUpperCase()?'gold':'black');button.append(el)}
  if((!flipped&&f===0)||(flipped&&f===7)){const marker=document.createElement('span');marker.className='marker';marker.textContent=8-r;button.append(marker)}
  if((!flipped&&r===7)||(flipped&&r===0)){const marker=document.createElement('span');marker.className='marker file';marker.textContent='abcdefgh'[f];button.append(marker)}
  button.setAttribute('aria-label','Schachfeld '+E.sq(x));button.onclick=()=>click(x);b.append(button);
 }
}
function click(target){const entry=state(),{game}=entry;if(busy||entry.winner||!isHuman())return;const moves=E.legal(game);
 if(selectedDrop){const m=moves.find(x=>x.drop===selectedDrop&&x.to===target);if(m){selectedDrop=null;playMove(m);return;}selectedDrop=null;}
 if(selected>=0){const found=moves.filter(m=>m.from===selected&&m.to===target);if(found.length){if(found.length>1){const dlg=$('promotionDialog'),opts=$('promotionOptions');opts.replaceChildren();for(const m of found){const btn=document.createElement('button');btn.className='btn';btn.textContent=symbols[game.turn==='w'?m.promotion.toUpperCase():m.promotion];btn.onclick=()=>{dlg.classList.add('hide');playMove(m)};opts.append(btn)}dlg.classList.remove('hide');return;}playMove(found[0]);return;}}
 if(game.b[target]&&game.b[target]===(game.turn==='w'?game.b[target].toUpperCase():game.b[target].toLowerCase())&&moves.some(m=>m.from===target)){selected=selected===target?-1:target;renderBoard();return;}
 selected=-1;renderBoard();if(mode==='blind5')setStatus('Startfeld '+E.sq(target)+' prüfen und Zielfeld auswählen.');
}
function renderCastles(){
 let box=$('castleMoves');if(!box){box=document.createElement('div');box.id='castleMoves';box.className='row';$('board').parentNode.after(box)}
 box.replaceChildren();if(!isHuman()||busy||state().winner)return;
 for(const m of E.legal(state().game).filter(m=>m.castle)){
   const b=document.createElement('button');b.className='btn';b.textContent=m.castle==='k'?'Rochade kurz':'Rochade lang';b.onclick=()=>playMove(m);box.append(b);
 }
}
function renderPockets(){const game=state().game,holder=$('pockets');holder.replaceChildren();for(const col of ['w','b']){const label=document.createElement('span');label.textContent=col==='w'?'Gold:':'Schwarz:';holder.append(label);for(const [pc,count] of Object.entries(game.pockets[col]))if(count){const btn=document.createElement('button');btn.className='btn';btn.textContent=symbols[col==='w'?pc.toUpperCase():pc]+' ×'+count;btn.disabled=!isHuman()||game.turn!==col;btn.onclick=()=>{selectedDrop=selectedDrop===pc?null:pc;selected=-1;renderBoard()};holder.append(btn)}}}
function explainMove(before,m,bestData,playedData){const best=bestData.best;let difference=best?Math.max(0,Math.round(best.value-(playedData?.value??best.value))):0;
 const quality=difference<=25?'Sehr guter Zug':difference<=90?'Guter Zug':difference<=240?'Ungenauigkeit':difference<=450?'Fehler':'Schwerer Fehler';
 const cues={atomic:'Beim Schlagen explodieren benachbarte Figuren außer Bauern. Achte auf den eigenen König.',antichess:'In Räuberschach musst du schlagen, wenn du schlagen kannst. Ziel ist, keine Figuren mehr zu besitzen.',threecheck:'Drei Schachgebote entscheiden die Partie. Erhöhe deine Schachzahl und verhindere Gegenangriffe.',kingofthehill:'Bringe deinen König sicher auf d4, e4, d5 oder e5.',horde:'Die Horde will die schwarze Armee bezwingen; Schwarz muss alle weißen Figuren beseitigen.',crazyhouse:'Geschlagene Figuren kommen in die Reserve. Auch Einsetzen auf leere Felder gehört zur Strategie.',racingkings:'Beide Könige müssen die achte Reihe erreichen. Schachgebote sind nicht erlaubt.',chess960:'Die Grundstellung ist zufällig, aber Läufer stehen auf verschiedenen Feldfarben und der König zwischen Türmen.',simul:'Behalte mehrere unabhängige Bretter im Auge; auf jedem gelten klassische Schachregeln.'};
 const note=cues[mode]||(mode.startsWith('blind')?'Merke dir die Stellung: Die verdeckten Figuren folgen denselben Schachregeln.':'Material, Königssicherheit und Beweglichkeit bleiben entscheidend.');
 return '<strong>'+quality+'</strong> · Zug '+E.moveName(m)+'. '+(best&&E.moveName(best.move)!==E.moveName(m)?'Vorschlag der lokalen Variantenanalyse: '+E.moveName(best.move)+'. ':'')+note;
}
function playMove(m){const entry=state();if(entry.winner)return;const before=entry.game,coach=setup.coach;let analysis=null;
 if(coach)analysis=E.best(before,1,1200);
 entry.positions.push(E.clone(before));entry.game=E.apply(before,m);
 const uci=E.moveName(m),after=entry.game;entry.history.push({uci,side:before.turn,before:E.fen(before),after:E.fen(after)});
 entry.clock.last=Date.now();selected=-1;selectedDrop=null;
 if(coach){let delta=analysis?.ranked.find(x=>E.moveName(x.move)===uci)||null;
  $('coachNote').innerHTML=explainMove(before,m,analysis||{best:null},delta);$('evaluation').innerHTML='<span>Lokale Variantenbewertung</span><strong>'+Math.round(E.evaluate(after,before.turn))+' Pkt.</strong>';
 }
 render();if(!entry.winner)maybeBot();
}
function maybeBot(){const entry=state();if(entry.winner||setup.enemy==='free'||entry.game.turn===setup.side)return;
 busy=true;render();const boardId=active;
 setTimeout(()=>{
  if(boardId!==active){busy=false;return;}
  const g=state().game;if(state().winner||g.turn===setup.side){busy=false;render();return;}
  const depth=setup.elo>=1700?3:setup.elo>=900?2:1,limit=setup.elo>=1900?1700:setup.elo>=1200?1200:500;
  const data=E.best(g,depth,limit),legal=E.legal(g);let next=data.best?.move||legal[0];
  if(setup.elo<1050&&legal.length&&Math.random()<.18)next=legal[Math.floor(Math.random()*legal.length)];
  busy=false;if(next)playMove(next);else render();
 },180);
}
function showPositionCoach(){const data=E.best(state().game,setup.elo>=1800?2:1,1800);
 const suggestion=data.best?'Empfohlener Zug: '+E.moveName(data.best.move)+' · Bewertung '+Math.round(data.best.value)+' Pkt.':'Keine weiteren Züge.';
 $('coachNote').textContent=suggestion;
 $('evaluation').innerHTML='<span>Untersuchte Knoten</span><strong>'+data.nodes+'</strong>';
 if(analysisOpen)review();
}
function review(){const holder=$('reviewMove');holder.replaceChildren();const history=state().history;
 if(!history.length){holder.textContent='Noch keine gespielten Züge. Du kannst die aktuelle Stellung analysieren.';return}
 history.slice(-16).forEach((item,i)=>{const div=document.createElement('div');div.className='analysis-entry';
 const index=history.length-Math.min(16,history.length)+i+1;
 div.textContent=index+'. '+(item.side==='w'?'Weiß':'Schwarz')+': '+item.uci;
 holder.append(div)});
}
init();
})();

// Match the selected local board design; tournament green must not show gold/black squares.
(function(){
 const qs=new URLSearchParams(location.search);
 const board=qs.get('board')||qs.get('theme')||'turnier';
 if(board==='turnier')document.body.classList.add('v563Green');
})();

// Match the selected local board design; tournament green must not show gold/black squares.
(function(){
 const qs=new URLSearchParams(location.search);
 const board=qs.get('board')||qs.get('theme')||'turnier';
 if(board==='turnier')document.body.classList.add('v563Green');
})();
