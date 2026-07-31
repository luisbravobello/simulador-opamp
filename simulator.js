/* ================================================================
   OpAmp Lab Simulator — simulator.js
   Light theme · Loading animation · Canvas rendering
   ================================================================ */

'use strict';

// ═══════════════════════════════════════════════════════
//  LOADING SCREEN SEQUENCE
// ═══════════════════════════════════════════════════════

const LOAD_STEPS = 5;
let currentStep = 0;
let currentPct  = 0;

function setLoaderStep(n) {
  // Mark previous steps done
  for (let i = 1; i < n; i++) {
    const step = document.getElementById(`ls-${i}`);
    if (step) {
      step.classList.remove('active');
      step.classList.add('done');
      const icon = document.getElementById(`ls-icon-${i}`);
      if (icon) icon.textContent = '✓';
    }
  }
  // Activate current step
  const cur = document.getElementById(`ls-${n}`);
  if (cur) {
    cur.classList.add('active');
    const icon = document.getElementById(`ls-icon-${n}`);
    if (icon) icon.textContent = '◐';
  }
  currentStep = n;
}

function setLoaderPct(pct) {
  currentPct = pct;
  const bar  = document.getElementById('loader-bar');
  const txt  = document.getElementById('loader-pct');
  const ring = document.getElementById('loader-ring');
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = Math.round(pct) + '%';
  // SVG ring: circumference ≈ 213
  if (ring) ring.style.strokeDashoffset = 213 * (1 - pct / 100);
}

function hideLoader() {
  const overlay = document.getElementById('loader-overlay');
  if (overlay) {
    // Mark all steps done
    for (let i = 1; i <= LOAD_STEPS; i++) {
      const step = document.getElementById(`ls-${i}`);
      if (step) { step.classList.remove('active'); step.classList.add('done'); }
      const icon = document.getElementById(`ls-icon-${i}`);
      if (icon) icon.textContent = '✓';
    }
    setLoaderPct(100);
    setTimeout(() => overlay.classList.add('hidden'), 300);
  }
}

// ═══════════════════════════════════════════════════════
//  GLOBAL ANIMATION STATE
// ═══════════════════════════════════════════════════════
const animState = { 1: true, 2: true };
let phase   = 0;
let lastT   = null;

// ═══════════════════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(target).classList.add('active');
    if (target === 'step3') drawBode3();
    if (target === 'step4') { drawCircuit4(); drawBode4(); }
    if (target === 'step1') drawCircuit1();
    if (target === 'step2') drawCircuit2();
  });
});

// ═══════════════════════════════════════════════════════
//  PLAY / PAUSE
// ═══════════════════════════════════════════════════════
function togglePlay(n) {
  animState[n] = !animState[n];
  const btn = document.getElementById(`play${n}`);
  btn.textContent = animState[n] ? '▶ Animado' : '⏸ Pausado';
}
function resetSim(n) { phase = 0; animState[n] = true; const b = document.getElementById(`play${n}`); if(b) b.textContent='▶ Animado'; }

// ═══════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function dB(x) { return 20 * Math.log10(Math.abs(x) + 1e-12); }

// Theme colours for canvas (light mode)
const C = {
  wire:     '#94a3b8',
  wireDark: '#64748b',
  gnd:      '#cbd5e1',
  blue:     '#2563eb',
  red:      '#dc2626',
  amber:    '#f59e0b',
  violet:   '#7c3aed',
  emerald:  '#059669',
  opAmp:    '#7c3aed',
  opAmpFg:  'rgba(124,58,237,0.08)',
  gridLine: 'rgba(0,0,0,0.06)',
  gridMid:  'rgba(0,0,0,0.12)',
  axisLbl:  '#94a3b8',
  fclabel:  '#64748b',
  chartBg:  '#f9fafb',
};

// Responsive canvas
function resizeCanvas(canvas) {
  const wrap = canvas.parentElement;
  const dpr  = window.devicePixelRatio || 1;
  const w    = wrap.clientWidth;
  const h    = wrap.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return [w, h, ctx];
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [w, h, ctx];
}

// Grid for waveform canvases
function drawGrid(ctx, w, h, nCols = 12, nRows = 8) {
  ctx.strokeStyle = C.gridLine;
  ctx.lineWidth = 1;
  for (let i = 0; i <= nCols; i++) {
    const x = (i / nCols) * w;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let j = 0; j <= nRows; j++) {
    const y = (j / nRows) * h;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.strokeStyle = C.gridMid;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
}

// Draw a waveform
function drawWave(ctx, w, h, data, color, lineWidth = 2.5, alpha = 1) {
  if (!data || data.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = color;
  ctx.shadowBlur = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = (i / (data.length - 1)) * w;
    const y = h / 2 - (data[i] / 14) * (h / 2 - 22);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

// Time axis labels
function drawTimeAxis(ctx, w, h, freq, cycles = 3) {
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.fillStyle = C.axisLbl;
  ctx.textAlign = 'center';
  const T = 1 / freq;
  for (let c = 0; c <= cycles; c++) {
    const x = (c / cycles) * w;
    ctx.strokeStyle = C.gnd;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, h - 18); ctx.lineTo(x, h - 13); ctx.stroke();
    const ms = ((c * T) * 1000).toFixed(1);
    ctx.fillText(`${ms}ms`, x, h - 3);
  }
}

// ═══════════════════════════════════════════════════════
//  PARAMETER READERS
// ═══════════════════════════════════════════════════════
const gv = id => parseFloat(document.getElementById(id).value);

function getParams1() { return { R: gv('r1')*1e3, C: gv('c1')*1e-6, f: gv('f1'), A: gv('a1') }; }
function getParams2() { return { R: gv('r2')*1e3, C: gv('c2')*1e-6, f: gv('f2'), A: gv('a2'), noise: gv('noise2')/100 }; }
function getParams3() { return { R: gv('r3')*1e3, C: gv('c3')*1e-6, K: gv('k3'), ftest: Math.pow(10, gv('ftest3')) }; }
function getParams4() {
  return {
    R1: gv('r4a')*1e3, R2: gv('r4b')*1e3,
    C1: gv('c4a')*1e-6, C2: gv('c4b')*1e-6,
    Q: gv('q4'),
    probe: Math.pow(10, gv('probe4')),
    type: document.getElementById('sk-lp').classList.contains('active') ? 'lp' : 'hp'
  };
}

// ═══════════════════════════════════════════════════════
//  SLIDER BINDINGS
// ═══════════════════════════════════════════════════════
function bindSlider(id, lblId, fmt) {
  const sl = document.getElementById(id);
  const lb = document.getElementById(lblId);
  if (!sl || !lb) return;
  const upd = () => { lb.textContent = fmt(parseFloat(sl.value)); };
  sl.addEventListener('input', upd);
  upd();
}
const fmtK  = v => `${v} kΩ`;
const fmtUF = v => `${v.toFixed(1)} µF`;
const fmtHz = v => `${v} Hz`;
const fmtV  = v => `${v.toFixed(1)} V`;
const fmtPct= v => `${v.toFixed(0)}%`;
const fmtN  = v => `${v.toFixed(1)}`;
const fmtQ  = v => Math.abs(v-0.707)<0.01 ? `0.707 (Butterworth)` : v<0.5 ? `${v.toFixed(2)} (Sobredamp.)` : v>1 ? `${v.toFixed(2)} (Pico)` : `${v.toFixed(2)}`;
const fmtLogF = v => { const f=Math.pow(10,v); return f<1000?`${f.toFixed(0)} Hz`:`${(f/1000).toFixed(2)} kHz`; };

bindSlider('r1','r1-val',fmtK); bindSlider('c1','c1-val',fmtUF);
bindSlider('f1','f1-val',fmtHz); bindSlider('a1','a1-val',fmtV);

bindSlider('r2','r2-val',fmtK); bindSlider('c2','c2-val',fmtUF);
bindSlider('f2','f2-val',fmtHz); bindSlider('a2','a2-val',fmtV);
bindSlider('noise2','noise2-val',fmtPct);

bindSlider('r3','r3-val',fmtK); bindSlider('c3','c3-val',fmtUF);
bindSlider('k3','k3-val',fmtN); bindSlider('ftest3','ftest3-val',fmtLogF);

bindSlider('r4a','r4a-val',fmtK); bindSlider('r4b','r4b-val',fmtK);
bindSlider('c4a','c4a-val',fmtUF); bindSlider('c4b','c4b-val',fmtUF);
bindSlider('q4','q4-val',fmtQ); bindSlider('probe4','probe4-val',fmtLogF);

// ═══════════════════════════════════════════════════════
//  SIGNAL MATH
// ═══════════════════════════════════════════════════════
function squareWave(t, f, A)   { return ((t*f)%1 < 0.5) ? A : -A; }
function triangleWave(t, f, A) { const ph=(t*f)%1; return ph<0.5 ? A*(4*ph-1) : A*(3-4*ph); }
function integrateSquare(t, f, A, RC) {
  const ph = (t*f)%1;
  const amp = A / (2*RC*f);
  return ph < 0.5 ? -(A/RC)*(ph/f) + amp : -((-A)/RC)*((ph-0.5)/f) - amp;
}
function differentiateTriangle(t, f, A, RC) {
  const ph = (t*f)%1;
  return -RC * ((ph<0.5) ? 4*A*f : -4*A*f);
}

// ═══════════════════════════════════════════════════════
//  CIRCUIT DRAWING PRIMITIVES (Light theme)
// ═══════════════════════════════════════════════════════
function drawOpAmp(ctx, cx, cy, size) {
  const h = size, w = size*0.85;
  ctx.strokeStyle = C.opAmp; ctx.fillStyle = C.opAmpFg; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx-w/2, cy-h/2);
  ctx.lineTo(cx-w/2, cy+h/2);
  ctx.lineTo(cx+w/2, cy);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.opAmp;
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('+', cx-w/2+12, cy-h/6+4);
  ctx.fillText('−', cx-w/2+12, cy+h/6+4);
  ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Op-Amp', cx+2, cy+h/2+13);
}

function drawResistor(ctx, x1, y1, x2, y2, label, color) {
  const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
  const nx=dx/len, ny=dy/len;
  const zigLen=len*0.6, zigStart=len*0.2;
  ctx.strokeStyle=color; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x1+nx*zigStart, y1+ny*zigStart); ctx.stroke();
  const n=6, step=zigLen/n, amp=6, px=-ny, py=nx;
  ctx.beginPath(); ctx.moveTo(x1+nx*zigStart, y1+ny*zigStart);
  for (let i=0; i<=n; i++) {
    const ox=x1+nx*(zigStart+i*step), oy=y1+ny*(zigStart+i*step);
    ctx.lineTo(ox+px*(i%2===0?1:-1)*amp, oy+py*(i%2===0?1:-1)*amp);
  }
  ctx.lineTo(x2,y2); ctx.stroke();
  if (label) {
    ctx.font='600 11px "JetBrains Mono", monospace';
    ctx.fillStyle=color; ctx.textAlign='center';
    ctx.fillText(label, (x1+x2)/2, (y1+y2)/2-10);
  }
}

function drawCapacitor(ctx, x, y, label, horiz, color) {
  ctx.strokeStyle=color; ctx.lineWidth=2;
  const gap=5, plate=13;
  if (horiz) {
    ctx.beginPath(); ctx.moveTo(x-22,y); ctx.lineTo(x-gap,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-gap,y-plate); ctx.lineTo(x-gap,y+plate); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+gap,y-plate); ctx.lineTo(x+gap,y+plate); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+gap,y); ctx.lineTo(x+22,y); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(x,y-22); ctx.lineTo(x,y-gap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-plate,y-gap); ctx.lineTo(x+plate,y-gap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-plate,y+gap); ctx.lineTo(x+plate,y+gap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y+gap); ctx.lineTo(x,y+22); ctx.stroke();
  }
  if (label) {
    ctx.font='600 11px "JetBrains Mono", monospace';
    ctx.fillStyle=color; ctx.textAlign='center';
    ctx.fillText(label, horiz?x:x+22, horiz?y-14:y);
  }
}

function wireH(ctx, x1, x2, y, col=C.wire) {
  ctx.strokeStyle=col; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
}
function wireV(ctx, x, y1, y2, col=C.wire) {
  ctx.strokeStyle=col; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(x,y1); ctx.lineTo(x,y2); ctx.stroke();
}
function junction(ctx, x, y, col=C.blue) {
  ctx.beginPath(); ctx.arc(x,y,3.5,0,2*Math.PI);
  ctx.fillStyle=col; ctx.fill();
}
function cLabel(ctx, x, y, text, col='#64748b') {
  ctx.font='600 12px "JetBrains Mono", monospace';
  ctx.fillStyle=col; ctx.textAlign='center';
  ctx.fillText(text, x, y);
}
function cLabelSmall(ctx, x, y, text, col='#94a3b8') {
  ctx.font='500 10px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle=col; ctx.textAlign='right';
  ctx.fillText(text, x, y);
}

// ── CIRCUIT 1: Integrador ──────────────────────────────
function drawCircuit1(t) {
  if (t === undefined) t = typeof circTime !== 'undefined' ? circTime : 0;
  const canvas = document.getElementById('circuit1');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = 700, H = 215;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = 'auto';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

  const p = getParams1();
  const my = H/2, gnd = H - 20;
  const x0=36, x1=106, x2=206, x3=306, x4=418, x5=530;
  const opy = my - 22, opSize = 80;
  const fbY = opy - 24;

  // GND dashed rail
  ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=1; ctx.setLineDash([5,4]);
  ctx.beginPath(); ctx.moveTo(x0, gnd); ctx.lineTo(x5+50, gnd); ctx.stroke();
  ctx.setLineDash([]);

  // GND labels
  for (const gx of [x0+20, x3+18, x4-10]) {
    ctx.font='600 9px "JetBrains Mono", monospace';
    ctx.fillStyle='#94a3b8'; ctx.textAlign='center';
    ctx.fillText('GND', gx, gnd + 11);
  }

  // Vin source circle
  ctx.beginPath(); ctx.arc(x0+20, my, 18, 0, 2*Math.PI);
  ctx.strokeStyle=C.blue; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(37,99,235,0.06)'; ctx.fill();
  cLabel(ctx, x0+20, my+4, '~', C.blue);
  wireV(ctx, x0+20, my+18, gnd, C.blue);
  cLabel(ctx, x0+20, my-32, 'Vin', C.blue);
  compLabel(ctx, x0+20, my+28, `${p.f}Hz`, '#eff6ff', '#1d4ed8');

  // R series input
  wireH(ctx, x0+38, x1, my);
  drawResistor(ctx, x1, my, x2, my, 'R', C.blue);
  compLabel(ctx, (x1+x2)/2, my+14, `${gv('r1')} kΩ`, '#0f172a', '#ffffff');
  junction(ctx, x2, my);

  // C feedback path (top)
  wireV(ctx, x2, my, fbY, C.wire);
  wireH(ctx, x2, x4+8, fbY, C.wire);
  drawCapacitor(ctx, (x2 + x4 + 8) / 2, fbY, 'C', true, C.red);
  compLabel(ctx, (x2 + x4 + 8) / 2, fbY - 14, `${gv('c1')} µF`, '#dc2626', '#ffffff');
  wireV(ctx, x4+8, fbY, opy, C.wire);
  junction(ctx, x4+8, opy);

  // Op-amp
  drawOpAmp(ctx, x3+50, opy, opSize);

  // Inverting input wire
  wireH(ctx, x2, x3+13, my);
  wireV(ctx, x3+13, my, opy+13, C.wire);
  wireH(ctx, x3+13, x3+20, opy+13, C.wire);

  // Non-inverting to GND
  wireV(ctx, x3+20, opy-13, gnd-20, C.wire);
  wireH(ctx, x3+20, x4-10, gnd-20, C.wire);
  wireV(ctx, x4-10, gnd-20, gnd, C.wire);

  // Output
  wireH(ctx, x4+8, x5, opy);
  ctx.beginPath(); ctx.arc(x5+14, opy, 14, 0, 2*Math.PI);
  ctx.strokeStyle=C.red; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(220,38,38,0.07)'; ctx.fill();
  cLabel(ctx, x5+14, opy+4, '~', C.red);
  cLabel(ctx, x5+14, opy-30, 'Vout', C.red);

  // Animated Current Flow Dots
  if (t > 0 && animState[1]) {
    drawCurrentFlow(ctx, [
      { pts: [{x: x0+20, y: my}, {x: x2, y: my}], color: '#2563eb', speed: 60 },
      { pts: [{x: x2, y: my}, {x: x2, y: fbY}, {x: x4+8, y: fbY}, {x: x4+8, y: opy}], color: '#dc2626', speed: 50, phaseOff: 0.3 },
      { pts: [{x: x4+8, y: opy}, {x: x5+14, y: opy}], color: '#ea580c', speed: 65 }
    ], t);
  }

  cLabelSmall(ctx, W-8, H-5, 'Integrador Op-Amp');
}

// ── CIRCUIT 2: Diferenciador ──────────────────────────
function drawCircuit2(t) {
  if (t === undefined) t = typeof circTime !== 'undefined' ? circTime : 0;
  const canvas = document.getElementById('circuit2');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = 700, H = 215;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = 'auto';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

  const p = getParams2();
  const my = H/2, gnd = H - 20;
  const x0=36, x2=206, x3=306, x4=418, x5=530;
  const opy = my - 22, opSize = 80;
  const fbY = opy - 24;

  // GND dashed rail
  ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=1; ctx.setLineDash([5,4]);
  ctx.beginPath(); ctx.moveTo(x0, gnd); ctx.lineTo(x5+55, gnd); ctx.stroke();
  ctx.setLineDash([]);

  // Vin triangle source
  ctx.beginPath(); ctx.arc(x0+20, my, 18, 0, 2*Math.PI);
  ctx.strokeStyle=C.blue; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(37,99,235,0.06)'; ctx.fill();
  cLabel(ctx, x0+20, my+4, '△', C.blue);
  wireV(ctx, x0+20, my+18, gnd, C.blue);
  cLabel(ctx, x0+20, my-32, 'Vin', C.blue);
  compLabel(ctx, x0+20, my+28, `${p.f}Hz`, '#eff6ff', '#1d4ed8');

  // C series input
  const cMid = (x0+38 + x2) / 2;
  wireH(ctx, x0+38, cMid-22, my);
  drawCapacitor(ctx, cMid, my, 'C', true, C.red);
  compLabel(ctx, cMid, my + 16, `${gv('c2')} µF`, '#dc2626', '#ffffff');
  wireH(ctx, cMid+22, x2, my);
  junction(ctx, x2, my);

  // R feedback (top)
  wireV(ctx, x2, my, fbY, C.wire);
  wireH(ctx, x2, x4+8, fbY, C.wire);
  drawResistor(ctx, x2+(x4+8-x2)*0.2, fbY, x2+(x4+8-x2)*0.8, fbY, 'R', C.blue);
  compLabel(ctx, (x2+x4+8)/2, fbY - 14, `${gv('r2')} kΩ`, '#0f172a', '#ffffff');
  wireV(ctx, x4+8, fbY, opy, C.wire);
  junction(ctx, x4+8, opy);

  // Op-amp
  drawOpAmp(ctx, x3+50, opy, opSize);
  wireH(ctx, x2, x3+18, my);
  wireV(ctx, x3+13, my, opy+13, C.wire);
  wireH(ctx, x3+13, x3+20, opy+13, C.wire);
  wireV(ctx, x3+20, opy-13, gnd-20, C.wire);
  wireH(ctx, x3+20, x4-10, gnd-20, C.wire);
  wireV(ctx, x4-10, gnd-20, gnd, C.wire);

  // GND labels
  for (const gx of [x0+20, x3+20, x4-10]) {
    ctx.font='600 9px "JetBrains Mono", monospace';
    ctx.fillStyle='#94a3b8'; ctx.textAlign='center';
    ctx.fillText('GND', gx, gnd + 11);
  }

  // Output
  wireH(ctx, x4+8, x5, opy);
  ctx.beginPath(); ctx.arc(x5+14, opy, 14, 0, 2*Math.PI);
  ctx.strokeStyle=C.red; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(220,38,38,0.07)'; ctx.fill();
  cLabel(ctx, x5+14, opy+4, '□', C.red);
  cLabel(ctx, x5+14, opy-30, 'Vout', C.red);

  // Animated Current Flow Dots
  if (t > 0 && animState[2]) {
    const flowColor = p.noise > 0.3 ? '#d97706' : '#2563eb';
    drawCurrentFlow(ctx, [
      { pts: [{x: x0+20, y: my}, {x: x2, y: my}], color: '#2563eb', speed: 65 },
      { pts: [{x: x2, y: my}, {x: x2, y: fbY}, {x: x4+8, y: fbY}, {x: x4+8, y: opy}], color: flowColor, speed: 55, phaseOff: 0.2 },
      { pts: [{x: x4+8, y: opy}, {x: x5+14, y: opy}], color: '#dc2626', speed: 70 }
    ], t);
  }

  cLabelSmall(ctx, W-8, H-5, 'Diferenciador Op-Amp');
}

// ── CIRCUIT 4: Sallen-Key ─────────────────────────────
function drawCircuit4(t) {
  if (t === undefined) t = typeof circTime !== 'undefined' ? circTime : 0;
  const canvas = document.getElementById('circuit4');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = 700, H = 230;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = 'auto';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

  const p = getParams4();
  const type = p.type;
  const my = H/2, gnd = H - 20;
  const opy = my - 28, opSize = 80;
  const opx = 455;
  const outx = opx + 46;

  // GND dashed rail
  ctx.strokeStyle='#e2e8f0'; ctx.setLineDash([5,4]); ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(18, gnd); ctx.lineTo(W-12, gnd); ctx.stroke();
  ctx.setLineDash([]);

  // Title
  ctx.fillStyle = '#0a0a0a';
  ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Sallen-Key ${type==='lp'?'Pasa-Bajas':'Pasa-Altas'} — 2° Orden`, 16, 16);

  // Vin source
  ctx.beginPath(); ctx.arc(46, my, 18, 0, 2*Math.PI);
  ctx.strokeStyle=C.blue; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(37,99,235,0.06)'; ctx.fill();
  cLabel(ctx, 46, my+4, '~', C.blue);
  wireV(ctx, 46, my+18, gnd, C.blue);
  cLabel(ctx, 46, my-32, 'Vin', C.blue);

  const c1col = type==='lp' ? C.blue : C.red;
  const c2col = type==='lp' ? C.red  : C.blue;

  // Series element 1
  wireH(ctx, 64, 100, my);
  if (type==='lp') {
    drawResistor(ctx, 100, my, 188, my, 'R₁', c1col);
    compLabel(ctx, 144, my + 14, `${gv('r4a')} kΩ`, '#0f172a', '#ffffff');
  } else {
    drawCapacitor(ctx, 144, my, 'C₁', true, c1col);
    compLabel(ctx, 144, my + 16, `${gv('c4a')} µF`, '#dc2626', '#ffffff');
  }
  wireH(ctx, 188, 224, my); junction(ctx, 224, my);

  // Series element 2
  if (type==='lp') {
    drawResistor(ctx, 224, my, 312, my, 'R₂', c2col);
    compLabel(ctx, 268, my + 14, `${gv('r4b')} kΩ`, '#0f172a', '#ffffff');
  } else {
    drawCapacitor(ctx, 268, my, 'C₂', true, c2col);
    compLabel(ctx, 268, my + 16, `${gv('c4b')} µF`, '#dc2626', '#ffffff');
  }
  wireH(ctx, 312, 348, my); junction(ctx, 348, my);

  // Shunt element at node1 (x=224)
  wireV(ctx, 224, my, my+48, C.wire);
  if (type==='lp') {
    drawCapacitor(ctx, 224, my+72, 'C₁', false, C.red);
    compLabel(ctx, 255, my+72, `${gv('c4a')} µF`, '#dc2626', '#ffffff');
  } else {
    drawResistor(ctx, 224, my+50, 224, gnd-2, 'R₁', C.blue);
    compLabel(ctx, 255, my+65, `${gv('r4a')} kΩ`, '#0f172a', '#ffffff');
  }
  wireV(ctx, 224, my+98, gnd, C.wire);

  // Op-amp
  drawOpAmp(ctx, opx, opy, opSize);

  // Inv input wiring
  wireH(ctx, 348, opx-33, my);
  wireV(ctx, opx-33, my, opy+13, C.wire);
  wireH(ctx, opx-33, opx-27, opy+13, C.wire);

  // Non-inv to GND
  wireV(ctx, opx-27, opy-13, gnd-20, C.wire);
  wireH(ctx, opx-27, opx+2, gnd-20, C.wire);
  wireV(ctx, opx+2, gnd-20, gnd, C.wire);

  // GND labels
  for (const gx of [46, opx-27, opx+2]) {
    ctx.font='600 9px "JetBrains Mono", monospace';
    ctx.fillStyle='#94a3b8'; ctx.textAlign='center';
    ctx.fillText('GND', gx, gnd+11);
  }

  // Output wire
  wireH(ctx, outx, outx+66, opy);

  // Feedback loop
  wireV(ctx, outx+56, opy, opy-36, C.wire);
  wireH(ctx, 348, outx+56, opy-36, C.wire);
  junction(ctx, 348, opy-36);
  wireV(ctx, 348, my, opy-36, C.wire);

  // Feedback element label
  const lbl = type==='lp' ? `C₂ (${gv('c4b')} µF)` : `R₂ (${gv('r4b')} kΩ)`;
  const lcolor = type==='lp' ? C.red : C.blue;
  compLabel(ctx, 385, opy-45, lbl, lcolor === C.red ? '#dc2626' : '#0f172a', '#ffffff');

  // Output terminal circle
  const termX = outx + 66 + 16;
  ctx.beginPath(); ctx.arc(termX, opy, 14, 0, 2*Math.PI);
  ctx.strokeStyle=C.red; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(220,38,38,0.07)'; ctx.fill();
  cLabel(ctx, termX, opy+4, '~', C.red);
  cLabel(ctx, termX, opy-30, 'Vout', C.red);

  ctx.font='500 10px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle=C.opAmp; ctx.textAlign='left';
  ctx.fillText('(Ganancia = 1)', outx-20, opy+50);

  // Animated Current Flow Dots
  if (t > 0) {
    drawCurrentFlow(ctx, [
      { pts: [{x: 46, y: my}, {x: 224, y: my}, {x: 348, y: my}, {x: opx-33, y: my}], color: '#2563eb', speed: 50 },
      { pts: [{x: 224, y: my}, {x: 224, y: gnd}], color: '#a855f7', speed: 45, phaseOff: 0.4 },
      { pts: [{x: outx+56, y: opy}, {x: outx+56, y: opy-36}, {x: 348, y: opy-36}, {x: 348, y: my}], color: '#dc2626', speed: 55, phaseOff: 0.2 },
      { pts: [{x: outx, y: opy}, {x: termX, y: opy}], color: '#ea580c', speed: 65 }
    ], t);
  }

  cLabelSmall(ctx, W-8, H-5, `Sallen-Key ${type==='lp'?'LP':'HP'}`);
}

// ═══════════════════════════════════════════════════════
//  INFO BOX UPDATES
// ═══════════════════════════════════════════════════════
function set(id, txt) { const el=document.getElementById(id); if(el) el.textContent=txt; }

function updateInfo1(p) {
  const tau=p.R*p.C, w=2*Math.PI*p.f, gain=1/(w*tau);
  const voutAmp=p.A/(2*Math.PI*p.f*tau);
  set('tau1', (tau*1000).toFixed(2)+' ms');
  set('gain1', gain.toFixed(3));
  set('vout1-amp', Math.min(voutAmp,14).toFixed(2)+' V');
}
function updateInfo2(p) {
  const tau=p.R*p.C, voutAmp=tau*4*p.A*p.f, fc=1/(2*Math.PI*tau);
  set('tau2', (tau*1000).toFixed(2)+' ms');
  set('vout2-amp', Math.min(voutAmp,14).toFixed(2)+' V');
  set('fcross2', fc.toFixed(1)+' Hz');
}
function updateInfo3(p) {
  const fc=1/(2*Math.PI*p.R*p.C), wc=1/(p.R*p.C);
  set('fc3', fc.toFixed(2)+' Hz');
  set('wc3', wc.toFixed(1)+' rad/s');
  set('gaindc3', dB(p.K).toFixed(1)+' dB');
  const w=2*Math.PI*p.ftest, ratio=w/wc;
  set('mag-passive', dB(1/Math.sqrt(1+ratio*ratio)).toFixed(1)+' dB');
  set('mag-active',  dB(p.K/Math.sqrt(1+ratio*ratio)).toFixed(1)+' dB');
  set('phase-passive', (-Math.atan(ratio)*180/Math.PI).toFixed(1)+'°');
}
function updateInfo4(p) {
  const w0=1/Math.sqrt(p.R1*p.R2*p.C1*p.C2), fc=w0/(2*Math.PI);
  set('w0-sk', w0.toFixed(2)+' rad/s');
  set('fc4-theory', fc<1000 ? fc.toFixed(2)+' Hz' : (fc/1000).toFixed(3)+' kHz');
  const fcExp=findCutoff4(p);
  set('fc4-exp', fcExp ? (fcExp<1000?fcExp.toFixed(2)+' Hz':(fcExp/1000).toFixed(3)+' kHz') : '—');
  set('probe-mag', getMag4(p,p.probe).toFixed(1)+' dB');
  set('probe-phase', getPhase4(p,p.probe).toFixed(1)+'°');
  const obs=document.getElementById('sk-obs');
  if (obs) obs.innerHTML=`El filtro Sallen-Key ${p.type==='lp'?'pasa-bajas':'pasa-altas'} de 2.° orden presenta una pendiente de <strong>−40 dB/década</strong>. Para Q = ${p.Q.toFixed(3)} ${Math.abs(p.Q-0.707)<0.02?'(Butterworth) — respuesta maximamente plana':p.Q>1?'se observa un <strong>pico de resonancia</strong> cerca de f<sub>c</sub>':'— respuesta sobre-amortiguada'}. Usa la sonda para encontrar empíricamente el punto −3 dB.`;
}

// ═══════════════════════════════════════════════════════
//  FILTER MATH
// ═══════════════════════════════════════════════════════
function getMag3(p, f, isActive) {
  const wc=1/(p.R*p.C), ratio=(2*Math.PI*f)/wc, gain=isActive?p.K:1;
  return dB(gain/Math.sqrt(1+ratio*ratio));
}
function getPhase3(f, R, C) {
  return -Math.atan((2*Math.PI*f)/(1/(R*C)))*180/Math.PI;
}
function getMag4(p, f) {
  const w0=1/Math.sqrt(p.R1*p.R2*p.C1*p.C2), w=2*Math.PI*f;
  const re=w0*w0-w*w, im=(w0/p.Q)*w;
  const den=Math.sqrt(re*re+im*im);
  return p.type==='lp' ? dB(w0*w0/den) : dB(w*w/den);
}
function getPhase4(p, f) {
  const w0=1/Math.sqrt(p.R1*p.R2*p.C1*p.C2), w=2*Math.PI*f;
  const ph = -Math.atan2((w0/p.Q)*w, w0*w0-w*w)*180/Math.PI;
  return p.type==='lp' ? ph : 180+ph;
}
function findCutoff4(p) {
  const ref=getMag4(p,1); let lo=1, hi=1e6;
  for (let i=0; i<60; i++) {
    const mid=Math.sqrt(lo*hi), m=getMag4(p,mid);
    if (p.type==='lp') { if(m>ref-3) lo=mid; else hi=mid; }
    else { if(m<ref-3) lo=mid; else hi=mid; }
  }
  return Math.sqrt(lo*hi);
}

// ═══════════════════════════════════════════════════════
//  BODE GRID HELPERS
// ═══════════════════════════════════════════════════════
function drawBodeGrid(ctx, pw, ph, fMin, fMax, yMin, yMax, nY=6) {
  const decades=Math.log10(fMax/fMin);
  for (let d=0; d<=decades; d++) {
    for (let sub of [1,2,3,4,5,6,7,8,9]) {
      const f=fMin*Math.pow(10,d)*sub;
      if (f>fMax) break;
      const x=(Math.log10(f/fMin)/decades)*pw;
      ctx.strokeStyle = sub===1 ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.04)';
      ctx.lineWidth   = sub===1 ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,ph); ctx.stroke();
    }
  }
  for (let i=0; i<=nY; i++) {
    const y=ph-(i/nY)*ph;
    ctx.strokeStyle='rgba(0,0,0,0.07)'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(pw,y); ctx.stroke();
  }
}

function drawBodeXLabels(ctx, pw, padL, yBase, fMin, fMax) {
  const decades=Math.log10(fMax/fMin);
  ctx.font='600 9px "JetBrains Mono", monospace';
  ctx.fillStyle=C.axisLbl; ctx.textAlign='center';
  for (let d=0; d<=decades; d++) {
    const f=fMin*Math.pow(10,d);
    const x=padL+(d/decades)*pw;
    const lbl=f<1000?`${f.toFixed(0)}Hz`:f<1e6?`${f/1000}kHz`:`${f/1e6}MHz`;
    ctx.fillText(lbl, x, yBase+20);
  }
}

function drawBodeCurve(ctx, fMin, fMax, magFn, fToX, mToY, color, lw=2, alpha=1, dash=[]) {
  ctx.save();
  ctx.globalAlpha=alpha; ctx.strokeStyle=color; ctx.lineWidth=lw;
  ctx.shadowColor=color; ctx.shadowBlur=4;
  if (dash.length) ctx.setLineDash(dash);
  ctx.beginPath();
  for (let i=0; i<=500; i++) {
    const f=fMin*Math.pow(fMax/fMin,i/500);
    const y=mToY(magFn(f));
    if (i===0) ctx.moveTo(fToX(f),y); else ctx.lineTo(fToX(f),y);
  }
  ctx.stroke(); ctx.restore();
}

function drawDashedH(ctx, x1, x2, y, color, alpha=0.4) {
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.setLineDash([6,4]); ctx.strokeStyle=color; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════
//  BODE — PASO 3
// ═══════════════════════════════════════════════════════
function drawBode3() {
  const p=getParams3();
  updateInfo3(p);
  _drawBode3Mag(p);
  _drawBode3Phase(p);
}

function _drawBode3Mag(p) {
  const canvas=document.getElementById('bode3mag'); if(!canvas) return;
  const [W,H,ctx]=resizeCanvas(canvas);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#f9fafb'; ctx.fillRect(0,0,W,H);

  const fMin=1,fMax=1e5,dBmin=-60,dBmax=30;
  const padL=52,padR=20,padT=16,padB=36;
  const pw=W-padL-padR, ph=H-padT-padB;

  ctx.save(); ctx.translate(padL,padT);
  drawBodeGrid(ctx,pw,ph,fMin,fMax,dBmin,dBmax);
  ctx.font='600 9px "JetBrains Mono", monospace';
  ctx.fillStyle=C.axisLbl; ctx.textAlign='right';
  for (let d=dBmin; d<=dBmax; d+=10) {
    const y=ph-((d-dBmin)/(dBmax-dBmin))*ph;
    ctx.fillText(`${d}`,  -5, y+3);
  }
  ctx.restore();

  const fToX=f=>padL+(Math.log10(f/fMin)/Math.log10(fMax/fMin))*pw;
  const dToY=d=>padT+ph-((d-dBmin)/(dBmax-dBmin))*ph;

  drawBodeCurve(ctx,fMin,fMax,f=>getMag3(p,f,false),fToX,dToY,C.blue,2.5);
  drawBodeCurve(ctx,fMin,fMax,f=>getMag3(p,f,true), fToX,dToY,C.red, 2.5);
  drawDashedH(ctx,padL,padL+pw,dToY(getMag3(p,1,false)-3),C.blue,0.35);
  drawDashedH(ctx,padL,padL+pw,dToY(getMag3(p,1,true)-3), C.red, 0.35);

  // Probe
  const tx=fToX(p.ftest);
  const mpas=getMag3(p,p.ftest,false), mact=getMag3(p,p.ftest,true);
  ctx.save(); ctx.setLineDash([4,3]); ctx.strokeStyle=C.amber; ctx.lineWidth=1.2; ctx.globalAlpha=0.7;
  ctx.beginPath(); ctx.moveTo(tx,padT); ctx.lineTo(tx,padT+ph); ctx.stroke(); ctx.restore();
  ctx.beginPath(); ctx.arc(tx,dToY(mpas),5,0,2*Math.PI); ctx.fillStyle=C.amber; ctx.fill();
  ctx.beginPath(); ctx.arc(tx,dToY(mact),5,0,2*Math.PI); ctx.fillStyle=C.amber; ctx.fill();

  // fc line
  const fc=1/(2*Math.PI*p.R*p.C), fcx=fToX(fc);
  ctx.save(); ctx.setLineDash([6,4]); ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(fcx,padT); ctx.lineTo(fcx,padT+ph); ctx.stroke(); ctx.restore();
  ctx.font='600 9px "JetBrains Mono", monospace'; ctx.fillStyle='#64748b'; ctx.textAlign='center';
  ctx.fillText(`fc=${fc.toFixed(1)}Hz`, fcx, padT+ph+22);

  drawBodeXLabels(ctx,pw,padL,padT+ph,fMin,fMax);
  ctx.font='600 10px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle='#94a3b8'; ctx.textAlign='center';
  ctx.save(); ctx.translate(14,padT+ph/2); ctx.rotate(-Math.PI/2); ctx.fillText('Magnitud (dB)',0,0); ctx.restore();
}

function _drawBode3Phase(p) {
  const canvas=document.getElementById('bode3phase'); if(!canvas) return;
  const [W,H,ctx]=resizeCanvas(canvas);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#f9fafb'; ctx.fillRect(0,0,W,H);

  const fMin=1,fMax=1e5,phMin=-100,phMax=10;
  const padL=52,padR=20,padT=10,padB=36;
  const pw=W-padL-padR, ph=H-padT-padB;

  ctx.save(); ctx.translate(padL,padT);
  drawBodeGrid(ctx,pw,ph,fMin,fMax,phMin,phMax,4);
  ctx.font='600 9px "JetBrains Mono", monospace'; ctx.fillStyle=C.axisLbl; ctx.textAlign='right';
  for (let d=phMin; d<=phMax; d+=20) {
    const y=ph-((d-phMin)/(phMax-phMin))*ph;
    ctx.fillText(`${d}°`,-5,y+3);
  }
  ctx.restore();

  const fToX=f=>padL+(Math.log10(f/fMin)/Math.log10(fMax/fMin))*pw;
  const pToY=p2=>padT+ph-((p2-phMin)/(phMax-phMin))*ph;
  drawBodeCurve(ctx,fMin,fMax,f=>getPhase3(f,p.R,p.C),fToX,pToY,C.blue,2.5);

  const fc=1/(2*Math.PI*p.R*p.C), fcx=fToX(fc);
  ctx.save(); ctx.setLineDash([6,4]); ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(fcx,padT); ctx.lineTo(fcx,padT+ph); ctx.stroke(); ctx.restore();

  drawBodeXLabels(ctx,pw,padL,padT+ph,fMin,fMax);
  ctx.font='600 10px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle='#94a3b8'; ctx.textAlign='center';
  ctx.save(); ctx.translate(14,padT+ph/2); ctx.rotate(-Math.PI/2); ctx.fillText('Fase (°)',0,0); ctx.restore();
}

// ═══════════════════════════════════════════════════════
//  BODE — PASO 4 (Sallen-Key)
// ═══════════════════════════════════════════════════════
function drawBode4() {
  const p=getParams4();
  updateInfo4(p);

  const canvas=document.getElementById('bode4mag'); if(!canvas) return;
  const [W,H,ctx]=resizeCanvas(canvas);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#f9fafb'; ctx.fillRect(0,0,W,H);

  const fMin=1,fMax=1e6,dBmin=-80,dBmax=20;
  const padL=52,padR=20,padT=16,padB=36;
  const pw=W-padL-padR, ph=H-padT-padB;

  ctx.save(); ctx.translate(padL,padT);
  drawBodeGrid(ctx,pw,ph,fMin,fMax,dBmin,dBmax,6);
  ctx.font='600 9px "JetBrains Mono", monospace'; ctx.fillStyle=C.axisLbl; ctx.textAlign='right';
  for (let d=dBmin; d<=dBmax; d+=10) {
    const y=ph-((d-dBmin)/(dBmax-dBmin))*ph;
    ctx.fillText(`${d}`,-5,y+3);
  }
  ctx.restore();

  const fToX=f=>padL+(Math.log10(f/fMin)/Math.log10(fMax/fMin))*pw;
  const dToY=d=>padT+ph-((d-dBmin)/(dBmax-dBmin))*ph;

  // 1st-order reference
  const pRef={R:Math.sqrt(p.R1*p.R2), C:Math.sqrt(p.C1*p.C2), K:1};
  if (p.type==='lp') {
    drawBodeCurve(ctx,fMin,fMax,f=>getMag3(pRef,f,false),fToX,dToY,C.emerald,1.5,0.65,[7,5]);
  } else {
    drawBodeCurve(ctx,fMin,fMax,f=>{
      const wc=1/(pRef.R*pRef.C), ratio=wc/(2*Math.PI*f);
      return dB(1/Math.sqrt(1+ratio*ratio));
    },fToX,dToY,C.emerald,1.5,0.65,[7,5]);
  }

  // Sallen-Key 2nd order
  drawBodeCurve(ctx,fMin,fMax,f=>getMag4(p,f),fToX,dToY,C.violet,3);

  // -3dB line
  const refMag=p.type==='lp'?getMag4(p,1):getMag4(p,fMax);
  const y3dB=dToY(refMag-3);
  drawDashedH(ctx,padL,padL+pw,y3dB,C.red,0.7);
  ctx.font='600 9px "JetBrains Mono", monospace'; ctx.fillStyle=C.red; ctx.textAlign='right';
  ctx.fillText('−3 dB', padL+pw-4, y3dB-5);

  // f0 line
  const w0=1/Math.sqrt(p.R1*p.R2*p.C1*p.C2), fc=w0/(2*Math.PI);
  if (fc>=fMin && fc<=fMax) {
    const fcx=fToX(fc);
    ctx.save(); ctx.setLineDash([6,4]); ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(fcx,padT); ctx.lineTo(fcx,padT+ph); ctx.stroke(); ctx.restore();
    ctx.font='600 9px "JetBrains Mono", monospace'; ctx.fillStyle='#64748b'; ctx.textAlign='center';
    const fcStr=fc<1000?`f₀=${fc.toFixed(1)}Hz`:`f₀=${(fc/1000).toFixed(2)}kHz`;
    ctx.fillText(fcStr, fcx, padT+ph+20);
  }

  // Probe dot
  const px=fToX(p.probe), pmag=getMag4(p,p.probe);
  const py=dToY(pmag);
  ctx.save(); ctx.setLineDash([4,3]); ctx.strokeStyle=C.amber; ctx.lineWidth=1; ctx.globalAlpha=0.6;
  ctx.beginPath(); ctx.moveTo(px,padT); ctx.lineTo(px,padT+ph); ctx.stroke(); ctx.restore();
  ctx.beginPath(); ctx.arc(px,py,7,0,2*Math.PI);
  ctx.fillStyle=C.amber; ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
  const probeStr=p.probe<1000?`${p.probe.toFixed(0)}Hz,${pmag.toFixed(1)}dB`:`${(p.probe/1000).toFixed(2)}kHz,${pmag.toFixed(1)}dB`;
  ctx.font='600 9px "JetBrains Mono", monospace'; ctx.fillStyle='#92400e'; ctx.textAlign='left';
  ctx.fillText(probeStr, px+10, py);

  drawBodeXLabels(ctx,pw,padL,padT+ph,fMin,fMax);
  ctx.font='600 10px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle='#94a3b8'; ctx.textAlign='center';
  ctx.save(); ctx.translate(14,padT+ph/2); ctx.rotate(-Math.PI/2); ctx.fillText('Magnitud (dB)',0,0); ctx.restore();
}

// ═══════════════════════════════════════════════════════
//  WAVEFORM ANIMATION (Steps 1 & 2)
// ═══════════════════════════════════════════════════════

// ===================================================================
//  CURRENT FLOW DOTS
// ===================================================================
function drawCurrentFlow(ctx, segs, timeS) {
  var DOT_R = 4;
  for (var si = 0; si < segs.length; si++) {
    var seg = segs[si];
    var pts = seg.pts, color = seg.color;
    var speed = seg.speed !== undefined ? seg.speed : 55;
    var spacing = seg.spacing !== undefined ? seg.spacing : 32;
    var phaseOff = seg.phaseOff !== undefined ? seg.phaseOff : 0;
    var lens = [], total = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      lens.push(d); total += d;
    }
    if (total < 2) continue;
    var travel = ((timeS * speed + phaseOff * spacing) % spacing + spacing) % spacing;
    for (var dist = travel; dist < total; dist += spacing) {
      var rem = dist, px, py;
      for (var j = 0; j < lens.length; j++) {
        if (rem <= lens[j]) {
          var t = rem / lens[j];
          px = pts[j].x + t * (pts[j+1].x - pts[j].x);
          py = pts[j].y + t * (pts[j+1].y - pts[j].y);
          break;
        }
        rem -= lens[j];
      }
      if (px !== undefined) {
        ctx.save();
        ctx.shadowColor = color; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(px, py, DOT_R, 0, 2*Math.PI);
        ctx.fillStyle = color; ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(px, py, DOT_R * 0.42, 0, 2*Math.PI);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.restore();
      }
    }
  }
}

function compLabel(ctx, x, y, text, bg, fg) {
  if (bg === undefined) bg = '#0f0f0f';
  if (fg === undefined) fg = '#ffffff';
  ctx.save();
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  var tw = ctx.measureText(text).width;
  var pad = 5, rh = 15;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x - tw/2 - pad, y - rh/2, tw + pad*2, rh, 3);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, x, y + 4);
  ctx.restore();
}
const CYCLES=3, N_PTS=600;

var circTime = 0;
function animateWaves(timestamp) {
  if (lastT!==null) phase += (timestamp-lastT)/1000;
  lastT = timestamp;
  circTime = timestamp / 1000;
  var s1 = document.getElementById('step1').classList.contains('active');
  var s2 = document.getElementById('step2').classList.contains('active');
  var s4 = document.getElementById('step4').classList.contains('active');
  if (s1) { drawCircuit1(circTime); drawWave1(); }
  if (s2) { drawCircuit2(circTime); drawWave2(); }
  if (s4) { drawCircuit4(circTime); }
  requestAnimationFrame(animateWaves);
}

function drawWave1() {
  const canvas=document.getElementById('wave1'); if(!canvas) return;
  const [W,H,ctx]=resizeCanvas(canvas);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#f9fafb'; ctx.fillRect(0,0,W,H);
  drawGrid(ctx,W,H);

  const p=getParams1();
  updateInfo1(p);
  const tau=p.R*p.C, T=1/p.f, totalTime=CYCLES*T, dt=totalTime/N_PTS;
  const speedFactor1 = (CYCLES / p.f) * 0.5; const tOff = animState[1] ? phase * speedFactor1 : 0;
  const vin=[], vout=[];
  for (let i=0; i<N_PTS; i++) {
    const t=i*dt+tOff;
    vin.push(squareWave(t,p.f,p.A));
    const amp=p.A/(2*Math.PI*p.f*tau);
    vout.push(clamp(integrateSquare(t,p.f,p.A,tau)*(amp<14?1:14/amp),-14,14));
  }
  drawWave(ctx,W,H,vin, C.blue, 2.5);
  drawWave(ctx,W,H,vout,C.red,  2.5);
  drawTimeAxis(ctx,W,H,p.f,CYCLES);
  // Y labels
  ctx.font='600 10px "JetBrains Mono", monospace'; ctx.fillStyle='#94a3b8'; ctx.textAlign='right';
  for (const v of [-p.A,0,p.A]) {
    const y=H/2-(v/14)*(H/2-22);
    ctx.fillText(`${v}V`, 38, y+3);
  }
}

function drawWave2() {
  const canvas=document.getElementById('wave2'); if(!canvas) return;
  const [W,H,ctx]=resizeCanvas(canvas);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#f9fafb'; ctx.fillRect(0,0,W,H);
  drawGrid(ctx,W,H);

  const p=getParams2();
  updateInfo2(p);
  const tau=p.R*p.C, T=1/p.f, totalTime=CYCLES*T, dt=totalTime/N_PTS;
  const speedFactor2 = (CYCLES / p.f) * 0.5; const tOff = animState[2] ? phase * speedFactor2 : 0;
  const vin=[], vout_ideal=[], vout_noisy=[];
  for (let i=0; i<N_PTS; i++) {
    const t=i*dt+tOff;
    vin.push(triangleWave(t,p.f,p.A));
    const ideal=clamp(differentiateTriangle(t,p.f,p.A,tau),-14,14);
    vout_ideal.push(ideal);
    const nAmp=p.noise*ideal*0.6;
    const noisy=nAmp*(Math.sin(2*Math.PI*t*p.f*11+1.2)*0.5+Math.sin(2*Math.PI*t*p.f*23+2.4)*0.3+Math.sin(2*Math.PI*t*p.f*37+0.8)*0.2+(Math.random()-0.5)*p.noise*1.5);
    vout_noisy.push(clamp(ideal+noisy,-14,14));
  }
  drawWave(ctx,W,H,vin,       C.blue, 2.5);
  if (p.noise>0) drawWave(ctx,W,H,vout_noisy,C.amber,1.5,0.85);
  drawWave(ctx,W,H,vout_ideal,C.red,  2.5);
  drawTimeAxis(ctx,W,H,p.f,CYCLES);
  ctx.font='600 10px "JetBrains Mono", monospace'; ctx.fillStyle='#94a3b8'; ctx.textAlign='right';
  for (const v of [-p.A,0,p.A]) {
    const y=H/2-(v/14)*(H/2-22);
    ctx.fillText(`${v}V`,38,y+3);
  }
}

// ═══════════════════════════════════════════════════════
//  SALLEN-KEY TYPE TOGGLE
// ═══════════════════════════════════════════════════════
function setSKType(type) {
  document.getElementById('sk-lp').classList.toggle('active',type==='lp');
  document.getElementById('sk-hp').classList.toggle('active',type==='hp');
  drawCircuit4();
  drawBode4();
}

// ═══════════════════════════════════════════════════════
//  SLIDER CHANGE LISTENERS
// ═══════════════════════════════════════════════════════
function attachListeners(ids, fn) {
  ids.forEach(id => { const el=document.getElementById(id); if(el) el.addEventListener('input',fn); });
}
attachListeners(['r3','c3','k3','ftest3'], drawBode3);
attachListeners(['r4a','r4b','c4a','c4b','q4','probe4'], drawBode4);

// Resize debounce
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(() => { drawBode3(); drawBode4(); drawCircuit1(); drawCircuit2(); drawCircuit4(); }, 150);
});

// ═══════════════════════════════════════════════════════
//  INIT — Loading Sequence
// ═══════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  setLoaderPct(0);

  const steps = [
    { pct: 20, fn: () => { setLoaderStep(1); } },
    { pct: 40, fn: () => { setLoaderStep(2); drawCircuit1(); } },
    { pct: 58, fn: () => { setLoaderStep(3); drawCircuit2(); } },
    { pct: 76, fn: () => { setLoaderStep(4); drawBode3(); } },
    { pct: 92, fn: () => { setLoaderStep(5); drawCircuit4(); drawBode4(); } },
    { pct: 100, fn: () => { hideLoader(); requestAnimationFrame(animateWaves); } },
  ];

  let delay = 0;
  steps.forEach((s, i) => {
    delay += 300 + i * 80;
    setTimeout(() => {
      s.fn();
      setLoaderPct(s.pct);
    }, delay);
  });
});
