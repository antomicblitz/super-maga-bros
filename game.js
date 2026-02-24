// ============================================================
//  SUPER MAGA BROS. — A Phaser 3 Platformer
// ============================================================

// ── Constants ────────────────────────────────────────────────
const GW = 800, GH = 500;
const TILE = 32;
const WORLD_W = 6400, WORLD_H = 600;
const GROUND_Y = GH - TILE;          // 468
const PX = 2;                         // pixel‑art scale (each art‑pixel = 2×2)

// ── Colour palette (from reference images) ───────────────────
const C = {
    capRed:    '#CC2222', capDark: '#991111',
    gold:      '#FFD700', goldDark: '#CC9900',
    skin:      '#DEB887', skinDk: '#C49A6C',
    navy:      '#1A1A4E', navyLt: '#2A2A6E',
    white:     '#FFFFFF', black: '#111111',
    tie:       '#CC0000',
    pants:     '#121240',
    brick:     '#B84A28', brickDk: '#8B3A1F', brickLt: '#D06840',
    grass:     '#3CB043', grassDk: '#2E8B36',
    dirt:      '#8B6914', dirtDk: '#6B4914',
    sky:       '#87CEEB', skyLt: '#C8E8FF',
    hill:      '#4CAF50', hillDk: '#388E3C',
    hillFar:   '#66BB6A', hillFarDk:'#43A047',
    eGreen:    '#44AA44', eGreenDk:'#2D882D', eEye:'#FF3333',
    starOut:   '#DAA520',
    flagRed:   '#CC0000', flagWhite:'#FFFFFF', poleBrown:'#8B7355',
};

// ── Enemy & Power-Up type tables ─────────────────────────────
const ENEMY_TYPES = [
    { name: 'journalist', speed: 60,  score: 200, tint: 0x4488FF },
    { name: 'scientist',  speed: 80,  score: 300, tint: null },
    { name: 'girl',       speed: 100, score: 150, tint: 0xFF88CC },
];
const POWER_TYPES = [
    { name: 'MAGA Hat',        duration: Infinity },
    { name: 'Censor Bar',      duration: 10 },
    { name: 'Classified Docs', duration: 15 },
];

// ── Tiny SFX via Web Audio ──────────────────────────────────
let audioCtx;
function sfx(freq, freq2, dur, type, vol) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (freq2) o.frequency.linearRampToValueAtTime(freq2, audioCtx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.15, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
}
const SFX = {
    jump()  { sfx(250, 500, 0.15, 'square', 0.12); },
    coin()  { sfx(880, 1200, 0.08, 'square', 0.10); sfx(1200, 1400, 0.08, 'square', 0.10); },
    stomp() { sfx(200, 80, 0.12, 'triangle', 0.15); },
    die()     { sfx(400, 100, 0.4, 'sawtooth', 0.12); },
    powerup() { sfx(523, 1047, 0.2, 'square', 0.12); setTimeout(() => sfx(784, 1568, 0.15, 'square', 0.10), 100); },
    win()     { sfx(523, 523, 0.12, 'square', 0.10);
              setTimeout(() => sfx(659, 659, 0.12, 'square', 0.10), 130);
              setTimeout(() => sfx(784, 784, 0.12, 'square', 0.10), 260);
              setTimeout(() => sfx(1047, 1047, 0.25, 'square', 0.12), 400); },
};

// ── Audio helper (tries external asset, falls back to Web Audio) ─
function playSound(scene, key, fallbackFn) {
    if (window.ASSETS_LOADED && window.ASSETS_LOADED.audio && scene.cache.audio.has(key)) {
        try { scene.sound.play(key); return; } catch (e) { /* fall through */ }
    }
    if (fallbackFn) fallbackFn();
}

// ── Canvas helpers ──────────────────────────────────────────
function mkCanvas(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function px(ctx, x, y, s, col) { ctx.fillStyle = col; ctx.fillRect(x*s, y*s, s, s); }
function rect(ctx, x, y, w, h, s, col) { ctx.fillStyle = col; ctx.fillRect(x*s, y*s, w*s, h*s); }

// ── Player sprite‑sheet generation (5 frames: idle, run1, run2, run3, jump) ─
function genPlayer() {
    const fw = 32, fh = 48, frames = 5;
    const cv = mkCanvas(fw * frames, fh);
    const ctx = cv.getContext('2d');
    const s = PX;

    function head(ox) {
        // Red cap
        rect(ctx, ox+5,0, 6,1, s, C.capRed);
        rect(ctx, ox+4,1, 8,2, s, C.capRed);
        // Gold band (USA)
        rect(ctx, ox+6,2, 4,1, s, C.gold);
        // Brim
        rect(ctx, ox+2,3, 12,1, s, C.capDark);
        // Face
        rect(ctx, ox+3,4, 10,5, s, C.skin);
        // Eyebrows
        rect(ctx, ox+4,4, 2,1, s, C.skinDk);
        rect(ctx, ox+9,4, 2,1, s, C.skinDk);
        // Eyes
        px(ctx, ox+5, 5, s, C.black); px(ctx, ox+6, 5, s, C.black);
        px(ctx, ox+9, 5, s, C.black); px(ctx, ox+10,5, s, C.black);
        // Eye whites
        px(ctx, ox+5, 5, s, '#335'); px(ctx, ox+10,5, s, '#335');
        // Nose
        px(ctx, ox+7, 7, s, C.skinDk); px(ctx, ox+8, 7, s, C.skinDk);
        // Mouth
        rect(ctx, ox+6,8, 4,1, s, '#A0522D');
    }

    function torso(ox) {
        // White collar
        rect(ctx, ox+4,9, 3,1, s, C.white);
        rect(ctx, ox+9,9, 3,1, s, C.white);
        // Tie
        rect(ctx, ox+7,9, 2,6, s, C.tie);
        // Suit jacket
        rect(ctx, ox+3,10, 4,5, s, C.navy);
        rect(ctx, ox+9,10, 4,5, s, C.navy);
        // Suit highlight
        px(ctx, ox+4, 11, s, C.navyLt); px(ctx, ox+11,11, s, C.navyLt);
        // Hands
        px(ctx, ox+2, 13, s, C.skin); px(ctx, ox+13,13, s, C.skin);
        px(ctx, ox+2, 14, s, C.skin); px(ctx, ox+13,14, s, C.skin);
    }

    function legsIdle(ox) {
        rect(ctx, ox+5,15, 6,1, s, C.navy);   // belt area
        rect(ctx, ox+5,16, 6,3, s, C.pants);
        rect(ctx, ox+5,19, 2,2, s, C.pants);
        rect(ctx, ox+9,19, 2,2, s, C.pants);
        rect(ctx, ox+4,21, 3,1, s, C.black);
        rect(ctx, ox+9,21, 3,1, s, C.black);
    }

    function legsRun1(ox) {
        rect(ctx, ox+5,15, 6,1, s, C.navy);
        rect(ctx, ox+5,16, 6,2, s, C.pants);
        // Left leg forward
        rect(ctx, ox+4,18, 2,2, s, C.pants);
        rect(ctx, ox+3,20, 3,1, s, C.black);
        // Right leg back
        rect(ctx, ox+10,18, 2,2, s, C.pants);
        rect(ctx, ox+10,20, 3,1, s, C.black);
    }

    function legsRun2(ox) {
        rect(ctx, ox+5,15, 6,1, s, C.navy);
        rect(ctx, ox+5,16, 6,2, s, C.pants);
        // Legs together (passing position)
        rect(ctx, ox+6,18, 4,2, s, C.pants);
        rect(ctx, ox+5,20, 3,1, s, C.black);
        rect(ctx, ox+8,20, 3,1, s, C.black);
    }

    function legsRun3(ox) {
        rect(ctx, ox+5,15, 6,1, s, C.navy);
        rect(ctx, ox+5,16, 6,2, s, C.pants);
        // Right leg forward (mirror of run1)
        rect(ctx, ox+10,18, 2,2, s, C.pants);
        rect(ctx, ox+10,20, 3,1, s, C.black);
        // Left leg back
        rect(ctx, ox+4,18, 2,2, s, C.pants);
        rect(ctx, ox+3,20, 3,1, s, C.black);
    }

    function legsJump(ox) {
        rect(ctx, ox+5,15, 6,1, s, C.navy);
        rect(ctx, ox+4,16, 8,2, s, C.pants);
        rect(ctx, ox+3,18, 4,1, s, C.pants);
        rect(ctx, ox+9,18, 4,1, s, C.pants);
        rect(ctx, ox+3,19, 3,1, s, C.black);
        rect(ctx, ox+10,19, 3,1, s, C.black);
    }

    // Draw 5 frames
    const legFns = [legsIdle, legsRun1, legsRun2, legsRun3, legsJump];
    for (let i = 0; i < frames; i++) {
        const ox = (i * fw) / s;     // pixel-art x offset
        head(ox); torso(ox); legFns[i](ox);
    }
    return cv;
}

// ── Ground tile (grass-on-dirt) ─────────────────────────────
function genGround() {
    const cv = mkCanvas(TILE, TILE), ctx = cv.getContext('2d'), s = PX;
    // Dirt fill
    rect(ctx, 0, 0, 16, 16, s, C.dirt);
    // Dirt texture spots
    for (let i = 0; i < 8; i++) {
        px(ctx, (i*3+1)%16, 4+(i*5)%12, s, C.dirtDk);
        px(ctx, (i*7+3)%16, 3+(i*4)%12, s, '#7B5914');
    }
    // Grass top 3 rows
    rect(ctx, 0, 0, 16, 3, s, C.grass);
    // Grass highlight
    rect(ctx, 0, 0, 16, 1, s, '#4CD053');
    // Grass tufts
    px(ctx, 2, 3, s, C.grassDk); px(ctx, 7, 3, s, C.grassDk);
    px(ctx, 12, 3, s, C.grassDk);
    return cv;
}

// ── Platform / brick tile ───────────────────────────────────
function genBrick() {
    const cv = mkCanvas(TILE, TILE), ctx = cv.getContext('2d'), s = PX;
    rect(ctx, 0, 0, 16, 16, s, C.brick);
    // Brick lines (mortar)
    rect(ctx, 0, 3, 16, 1, s, C.brickDk);
    rect(ctx, 0, 7, 16, 1, s, C.brickDk);
    rect(ctx, 0, 11, 16, 1, s, C.brickDk);
    rect(ctx, 0, 15, 16, 1, s, C.brickDk);
    // Vertical mortar (offset per row)
    px(ctx, 7, 0, s, C.brickDk); px(ctx, 7, 1, s, C.brickDk); px(ctx, 7, 2, s, C.brickDk);
    px(ctx, 3, 4, s, C.brickDk); px(ctx, 3, 5, s, C.brickDk); px(ctx, 3, 6, s, C.brickDk);
    px(ctx, 11,4, s, C.brickDk); px(ctx, 11,5, s, C.brickDk); px(ctx, 11,6, s, C.brickDk);
    px(ctx, 7, 8, s, C.brickDk); px(ctx, 7, 9, s, C.brickDk); px(ctx, 7, 10,s, C.brickDk);
    px(ctx, 3, 12,s, C.brickDk); px(ctx, 3, 13,s, C.brickDk); px(ctx, 3, 14,s, C.brickDk);
    px(ctx, 11,12,s, C.brickDk); px(ctx, 11,13,s, C.brickDk); px(ctx, 11,14,s, C.brickDk);
    // Highlight top-left of some bricks
    px(ctx, 0, 0, s, C.brickLt); px(ctx, 8, 4, s, C.brickLt);
    px(ctx, 0, 8, s, C.brickLt); px(ctx, 8, 12,s, C.brickLt);
    return cv;
}

// ── Question block (holds stars) ────────────────────────────
function genQBlock() {
    const cv = mkCanvas(TILE, TILE), ctx = cv.getContext('2d'), s = PX;
    rect(ctx, 0, 0, 16, 16, s, C.gold);
    // Border
    rect(ctx, 0, 0, 16, 1, s, C.goldDark);
    rect(ctx, 0, 15,16, 1, s, C.goldDark);
    rect(ctx, 0, 0, 1, 16, s, C.goldDark);
    rect(ctx, 15,0, 1, 16, s, C.goldDark);
    // Inner highlight
    rect(ctx, 1, 1, 14,1, s, '#FFE85A');
    rect(ctx, 1, 1, 1, 14,s, '#FFE85A');
    // "?" mark
    rect(ctx, 6, 4, 4, 1, s, C.brickDk);
    rect(ctx, 9, 5, 2, 2, s, C.brickDk);
    rect(ctx, 7, 7, 3, 1, s, C.brickDk);
    rect(ctx, 6, 8, 2, 2, s, C.brickDk);
    rect(ctx, 6,11, 2, 2, s, C.brickDk);
    return cv;
}

// ── Gold star collectible ───────────────────────────────────
function genStar() {
    const cv = mkCanvas(24, 24), ctx = cv.getContext('2d');
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const aO = (i * 72 - 90) * Math.PI / 180;
        const aI = ((i * 72 + 36) - 90) * Math.PI / 180;
        ctx.lineTo(12 + 10 * Math.cos(aO), 12 + 10 * Math.sin(aO));
        ctx.lineTo(12 + 4  * Math.cos(aI), 12 + 4  * Math.sin(aI));
    }
    ctx.closePath(); ctx.fill();
    // Outline
    ctx.strokeStyle = C.starOut; ctx.lineWidth = 1.5; ctx.stroke();
    // Highlight
    ctx.fillStyle = '#FFF8B0';
    ctx.fillRect(9, 4, 3, 3);
    return cv;
}

// ── Dollar bill collectible ─────────────────────────────────
function genDollar() {
    const cv = mkCanvas(24, 16), ctx = cv.getContext('2d'), s = 2;
    rect(ctx, 0, 0, 12, 8, s, '#3B8C3B');
    rect(ctx, 0, 0, 12, 1, s, '#2D6B2D');
    rect(ctx, 0, 7, 12, 1, s, '#2D6B2D');
    rect(ctx, 0, 0, 1, 8, s, '#2D6B2D');
    rect(ctx, 11,0, 1, 8, s, '#2D6B2D');
    // $ sign
    rect(ctx, 5, 2, 2, 4, s, '#F0E68C');
    rect(ctx, 4, 3, 1, 1, s, '#F0E68C');
    rect(ctx, 7, 4, 1, 1, s, '#F0E68C');
    return cv;
}

// ── Enemy: green swamp creature ─────────────────────────────
function genEnemy() {
    const fw = 28, fh = 28, frames = 2;
    const cv = mkCanvas(fw * frames, fh), ctx = cv.getContext('2d'), s = PX;

    function body(ox) {
        // Body
        rect(ctx, ox+3, 2, 8, 6, s, C.eGreen);
        rect(ctx, ox+2, 4, 10,4, s, C.eGreen);
        rect(ctx, ox+4, 8, 6, 3, s, C.eGreen);
        // Darker belly
        rect(ctx, ox+4, 7, 6, 2, s, C.eGreenDk);
        // Eyes
        rect(ctx, ox+3, 3, 2, 2, s, C.white);
        rect(ctx, ox+9, 3, 2, 2, s, C.white);
        px(ctx, ox+4, 3, s, C.eEye); px(ctx, ox+4, 4, s, C.eEye);
        px(ctx, ox+10,3, s, C.eEye); px(ctx, ox+10,4, s, C.eEye);
        // Brow bumps
        px(ctx, ox+3, 2, s, C.eGreenDk);
        px(ctx, ox+10,2, s, C.eGreenDk);
        // Mouth
        rect(ctx, ox+5, 6, 4, 1, s, '#225522');
        // Teeth
        px(ctx, ox+6, 6, s, C.white);
        px(ctx, ox+8, 6, s, C.white);
    }

    // Frame 0: feet apart
    body(0);
    rect(ctx, 2, 11, 3, 2, s, C.eGreenDk);
    rect(ctx, 9, 11, 3, 2, s, C.eGreenDk);

    // Frame 1: feet together
    body(fw/s);
    rect(ctx, fw/s+4, 11, 2, 2, s, C.eGreenDk);
    rect(ctx, fw/s+8, 11, 2, 2, s, C.eGreenDk);

    return cv;
}

// ── Flag ────────────────────────────────────────────────────
function genFlag() {
    const cv = mkCanvas(48, 160), ctx = cv.getContext('2d');
    // Pole
    ctx.fillStyle = C.poleBrown;
    ctx.fillRect(22, 0, 4, 160);
    ctx.fillStyle = '#A09070';
    ctx.fillRect(22, 0, 2, 160);
    // Gold ball top
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.arc(24, 8, 6, 0, Math.PI*2); ctx.fill();
    // Flag
    ctx.fillStyle = C.flagRed;
    ctx.fillRect(0, 14, 22, 20);
    // Star on flag
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const aO = (i*72-90)*Math.PI/180, aI = ((i*72+36)-90)*Math.PI/180;
        ctx.lineTo(11 + 6*Math.cos(aO), 24 + 6*Math.sin(aO));
        ctx.lineTo(11 + 2.5*Math.cos(aI), 24 + 2.5*Math.sin(aI));
    }
    ctx.closePath(); ctx.fill();
    return cv;
}

// ── Background layers ───────────────────────────────────────
function genSkyBg() {
    const cv = mkCanvas(GW, GH), ctx = cv.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, GH);
    grad.addColorStop(0, '#4A90D9'); grad.addColorStop(0.6, C.sky); grad.addColorStop(1, C.skyLt);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, GW, GH);
    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    [[100,60,50],[300,40,40],[550,70,35],[700,30,45]].forEach(([cx,cy,r]) => {
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx-r*0.6,cy+5,r*0.7,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.6,cy+5,r*0.7,0,Math.PI*2); ctx.fill();
    });
    return cv;
}

function genHillsFar() {
    const cv = mkCanvas(GW, 200), ctx = cv.getContext('2d');
    ctx.fillStyle = C.hillFar;
    for (let i = 0; i < 4; i++) {
        const x = i * 220 - 20, w = 260, h = 120 + (i%2)*30;
        ctx.beginPath();
        ctx.moveTo(x, 200); ctx.quadraticCurveTo(x + w/2, 200 - h, x + w, 200);
        ctx.fill();
    }
    // Darker bottoms
    ctx.fillStyle = C.hillFarDk;
    ctx.fillRect(0, 170, GW, 30);
    return cv;
}

function genHillsNear() {
    const cv = mkCanvas(GW, 160), ctx = cv.getContext('2d');
    ctx.fillStyle = C.hill;
    for (let i = 0; i < 3; i++) {
        const x = i * 300 + 40, w = 280, h = 100 + (i%2)*20;
        ctx.beginPath();
        ctx.moveTo(x, 160); ctx.quadraticCurveTo(x + w/2, 160 - h, x + w, 160);
        ctx.fill();
    }
    ctx.fillStyle = C.hillDk;
    ctx.fillRect(0, 140, GW, 20);
    return cv;
}

// ── Sparkle particle ────────────────────────────────────────
function genSparkle() {
    const cv = mkCanvas(8, 8), ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFFA0';
    ctx.fillRect(3, 0, 2, 8);
    ctx.fillRect(0, 3, 8, 2);
    ctx.fillStyle = C.gold;
    ctx.fillRect(3, 3, 2, 2);
    return cv;
}

// ── USA Cap power-up ────────────────────────────────────────
function genCap() {
    const cv = mkCanvas(28, 20), ctx = cv.getContext('2d'), s = PX;
    rect(ctx, 3, 0, 8, 2, s, C.capRed);
    rect(ctx, 2, 2, 10,2, s, C.capRed);
    rect(ctx, 0, 4, 14,2, s, C.capDark);
    rect(ctx, 4, 1, 6, 1, s, C.gold);
    return cv;
}

// ── Power-up procedural sprites ─────────────────────────────
function genPowerup0() { return genCap(); }

function genPowerup1() {
    const cv = mkCanvas(32, 16), ctx = cv.getContext('2d'), s = PX;
    rect(ctx, 0, 0, 16, 8, s, '#111111');
    rect(ctx, 1, 1, 14, 6, s, '#222222');
    rect(ctx, 3, 3, 2, 2, s, '#666666');
    rect(ctx, 7, 3, 2, 2, s, '#666666');
    rect(ctx, 11,3, 2, 2, s, '#666666');
    return cv;
}

function genPowerup2() {
    const cv = mkCanvas(28, 24), ctx = cv.getContext('2d'), s = PX;
    rect(ctx, 0, 2, 14, 10, s, '#C4A052');
    rect(ctx, 0, 1, 6, 1, s, '#C4A052');
    rect(ctx, 0, 2, 14, 1, s, '#DAB866');
    rect(ctx, 3, 5, 8, 4, s, '#CC2222');
    rect(ctx, 4, 6, 6, 2, s, '#FF3333');
    return cv;
}

function genTweet() {
    const cv = mkCanvas(16, 12), ctx = cv.getContext('2d');
    ctx.fillStyle = '#1DA1F2';
    ctx.fillRect(2, 2, 10, 7);
    ctx.fillRect(0, 4, 14, 4);
    ctx.fillStyle = '#0D8DDB';
    ctx.fillRect(1, 3, 4, 3);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(9, 3, 2, 2);
    ctx.fillStyle = '#000000'; ctx.fillRect(10, 3, 1, 1);
    ctx.fillStyle = '#FFAA00'; ctx.fillRect(12, 5, 3, 2);
    return cv;
}

// ── Level Data ───────────────────────────────────���──────────
const LEVEL = {
    // Ground segments [startTileX, endTileX]
    ground: [
        [0, 28],
        [31, 52],
        [55, 82],
        [85, 125],
        [128, 200],
    ],
    // Platforms [tileX, pixelY, widthInTiles]
    platforms: [
        // Section 1 – intro
        [14, 368, 4],
        [20, 336, 3],
        // Over gap 1
        [28, 400, 3],
        [31, 368, 3],
        [35, 336, 3],
        // Section 2
        [40, 304, 4],
        [46, 368, 3],
        [50, 336, 3],
        // Over gap 2
        [53, 400, 3],
        [56, 368, 3],
        // Section 3 – climbing
        [61, 336, 3],
        [65, 304, 4],
        [70, 272, 3],
        [74, 336, 3],
        [78, 368, 3],
        // Over gap 3
        [83, 400, 3],
        [86, 368, 3],
        // Section 4 – challenge
        [92, 336, 4],
        [98, 304, 3],
        [103, 272, 3],
        [107, 336, 4],
        [113, 368, 3],
        [118, 304, 4],
        // Final area
        [125, 400, 3],
        [128, 368, 3],
        [133, 336, 4],
        [140, 368, 5],
        [148, 336, 3],
        [155, 304, 4],
        [162, 368, 3],
        [170, 336, 4],
        [178, 368, 3],
    ],
    // Stars [pixelX, pixelY]
    stars: [
        // Ground section 1
        [160,436],[192,436],[256,436],[320,436],
        // On platforms
        [480,336],[512,336],
        [672,304],[704,304],
        // Over gap 1
        [960,336],[1024,368],
        [1120,336],[1152,336],
        // Section 2
        [1312,272],[1344,272],
        [1504,336],[1536,336],
        [1632,304],
        // Over gap 2
        [1760,368],[1824,336],
        // Section 3
        [1984,304],[2016,304],
        [2112,272],[2144,272],
        [2272,240],[2304,240],
        // Over gap 3
        [2688,368],[2752,336],
        // Section 4
        [2976,304],[3008,304],
        [3168,272],[3200,240],
        [3296,272],
        [3424,304],[3456,304],
        [3616,336],
        [3776,272],[3808,272],
        // Final area
        [4064,368],
        [4256,336],[4288,336],
        [4480,304],[4512,304],
        [4736,368],
        [4960,304],[4992,304],
        [5184,368],
        [5440,304],[5472,304],[5504,304],
        [5696,336],[5728,336],
    ],
    // Enemies [pixelX, patrolLeft, patrolRight, type]
    // type: 0=journalist, 1=scientist, 2=girl
    enemies: [
        [520, 440, 720, 0],
        [960, 960, 1100, 1],
        [1400, 1280, 1520, 0],
        [1800, 1760, 1920, 2],
        [2100, 1952, 2240, 1],
        [2500, 2368, 2624, 0],
        [2900, 2720, 3000, 2],
        [3300, 3200, 3420, 1],
        [3700, 3550, 3800, 0],
        [4100, 4000, 4200, 2],
        [4500, 4416, 4600, 1],
        [4900, 4800, 5000, 0],
        [5300, 5200, 5400, 2],
        [5700, 5600, 5800, 1],
    ],
    // Power-ups [pixelX, pixelY, type]
    // type: 0=MAGA Hat, 1=Censor Bar, 2=Classified Docs
    powerups: [
        [700,  336, 0],
        [1536, 272, 1],
        [2304, 208, 2],
        [3456, 272, 0],
        [4512, 272, 1],
        [5472, 272, 2],
    ],
    flagX: 6100,
};

// ── PRELOAD SCENE ────────────────────────────────────────────
class PreloadScene extends Phaser.Scene {
    constructor() { super('Preload'); }

    preload() {
        // Progress bar
        this.add.rectangle(400, 250, 804, 24, 0x333333);
        const bar = this.add.rectangle(400, 250, 0, 20, 0xFFD700).setOrigin(0.5);
        this.add.text(400, 220, 'LOADING...', {
            fontSize: '16px', fontFamily: 'Arial Black', color: '#FFD700'
        }).setOrigin(0.5);
        this.load.on('progress', v => { bar.width = 800 * v; });

        // Silently skip missing/corrupt placeholders
        this.load.on('loaderror', (file) => { console.warn('Asset skipped:', file.key); });

        // Sprites
        try { this.load.spritesheet('player-ext', 'assets/sprites/player.png', { frameWidth: 48, frameHeight: 48 }); } catch(e) {}
        try { this.load.spritesheet('enemies-ext', 'assets/sprites/enemies.png', { frameWidth: 48, frameHeight: 48 }); } catch(e) {}
        try { this.load.spritesheet('powerups-ext', 'assets/sprites/powerups.png', { frameWidth: 48, frameHeight: 48 }); } catch(e) {}

        // Tiles
        try { this.load.image('ground-ext', 'assets/tiles/ground.png'); } catch(e) {}
        try { this.load.image('brick-ext',  'assets/tiles/brick.png'); } catch(e) {}
        try { this.load.spritesheet('qblock-ext', 'assets/tiles/qblock.png', { frameWidth: 32, frameHeight: 32 }); } catch(e) {}

        // Backgrounds
        try { this.load.image('sky-ext', 'assets/sprites/background.png'); } catch(e) {}
        try { this.load.image('menuBg',  'assets/ui/title-screen.png'); } catch(e) {}

        // HUD
        try { this.load.spritesheet('hudIcons', 'assets/ui/hud-icons.png', { frameWidth: 32, frameHeight: 32 }); } catch(e) {}

        // Audio
        try { this.load.audio('snd-jump',    'assets/audio/jump.wav'); } catch(e) {}
        try { this.load.audio('snd-stomp',   'assets/audio/stomp.wav'); } catch(e) {}
        try { this.load.audio('snd-coin',    'assets/audio/coin.wav'); } catch(e) {}
        try { this.load.audio('snd-die',     'assets/audio/die.wav'); } catch(e) {}
        try { this.load.audio('snd-win',     'assets/audio/win.wav'); } catch(e) {}
        try { this.load.audio('snd-powerup', 'assets/audio/powerup.wav'); } catch(e) {}
        try { this.load.audio('bgm',         'assets/audio/bgm-game.mp3'); } catch(e) {}
        try { this.load.audio('bgmMenu',     'assets/audio/bgm-menu.mp3'); } catch(e) {}
    }

    create() {
        // Mark which external assets loaded successfully
        window.ASSETS_LOADED = {
            player:   this.textures.exists('player-ext'),
            enemies:  this.textures.exists('enemies-ext'),
            powerups: this.textures.exists('powerups-ext'),
            ground:   this.textures.exists('ground-ext'),
            brick:    this.textures.exists('brick-ext'),
            qblock:   this.textures.exists('qblock-ext'),
            sky:      this.textures.exists('sky-ext'),
            menuBg:   this.textures.exists('menuBg'),
            hud:      this.textures.exists('hudIcons'),
            audio:    this.cache.audio.has('snd-jump'),
        };
        this.scene.start('Boot');
    }
}

// ── BOOT SCENE ──────────────────────────────────────────────
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    create() {
        const AL = window.ASSETS_LOADED || {};

        // Only generate procedural textures when external assets didn't load
        if (!AL.player) {
            const pTex = this.textures.addCanvas('player', genPlayer());
            for (let i = 0; i < 5; i++) pTex.add(i, 0, i * 32, 0, 32, 48);
        }
        if (!AL.enemies) {
            const eTex = this.textures.addCanvas('enemy', genEnemy());
            for (let i = 0; i < 2; i++) eTex.add(i, 0, i * 28, 0, 28, 28);
        }
        if (!AL.ground)  this.textures.addCanvas('ground', genGround());
        if (!AL.brick)   this.textures.addCanvas('brick', genBrick());
        if (!AL.qblock)  this.textures.addCanvas('qblock', genQBlock());
        if (!AL.sky)     this.textures.addCanvas('sky', genSkyBg());

        // Always generate (no external equivalent)
        this.textures.addCanvas('star', genStar());
        this.textures.addCanvas('dollar', genDollar());
        this.textures.addCanvas('flag', genFlag());
        this.textures.addCanvas('hillsFar', genHillsFar());
        this.textures.addCanvas('hillsNear', genHillsNear());
        this.textures.addCanvas('sparkle', genSparkle());
        this.textures.addCanvas('cap', genCap());
        this.textures.addCanvas('tweet', genTweet());

        // Power-up procedural fallbacks
        if (!AL.powerups) {
            this.textures.addCanvas('powerup0', genPowerup0());
            this.textures.addCanvas('powerup1', genPowerup1());
            this.textures.addCanvas('powerup2', genPowerup2());
        }

        // Texture key alias map: canonical → actual loaded key
        window.TEX = {
            player:   AL.player  ? 'player-ext'  : 'player',
            enemy:    AL.enemies ? 'enemies-ext'  : 'enemy',
            ground:   AL.ground  ? 'ground-ext'   : 'ground',
            brick:    AL.brick   ? 'brick-ext'    : 'brick',
            qblock:   AL.qblock  ? 'qblock-ext'   : 'qblock',
            sky:      AL.sky     ? 'sky-ext'       : 'sky',
            menuBg:   AL.menuBg  ? 'menuBg'       : null,
            enemyExt:  !!AL.enemies,
            powerExt:  !!AL.powerups,
        };

        this.scene.start('Menu');
    }
}

// ── MENU SCENE ──────────────────────────────────────────────
class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }

    create() {
        const T = window.TEX || {};

        // Background: use menuBg if available, otherwise procedural
        if (T.menuBg) {
            this.add.image(GW/2, GH/2, T.menuBg).setDisplaySize(GW, GH);
        } else {
            this.add.image(GW/2, GH/2, T.sky || 'sky');
            this.add.image(GW/2, GH - 80, 'hillsFar');
            this.add.image(GW/2, GH - 40, 'hillsNear');
            for (let x = 0; x < GW; x += TILE) {
                this.add.image(x + TILE/2, GH - TILE/2, T.ground || 'ground');
            }
        }

        // Title shadow
        this.add.text(GW/2 + 3, 83, 'SUPER MAGA BROS.', {
            fontSize: '48px', fontFamily: 'Arial Black, Impact, sans-serif',
            fontStyle: 'bold', color: '#000000',
        }).setOrigin(0.5);

        // Title text
        this.add.text(GW/2, 80, 'SUPER MAGA BROS.', {
            fontSize: '48px', fontFamily: 'Arial Black, Impact, sans-serif',
            fontStyle: 'bold', color: C.gold,
            stroke: C.capRed, strokeThickness: 5,
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(GW/2, 130, 'MAKE PLATFORMING GREAT AGAIN', {
            fontSize: '14px', fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold', color: C.white,
        }).setOrigin(0.5);

        // Player character in center
        const pk = T.player || 'player';
        const p = this.add.sprite(GW/2, GH - TILE - 24, pk, 0).setScale(2.5);
        this.tweens.add({
            targets: p, y: p.y - 8, duration: 800,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // Stars decoration
        const starL = this.add.image(GW/2 - 180, 80, 'star').setScale(1.5);
        const starR = this.add.image(GW/2 + 180, 80, 'star').setScale(1.5);
        this.tweens.add({ targets: [starL, starR], angle: 360, duration: 3000, repeat: -1 });

        // Instructions
        const inst = this.add.text(GW/2, GH - 100, 'PRESS  SPACE  TO  START', {
            fontSize: '22px', fontFamily: 'Arial Black, Impact, sans-serif',
            color: C.white, stroke: C.navy, strokeThickness: 3,
        }).setOrigin(0.5);
        this.tweens.add({ targets: inst, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

        // Controls info
        this.add.text(GW/2, GH - 60, 'Arrow Keys / WASD to Move   SPACE to Jump   Z to Fire', {
            fontSize: '12px', fontFamily: 'Arial, sans-serif',
            color: '#AACCEE',
        }).setOrigin(0.5);

        // Menu background music
        if (window.ASSETS_LOADED && window.ASSETS_LOADED.audio && this.cache.audio.has('bgmMenu')) {
            this.menuMusic = this.sound.add('bgmMenu', { loop: true, volume: 0.3 });
            this.menuMusic.play();
        }

        // Start listener
        this.input.keyboard.once('keydown-SPACE', () => {
            if (this.menuMusic) this.menuMusic.stop();
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.time.delayedCall(300, () => this.scene.start('Game'));
        });
    }
}

// ── GAME SCENE ──────────────────────────────────────────────
class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    init(data) {
        this.score = data.score || 0;
        this.lives = data.lives !== undefined ? data.lives : 3;
        this.starsCollected = data.starsCollected || 0;
        // Power-up state resets on death
        this.playerPower = -1;
        this.powerTimer = 0;
        this.invincible = false;
        this.hasHat = false;
    }

    create() {
        this.totalStars = LEVEL.stars.length;
        this.dead = false;
        this.won = false;
        const T = window.TEX || {};

        // ─ Background layers (parallax)
        const skyKey = T.sky || 'sky';
        this.skyImg = this.add.tileSprite(0, 0, GW, GH, skyKey).setOrigin(0).setScrollFactor(0).setDepth(-10);
        this.farHills = this.add.tileSprite(0, GH - 180, GW, 200, 'hillsFar').setOrigin(0).setScrollFactor(0).setDepth(-9);
        this.nearHills = this.add.tileSprite(0, GH - 140, GW, 160, 'hillsNear').setOrigin(0).setScrollFactor(0).setDepth(-8);

        // ─ World bounds
        this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

        // ─ Static groups
        const gndKey = T.ground || 'ground';
        const brkKey = T.brick || 'brick';
        this.groundGroup = this.physics.add.staticGroup();
        this.platformGroup = this.physics.add.staticGroup();

        LEVEL.ground.forEach(([s, e]) => {
            for (let tx = s; tx <= e; tx++) {
                this.groundGroup.create(tx * TILE + TILE/2, GROUND_Y + TILE/2, gndKey);
            }
        });

        LEVEL.platforms.forEach(([tx, py, w]) => {
            for (let i = 0; i < w; i++) {
                this.platformGroup.create(tx * TILE + i * TILE + TILE/2, py + TILE/2, brkKey);
            }
        });

        // ─ Stars
        this.starsGroup = this.physics.add.group({ allowGravity: false });
        LEVEL.stars.forEach(([sx, sy], idx) => {
            const star = this.starsGroup.create(sx, sy, 'star');
            star.setCircle(10, 2, 2);
            this.tweens.add({
                targets: star, y: sy - 6, duration: 800 + (idx % 5) * 100,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
        });

        // ─ Enemies (3 types)
        const ek = T.enemy || 'enemy';
        const enemyExt = T.enemyExt;
        this.enemyGroup = this.physics.add.group();

        LEVEL.enemies.forEach(([ex, eL, eR, type]) => {
            const et = ENEMY_TYPES[type] || ENEMY_TYPES[0];
            let e;
            if (enemyExt) {
                e = this.enemyGroup.create(ex, GROUND_Y - 24, ek, type * 4);
            } else {
                e = this.enemyGroup.create(ex, GROUND_Y - 14, ek, 0);
                if (et.tint) e.setTint(et.tint);
            }
            e.setSize(24, 24).setOffset(2, 4);
            e.setBounce(0);
            e.setCollideWorldBounds(false);
            e.setVelocityX(-et.speed);
            e.patrolL = eL;
            e.patrolR = eR;
            e.patrolSpeed = et.speed;
            e.enemyType = type;
            e.body.setAllowGravity(true);
        });

        // ─ Power-ups
        const powerExt = T.powerExt;
        this.powerupGroup = this.physics.add.group({ allowGravity: false });

        LEVEL.powerups.forEach(([pux, puy, type]) => {
            let pu;
            if (powerExt) {
                pu = this.powerupGroup.create(pux, puy, 'powerups-ext', type);
            } else {
                pu = this.powerupGroup.create(pux, puy, 'powerup' + type);
            }
            pu.powerType = type;
            this.tweens.add({
                targets: pu, y: puy - 8, duration: 1000,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
        });

        // ─ Tweet blast group
        this.tweetGroup = this.physics.add.group({ allowGravity: false });

        // ─ Flag
        this.flag = this.physics.add.sprite(LEVEL.flagX, GROUND_Y - 80, 'flag');
        this.flag.body.setAllowGravity(false);
        this.flag.setImmovable(true);
        this.flag.setSize(48, 140).setOffset(0, 10);

        // ─ Player
        const pk = T.player || 'player';
        this.player = this.physics.add.sprite(80, GROUND_Y - 48, pk, 0);
        this.player.setSize(20, 40).setOffset(6, 8);
        this.player.setCollideWorldBounds(false);
        this.player.setBounce(0);
        this.player.setDepth(5);

        // ─ Player animations (only create once — anims are global)
        if (!this.anims.exists('idle')) {
            this.anims.create({ key: 'idle', frames: [{ key: pk, frame: 0 }], frameRate: 1 });
            this.anims.create({ key: 'run', frames: this.anims.generateFrameNumbers(pk, { start: 1, end: 3 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'jump', frames: [{ key: pk, frame: 4 }], frameRate: 1 });
        }

        // ─ Enemy animations
        if (enemyExt) {
            for (let t = 0; t < 3; t++) {
                const base = t * 4;
                const walkKey = 'enemy' + t + 'Walk';
                if (!this.anims.exists(walkKey)) {
                    this.anims.create({ key: walkKey, frames: this.anims.generateFrameNumbers(ek, { frames: [base, base + 1] }), frameRate: 4, repeat: -1 });
                }
                const dieKey = 'enemy' + t + 'Die';
                if (!this.anims.exists(dieKey)) {
                    this.anims.create({ key: dieKey, frames: [{ key: ek, frame: base + 3 }], frameRate: 1 });
                }
            }
        } else {
            if (!this.anims.exists('enemyWalk')) {
                this.anims.create({ key: 'enemyWalk', frames: this.anims.generateFrameNumbers(ek, { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
            }
        }
        this.enemyGroup.children.iterate(e => {
            if (!e) return;
            e.play(enemyExt ? ('enemy' + e.enemyType + 'Walk') : 'enemyWalk');
        });

        // ─ Colliders
        this.physics.add.collider(this.player, this.groundGroup);
        this.physics.add.collider(this.player, this.platformGroup);
        this.physics.add.collider(this.enemyGroup, this.groundGroup);
        this.physics.add.collider(this.enemyGroup, this.platformGroup);

        this.physics.add.overlap(this.player, this.starsGroup, this.collectStar, null, this);
        this.physics.add.overlap(this.player, this.enemyGroup, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.flag, this.reachFlag, null, this);
        this.physics.add.overlap(this.player, this.powerupGroup, this.collectPowerUp, null, this);
        this.physics.add.overlap(this.tweetGroup, this.enemyGroup, this.tweetHitEnemy, null, this);

        // ─ Particle emitter
        this.sparkleEmitter = this.add.particles(0, 0, 'sparkle', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 400,
            gravityY: 200,
            emitting: false,
        });

        // ─ Camera
        this.cameras.main.setBounds(0, 0, WORLD_W, GH);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(100, 50);
        this.cameras.main.fadeIn(300);

        // ─ Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

        // ─ HUD
        const hudStyle = { fontSize: '18px', fontFamily: 'Arial Black, Impact, sans-serif', color: C.white, stroke: '#000', strokeThickness: 3 };
        this.scoreText = this.add.text(16, 12, 'SCORE: 0', hudStyle).setScrollFactor(0).setDepth(100);
        this.livesText = this.add.text(GW - 16, 12, 'LIVES: 3', hudStyle).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
        this.starsText = this.add.text(GW / 2, 12, 'STARS: 0/' + this.totalStars, { ...hudStyle, color: C.gold }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
        this.powerText = this.add.text(16, 36, '', { ...hudStyle, fontSize: '14px', color: '#88FF88' }).setScrollFactor(0).setDepth(100);

        // Coyote time tracking
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.wasOnGround = false;

        // ─ Background music
        this.bgm = null;
        if (window.ASSETS_LOADED && window.ASSETS_LOADED.audio && this.cache.audio.has('bgm')) {
            this.bgm = this.sound.add('bgm', { loop: true, volume: 0.3 });
            this.bgm.play();
        }
    }

    update(_time, delta) {
        if (this.dead || this.won) return;

        const p = this.player;
        const onGround = p.body.touching.down || p.body.blocked.down;
        const dt = delta / 1000;

        // ─ Coyote time
        if (onGround) {
            this.coyoteTimer = 0.08;
            this.wasOnGround = true;
        } else {
            this.coyoteTimer -= dt;
        }

        // ─ Jump buffer
        const jumpPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
                           Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                           Phaser.Input.Keyboard.JustDown(this.wasd.up);
        if (jumpPressed) this.jumpBufferTimer = 0.1;
        else this.jumpBufferTimer -= dt;

        // ─ Horizontal movement
        const speed = 220;
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            p.setVelocityX(-speed);
            p.setFlipX(true);
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            p.setVelocityX(speed);
            p.setFlipX(false);
        } else {
            p.setVelocityX(p.body.velocity.x * 0.8);
            if (Math.abs(p.body.velocity.x) < 10) p.setVelocityX(0);
        }

        // ─ Jump
        const canJump = this.coyoteTimer > 0;
        if (this.jumpBufferTimer > 0 && canJump) {
            p.setVelocityY(-430);
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            playSound(this, 'snd-jump', SFX.jump);
        }

        // Variable jump height
        const jumpHeld = this.spaceKey.isDown || this.cursors.up.isDown || this.wasd.up.isDown;
        if (!jumpHeld && p.body.velocity.y < -150) {
            p.setVelocityY(p.body.velocity.y * 0.6);
        }

        // ─ Animations
        if (!onGround) {
            p.play('jump', true);
        } else if (Math.abs(p.body.velocity.x) > 20) {
            p.play('run', true);
        } else {
            p.play('idle', true);
        }

        // ─ Enemy patrol
        this.enemyGroup.children.iterate(e => {
            if (!e || !e.active) return;
            if (e.y > GH + 100) { e.destroy(); return; }
            if (e.x <= e.patrolL) e.setVelocityX(e.patrolSpeed);
            if (e.x >= e.patrolR) e.setVelocityX(-e.patrolSpeed);
            e.setFlipX(e.body.velocity.x > 0);
        });

        // ─ Parallax
        const camX = this.cameras.main.scrollX;
        this.farHills.tilePositionX = camX * 0.15;
        this.nearHills.tilePositionX = camX * 0.35;

        // ─ Death by falling
        if (p.y > GH + 80) {
            this.playerDie();
        }

        // ─ Power-up timer countdown
        if (this.playerPower >= 0 && this.powerTimer > 0) {
            this.powerTimer -= dt;
            if (this.powerTimer <= 0) {
                this.powerTimer = 0;
                if (this.playerPower === 1) this.invincible = false;
                this.playerPower = -1;
                p.clearTint();
            }
        }

        // ─ Z key: fire tweet-blast
        if (Phaser.Input.Keyboard.JustDown(this.zKey) && this.playerPower === 2) {
            this.fireTweetBlast();
        }

        // ─ Clean up off-screen tweets
        this.tweetGroup.children.iterate(t => {
            if (t && (t.x < camX - 100 || t.x > camX + GW + 100)) t.destroy();
        });

        // ─ Update HUD
        this.scoreText.setText('SCORE: ' + this.score);
        this.livesText.setText('LIVES: ' + this.lives);
        this.starsText.setText('STARS: ' + this.starsCollected + '/' + this.totalStars);
        this.updatePowerHUD();
    }

    // ── Collectibles ────────────────────────────────────────
    collectStar(_player, star) {
        this.sparkleEmitter.emitParticleAt(star.x, star.y, 8);
        star.destroy();
        this.score += 100;
        this.starsCollected++;
        playSound(this, 'snd-coin', SFX.coin);

        const popup = this.add.text(star.x, star.y, '+100', {
            fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold',
            color: C.gold, stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
            targets: popup, y: popup.y - 30, alpha: 0, duration: 600,
            onComplete: () => popup.destroy(),
        });
    }

    collectPowerUp(player, powerup) {
        const type = powerup.powerType;
        this.sparkleEmitter.emitParticleAt(powerup.x, powerup.y, 6);
        powerup.destroy();
        playSound(this, 'snd-powerup', SFX.powerup);

        this.playerPower = type;
        const pt = POWER_TYPES[type];

        if (type === 0) {
            // MAGA Hat: permanent until hit
            this.hasHat = true;
            this.powerTimer = 0;
            player.setTint(0xFFDD44);
        } else if (type === 1) {
            // Censor Bar: 10s invincibility
            this.invincible = true;
            this.powerTimer = pt.duration;
            player.setTint(0x88FFFF);
        } else if (type === 2) {
            // Classified Docs: 15s tweet-blast
            this.invincible = false;
            this.powerTimer = pt.duration;
            player.setTint(0xFF8844);
        }

        const popup = this.add.text(powerup.x, powerup.y, pt.name + '!', {
            fontSize: '12px', fontFamily: 'Arial Black', fontStyle: 'bold',
            color: '#88FF88', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
            targets: popup, y: popup.y - 30, alpha: 0, duration: 800,
            onComplete: () => popup.destroy(),
        });
    }

    // ── Tweet blast ─────────────────────────────────────────
    fireTweetBlast() {
        const p = this.player;
        const dir = p.flipX ? -1 : 1;
        const tweet = this.tweetGroup.create(p.x + dir * 20, p.y, 'tweet');
        tweet.setVelocityX(dir * 400);
        tweet.setFlipX(dir < 0);
        tweet.body.setAllowGravity(false);
        playSound(this, 'snd-jump', SFX.jump);

        this.time.delayedCall(2000, () => {
            if (tweet && tweet.active) tweet.destroy();
        });
    }

    tweetHitEnemy(tweet, enemy) {
        if (tweet && tweet.active) tweet.destroy();
        if (enemy && enemy.active) this.destroyEnemy(enemy);
    }

    // ── Enemy helpers ───────────────────────────────────────
    destroyEnemy(enemy) {
        const et = ENEMY_TYPES[enemy.enemyType] || ENEMY_TYPES[0];
        this.score += et.score;
        playSound(this, 'snd-stomp', SFX.stomp);

        const popup = this.add.text(enemy.x, enemy.y, '+' + et.score, {
            fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold',
            color: '#FF6666', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
            targets: popup, y: popup.y - 30, alpha: 0, duration: 600,
            onComplete: () => popup.destroy(),
        });

        // Play death animation if external spritesheet, then destroy
        const T = window.TEX || {};
        if (T.enemyExt && this.anims.exists('enemy' + enemy.enemyType + 'Die')) {
            enemy.play('enemy' + enemy.enemyType + 'Die');
            enemy.setVelocity(0, 0);
            enemy.body.enable = false;
            this.time.delayedCall(400, () => {
                if (enemy && enemy.active) enemy.destroy();
            });
        } else {
            enemy.destroy();
        }
    }

    hitEnemy(player, enemy) {
        if (this.dead || this.won) return;

        // Invincible: destroy on contact
        if (this.invincible) {
            this.destroyEnemy(enemy);
            return;
        }

        // Stomp check
        if (player.body.velocity.y > 0 && player.y + player.body.halfHeight < enemy.y) {
            player.setVelocityY(-280);
            // Show stomp frame briefly before death animation
            const T = window.TEX || {};
            if (T.enemyExt) {
                enemy.setFrame(enemy.enemyType * 4 + 2);
                this.time.delayedCall(100, () => {
                    if (enemy && enemy.active) this.destroyEnemy(enemy);
                });
            } else {
                this.destroyEnemy(enemy);
            }
            return;
        }

        // MAGA Hat absorbs one hit
        if (this.hasHat) {
            this.hasHat = false;
            this.playerPower = -1;
            player.clearTint();
            player.setTint(0xFFFFFF);
            this.time.delayedCall(100, () => { if (!this.dead) player.clearTint(); });
            playSound(this, 'snd-stomp', SFX.stomp);
            const dir = player.x < enemy.x ? -1 : 1;
            player.setVelocityX(dir * 200);
            player.setVelocityY(-200);
            return;
        }

        // Player dies
        this.playerDie();
    }

    // ── Power-up HUD ────────────────────────────────────────
    updatePowerHUD() {
        if (this.playerPower < 0) {
            this.powerText.setText('');
        } else {
            const pt = POWER_TYPES[this.playerPower];
            let text = pt.name;
            if (this.powerTimer > 0) {
                text += ' ' + Math.ceil(this.powerTimer) + 's';
            }
            this.powerText.setText(text);
        }
    }

    // ── Death & Game Over ───────────────────────────────────
    playerDie() {
        if (this.dead) return;
        this.dead = true;
        this.lives--;
        playSound(this, 'snd-die', SFX.die);
        if (this.bgm) this.bgm.stop();

        const p = this.player;
        p.setTint(0xff0000);
        p.body.setAllowGravity(false);
        p.setVelocity(0, -300);

        this.time.delayedCall(200, () => {
            p.body.setAllowGravity(true);
            p.setVelocity(0, 0);
        });

        this.time.delayedCall(1500, () => {
            if (this.lives > 0) {
                this.scene.restart({ lives: this.lives, score: this.score, starsCollected: this.starsCollected });
            } else {
                this.showGameOver();
            }
        });
    }

    showGameOver() {
        const overlay = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.7).setScrollFactor(0).setDepth(200);
        overlay.setAlpha(0);
        this.tweens.add({ targets: overlay, alpha: 1, duration: 500 });

        this.time.delayedCall(500, () => {
            this.add.text(GW/2, GH/2 - 40, 'GAME OVER', {
                fontSize: '48px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.capRed, stroke: '#000', strokeThickness: 5,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            this.add.text(GW/2, GH/2 + 20, 'FINAL SCORE: ' + this.score, {
                fontSize: '22px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.gold, stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            const restart = this.add.text(GW/2, GH/2 + 70, 'PRESS SPACE TO TRY AGAIN', {
                fontSize: '18px', fontFamily: 'Arial, sans-serif',
                color: C.white, stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            this.tweens.add({ targets: restart, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

            this.input.keyboard.once('keydown-SPACE', () => {
                this.scene.start('Menu');
            });
        });
    }

    // ── Victory ─────────────────────────────────────────────
    reachFlag(player, _flag) {
        if (this.won) return;
        this.won = true;
        playSound(this, 'snd-win', SFX.win);
        if (this.bgm) this.bgm.stop();

        this.score += 1000 + this.starsCollected * 50;

        player.setVelocity(0, 0);
        player.body.setAllowGravity(false);
        player.play('idle');

        this.tweens.add({
            targets: player, y: GROUND_Y - 24, duration: 800, ease: 'Sine.easeIn',
            onComplete: () => this.showVictory(),
        });
    }

    showVictory() {
        const overlay = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000033, 0.6).setScrollFactor(0).setDepth(200);
        overlay.setAlpha(0);
        this.tweens.add({ targets: overlay, alpha: 1, duration: 500 });

        this.time.delayedCall(400, () => {
            this.add.text(GW/2, GH/2 - 60, 'LEVEL COMPLETE!', {
                fontSize: '42px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.gold, stroke: C.capRed, strokeThickness: 5,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            this.add.text(GW/2, GH/2, 'SCORE: ' + this.score, {
                fontSize: '26px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.white, stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            this.add.text(GW/2, GH/2 + 40, 'STARS: ' + this.starsCollected + ' / ' + this.totalStars, {
                fontSize: '20px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.gold, stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            const cont = this.add.text(GW/2, GH/2 + 90, 'PRESS SPACE FOR MENU', {
                fontSize: '18px', fontFamily: 'Arial, sans-serif',
                color: C.white, stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            this.tweens.add({ targets: cont, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

            this.input.keyboard.once('keydown-SPACE', () => {
                this.scene.start('Menu');
            });
        });
    }
}

// ── Phaser Configuration ────────────────────────────────────
const config = {
    type: Phaser.CANVAS,
    width: GW,
    height: GH,
    parent: document.body,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 },
            debug: false,
        },
    },
    scene: [PreloadScene, BootScene, MenuScene, GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
};

const game = new Phaser.Game(config);
