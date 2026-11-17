'use strict';
/* ============================================================
   ПОГОДНЫЙ СТРАЖ / WEATHER WARDEN
   Пиксель-арт игра: управление погодой над маленьким островом.
   Чистый JS, ноль внешних зависимостей, ноль внешних ассетов —
   вся графика рисуется кодом на canvas с внутренним разрешением 320x176.
   ============================================================ */

/* ---------------- базовые константы ---------------- */
const W = 320, H = 176;
const TS = 16;
const COLS = W / TS, ROWS = H / TS;
const HORIZON = 32;          // линия горизонта (пиксели)
const WROW0 = HORIZON / TS;  // первая строка тайлов мира (2)
const NEI4 = [[-1,0],[1,0],[0,-1],[0,1]];

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

const PAL = {
  grass:'#3fa34d', grass2:'#378a3e', grass3:'#2c6f34',
  dirt:'#7b5334', dirt2:'#5d3d26',
  sand:'#d9c37c', sand2:'#b39a58',
  water:'#2d6cb0', water2:'#22568f', water3:'#54a0da',
  snow:'#e9f3ff', snow2:'#c3d5ea',
  ice:'#a8d8e8', ice2:'#86bcd2',
  wood:'#6b4429', wood2:'#472d1b',
  leaf:'#2f9e44', leaf2:'#1f6b2c', leaf3:'#59c76c',
  roof:'#c0392b', roof2:'#8e2a1f',
  wall:'#ecdcb2', wall2:'#c9b184',
  stone:'#9aa4b4', stone2:'#6e7789',
  glass:'#ffe9a8', glass2:'#8fd0e8',
  gold:'#ffd23f', gold2:'#f0a300',
  flame:'#ff7b1c', white:'#ffffff', black:'#191320',
  purple:'#9b7bff', cyan:'#6ee7e7', rose:'#e056a0',
  skin:'#e8b48a', skin2:'#c98d63', hair:'#3a2a20'
};

/* ---------------- утилиты ---------------- */
function mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(Date.now() & 0xffffffff);
const rr  = (a, b) => a + rnd() * (b - a);
const ri  = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const pick= a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;
function hex2rgb(h){ h = h.replace('#',''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
function rgb2hex(c){ return '#' + c.map(v => clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join(''); }
function mix(a, b, t){ const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex([lerp(A[0],B[0],t), lerp(A[1],B[1],t), lerp(A[2],B[2],t)]); }
function shade(c, t){ return mix(c, t < 0 ? '#000000' : '#ffffff', Math.abs(t)); }
function hash2(x, y){
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}
function px(x, y, w, h, c){ ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }

/* гладкий value-noise — для органичной береговой линии */
function makeNoise(){
  const gw = 6, gh = 5, g = [];
  for (let i = 0; i < gw * gh; i++) g.push(rnd());
  const at = (i, j) => g[clamp(j, 0, gh - 1) * gw + clamp(i, 0, gw - 1)];
  return function(x, y){
    const fx = x * (gw - 1), fy = y * (gh - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return lerp(
      lerp(at(x0, y0), at(x0 + 1, y0), sx),
      lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), sx),
      sy
    );
  };
}

/* ---------------- погода ---------------- */
const WEATHER = {
  clear:{ name:'ЯСНО',   cost:0,  color:'#ffd23f', icon:'sun',
          desc:'Яркое солнце. Сушит почву, но поднимает настроение.',
          wet:-1.0, evap:1.45, temp:6,   happy:0.55, mana:1.0,  growth:1.05 },
  rain:{  name:'ДОЖДЬ',  cost:10, color:'#54a0da', icon:'rain',
          desc:'Поливает грядки. Магия копится быстрее.',
          wet:4.0,  evap:0.25, temp:-4,  happy:0.35, mana:2.2,  growth:1.30 },
  storm:{ name:'ГРОЗА',  cost:20, color:'#9b7bff', icon:'storm',
          desc:'Ливень и молнии! Лови разряд кликом — до ×2 магии.',
          wet:6.2,  evap:0.20, temp:-7,  happy:-0.90, mana:2.6, growth:1.20 },
  snow:{  name:'СНЕГ',   cost:12, color:'#dff3ff', icon:'snow',
          desc:'Холод и красота. Снег копится, в тепле тает в воду.',
          wet:0.9,  evap:0.30, temp:-12, happy:0.20, mana:1.6,  growth:0.55 },
  fog:{   name:'ТУМАН',  cost:8,  color:'#b9c3cf', icon:'fog',
          desc:'Густой туман. Молнии в тумане дают вдвое больше магии.',
          wet:0.5,  evap:0.70, temp:-2,  happy:-0.45, mana:1.2,  growth:0.70 },
  wind:{  name:'ВЕТЕР',  cost:6,  color:'#6ee7e7', icon:'wind',
          desc:'Рассеивает туман и облака, сдувает снег, сушит почву.',
          wet:-1.4, evap:1.10, temp:-3,  happy:-0.15, mana:1.3,  growth:0.90 }
};
const WORDER = ['clear','rain','storm','snow','fog','wind'];

/* ---------------- сезоны ---------------- */
const SEASONS = [
  { name:'весна', base:14, tint:'#63c46a' },
  { name:'весна', base:16, tint:'#5ec063' },
  { name:'лето',  base:25, tint:'#9ccf4a' },
  { name:'лето',  base:27, tint:'#b0d24a' },
  { name:'осень', base:12, tint:'#d2a13c' },
  { name:'зима',  base:2,  tint:'#e9f3ff' }
];
function season(){ return SEASONS[clamp(S.day - 1, 0, SEASONS.length - 1)]; }

/* ---------------- состояние ---------------- */
const S = {
  mode:'menu',                 // menu | play | pause | win | lose
  day:1, time:8/24, dayLen:45,
  mana:60, manaMax:100,
  temp:18, water:55, happy:70,
  harvest:0, needHarvest:5, lastDay:6,
  weather:'clear', next:'clear', blend:1,
  cur:null,                   // параметры погоды на момент переключения
  flash:0, shake:0, fogAlpha:0,
  caught:0, strikes:0, stormT:0,
  logs:[], logId:0, hudT:0
};
S.cur = Object.assign({}, WEATHER.clear);

/* ---------------- мир ---------------- */
const G = {
  tiles:[], objects:[], plots:[], villagers:[], clouds:[],
  bolts:[], strikes:[], drops:[], flakes:[], parts:[], splashes:[],
  mage:{ x:0, y:0, cast:0 }, seed:0
};

function tileAt(tx, ty){
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return null;
  return G.tiles[ty * COLS + tx];
}
function setTile(tx, ty, t){
  const c = tileAt(tx, ty);
  if (c) c.t = t;
}

function genWorld(seed){
  G.seed = seed;
  rnd = mulberry32(seed);
  G.tiles.length = 0; G.objects.length = 0; G.plots.length = 0;
  G.villagers.length = 0; G.clouds.length = 0; G.bolts.length = 0;
  G.strikes.length = 0; G.drops.length = 0; G.flakes.length = 0;
  G.parts.length = 0; G.splashes.length = 0;
  G.dropAcc = 0; G.flakeAcc = 0;

  const cx = 9.4, cy = 6.7;
  const nz = makeNoise();
  for (let y = 0; y < ROWS; y++){
    for (let x = 0; x < COLS; x++){
      const t = { t:'sea', x, y, d:0, burnt:0, shallow:false };
      G.tiles.push(t);
      if (y < WROW0){ t.t = 'sky'; continue; }
      const ix = (x - cx) / 6.4, iy = (y - cy) / 3.6;
      let d = Math.sqrt(ix * ix + iy * iy);
      d += (nz(x / (COLS - 1), y / (ROWS - 1)) - 0.5) * 0.40;
      t.d = d;
      if (d < 0.76) t.t = 'grass';
      else if (d < 0.85) t.t = 'sand';
    }
  }

  // маленький пруд
  let px0 = ri(3, COLS - 6), py0 = ri(WROW0 + 1, ROWS - 4);
  let tries = 0;
  while (tries++ < 40){
    let ok = true;
    for (let y = 0; y < 2 && ok; y++)
      for (let x = 0; x < 3; x++){
        const c = tileAt(px0 + x, py0 + y);
        if (!c || c.t !== 'grass'){ ok = false; break; }
      }
    if (ok) break;
    px0 = ri(3, COLS - 6); py0 = ri(WROW0 + 1, ROWS - 4);
  }
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 3; x++){
      const c = tileAt(px0 + x, py0 + y);
      if (c) c.t = 'water';
    }

  // собираем «свободную» сушу
  const free = [];
  for (const t of G.tiles){
    if (t.t !== 'grass') continue;
    let n = 0;
    for (const [dx, dy] of NEI4){
      const nb = tileAt(t.x + dx, t.y + dy);
      if (nb && (nb.t === 'grass' || nb.t === 'sand')) n++;
    }
    if (n >= 3) free.push(t);
  }
  // перемешиваем
  for (let i = free.length - 1; i > 0; i--){
    const j = ri(0, i);
    const tmp = free[i]; free[i] = free[j]; free[j] = tmp;
  }

  // поля: ферма 3x2 из 5 грядок на ровном участке
  const farmSpots = [];
  for (let y = WROW0; y < ROWS - 1; y++){
    for (let x = 0; x < COLS - 2; x++){
      let ok = true;
      for (let dy = 0; dy < 2 && ok; dy++)
        for (let dx = 0; dx < 3; dx++){
          const c = tileAt(x + dx, y + dy);
          if (!c || c.t !== 'grass'){ ok = false; break; }
        }
      if (ok) farmSpots.push({ x, y });
    }
  }
  const farm = farmSpots.length ? farmSpots[ri(0, farmSpots.length - 1)] : { x:8, y:6 };
  const farmCells = [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]];
  for (let i = 0; i < 5; i++){
    const c = farmCells[i];
    G.plots.push({ tx:farm.x + c[0], ty:farm.y + c[1], x:(farm.x + c[0]) * TS + 8, y:(farm.y + c[1]) * TS + 11, growth:0, ready:false, glow:0 });
  }
  const used = new Set(G.plots.map(p => p.tx + ',' + p.ty));
  G.objects.push({ type:'fence', x:farm.x * TS, y:farm.y * TS, w:3 * TS, h:2 * TS });

  // дома
  const houses = [];
  for (const t of free){
    if (houses.length >= 4) break;
    if (used.has(t.x + ',' + t.y)) continue;
    let far = true;
    for (const h of houses) if (Math.abs(h.tx - t.x) + Math.abs(h.ty - t.y) < 6) { far = false; break; }
    if (!far) continue;
    const h = { type:'house', tx:t.x, ty:t.y, x:t.x * TS + 8, y:t.y * TS + 12, hp:2, ruins:false, seed:rnd() };
    houses.push(h); G.objects.push(h); used.add(t.x + ',' + t.y);
  }

  // деревья
  let trees = 0;
  for (const t of free){
    if (trees >= 18) break;
    if (used.has(t.x + ',' + t.y)) continue;
    let near = false;
    for (const h of houses) if (Math.abs(h.tx - t.x) + Math.abs(h.ty - t.y) < 3) { near = true; break; }
    if (near) continue;
    G.objects.push({ type:'tree', tx:t.x, ty:t.y, x:t.x * TS + 8, y:t.y * TS + 13, burnt:false, seed:rnd() });
    used.add(t.x + ',' + t.y); trees++;
  }

  // камни
  for (let i = 0; i < 7 && free.length; i++){
    const t = free[ri(0, free.length - 1)];
    if (used.has(t.x + ',' + t.y)) continue;
    G.objects.push({ type:'rock', x:t.x * TS + 8, y:t.y * TS + 12, seed:rnd() });
    used.add(t.x + ',' + t.y);
  }

  // колодец
  for (const t of free){
    if (used.has(t.x + ',' + t.y)) continue;
    G.objects.push({ type:'well', x:t.x * TS + 8, y:t.y * TS + 12 });
    used.add(t.x + ',' + t.y);
    break;
  }

  // тропинки: от домов к центру
  const ccx = 10, ccy = 7;
  for (const h of houses){
    let x = h.tx, y = h.ty;
    while (x !== ccx && tileAt(x, y) && tileAt(x, y).t === 'grass'){ x += Math.sign(ccx - x); setTile(x, y, 'path'); }
    while (y !== ccy && tileAt(x, y) && tileAt(x, y).t === 'grass'){ y += Math.sign(ccy - y); setTile(x, y, 'path'); }
  }

  // маг
  G.mage.x = ccx * TS + 8; G.mage.y = ccy * TS + 12;

  // жители
  const shirts = ['#c0392b','#2f6fb5','#2f9e44','#9b7bff','#e056a0','#f0a300'];
  for (let i = 0; i < 6; i++){
    const t = free[ri(0, free.length - 1)];
    G.villagers.push({
      x:t.x * TS + 8 + rr(-3,3), y:t.y * TS + 12 + rr(-2,2),
      tx:t.x * TS + 8, ty:t.y * TS + 12, dir:1, sp:rr(9,15), bob:rr(0,6),
      shirt:pick(shirts), skin:pick([PAL.skin, PAL.skin2]), hair:pick(['#3a2a20','#6b4a2a','#c9a13a']),
      wait:rr(0.5,2.5), bubble:null
    });
  }

  // облака
  for (let i = 0; i < 8; i++){
    G.clouds.push({
      x:rr(-20, W + 20), y:rr(3, 24), w:rr(24, 44), h:rr(9, 14),
      vx:rr(3, 8), seed:rnd(), dark:0, puff:rr(0,6)
    });
  }
}

/* ---------------- аудио ---------------- */
const AU = { ctx:null, muted:false, rain:null };
function auInit(){
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  AU.ctx = new AC();
  const len = AU.ctx.sampleRate * 2;
  const buf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
  const src = AU.ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const flt = AU.ctx.createBiquadFilter();
  flt.type = 'bandpass'; flt.frequency.value = 1500; flt.Q.value = 0.55;
  const g = AU.ctx.createGain(); g.gain.value = 0;
  src.connect(flt).connect(g).connect(AU.ctx.destination);
  src.start();
  AU.rain = g;
}
function auRain(v){
  if (!AU.rain || !AU.ctx) return;
  AU.rain.gain.setTargetAtTime(AU.muted ? 0 : v, AU.ctx.currentTime, 0.5);
}
function tone(freq, dur, type, vol, when, slideTo){
  if (!AU.ctx || AU.muted) return;
  const t0 = AU.ctx.currentTime + (when || 0);
  const o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.06, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(AU.ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function noiseBurst(dur, vol, cutoff, type){
  if (!AU.ctx || AU.muted) return;
  const sr = AU.ctx.sampleRate, len = Math.max(1, Math.floor(sr * dur));
  const buf = AU.ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = AU.ctx.createBufferSource(); src.buffer = buf;
  const flt = AU.ctx.createBiquadFilter();
  flt.type = type || 'lowpass'; flt.frequency.value = cutoff || 1200;
  const g = AU.ctx.createGain(); g.gain.value = vol || 0.12;
  src.connect(flt); flt.connect(g); g.connect(AU.ctx.destination);
  src.start();
}

/* ---------------- журнал событий ---------------- */
function log(msg, kind){
  S.logs.unshift({ msg, kind: kind || '', id: ++S.logId });
  if (S.logs.length > 30) S.logs.pop();
}

/* ---------------- погодные параметры (с плавным переходом) ---------------- */
function wx(){
  const a = S.cur, b = WEATHER[S.next], t = S.blend;
  return {
    wet:   lerp(a.wet,   b.wet,   t),
    evap:  lerp(a.evap,  b.evap,  t),
    temp:  lerp(a.temp,  b.temp,  t),
    happy: lerp(a.happy, b.happy, t),
    mana:  lerp(a.mana,  b.mana,  t),
    growth:lerp(a.growth,b.growth,t)
  };
}
function setWeather(id){
  if (S.mode !== 'play') return;
  const w = WEATHER[id];
  if (!w) return;
  if (id !== S.weather){
    const cost = w.cost;
    if (cost > S.mana){
      log('Не хватает магии для «' + w.name + '»', 'warn');
      tone(140, 0.14, 'square', 0.05);
      return;
    }
    S.mana -= cost;
    S.cur = Object.assign({}, wx());
    S.weather = id; S.next = id; S.blend = 0;
    G.mage.cast = 1;
    log('Погода: ' + w.name, id === 'storm' ? 'warn' : '');
    tone(420, 0.09, 'square', 0.05);
    tone(660, 0.12, 'square', 0.05, 0.08);
    if (id === 'wind'){ S.fogAlpha = 0; }
    if (id === 'fog'){ S.fogAlpha = 0.85; }
  }
}

/* ---------------- симуляция ---------------- */
function updateSim(dt){
  const w = wx();
  S.mana = clamp(S.mana + w.mana * dt, 0, S.manaMax);

  const sn = season();
  const dayCurve = 7 * Math.sin((S.time - 0.25) * Math.PI * 2);
  const target = sn.base + dayCurve + w.temp;
  S.temp += (target - S.temp) * Math.min(1, dt * 0.18);

  let wet = w.wet;
  if (S.weather === 'snow' && S.temp > 3) wet = 4.2;      // снег тает
  const evap = (0.15 + Math.max(0, S.temp - 8) * 0.035) * w.evap;
  S.water = clamp(S.water + (wet - evap) * dt, 0, 100);

  let hd = w.happy;
  hd += (S.temp >= 14 && S.temp <= 26) ? 0.3 : -Math.min(1.6, Math.abs(S.temp - 20) * 0.09);
  if (S.water < 12) hd -= 0.60;            // засуха
  if (S.water > 95) hd -= 0.35;            // затопление
  if (S.weather === 'snow' && S.temp < -5) hd -= 0.50;  // мороз
  S.happy = clamp(S.happy + hd * dt, 0, 100);

  for (const p of G.plots){
    if (p.growth >= 100) { p.ready = true; continue; }
    const wf = waterFactor(S.water), tf = tempFactor(S.temp);
    p.growth = clamp(p.growth + dt * 3.4 * wf * tf * w.growth, 0, 100);
    if (p.growth >= 100){ p.ready = true; log('Грядка созрела — кликни, чтобы собрать урожай', 'good'); tone(880, 0.08, 'triangle', 0.04); }
  }
}
function waterFactor(v){
  if (v >= 35 && v <= 70) return 1;
  if (v < 35)  return clamp(0.25 + v / 35 * 0.75, 0.2, 1);
  return clamp(1 - (v - 70) / 30 * 0.8, 0.2, 1);
}
function tempFactor(v){
  if (v >= 12 && v <= 30) return 1;
  if (v < 12) return clamp(0.25 + (v + 8) / 20 * 0.75, 0.15, 1);
  return clamp(1 - (v - 30) / 12 * 0.8, 0.15, 1);
}

function updateWorld(dt){
  // облака
  const windPower = S.weather === 'wind' ? 26 : S.weather === 'storm' ? 11 : S.weather === 'rain' ? 6 : 3.5;
  const wantClouds = S.weather === 'clear' ? 3 : S.weather === 'fog' ? 1 : S.weather === 'wind' ? 5 : S.weather === 'snow' ? 6 : 7;
  while (G.clouds.length < wantClouds){
    G.clouds.push({ x:rr(-20, W + 20), y:rr(3, 24), w:rr(24, 44), h:rr(9, 14), vx:rr(3, 8), seed:rnd(), dark:0, puff:rr(0,6) });
  }
  while (G.clouds.length > wantClouds) G.clouds.pop();
  for (const c of G.clouds){
    c.x += (c.vx + windPower) * dt;
    c.puff += dt * 2;
    if (c.x > W + 50) { c.x = -50; c.y = rr(3, 24); }
  }

  // дождь
  const rainRate = S.weather === 'storm' ? 170 : S.weather === 'rain' ? 90 : 0;
  G.dropAcc = (G.dropAcc || 0) + rainRate * dt;
  while (G.dropAcc >= 1){
    G.dropAcc -= 1;
    G.drops.push({ x:rr(-10, W + 10), y:rr(-14, 0), sp:rr(150, 240), len:S.weather === 'storm' ? 4 : 3 });
  }
  for (let i = G.drops.length - 1; i >= 0; i--){
    const d = G.drops[i];
    d.y += d.sp * dt; d.x += windPower * dt * 0.35;
    const ty = Math.floor(d.y / TS), tx = Math.floor(d.x / TS);
    if (d.y >= H - 4 || d.x > W + 12){
      if (d.y < H) G.splashes.push({ x:d.x, y:(ty + 1) * TS, t:0 });
      G.drops.splice(i, 1);
    }
  }
  for (let i = G.splashes.length - 1; i >= 0; i--){
    G.splashes[i].t += dt * 4;
    if (G.splashes[i].t > 1) G.splashes.splice(i, 1);
  }

  // снег
  const snowRate = S.weather === 'snow' ? (S.temp > 8 ? 14 : 55) : 0;
  G.flakeAcc = (G.flakeAcc || 0) + snowRate * dt;
  while (G.flakeAcc >= 1){
    G.flakeAcc -= 1;
    G.flakes.push({ x:rr(0, W), y:rr(-10, 0), ph:rr(0, 6.3), sp:rr(12, 26), sz:rnd() > 0.7 ? 2 : 1 });
  }
  const melt = S.temp > 8;
  for (let i = G.flakes.length - 1; i >= 0; i--){
    const f = G.flakes[i];
    f.y += f.sp * dt;
    f.x += Math.sin(f.y * 0.06 + f.ph) * 12 * dt + windPower * dt * 0.25;
    const landed = f.y > H - 18;
    if (melt && landed){ G.splashes.push({ x:f.x, y:H - 6, t:0 }); G.flakes.splice(i, 1); continue; }
    if (f.y > H + 4) G.flakes.splice(i, 1);
  }

  // туман
  const wantFog = S.weather === 'fog' ? 0.9 : 0;
  S.fogAlpha += (wantFog - S.fogAlpha) * Math.min(1, dt * (S.weather === 'wind' ? 3.2 : 1.1));

  // молнии
  if (S.weather === 'storm'){
    S.stormT += dt;
    if (S.stormT > 3.4 + rnd() * 2.6 && G.bolts.length < 2){
      S.stormT = 0;
      const c = pick(G.clouds);
      G.bolts.push({ x:c.x, y:c.y + 4, t:2.8, caught:false, done:false });
    }
  }
  for (let i = G.bolts.length - 1; i >= 0; i--){
    const b = G.bolts[i];
    b.t -= dt;
    if (b.t <= 0 && !b.done){
      b.done = true;
      strikeLightning(b.x, b.y);
      G.bolts.splice(i, 1);
    }
  }
  for (let i = G.strikes.length - 1; i >= 0; i--){
    G.strikes[i].t -= dt;
    if (G.strikes[i].t <= 0) G.strikes.splice(i, 1);
  }

  // частицы
  for (let i = G.parts.length - 1; i >= 0; i--){
    const p = G.parts[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt;
    p.life -= dt;
    if (p.life <= 0) G.parts.splice(i, 1);
  }

  // жители
  for (const v of G.villagers){
    v.wait -= dt;
    if (v.wait <= 0){
      const tx = v.tx + rr(-16, 16), ty = v.ty + rr(-12, 12);
      const t = tileAt(Math.floor(tx / TS), Math.floor(ty / TS));
      if (t && t.t !== 'water'){ v.tx = tx; v.ty = ty; }
      v.wait = rr(1.2, 3.6);
    }
    const dx = v.tx - v.x, dy = v.ty - v.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1.5){
      const sp = v.sp * (S.weather === 'storm' ? 1.5 : S.weather === 'fog' ? 0.7 : 1) * (S.happy > 60 ? 1.15 : 1);
      v.x += dx / dist * sp * dt; v.y += dy / dist * sp * dt;
      v.dir = dx >= 0 ? 1 : -1;
      v.moving = true;
    } else v.moving = false;
    v.bob += dt * (v.moving ? 9 : 3);
    if (v.bubble){ v.bubble.t -= dt; if (v.bubble.t <= 0) v.bubble = null; }
  }

  // маг
  if (G.mage.cast > 0) G.mage.cast = Math.max(0, G.mage.cast - dt * 0.8);
  S.flash = Math.max(0, S.flash - dt * 3.4);
  S.shake = Math.max(0, S.shake - dt * 22);
}

function strikeLightning(fromX, fromY){
  S.strikes.push({ x1:fromX, y1:fromY, x2:fromX, y2:H, t:0.28 });
  S.flash = 1; S.shake = 4;
  noiseBurst(1.1, 0.2, 420, 'lowpass');
  S.strikes++;

  // ищем ближайшее дерево
  let best = null, bd = 1e9;
  for (const o of G.objects){
    if (o.type !== 'tree' || o.burnt) continue;
    const d = Math.hypot(o.x - fromX, o.y - fromY);
    if (d < bd){ bd = d; best = o; }
  }
  if (best && bd < 78){
    best.burnt = true;
    S.happy = clamp(S.happy - 5, 0, 100);
    for (let i = 0; i < 14; i++)
      G.parts.push({ x:best.x, y:best.y - 10, vx:rr(-14,14), vy:rr(-30,-6), life:rr(0.5,1.3), grav:6, color:pick(['#ff7b1c','#ffd23f','#8a5a3a']), sz:rr(1,3) });
    log('Молния сожгла дерево! Настроение упало', 'bad');
    tone(180, 0.25, 'sawtooth', 0.07, 0, 90);
    return;
  }
  // ищем дом
  let h = null, hd = 1e9;
  for (const o of G.objects){
    if (o.type !== 'house' || o.ruins) continue;
    const d = Math.hypot(o.x - fromX, o.y - fromY);
    if (d < hd){ hd = d; h = o; }
  }
  if (h && hd < 66){
    h.hp--;
    S.happy = clamp(S.happy - 7, 0, 100);
    for (let i = 0; i < 10; i++)
      G.parts.push({ x:h.x, y:h.y - 12, vx:rr(-18,18), vy:rr(-24,-4), life:rr(0.4,1.0), grav:20, color:pick(['#c0392b','#ffd23f','#e8d9b0']), sz:rr(1,2) });
    if (h.hp <= 0){
      h.ruins = true;
      S.happy = clamp(S.happy - 6, 0, 100);
      log('Дом разрушен молнией!', 'bad');
    } else {
      log('Молния ударила в дом — он повреждён', 'warn');
    }
    return;
  }
  // иначе — в землю
  const tx = Math.floor(fromX / TS), ty = Math.floor(fromY / TS);
  const c = tileAt(tx, ty);
  if (c) c.burnt = 1;
  for (let i = 0; i < 8; i++)
    G.parts.push({ x:fromX, y:fromY, vx:rr(-24,24), vy:rr(-20,10), life:rr(0.2,0.6), grav:30, color:'#fff07a', sz:rr(1,2) });
}

function catchLightning(b){
  b.caught = true; b.done = true;
  const mult = (S.weather === 'fog') ? 2 : 1;
  const gain = 18 * mult;
  S.mana = clamp(S.mana + gain, 0, S.manaMax);
  S.caught++;
  S.flash = 0.45;
  for (let i = 0; i < 16; i++)
    G.parts.push({ x:b.x, y:b.y, vx:rr(-40,40), vy:rr(-40,40), life:rr(0.3,0.8), grav:12, color:pick(['#fff07a','#ffffff','#9b7bff']), sz:rr(1,3) });
  log('Молния поймана! +' + gain + ' магии' + (mult > 1 ? ' (×2 в тумане!)' : ''), 'good');
  tone(1180, 0.09, 'square', 0.07);
  tone(1760, 0.12, 'square', 0.05, 0.07);
}
function harvestPlot(p){
  if (p.growth < 100) return false;
  p.growth = 0; p.ready = false;
  S.harvest++;
  S.mana = clamp(S.mana + 7, 0, S.manaMax);
  S.happy = clamp(S.happy + 4, 0, 100);
  for (let i = 0; i < 14; i++)
    G.parts.push({ x:p.x, y:p.y - 4, vx:rr(-20,20), vy:rr(-34,-6), life:rr(0.5,1.1), grav:26, color:pick(['#ffd23f','#e8d9b0','#f0a300']), sz:rr(1,2) });
  log('Урожай собран! (' + S.harvest + '/' + S.needHarvest + ')', 'good');
  tone(523, 0.08, 'square', 0.06);
  tone(659, 0.08, 'square', 0.06, 0.08);
  tone(784, 0.14, 'square', 0.06, 0.16);
  if (S.harvest >= S.needHarvest) log('Все урожаи собраны — осталось дожить до 6-го дня!', 'good');
  return true;
}

/* ---------------- небо ---------------- */
const SKY_KEYS = [
  { h:0,    top:'#04081a', bot:'#101f44' },
  { h:4.5,  top:'#0e1c46', bot:'#3b3a72' },
  { h:6.2,  top:'#2c3a72', bot:'#f09a62' },
  { h:8,    top:'#3f8fd6', bot:'#a5dcf7' },
  { h:15.5, top:'#357fc8', bot:'#9ed4f2' },
  { h:17.8, top:'#3c4a86', bot:'#f08a5a' },
  { h:19.8, top:'#1a2452', bot:'#6a4a80' },
  { h:21.5, top:'#070d24', bot:'#16254e' },
  { h:24,   top:'#04081a', bot:'#101f44' }
];
function skyColors(hour){
  let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++){
    if (hour >= SKY_KEYS[i].h && hour <= SKY_KEYS[i + 1].h){ a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break; }
  }
  const t = (b.h === a.h) ? 0 : (hour - a.h) / (b.h - a.h);
  return { top: mix(a.top, b.top, t), bot: mix(a.bot, b.bot, t) };
}
function nightFactor(){
  const hour = S.time * 24;
  if (hour >= 19.8 || hour <= 5.4) return 1;
  if (hour >= 18.2) return (hour - 18.2) / 1.6;
  if (hour <= 6.8) return 1 - (hour - 5.4) / 1.4;
  return 0;
}
function weatherTint(top, bot){
  let t = 0, c = '#8a97a8';
  if (S.weather === 'storm'){ t = 0.55; c = '#39405a'; }
  else if (S.weather === 'rain'){ t = 0.30; c = '#6b8aa6'; }
  else if (S.weather === 'snow'){ t = 0.34; c = '#c2d6e8'; }
  else if (S.weather === 'fog'){ t = 0.50; c = '#9aa6b2'; }
  else if (S.weather === 'wind'){ t = 0.14; c = '#9fc6d6'; }
  return { top: mix(top, c, t), bot: mix(bot, c, t * 0.75) };
}

/* ---------------- отрисовка ---------------- */
let grassBase = PAL.grass, grassAlt = PAL.grass2, grassDark = PAL.grass3;
function updateSeasonColors(){
  const s = season();
  const winter = s.name === 'зима';
  grassBase  = mix(PAL.grass,  s.tint, winter ? 0.62 : 0.30);
  grassAlt   = mix(PAL.grass2, s.tint, winter ? 0.55 : 0.25);
  grassDark  = mix(PAL.grass3, s.tint, winter ? 0.45 : 0.20);
}
function drawSky(){
  const hour = S.time * 24;
  const sc = skyColors(hour);
  const wt = weatherTint(sc.top, sc.bot);
  const bands = 8;
  for (let i = 0; i < bands; i++){
    const t = i / (bands - 1);
    px(0, Math.floor(i * HORIZON / bands), W, Math.ceil(HORIZON / bands) + 1, mix(wt.top, wt.bot, t));
  }
}
function drawStars(){
  const nf = nightFactor();
  if (nf <= 0.02) return;
  for (let i = 0; i < 46; i++){
    const x = (i * 97) % W, y = (i * 53) % HORIZON;
    const tw = 0.55 + 0.45 * Math.sin(performance.now() / 700 + i);
    ctx.globalAlpha = nf * tw * 0.9;
    px(x, y, 1, 1, '#ffffff');
  }
  ctx.globalAlpha = 1;
}
function drawSunMoon(){
  const hour = S.time * 24;
  const isDay = hour >= 5.8 && hour <= 19.4;
  const hidden = S.weather === 'storm' || S.weather === 'fog';
  const dim = S.weather === 'snow' || S.weather === 'rain';
  const t = isDay ? (hour - 6) / 13 : ((hour < 6 ? hour + 18 : hour - 18) / 13);
  const ang = Math.PI * (1 - clamp(t, 0, 1));
  const x = W / 2 + Math.cos(ang) * 128;
  const y = HORIZON - 2 - Math.sin(ang) * 17;
  if (isDay && !hidden){
    const r = 6;
    if (dim) ctx.globalAlpha = 0.45;
    for (let dy = -r; dy <= r; dy++){
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      px(x - w, y + dy, w * 2 + 1, 1, PAL.gold);
    }
    px(x - 2, y - 3, 3, 2, shade(PAL.gold, 0.35));
    for (let i = 0; i < 8; i++){
      const a = i * Math.PI / 4 + performance.now() / 2600;
      px(Math.round(x + Math.cos(a) * 9), Math.round(y + Math.sin(a) * 9), 1, 1, PAL.gold2);
    }
    ctx.globalAlpha = 1;
  } else if (isDay){
    // светило закрыто тучами
    ctx.globalAlpha = 0.35;
    px(x - 4, y - 4, 8, 8, '#e9eef5');
    ctx.globalAlpha = 1;
  } else {
    const r = 5;
    for (let dy = -r; dy <= r; dy++){
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      px(x - w, y + dy, w * 2 + 1, 1, '#e6eeff');
    }
    px(x - 2, y - 1, 2, 1, '#c3cfe6'); px(x + 1, y + 1, 2, 1, '#c3cfe6');
  }
}
function drawClouds(){
  const stormy = S.weather === 'storm', foggy = S.weather === 'fog';
  for (const c of G.clouds){
    const dark = stormy ? 0.55 : (S.weather === 'rain' ? 0.3 : S.weather === 'snow' ? 0.12 : 0);
    const body = mix(PAL.white, '#5b667e', dark + (foggy ? 0.2 : 0));
    const shad = mix(body, '#39415a', 0.35);
    const x = Math.round(c.x), y = Math.round(c.y);
    const w = Math.round(c.w), h = Math.round(c.h);
    // мягкий силуэт из «ступенек»
    px(x + 6, y + h - 4, w - 12, 4, shad);
    px(x + 3, y + h - 7, w - 6, 4, body);
    px(x, y + h - 6, w, 3, body);
    px(x + 4, y + 2, w - 10, h - 5, body);
    px(x + 8, y, w - 20, 3, body);
    px(x + 5, y + 1, w - 14, 2, mix(body, '#ffffff', 0.35));
    if (dark > 0.1) px(x + 3, y + h - 3, w - 10, 1, shade(shad, -0.25));
  }
}
function drawSea(){
  const sc = weatherTint('#63b3e6', '#1c4a82');
  const rows = H - HORIZON;
  for (let y = HORIZON; y < H; y++){
    const t = (y - HORIZON) / rows;
    px(0, y, W, 1, mix(sc.top, sc.bot, Math.pow(t, 0.7)));
  }
  // мелководье у берега — полосой, а не пятном
  const isLand = n => n && n.t !== 'sea' && n.t !== 'sky';
  for (const t of G.tiles){
    if (t.t !== 'sea') continue;
    const x = t.x * TS, y = t.y * TS;
    let edge = false;
    const band = (bx, by, bw, bh, a) => {
      ctx.globalAlpha = a;
      for (let yy = 0; yy < bh; yy++)
        for (let xx = 0; xx < bw; xx++)
          if (((bx + xx + by + yy) & 1) === 0) px(bx + xx, by + yy, 1, 1, '#8fe0e8');
      ctx.globalAlpha = 1;
    };
    if (isLand(tileAt(t.x, t.y - 1))){ band(x, y, TS, 7, 0.30); edge = true; }
    if (isLand(tileAt(t.x, t.y + 1))){ band(x, y + TS - 5, TS, 5, 0.20); edge = true; }
    if (isLand(tileAt(t.x - 1, t.y))){ band(x, y, 6, TS, 0.26); edge = true; }
    if (isLand(tileAt(t.x + 1, t.y))){ band(x + TS - 5, y, 5, TS, 0.20); edge = true; }
    t.shallow = edge;
  }
  // блики и волны
  const time = performance.now();
  for (let i = 0; i < 52; i++){
    const seed = i * 137;
    const y = HORIZON + 2 + ((seed * 7) % (rows - 2));
    const depth = (y - HORIZON) / rows;
    const w = 2 + Math.floor(depth * 8);
    const speed = 3 + depth * 24;
    const x = ((time / 1000 * speed + seed * 5) % (W + w * 2)) - w;
    ctx.globalAlpha = 0.18 + depth * 0.35;
    px(Math.round(x), y, w, 1, mix(sc.top, '#ffffff', 0.6));
    ctx.globalAlpha = 1;
  }
  // солнечная дорожка
  const sx = sunX();
  for (let y = HORIZON; y < HORIZON + rows * 0.75; y++){
    const depth = (y - HORIZON) / rows;
    const w = 2 + Math.floor(depth * 9);
    const wob = Math.sin(y * 0.22 + time / 500) * (1 + depth * 3);
    ctx.globalAlpha = 0.09 * (1 - Math.abs(sx - W / 2) / 190);
    px(Math.round(sx + wob), y, w, 1, '#fff3c4');
    ctx.globalAlpha = 1;
  }
  // пена прибоя
  for (const t of G.tiles){
    if (t.t !== 'sea' || !t.shallow) continue;
    const ph = Math.sin(time / 240 + t.x * 0.8 + t.y * 1.4);
    if (ph < 0.15) continue;
    ctx.globalAlpha = (ph - 0.15) * 0.75;
    const x = t.x * TS, y = t.y * TS;
    if (tileAt(t.x, t.y - 1) && tileAt(t.x, t.y - 1).t !== 'sea' && tileAt(t.x, t.y - 1).t !== 'sky') px(x, y, TS, 1, '#eaf8ff');
    if (tileAt(t.x, t.y + 1) && tileAt(t.x, t.y + 1).t !== 'sea' && tileAt(t.x, t.y + 1).t !== 'sky') px(x, y + TS - 1, TS, 1, '#eaf8ff');
    if (tileAt(t.x - 1, t.y) && tileAt(t.x - 1, t.y).t !== 'sea' && tileAt(t.x - 1, t.y).t !== 'sky') px(x, y, 1, TS, '#eaf8ff');
    if (tileAt(t.x + 1, t.y) && tileAt(t.x + 1, t.y).t !== 'sea' && tileAt(t.x + 1, t.y).t !== 'sky') px(x + TS - 1, y, 1, TS, '#eaf8ff');
    ctx.globalAlpha = 1;
  }
}
function sunX(){
  const hour = S.time * 24;
  const isDay = hour >= 5.8 && hour <= 19.4;
  const t = isDay ? (hour - 6) / 13 : ((hour < 6 ? hour + 18 : hour - 18) / 13);
  const ang = Math.PI * (1 - clamp(t, 0, 1));
  return W / 2 + Math.cos(ang) * 128;
}
function drawTiles(){
  // тень-объём острова: смещённый силуэт под рельефом
  for (const t of G.tiles){
    if (t.t === 'sky' || t.t === 'sea') continue;
    ctx.globalAlpha = 0.22;
    px(t.x * TS + 2, t.y * TS + 3, TS, TS, '#0d2f52');
    ctx.globalAlpha = 1;
  }
  const hour = S.time * 24;
  const frozen = S.temp < -2;
  const snowCover = clamp((2 - S.temp) / 6, 0, 1);
  for (const t of G.tiles){
    if (t.t === 'sky' || t.t === 'sea') continue;
    const x = t.x * TS, y = t.y * TS, h = hash2(t.x, t.y);
    let base;
    if (t.t === 'water') base = frozen ? PAL.ice : PAL.water;
    else if (t.t === 'sand') base = PAL.sand;
    else if (t.t === 'path') base = PAL.dirt;
    else base = grassBase;
    px(x, y, TS, TS, base);

    if (t.t === 'grass'){
      if (h % 3 === 0) px(x + 2 + (h % 9), y + 3 + ((h >> 4) % 9), 1, 2, grassAlt);
      if (h % 7 === 0) px(x + 5 + ((h >> 8) % 7), y + 6 + ((h >> 6) % 7), 1, 1, grassDark);
      if (h % 41 === 0){ px(x + 4, y + 5, 1, 1, PAL.white); px(x + 5, y + 4, 1, 1, PAL.rose); }
    } else if (t.t === 'water'){
      const w1 = Math.floor((performance.now() / 260 + t.x * 7 + t.y * 3) % TS);
      px(x + w1, y + 4, 3, 1, frozen ? PAL.ice2 : mix(PAL.water, PAL.water3, 0.65));
      if (!frozen && h % 7 === 0) px(x + 3 + (h % 6), y + 9, 2, 1, mix(PAL.water, PAL.water2, 0.7));
    } else if (t.t === 'sand'){
      px(x + 2 + (h % 9), y + 4 + ((h >> 5) % 8), 1, 1, PAL.sand2);
      if (h % 9 === 0) px(x + 7, y + 11, 1, 1, PAL.sand2);
    } else {
      px(x + 1 + (h % 12), y + 3 + ((h >> 3) % 9), 1, 1, PAL.dirt2);
    }

    // текстура травы
    if (t.t === 'grass' && h % 5 === 0){
      for (let k = 0; k < 8; k++){
        const gx = x + (k * 5 + (h >> 3)) % TS, gy = y + (k * 11 + (h >> 5)) % TS;
        if (((gx + gy) & 1) === 0) px(gx, gy, 1, 1, grassAlt);
      }
    }
    // мягкий переход «трава — песок» и «трава — вода»
    for (const [dx, dy] of NEI4){
      const n = tileAt(t.x + dx, t.y + dy);
      if (!n) continue;
      if ((t.t === 'grass' && (n.t === 'sand' || n.t === 'water')) || (t.t === 'sand' && n.t === 'grass')){
        const col = (t.t === 'grass') ? (n.t === 'sand' ? PAL.sand : PAL.water3) : grassBase;
        for (let k = 0; k < 4; k++){
          if (((x + y + k) & 1) === 0) continue;
          if (dx === 0 && dy === -1) px(x + k, y, 1, 1, col);
          else if (dx === 0 && dy === 1) px(x + k, y + TS - 1, 1, 1, col);
          else if (dx === -1) px(x, y + k, 1, 1, col);
          else px(x + TS - 1, y + k, 1, 1, col);
        }
      }
    }
    if (t.burnt){ px(x, y, TS, TS, 'rgba(60,45,35,0.55)'); px(x + 3 + (h % 8), y + 4 + ((h >> 7) % 8), 2, 1, '#2a1f18'); }
    if (snowCover > 0 && t.t !== 'water'){
      ctx.globalAlpha = snowCover * 0.85;
      px(x, y, TS, TS, PAL.snow);
      ctx.globalAlpha = 1;
    }
    if (frozen && t.t === 'water'){
      px(x + 3 + (h % 6), y + 4 + ((h >> 6) % 6), 4, 1, PAL.ice2);
    }
  }
}
const CANOPY = [
  '.11111....',
  '111111111.',
  '1222222111',
  '1223333221',
  '1223333221',
  '.122332221.',
  '..1222221..',
  '...11111...'
];
function drawTree(o){
  const x = Math.round(o.x), y = Math.round(o.y);
  if (o.burnt){
    px(x - 6, y + 2, 12, 2, 'rgba(0,0,0,0.18)');
    px(x - 1, y - 8, 3, 9, '#3a2a20');
    px(x - 4, y - 10, 3, 2, '#3a2a20');
    px(x + 2, y - 12, 3, 2, '#3a2a20');
    px(x - 5, y - 6, 4, 1, '#241a14');
    px(x + 2, y - 8, 4, 1, '#241a14');
    return;
  }
  px(x - 6, y + 2, 12, 2, 'rgba(0,0,0,0.18)');
  px(x - 1, y - 9, 3, 11, PAL.wood);
  px(x - 1, y - 9, 1, 11, shade(PAL.wood, 0.18));
  for (let r = 0; r < CANOPY.length; r++){
    const row = CANOPY[r];
    for (let c = 0; c < row.length; c++){
      const ch = row[c];
      if (ch === '.') continue;
      const col = ch === '1' ? PAL.leaf2 : ch === '2' ? PAL.leaf : PAL.leaf3;
      px(x - 5 + c, y - 18 + r, 1, 1, col);
    }
  }
}
function drawHouse(o){
  const x = Math.round(o.x), y = Math.round(o.y);
  px(x - 9, y + 1, 18, 2, 'rgba(0,0,0,0.2)');
  if (o.ruins){
    px(x - 7, y - 6, 14, 7, '#6b5b4a');
    px(x - 9, y - 3, 3, 4, '#4d4034');
    px(x + 6, y - 4, 3, 5, '#4d4034');
    px(x - 4, y - 9, 2, 4, '#4d4034');
    px(x + 3, y - 10, 2, 5, '#4d4034');
    return;
  }
  const roof = o.hp < 2 ? '#8e2a1f' : PAL.roof;
  px(x - 7, y - 13, 14, 14, PAL.wall);
  px(x - 7, y - 1, 14, 2, PAL.wall2);
  px(x - 10, y - 17, 20, 4, PAL.roof2);
  px(x - 8, y - 21, 16, 4, roof);
  px(x - 6, y - 24, 12, 3, roof);
  px(x - 4, y - 26, 8, 2, roof);
  px(x + 3, y - 25, 3, 5, PAL.stone2);
  px(x - 2, y - 8, 4, 9, PAL.wood2);
  px(x - 1, y - 8, 1, 8, shade(PAL.wood, 0.2));
  const night = nightFactor();
  px(x - 5, y - 11, 3, 3, night > 0.35 ? PAL.glass : PAL.glass2);
  px(x + 2, y - 11, 3, 3, night > 0.35 ? PAL.glass : PAL.glass2);
  if (o.hp < 2){ px(x - 5, y - 11, 1, 3, '#6b4429'); px(x + 4, y - 6, 3, 1, '#8e2a1f'); }
}
function drawWell(o){
  const x = Math.round(o.x), y = Math.round(o.y);
  px(x - 7, y + 1, 14, 2, 'rgba(0,0,0,0.2)');
  px(x - 6, y - 6, 12, 8, PAL.stone2);
  px(x - 6, y - 6, 12, 3, PAL.stone);
  px(x - 4, y - 3, 8, 3, '#16324f');
  px(x - 4, y - 3, 8, 1, '#2d5f8f');
  px(x - 6, y - 16, 2, 11, PAL.wood);
  px(x + 4, y - 16, 2, 11, PAL.wood);
  px(x - 8, y - 20, 16, 4, PAL.roof2);
  px(x - 6, y - 23, 12, 3, PAL.roof);
  px(x - 1, y - 20, 2, 3, PAL.wood2);
}
function drawFence(o){
  const x = o.x, y = o.y, w = o.w, h = o.h;
  // задние столбы
  px(x - 2, y - 7, 2, 8, PAL.wood);
  px(x + w, y - 7, 2, 8, PAL.wood);
  px(x + (w >> 1) - 1, y - 7, 2, 8, PAL.wood);
  // передние столбы
  px(x - 2, y + h + 1, 2, 8, PAL.wood);
  px(x + w, y + h + 1, 2, 8, PAL.wood);
  px(x + (w >> 1) - 1, y + h + 1, 2, 8, PAL.wood);
  // перекладины
  px(x, y - 6, w, 1, PAL.wood2);
  px(x, y - 4, w, 1, PAL.wood2);
  px(x, y + h + 4, w, 1, PAL.wood2);
  px(x, y + h + 6, w, 1, PAL.wood2);
  px(x - 2, y - 7, 1, 2, shade(PAL.wood, 0.3));
  px(x + w + 1, y + h + 1, 1, 2, shade(PAL.wood, 0.3));
}
function drawRock(o){
  const x = Math.round(o.x), y = Math.round(o.y);
  px(x - 4, y, 8, 2, 'rgba(0,0,0,0.15)');
  px(x - 3, y - 3, 6, 3, PAL.stone2);
  px(x - 2, y - 4, 4, 2, PAL.stone);
  px(x - 2, y - 4, 2, 1, shade(PAL.stone, 0.25));
}
function drawPlot(p){
  const x = Math.round(p.x), y = Math.round(p.y);
  px(x - 7, y - 6, 14, 9, PAL.dirt);
  px(x - 7, y - 6, 14, 1, PAL.dirt2);
  for (let i = 0; i < 3; i++) px(x - 6, y - 4 + i * 3, 12, 1, PAL.dirt2);
  const sprouts = Math.min(5, Math.floor(p.growth / 20));
  for (let i = 0; i < sprouts; i++){
    const sx = x - 5 + i * 3;
    const sy = y - 2 - (i % 2);
    const ready = p.growth >= 100;
    const col = ready ? PAL.gold : (p.growth > 55 ? '#5ec063' : PAL.leaf);
    px(sx, sy - 3, 1, 4, col);
    px(sx - 1, sy - 4, 1, 1, col);
    px(sx + 1, sy - 4, 1, 1, col);
    if (ready){ px(sx, sy - 5, 1, 2, PAL.gold2); }
  }
  if (p.growth >= 100){
    const t = performance.now() / 260;
    px(x + 6, y - 7 + Math.round(Math.sin(t) * 2), 1, 1, PAL.gold);
    px(x - 7, y - 8 + Math.round(Math.cos(t) * 2), 1, 1, PAL.gold);
  }
}
function drawVillager(v){
  const bob = Math.round(Math.sin(v.bob) * 1.2);
  const x = Math.round(v.x), y = Math.round(v.y) + bob;
  px(x - 3, y + 1, 6, 2, 'rgba(0,0,0,0.18)');
  // ноги
  px(x - 2, y - 1, 2, 3, PAL.black);
  px(x + 1, y - 1, 2, 3, PAL.black);
  // тело
  px(x - 2, y - 5, 5, 5, v.shirt);
  px(x - 2, y - 5, 5, 1, shade(v.shirt, 0.18));
  // голова
  px(x - 2, y - 9, 5, 4, v.skin);
  px(x - 2, y - 10, 5, 2, v.hair);
  px(x + (v.dir > 0 ? 2 : -1), y - 7, 1, 1, PAL.black);

  if (S.weather === 'rain' || S.weather === 'storm'){
    const uc = v.shirt === '#c0392b' ? PAL.roof : '#3f6fa8';
    px(x - 5, y - 18, 11, 2, uc);
    px(x - 7, y - 16, 15, 1, shade(uc, -0.25));
    px(x - 5, y - 15, 11, 1, uc);
    px(x + 6, y - 15, 1, 9, PAL.wood);
  } else if (S.weather === 'snow'){
    px(x - 3, y - 11, 7, 2, PAL.rose);
    px(x - 2, y - 13, 5, 3, PAL.rose);
  } else if (S.weather === 'clear' && S.temp > 20){
    px(x - 2, y - 8, 5, 1, PAL.black);
  }
  if (S.happy > 70 && v.moving){
    px(x + 4, y - 12 + Math.round(Math.sin(v.bob * 2) * 1.5), 1, 1, PAL.gold);
  }
}
function drawMage(){
  const x = Math.round(G.mage.x), y = Math.round(G.mage.y);
  px(x - 5, y + 1, 10, 2, 'rgba(0,0,0,0.2)');
  px(x - 3, y - 8, 6, 9, '#5b4bd6');
  px(x - 3, y - 8, 6, 1, '#7f6ff0');
  px(x - 2, y - 12, 5, 4, PAL.skin);
  px(x - 5, y - 15, 11, 3, '#3f3a8c');
  px(x - 4, y - 18, 9, 3, '#3f3a8c');
  px(x - 1, y - 12, 2, 1, PAL.black);
  px(x + 4, y - 12, 2, 12, PAL.wood);
  px(x + 3, y - 14, 4, 4, PAL.gold);
  px(x + 4, y - 13, 2, 2, PAL.white);
  if (G.mage.cast > 0){
    const t = 1 - G.mage.cast;
    const r = 4 + t * 16;
    ctx.globalAlpha = Math.max(0, G.mage.cast) * 0.8;
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + 5, y - 12, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
function drawRenderables(){
  const list = [];
  for (const o of G.objects) list.push({ y:o.y, kind:'o', o });
  for (const p of G.plots)   list.push({ y:p.y, kind:'p', p });
  for (const v of G.villagers) list.push({ y:v.y, kind:'v', v });
  list.push({ y:G.mage.y, kind:'m' });
  list.sort((a, b) => a.y - b.y);
  for (const it of list){
    if (it.kind === 'o'){
      if (it.o.type === 'tree') drawTree(it.o);
      else if (it.o.type === 'house') drawHouse(it.o);
      else if (it.o.type === 'well') drawWell(it.o);
      else if (it.o.type === 'fence') drawFence(it.o);
      else drawRock(it.o);
    } else if (it.kind === 'p') drawPlot(it.p);
    else if (it.kind === 'v') drawVillager(it.v);
    else drawMage();
  }
}
function drawPrecip(){
  const showRain = S.weather === 'rain' || S.weather === 'storm';
  if (showRain){
    for (const d of G.drops) px(Math.round(d.x), Math.round(d.y), 1, d.len, S.weather === 'storm' ? '#9fd4f2' : '#7fc2e8');
  }
  if (S.weather === 'snow'){
    for (const f of G.flakes) px(Math.round(f.x), Math.round(f.y), f.sz, f.sz, '#ffffff');
  }
  for (const s of G.splashes){
    ctx.globalAlpha = Math.max(0, 1 - s.t);
    px(Math.round(s.x), Math.round(s.y), 2, 1, '#9fd4f2');
    px(Math.round(s.x) - 1, Math.round(s.y), 1, 1, '#cfe9ff');
    ctx.globalAlpha = 1;
  }
}
function drawFog(){
  if (S.fogAlpha <= 0.02) return;
  const a = S.fogAlpha;
  // общая дымка
  ctx.globalAlpha = a * 0.34;
  px(0, HORIZON, W, H - HORIZON, '#c6d2de');
  ctx.globalAlpha = 1;
  // полосы тумана
  for (let i = 0; i < 7; i++){
    const y = HORIZON - 6 + i * 24;
    const off = Math.round((performance.now() / 40 + i * 33) % 40);
    ctx.globalAlpha = a * (0.30 + (i % 2) * 0.10);
    px(0, y, W, 12, '#d6dee7');
    ctx.globalAlpha = a * 0.22;
    px(-off + 40, y + 5, 46, 8, '#eef3f8');
    px(W - off, y + 1, 34, 6, '#eef3f8');
  }
  ctx.globalAlpha = 1;
}
function drawWindFx(){
  if (S.weather !== 'wind' && S.weather !== 'storm') return;
  const n = S.weather === 'wind' ? 16 : 7;
  const t = performance.now() / 1000;
  for (let i = 0; i < n; i++){
    const seed = i * 37;
    const x = W - ((t * (150 + seed % 70) + seed * 20) % (W + 60));
    const y = 14 + (seed * 13) % (H - 30);
    const len = 6 + (seed % 9);
    ctx.globalAlpha = 0.35;
    px(Math.round(x), Math.round(y), len, 1, '#dff3ff');
    ctx.globalAlpha = 1;
  }
}
function drawBolts(){
  for (const b of G.bolts){
    if (b.caught) continue;
    const pulse = Math.round(Math.sin(performance.now() / 90) * 1.5);
    for (let i = 0; i < 4; i++){
      const y = b.y - 4 + i * 2;
      px(b.x - 2 + (i % 2), y, 4 - (i % 2), 1, i % 2 ? PAL.white : PAL.gold);
    }
    px(b.x - 4, b.y - 3 + pulse, 8, 1, PAL.gold);
    px(b.x - 1, b.y + 4, 2, 2, PAL.white);
  }
  for (const s of G.strikes){
    const a = Math.max(0, s.t / 0.28);
    ctx.globalAlpha = a;
    const steps = 7;
    for (let i = 0; i <= steps; i++){
      const t = i / steps;
      const jx = (i % 2 ? 3 : -3);
      const x = s.x1 + (s.x2 - s.x1) * t + jx * (1 - t);
      const y = s.y1 + (s.y2 - s.y1) * t;
      px(Math.round(x), Math.round(y), 3, 2, PAL.white);
      px(Math.round(x), Math.round(y), 1, 1, PAL.gold);
    }
    ctx.globalAlpha = 1;
  }
}
function drawParticles(){
  for (const p of G.parts){
    ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
    px(Math.round(p.x), Math.round(p.y), p.sz, p.sz, p.color);
    ctx.globalAlpha = 1;
  }
}
function drawBubbles(){
  ctx.font = 'bold 8px "Courier New", monospace';
  ctx.textBaseline = 'top';
  for (const v of G.villagers){
    if (!v.bubble) continue;
    const a = clamp(v.bubble.t * 2, 0, 1);
    const tw = ctx.measureText(v.bubble.text).width + 6;
    const x = clamp(v.x - tw / 2, 2, W - tw - 2);
    const y = v.y - 27;
    ctx.globalAlpha = a;
    px(x, y, tw, 11, '#f4f8ff');
    px(x + 1, y + 1, tw - 2, 9, '#22314a');
    ctx.fillStyle = '#16233c';
    ctx.fillText(v.bubble.text, x + 3, y + 2);
    ctx.globalAlpha = 1;
  }
}
function drawNightTint(){
  const nf = nightFactor();
  if (nf <= 0.02) return;
  ctx.globalAlpha = nf * 0.48;
  px(0, 0, W, H, '#0b1238');
  ctx.globalAlpha = 1;
}
function drawFlash(){
  if (S.flash <= 0.01) return;
  ctx.globalAlpha = clamp(S.flash, 0, 1) * 0.75;
  px(0, 0, W, H, '#ffffff');
  ctx.globalAlpha = 1;
}
let mouse = { x:-1, y:-1, inside:false };
function drawCursor(){
  if (!mouse.inside || S.mode !== 'play') return;
  const x = Math.round(mouse.x), y = Math.round(mouse.y);
  px(x - 3, y, 7, 1, PAL.gold);
  px(x, y - 3, 1, 7, PAL.gold);
  px(x - 1, y - 1, 3, 3, PAL.white);
}

function render(){
  ctx.save();
  if (S.shake > 0.2){
    ctx.translate(Math.round(rr(-S.shake, S.shake)), Math.round(rr(-S.shake, S.shake)));
  }
  updateSeasonColors();
  drawSky();
  drawStars();
  drawSunMoon();
  drawSea();
  drawTiles();
  drawClouds();
  drawRenderables();
  drawPrecip();
  drawFog();
  drawWindFx();
  drawNightTint();
  drawBolts();
  drawParticles();
  drawBubbles();
  drawFlash();
  drawCursor();
  ctx.restore();
}

/* ---------------- интерфейс ---------------- */
const UI = {
  day:document.getElementById('s-day'), clock:document.getElementById('s-clock'),
  temp:document.getElementById('s-temp'), water:document.getElementById('s-water'),
  mana:document.getElementById('s-mana'), happy:document.getElementById('s-happy'),
  harv:document.getElementById('s-harv'),
  logs:document.getElementById('logs'), obj:document.getElementById('obj'),
  btns:document.getElementById('wbtns'), overlay:document.getElementById('overlay'),
  card:document.getElementById('ov-card'), tooltip:document.getElementById('tooltip')
};
const BTN = [];

function drawIcon(cv, id){
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 16, 16);
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  if (id === 'sun'){
    for (let dy = -4; dy <= 4; dy++){
      const w = Math.floor(Math.sqrt(Math.max(0, 16 - dy * dy)));
      R(8 - w, 8 + dy, w * 2 + 1, 1, PAL.gold);
    }
    R(7, 5, 3, 2, '#ffe9a8');
    R(1, 7, 2, 2, PAL.gold2); R(13, 7, 2, 2, PAL.gold2);
    R(7, 1, 2, 2, PAL.gold2); R(7, 13, 2, 2, PAL.gold2);
  } else if (id === 'rain'){
    R(3, 3, 10, 4, '#c9d6e6'); R(1, 6, 14, 4, '#c9d6e6'); R(4, 1, 7, 3, '#c9d6e6');
    R(4, 11, 1, 3, '#54a0da'); R(8, 11, 1, 3, '#54a0da'); R(12, 10, 1, 3, '#54a0da');
  } else if (id === 'storm'){
    R(2, 2, 12, 5, '#6b7793'); R(0, 6, 16, 4, '#6b7793'); R(4, 0, 8, 3, '#6b7793');
    R(8, 9, 2, 4, PAL.gold); R(7, 13, 4, 2, PAL.gold); R(9, 10, 1, 3, PAL.white);
  } else if (id === 'snow'){
    R(3, 3, 10, 4, '#dce9f7'); R(1, 6, 14, 4, '#dce9f7'); R(4, 1, 7, 3, '#dce9f7');
    R(4, 12, 1, 1, '#ffffff'); R(8, 13, 1, 1, '#ffffff'); R(12, 12, 1, 1, '#ffffff');
  } else if (id === 'fog'){
    R(1, 4, 14, 3, '#b9c3cf'); R(3, 8, 11, 3, '#d3dae2'); R(0, 12, 15, 3, '#b9c3cf');
  } else if (id === 'wind'){
    R(1, 4, 10, 2, '#6ee7e7'); R(8, 3, 3, 2, '#6ee7e7');
    R(3, 8, 12, 2, '#9ef0ef');
    R(1, 12, 8, 2, '#6ee7e7'); R(6, 11, 3, 2, '#6ee7e7');
  }
}

function buildButtons(){
  UI.btns.innerHTML = '';
  BTN.length = 0;
  WORDER.forEach((id, i) => {
    const w = WEATHER[id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wbtn';
    b.dataset.id = id;
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 16;
    drawIcon(cv, w.icon);
    const box = document.createElement('span');
    box.innerHTML = '<b class="nm">' + w.name + '</b><span class="co">' +
      (w.cost ? w.cost + ' магии' : 'бесплатно') + ' · клавиша ' + (i + 1) + '</span>';
    const k = document.createElement('span');
    k.className = 'k'; k.textContent = String(i + 1);
    b.appendChild(cv); b.appendChild(box); b.appendChild(k);
    b.addEventListener('click', () => { auInit(); setWeather(id); });
    b.addEventListener('mouseenter', () => showTip(w.desc, b));
    b.addEventListener('mouseleave', hideTip);
    UI.btns.appendChild(b);
    BTN.push(b);
  });
}
function showTip(text, anchor){
  const r = anchor.getBoundingClientRect();
  UI.tooltip.textContent = text;
  UI.tooltip.style.left = (r.left + r.width / 2) + 'px';
  UI.tooltip.style.top = (r.top - 6) + 'px';
  UI.tooltip.classList.add('on');
}
function hideTip(){ UI.tooltip.classList.remove('on'); }

function fmtTime(){
  const total = S.time * 24;
  const h = Math.floor(total), m = Math.floor((total - h) * 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
function updateHUD(){
  const sn = season();
  UI.day.textContent = Math.min(S.day, S.lastDay) + '/' + S.lastDay;
  UI.clock.textContent = fmtTime();
  UI.temp.textContent = Math.round(S.temp) + '°';
  UI.water.textContent = Math.round(S.water) + '%';
  UI.mana.textContent = Math.floor(S.mana);
  UI.happy.textContent = Math.round(S.happy) + '%';
  UI.harv.textContent = S.harvest + '/' + S.needHarvest;

  UI.temp.parentElement.className = 'stat' + (S.temp > 30 ? ' warn' : (S.temp < 0 ? ' warn' : (S.temp >= 14 && S.temp <= 26 ? ' good' : '')));
  UI.water.parentElement.className = 'stat' + (S.water < 15 ? ' warn' : (S.water > 92 ? ' warn' : ''));
  UI.mana.parentElement.className  = 'stat' + (S.mana < 12 ? ' warn' : '');
  UI.happy.parentElement.className = 'stat' + (S.happy < 25 ? ' warn' : (S.happy > 70 ? ' good' : ''));
  UI.harv.parentElement.className = 'stat' + (S.harvest >= S.needHarvest ? ' good' : '');

  const items = [
    ['Дожить до конца ' + S.lastDay + '-го дня', 'День ' + Math.min(S.day, S.lastDay) + '/' + S.lastDay, S.day > S.lastDay],
    ['Собрать ' + S.needHarvest + ' урожаев', S.harvest + '/' + S.needHarvest, S.harvest >= S.needHarvest],
    ['Ловить молнии кликом', 'Поймано: ' + S.caught, S.caught > 0],
    ['Настроение выше нуля', Math.round(S.happy) + '%', false]
  ];
  UI.obj.innerHTML = items.map(it =>
    '<li class="' + (it[2] ? 'done' : '') + '"><b>' + it[0] + '</b> — ' + it[1] + '</li>').join('');
  const last = UI.obj.lastElementChild;
  if (last && S.happy < 25) last.style.color = '#e056a0';

  UI.logs.innerHTML = S.logs.slice(0, 6).map(l =>
    '<div class="k-' + l.kind + '"><span class="msg">' + l.msg + '</span></div>').join('');

  for (let i = 0; i < BTN.length; i++){
    const id = WORDER[i], w = WEATHER[id];
    const b = BTN[i];
    b.classList.toggle('sel', S.weather === id);
    b.classList.toggle('poor', w.cost > S.mana && S.weather !== id);
    const co = b.querySelector('.co');
    co.textContent = (w.cost ? w.cost + ' магии' : 'бесплатно') + ' · клавиша ' + (i + 1);
  }
}

/* ---------------- оверлеи ---------------- */
function showOverlay(html){
  UI.card.innerHTML = html;
  UI.overlay.classList.add('show');
}
function hideOverlay(){ UI.overlay.classList.remove('show'); }

function startCard(){
  showOverlay(
    '<h1>ПОГОДНЫЙ СТРАЖ</h1>' +
    '<h2>Ты — хранитель погоды над маленьким островом</h2>' +
    '<p>Управляй погодой клавишами <b>1</b>…<b>6</b>. Магия не бесконечна — трать её с умом.</p>' +
    '<ul>' +
    '<li><b>Полей грядки</b> — дождь и гроза дают воду, солнце сушит почву.</li>' +
    '<li><b>Лови молнии</b> — во время грозы кликни по облаку с разрядом (в тумане — вдвое больше магии).</li>' +
    '<li><b>Следи за настроением</b> — жителям нужна комфортная температура (14–26°) и политые поля.</li>' +
    '<li><b>Собирай урожай</b> — клик по созревшей грядке. Нужно ' + S.needHarvest + ' урожаев.</li>' +
    '<li><b>Продержись 6 дней</b> — сезоны меняются: весной поливай, летом увлажняй, зимой следи за теплом.</li>' +
    '</ul>' +
    '<div class="kbd-grid">' +
    '<div><b>1</b> Ясно · <b>2</b> Дождь</div>' +
    '<div><b>3</b> Гроза · <b>4</b> Снег</div>' +
    '<div><b>5</b> Туман · <b>6</b> Ветер</div>' +
    '<div><b>ЛКМ</b> урожай / молния / житель</div>' +
    '<div><b>Space</b> пауза · <b>R</b> заново</div>' +
    '<div><b>M</b> звук вкл/выкл</div>' +
    '</div>' +
    '<button class="ov-btn" id="ov-start" type="button">НАЧАТЬ</button>'
  );
  document.getElementById('ov-start').addEventListener('click', startGame);
}
function endCard(win){
  const sn = season();
  showOverlay(
    '<h1>' + (win ? 'ОСТРОВ СПАСЁН!' : 'ОСТРОВ ПОКИНУТ') + '</h1>' +
    '<h2>' + (win
      ? 'Ты удержал погоду и урожай. Жители благодарят стражу!'
      : (S.happy <= 0 ? 'Настроение жителей упало до нуля. Они разошлись по домам.'
                      : 'День ' + S.day + ' закончился, а урожая не хватило.')) + '</h2>' +
    '<div class="result">' +
    '<div><i>ДНЕЙ</i><b>' + Math.min(S.day, S.lastDay) + '</b></div>' +
    '<div><i>УРОЖАЙ</i><b>' + S.harvest + '/' + S.needHarvest + '</b></div>' +
    '<div><i>МОЛНИИ</i><b>' + S.caught + '</b></div>' +
    '<div><i>НАСТРОЕНИЕ</i><b>' + Math.round(S.happy) + '%</b></div>' +
    '<div><i>ПОЧВА</i><b>' + Math.round(S.water) + '%</b></div>' +
    '<div><i>СЕЗОН</i><b>' + sn.name + '</b></div>' +
    '</div>' +
    '<button class="ov-btn" id="ov-again" type="button">ИГРАТЬ СНОВА</button>'
  );
  document.getElementById('ov-again').addEventListener('click', startGame);
  if (win){
    tone(523, 0.12, 'square', 0.07); tone(659, 0.12, 'square', 0.07, 0.12);
    tone(784, 0.12, 'square', 0.07, 0.24); tone(1046, 0.3, 'square', 0.07, 0.36);
  } else {
    tone(330, 0.2, 'sawtooth', 0.07); tone(220, 0.2, 'sawtooth', 0.07, 0.2);
    tone(165, 0.4, 'sawtooth', 0.07, 0.4);
  }
}
function pauseCard(){
  showOverlay('<h1>ПАУЗА</h1><h2>Мир замер в ожидании</h2>' +
    '<p>Погода: <b>' + WEATHER[S.weather].name + '</b> · Сезон: <b>' + season().name + '</b></p>' +
    '<button class="ov-btn" id="ov-resume" type="button">ПРОДОЛЖИТЬ</button>');
  document.getElementById('ov-resume').addEventListener('click', togglePause);
}

/* ---------------- старт / рестарт ---------------- */
function startGame(){
  auInit();
  hideOverlay();
  S.mode = 'play';
  S.day = 1; S.time = 8/24; S.dayLen = 45;
  S.mana = 60; S.manaMax = 100; S.temp = 18; S.water = 55; S.happy = 70;
  S.harvest = 0; S.caught = 0; S.strikes = 0; S.flash = 0; S.shake = 0; S.fogAlpha = 0;
  S.weather = 'clear'; S.next = 'clear'; S.blend = 1;
  S.cur = Object.assign({}, WEATHER.clear);
  S.logs = [];
  genWorld((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  for (const p of G.plots) p.growth = rr(5, 28);
  log('Рассвет. Сезон: ' + season().name + '. Погода: ЯСНО.', 'good');
  log('Держи поля влажными и настроение жителей — подальше от нуля.', '');
  updateHUD();
}
function togglePause(){
  if (S.mode === 'play'){ S.mode = 'pause'; pauseCard(); }
  else if (S.mode === 'pause'){ S.mode = 'play'; hideOverlay(); }
}

/* ---------------- ввод ---------------- */
function canvasPos(e){
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.floor((e.clientX - r.left) / r.width * W),
    y: Math.floor((e.clientY - r.top) / r.height * H)
  };
}
const LINES = {
  good:['Красота-то какая!','Наконец-то дождь!','Солнце греет, душа радуется!','Урожай будет отменный!','Спасибо, страж!'],
  bad:['Нас мокро промочило!','Холодно как зимой...','Жарит невыносимо!','Где твоё обещание?','Настроение на нуле!'],
  neutral:['Погода меняется...','Интересно, что будет дальше?','Смотри на небо!','То ли дождь, то ли солнце...','Я верю в тебя, страж!']
};
function onDown(e){
  if (S.mode !== 'play') return;
  auInit();
  const p = canvasPos(e);
  // 1) молния в облаке
  for (const b of G.bolts){
    if (!b.caught && !b.done && Math.hypot(b.x - p.x, b.y - p.y) < 18){ catchLightning(b); return; }
  }
  // 2) грядка
  for (const pl of G.plots){
    if (Math.abs(pl.x - p.x) <= 9 && Math.abs(pl.y - 3 - p.y) <= 9){
      if (pl.growth >= 100) harvestPlot(pl);
      else {
        log('Грядка ещё растёт: ' + Math.round(pl.growth) + '%', '');
        tone(300, 0.08, 'triangle', 0.04);
      }
      return;
    }
  }
  // 3) житель
  for (const v of G.villagers){
    if (Math.hypot(v.x - p.x, v.y - 6 - p.y) < 11){
      const pool = S.happy > 60 ? LINES.good : S.happy < 30 ? LINES.bad : LINES.neutral;
      v.bubble = { text: pick(pool), t:2.6 };
      tone(520, 0.06, 'triangle', 0.04);
      return;
    }
  }
}
function onMove(e){
  const p = canvasPos(e);
  mouse.x = p.x; mouse.y = p.y; mouse.inside = true;
  // тултип по грядкам
  let tip = '';
  for (const pl of G.plots){
    if (Math.abs(pl.x - p.x) <= 9 && Math.abs(pl.y - 3 - p.y) <= 9){
      tip = pl.growth >= 100 ? 'Грядка: урожай готов! Кликни.' : 'Грядка: ' + Math.round(pl.growth) + '%';
    }
  }
  if (tip){
    const r = canvas.getBoundingClientRect();
    UI.tooltip.textContent = tip;
    UI.tooltip.style.left = (r.left + (p.x / W) * r.width) + 'px';
    UI.tooltip.style.top  = (r.top + (p.y / H) * r.height) + 'px';
    UI.tooltip.classList.add('on');
  } else if (!UI.tooltip.matches(':hover')) hideTip();
}
function onKey(e){
  const k = e.key.toLowerCase();
  if (k >= '1' && k <= '6'){ auInit(); setWeather(WORDER[parseInt(k, 10) - 1]); e.preventDefault(); return; }
  if (k === ' ' || e.code === 'Space'){ if (S.mode === 'play' || S.mode === 'pause') togglePause(); e.preventDefault(); return; }
  if (k === 'r' || k === 'к'){ startGame(); return; }
  if (k === 'm' || k === 'ь'){ toggleMute(); return; }
}
function toggleMute(){
  AU.muted = !AU.muted;
  if (AU.muted) auRain(0);
  document.getElementById('btn-mute').textContent = 'ЗВУК: ' + (AU.muted ? 'ВЫКЛ' : 'ВКЛ');
}

/* ---------------- главный цикл ---------------- */
let last = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (S.mode === 'play'){
    S.time += dt / S.dayLen;
    if (S.time >= 1){
      S.time -= 1;
      S.day++;
      log('Наступил день ' + S.day + '. Сезон: ' + season().name + '.', 'good');
      tone(660, 0.1, 'triangle', 0.05); tone(880, 0.16, 'triangle', 0.05, 0.1);
      if (S.day > S.lastDay){
        if (S.harvest >= S.needHarvest){ S.mode = 'win'; endCard(true); }
        else { S.mode = 'lose'; endCard(false); }
      }
    }
    S.blend = Math.min(1, S.blend + dt / 1.2);
    updateSim(dt);
    updateWorld(dt);
    const snd = S.weather === 'storm' ? 0.075 : S.weather === 'rain' ? 0.045 : 0;
    auRain(snd);
    if (S.happy <= 0 && S.mode === 'play'){ S.mode = 'lose'; endCard(false); }
  } else {
    // меню/пауза/финал — мир живёт, симуляция стоит
    S.blend = Math.min(1, S.blend + dt / 1.2);
    updateWorld(dt * 0.6);
  }

  S.hudT += dt;
  if (S.hudT > 0.12){ S.hudT = 0; updateHUD(); }

  render();
  requestAnimationFrame(loop);
setTimeout(resize, 80);
}

/* ---------------- ресайз ---------------- */
function resize(){
  const wrap = document.getElementById('canvasWrap');
  const availW = Math.max(220, wrap.clientWidth - 16);
  const availH = Math.max(140, window.innerHeight - 272);
  let s = Math.min(availW / W, availH / H);
  s = s >= 1 ? Math.floor(s) : Math.max(0.35, s);
  canvas.style.width  = (W * s) + 'px';
  canvas.style.height = (H * s) + 'px';
}

/* ---------------- старт ---------------- */
buildButtons();
genWorld((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
for (const p of G.plots) p.growth = rr(5, 28);
S.cur = Object.assign({}, WEATHER.clear);
updateHUD();
startCard();
resize();

canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerleave', () => { mouse.inside = false; });
window.addEventListener('keydown', onKey);
window.addEventListener('resize', resize);
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-mute').addEventListener('click', toggleMute);
document.getElementById('btn-restart').addEventListener('click', startGame);
requestAnimationFrame(loop);
