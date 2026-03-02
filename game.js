// ============================================================
//  SUPER MAGA BROS. — A Phaser 3 Platformer
// ============================================================

// ── Constants ────────────────────────────────────────────────
const GW = 800, GH = 500;
const TILE = 32;
const WORLD_W = 12800, WORLD_H = 600;
const GROUND_Y = GH - TILE;          // 468
const PX = 2;                         // pixel‑art scale (each art‑pixel = 2×2)
const DONATE_URL = 'https://buy.stripe.com/3cI28q0Ds61569wcB71gs0C';
const CRYPTO_URL = 'https://commerce.coinbase.com/checkout/3ac70090-fd98-44d5-a2f4-ff30eee60019';

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
    { name: 'lobbyist',   speed: 55,  score: 250, tint: 0xFFAA00 },
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
const SOUND_VOLUME = { 'snd-jump': 0.15, 'snd-tweet': 0.25, 'snd-coin': 0.25 };
function playSound(scene, key, fallbackFn) {
    if (scene.cache.audio.has(key)) {
        const vol = SOUND_VOLUME[key] !== undefined ? SOUND_VOLUME[key] : 1;
        try { scene.sound.play(key, { volume: vol }); return; } catch (e) { /* fall through */ }
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

// ── Big Mac fallback sprite ────────────────────────────────
function genBigmac() {
    const cv = mkCanvas(24, 24), ctx = cv.getContext('2d');
    // Bottom bun
    ctx.fillStyle = '#C8882A'; ctx.fillRect(3, 16, 18, 5);
    ctx.fillStyle = '#E8A830'; ctx.fillRect(4, 15, 16, 2);
    // Patty
    ctx.fillStyle = '#6B3410'; ctx.fillRect(4, 12, 16, 4);
    // Lettuce
    ctx.fillStyle = '#44AA22'; ctx.fillRect(3, 11, 18, 2);
    // Middle bun
    ctx.fillStyle = '#E8A830'; ctx.fillRect(4, 8, 16, 4);
    // Patty 2
    ctx.fillStyle = '#6B3410'; ctx.fillRect(4, 5, 16, 4);
    // Top bun
    ctx.fillStyle = '#E8A830';
    ctx.beginPath(); ctx.arc(12, 5, 8, Math.PI, 0); ctx.fill();
    // Sesame seeds
    ctx.fillStyle = '#FFF8B0';
    ctx.fillRect(8, 1, 2, 1); ctx.fillRect(13, 2, 2, 1);
    return cv;
}

// ── Coke fallback sprite ───────────────────────────────────
function genCoke() {
    const cv = mkCanvas(24, 24), ctx = cv.getContext('2d');
    // Can body
    ctx.fillStyle = '#CC1111'; ctx.fillRect(7, 4, 10, 18);
    // Rounded top/bottom
    ctx.fillStyle = '#CC1111';
    ctx.fillRect(8, 3, 8, 1); ctx.fillRect(8, 22, 8, 1);
    // Silver top
    ctx.fillStyle = '#BBBBBB'; ctx.fillRect(8, 3, 8, 2);
    ctx.fillStyle = '#999999'; ctx.fillRect(10, 2, 4, 1);
    // White wave stripe
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(7, 11, 10, 1); ctx.fillRect(8, 12, 8, 1);
    // Label text hint
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(9, 8, 6, 2);
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
        // Zone 1 — Intro (flat, easy, learn controls) — tiles 0-68
        [0, 68],
        // Zone 2 — First Gaps (2-tile gaps) — tiles 71-128
        [71, 95],
        [98, 128],
        // Zone 3 — Platforming Challenge (3-tile gaps, verticality) — tiles 132-198
        [132, 160],
        [164, 198],
        // Zone 4 — Mixed Terrain (varied gaps, staircase sections) — tiles 202-268
        [202, 228],
        [232, 250],
        [254, 268],
        // Zone 5 — Gauntlet (4-tile gaps, narrow land) — tiles 273-338
        [273, 295],
        [300, 318],
        [323, 338],
        // Zone 6 — Final Stretch + Staircase to Flag — tiles 342-395
        [342, 395],
    ],
    // Platforms [tileX, pixelY, widthInTiles]
    platforms: [
        // ── Zone 1 — Intro (tiles 0-68) ──
        // Floating block row (like SMB ? blocks)
        [8, 368, 1], [10, 368, 1], [12, 368, 1],
        // Low step platforms
        [18, 404, 3],
        [24, 372, 4],
        // High reward platform
        [30, 304, 3],
        // Staircase up (SMB-style ascending steps)
        [38, 404, 2], [41, 372, 2], [44, 340, 2],
        // Staircase down
        [48, 340, 2], [51, 372, 2], [54, 404, 2],
        // Block row before first gap
        [60, 368, 4],

        // ── Zone 2 — First Gaps (tiles 71-128) ──
        // Floating platforms over gap 1 (tiles 68-71)
        [69, 404, 2],
        // Ascending platform series
        [76, 372, 3], [81, 340, 3],
        // High floating row
        [86, 304, 4],
        // Platforms over gap 2 (tiles 95-98)
        [96, 400, 2],
        // "Pipe" — tall stack (like SMB warp pipes)
        [104, 436, 2], [104, 404, 2],
        // Block row with gaps (hit-or-miss jumping)
        [110, 368, 2], [114, 368, 2], [118, 368, 2],
        // Staircase section
        [122, 404, 2], [125, 372, 2],

        // ── Zone 3 — Platforming Challenge (tiles 132-198) ──
        // Platforms over gap (tiles 128-132)
        [129, 404, 2],
        // Ascending series
        [136, 372, 3], [141, 340, 2], [145, 304, 3],
        // Descending platforms
        [150, 340, 2], [154, 372, 3],
        // Bridge over gap (tiles 160-164)
        [161, 400, 3],
        // "Pipe" pair
        [170, 436, 2], [170, 404, 2],
        [178, 436, 2], [178, 404, 2],
        // High floating row between pipes
        [174, 336, 3],
        // Zigzag platforms
        [184, 372, 3], [189, 304, 3], [194, 372, 3],

        // ── Zone 4 — Mixed Terrain (tiles 202-268) ──
        // Platforms over gap (tiles 198-202)
        [199, 400, 3],
        // Low-high alternating blocks
        [207, 372, 2], [211, 304, 2], [215, 372, 2],
        // "Pipe"
        [221, 436, 2], [221, 404, 2],
        // Bridge over gap (tiles 228-232)
        [229, 404, 2], [231, 368, 1],
        // Staircase up to high section
        [237, 404, 2], [240, 372, 2], [243, 340, 2],
        // High platform run
        [246, 308, 4],
        // Bridge over gap (tiles 250-254)
        [251, 404, 2], [253, 372, 1],
        // Descending staircase
        [258, 372, 2], [261, 404, 2],
        // Block row
        [265, 340, 3],

        // ── Zone 5 — Gauntlet (tiles 273-338) ──
        // Platforms over gap (tiles 268-273)
        [269, 404, 2], [272, 372, 2],
        // Tight floating platforms (need precise jumping)
        [278, 340, 2], [282, 304, 2], [286, 340, 2],
        // Low platforms
        [291, 404, 3],
        // Bridge over gap (tiles 295-300)
        [296, 404, 2], [299, 372, 2],
        // Rapid staircase
        [304, 404, 1], [306, 372, 1], [308, 340, 1], [310, 308, 1],
        // High platform run
        [312, 308, 4],
        // Descending
        [317, 340, 2],
        // Bridge over gap (tiles 318-323)
        [319, 404, 2], [322, 372, 2],
        // Final gauntlet platforms
        [327, 340, 3], [332, 304, 3],
        [336, 372, 2],

        // ── Zone 6 — Final Stretch + Staircase (tiles 342-395) ──
        // Floating blocks over flat ground
        [347, 372, 3], [353, 340, 3],
        // "Pipe"
        [360, 436, 2], [360, 404, 2],
        // High platform with reward
        [366, 304, 3],
        // Classic SMB end staircase (ascending to flag)
        [375, 436, 1],
        [376, 436, 2], [376, 404, 1],
        [378, 436, 3], [378, 404, 2], [378, 372, 1],
        [381, 436, 4], [381, 404, 3], [381, 372, 2], [381, 340, 1],
    ],
    // Food collectibles [pixelX, pixelY, type]
    // type: 0=bigmac (2 cholesterol pts), 1=coke (1 cholesterol pt)
    food: [
        // ── Zone 1 — Intro ──
        // Ground-level trail (teaches collecting)
        [160,436,1], [192,436,1], [224,436,1],
        // On floating blocks
        [272,336,0], [336,336,1],
        // On step platforms
        [608,340,1], [640,340,0],
        // On staircase peak
        [1440,308,0],
        // Ground-level before gap
        [1920,436,1], [1952,436,1],

        // ── Zone 2 — First Gaps ──
        // Over gap 1 (risk/reward, floating in air)
        [2240,370,1],
        // On ascending platforms
        [2496,340,0], [2624,304,1],
        // On high floating row
        [2784,272,0], [2816,272,1],
        // Ground after gap 2
        [3200,436,1], [3264,436,1],
        // Near pipe
        [3392,372,0],
        // On block rows
        [3584,336,1], [3648,336,1], [3776,336,1],
        // Staircase area
        [3936,372,0], [4032,340,1],

        // ── Zone 3 — Platforming Challenge ──
        // Over gap
        [4160,372,1],
        // On ascending series
        [4416,340,0], [4544,308,1],
        [4640,272,0], [4672,272,1],
        // Between pipes
        [5568,304,0], [5600,304,1],
        // On zigzag platforms
        [5920,340,1], [6080,272,0], [6240,340,1],

        // ── Zone 4 — Mixed Terrain ──
        // Over gap
        [6400,368,1],
        // On alternating blocks
        [6656,340,1], [6752,272,0], [6848,340,1],
        // High platform run
        [7904,276,0], [7936,276,1],
        // Ground-level
        [7424,436,1], [7520,436,1],
        // On descending staircase
        [8288,340,1], [8384,372,0],

        // ── Zone 5 — Gauntlet ──
        // Over gap (risk/reward)
        [8672,372,1],
        // On tight floating platforms
        [8928,308,0], [9024,272,1],
        // Ground-level
        [9408,436,1], [9472,436,0],
        // On rapid staircase peak
        [9920,276,0],
        // High platform run
        [10048,276,1], [10112,276,1],
        // Over gap
        [10272,372,1],
        // Final gauntlet
        [10528,308,0], [10656,272,1], [10752,272,0],

        // ── Zone 6 — Final Stretch ──
        // On floating blocks
        [11136,340,1], [11200,340,1],
        [11328,308,0], [11360,308,1],
        // High reward platform
        [11744,272,0], [11776,272,1],
        // Ground trail to flag
        [11936,436,1], [12000,436,1], [12064,436,0],
    ],
    // Enemies [pixelX, patrolLeft, patrolRight, type]
    // type: 0=journalist, 1=scientist, 2=girl, 3=lobbyist
    enemies: [
        // ── Zone 1 — Intro (easy journalists) ──
        [480,  320,  640,  0],    // journalist on flat ground
        [880,  768, 1024,  0],    // journalist on flat ground
        [1600, 1500, 1700, 0],    // journalist before staircase

        // ── Zone 2 — First Gaps (introduce scientists + girls) ──
        // ground [71,95]=px 2272-3071, [98,128]=px 3136-4127
        // pipe at tiles 104-105 = px 3328-3391
        [2400, 2272, 2560, 1],    // scientist on ground after gap 1
        [2800, 2720, 2944, 0],    // journalist near high platforms
        [3250, 3136, 3320, 2],    // girl — before pipe (stops at pipe)
        [3700, 3400, 3840, 1],    // scientist after pipe
        [4000, 3900, 4096, 0],    // journalist near staircase

        // ── Zone 3 — Platforming Challenge (mixed types) ──
        // ground [132,160]=px 4224-5151, [164,198]=px 5248-6367
        // pipes at tiles 170-171=px 5440-5503, tiles 178-179=px 5696-5759
        [4500, 4320, 4700, 1],    // scientist on ground
        [4900, 4800, 5120, 2],    // girl on ground
        [5350, 5248, 5430, 0],    // journalist before first pipe
        [5600, 5510, 5690, 3],    // lobbyist between pipes (clear of both)
        [6000, 5770, 6200, 1],    // scientist after second pipe
        [6300, 6200, 6336, 2],    // girl on ground

        // ── Zone 4 — Mixed Terrain (lobbyists introduced heavily) ──
        // ground [202,228]=px 6464-7327, [232,250]=px 7424-8031, [254,268]=px 8128-8607
        // pipe at tiles 221-222=px 7072-7135
        [6600, 6464, 6800, 0],    // journalist on ground
        [6900, 6800, 7060, 3],    // lobbyist before pipe (stops at pipe)
        [7200, 7140, 7320, 1],    // scientist after pipe (clear of pipe)
        [7600, 7424, 7800, 2],    // girl on second ground segment
        [7900, 7800, 8000, 0],    // journalist
        [8200, 8128, 8350, 3],    // lobbyist on third ground segment

        // ── Zone 5 — Gauntlet (heavy enemies, all types) ──
        // ground [273,295]=px 8736-9471, [300,318]=px 9600-10207, [323,338]=px 10336-10847
        [8800, 8736, 8960, 1],    // scientist
        [9100, 8960, 9280, 2],    // girl
        [9350, 9280, 9440, 3],    // lobbyist
        [9700, 9600, 9760, 1],    // scientist (spawn on segment [300,318])
        [9900, 9760, 10000, 2],   // girl
        [10100, 9920, 10200, 0],  // journalist (patrol within segment)
        [10450, 10336, 10550, 3], // lobbyist (on segment [323,338])
        [10600, 10550, 10700, 1], // scientist
        [10750, 10700, 10816, 2], // girl

        // ── Zone 6 — Final Stretch (last enemies before flag) ──
        // ground [342,395]=px 10944-12671
        // pipe at tiles 360-361=px 11520-11583, staircase starts tile 375=px 12000
        [11100, 10944, 11300, 0], // journalist on ground
        [11400, 11300, 11510, 2], // girl (stops before pipe)
        [11700, 11590, 11850, 3], // lobbyist (after pipe, before staircase)
        [11950, 11860, 11990, 1], // scientist — last enemy (before staircase)
    ],
    // Power-ups [pixelX, pixelY, type]
    // type: 0=MAGA Hat, 1=Censor Bar, 2=Classified Docs
    powerups: [
        // Zone 1 — MAGA Hat above high platform [30, 304, 3] (tiles 30-32, px 960-1055)
        [1008, 268, 0],
        // Zone 2 — Censor Bar above high row [86, 304, 4] (tiles 86-89, px 2752-2879)
        [2816, 268, 1],
        // Zone 3 — Classified Docs above high platform [145, 304, 3] (tiles 145-147, px 4640-4735)
        [4688, 268, 2],
        // Zone 4 — MAGA Hat above high run [246, 308, 4] (tiles 246-249, px 7872-7967)
        [7920, 272, 0],
        // Zone 5 — Censor Bar above high run [312, 308, 4] (tiles 312-315, px 9984-10079)
        [10016, 272, 1],
        // Zone 6 — Classified Docs above high platform [366, 304, 3] (tiles 366-368, px 11712-11807)
        [11760, 268, 2],
    ],
    flagX: 12480,
};

// ── PRELOAD SCENE ────────────────────────────────────────────
class PreloadScene extends Phaser.Scene {
    constructor() { super('Preload'); }

    preload() {
        // Progress bar
        const cx = this.scale.width / 2, cy = this.scale.height / 2;
        const barMaxW = this.scale.width * 0.9;
        const barLeft = cx - barMaxW / 2;
        this.add.rectangle(cx, cy, barMaxW + 4, 24, 0x333333);
        const bar = this.add.rectangle(barLeft, cy, 0, 20, 0xFFD700).setOrigin(0, 0.5);
        this.add.text(cx, cy - 30, 'LOADING...', {
            fontSize: '16px', fontFamily: 'Arial Black', color: '#FFD700'
        }).setOrigin(0.5);
        this.load.on('progress', v => { bar.width = barMaxW * v; });

        // Silently skip missing/corrupt placeholders
        this.load.on('loaderror', (file) => { console.warn('Asset skipped:', file.key); });

        // Sprites
        try { this.load.spritesheet('player-ext', 'assets/sprites/player.png', { frameWidth: 48, frameHeight: 48 }); } catch(e) {}
        try { this.load.spritesheet('enemies-ext', 'assets/sprites/enemies.png', { frameWidth: 48, frameHeight: 48 }); } catch(e) {}
        try { this.load.spritesheet('powerups-ext', 'assets/sprites/powerups.png', { frameWidth: 48, frameHeight: 48 }); } catch(e) {}
        try { this.load.image('player-tweet', 'assets/sprites/player-tweet.png'); } catch(e) {}
        try { this.load.image('bigmac-ext', 'assets/sprites/bigmac.png'); } catch(e) {}
        try { this.load.image('coke-ext', 'assets/sprites/coke.png'); } catch(e) {}
        try { this.load.image('player-shart', 'assets/sprites/shart.png'); } catch(e) {}
        try { this.load.image('player-pole', 'assets/sprites/trump-pole-slide.png'); } catch(e) {}
        try { this.load.image('hat-ext', 'assets/sprites/hat.png'); } catch(e) {}
        try { this.load.image('bar-ext', 'assets/sprites/bar.png'); } catch(e) {}
        try { this.load.image('classified-docs-ext', 'assets/sprites/classified-docs.png'); } catch(e) {}
        try { this.load.spritesheet('lobbyist-ext', 'assets/sprites/lobbyist.png',
            { frameWidth: 48, frameHeight: 48 }); } catch(e) {}
        try { this.load.spritesheet('lobbyist-case-ext', 'assets/sprites/lobbyist-suitcase.png',
            { frameWidth: 48, frameHeight: 48 }); } catch(e) {}

        // Tiles
        try { this.load.image('ground-ext', 'assets/tiles/ground.png'); } catch(e) {}
        try { this.load.image('brick-ext',  'assets/tiles/brick.png'); } catch(e) {}
        try { this.load.spritesheet('qblock-ext', 'assets/tiles/qblock.png', { frameWidth: 32, frameHeight: 32 }); } catch(e) {}

        // Backgrounds
        try { this.load.image('sky-ext', 'assets/sprites/background.png'); } catch(e) {}
        try { this.load.image('menuBg',  'assets/ui/title-screen.png'); } catch(e) {}
        try { this.load.image('menuCover', 'assets/game-cover-2.jpg'); } catch(e) {}

        // Speech scene
        try { this.load.image('speechBg', 'assets/presidential-podium.png'); } catch(e) {}
        try { this.load.spritesheet('speechSprite', 'assets/sprites/png-trump-speech.png', { frameWidth: 48, frameHeight: 48 }); } catch(e) {}
        try { this.load.image('girl1w1', 'assets/sprites/girl1-wave1.png'); } catch(e) {}
        try { this.load.image('girl1w2', 'assets/sprites/girl1-wave2.png'); } catch(e) {}
        try { this.load.image('girl2w1', 'assets/sprites/girl2-wave1.png'); } catch(e) {}
        try { this.load.image('girl2w2', 'assets/sprites/girl2-wave2.png'); } catch(e) {}
        try { this.load.image('girl2w3', 'assets/sprites/girl2-wave3.png'); } catch(e) {}
        try { this.load.image('girl2w4', 'assets/sprites/girl2-wave4.png'); } catch(e) {}

        // HUD
        try { this.load.spritesheet('hudIcons', 'assets/ui/hud-icons.png', { frameWidth: 32, frameHeight: 32 }); } catch(e) {}

        // Audio
        try { this.load.audio('snd-jump',    'assets/audio/jump.wav'); } catch(e) {}
        try { this.load.audio('snd-stomp',   'assets/audio/stomp.wav'); } catch(e) {}
        try { this.load.audio('snd-coin',    'assets/audio/coin.mp3'); } catch(e) {}
        try { this.load.audio('snd-die',     'assets/audio/die.wav'); } catch(e) {}
        try { this.load.audio('snd-death-song', 'assets/audio/death-song.wav'); } catch(e) {}
        try { this.load.audio('snd-game-over', 'assets/audio/game-over.wav'); } catch(e) {}
        try { this.load.audio('snd-win',     'assets/audio/win.wav'); } catch(e) {}
        try { this.load.audio('snd-powerup', 'assets/audio/powerup.wav'); } catch(e) {}
        try { this.load.audio('bgm',         'assets/audio/bgm-game.mp3'); } catch(e) {}
        try { this.load.audio('bgmMenu',     'assets/audio/bgm-menu.mp3'); } catch(e) {}
        try { this.load.audio('bgm-censor',  'assets/audio/bgm-censor.mp3'); } catch(e) {}
        try { this.load.audio('snd-shart',   'assets/audio/shart.wav'); } catch(e) {}
        try { this.load.audio('snd-tweet',   'assets/audio/tweet.wav'); } catch(e) {}
        try { this.load.audio('speechAudio', 'assets/audio/trump-speech.mp3'); } catch(e) {}
        try { this.load.audio('hailChief', 'assets/audio/hail-the-chief.mp3'); } catch(e) {}
        try { this.load.audio('crowd', 'assets/audio/crowd.mp3'); } catch(e) {}
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
            playerTweet: this.textures.exists('player-tweet'),
            bigmac:   this.textures.exists('bigmac-ext'),
            coke:     this.textures.exists('coke-ext'),
            playerShart: this.textures.exists('player-shart'),
            playerPole: this.textures.exists('player-pole'),
            hat: this.textures.exists('hat-ext'),
            bar: this.textures.exists('bar-ext'),
            classifiedDocs: this.textures.exists('classified-docs-ext'),
            lobbyist:     this.textures.exists('lobbyist-ext'),
            lobbyistCase: this.textures.exists('lobbyist-case-ext'),
            audio:    this.cache.audio.has('snd-jump'),
            censorBgm: this.cache.audio.has('bgm-censor'),
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
        if (!AL.bigmac)  this.textures.addCanvas('bigmac', genBigmac());
        if (!AL.coke)    this.textures.addCanvas('coke', genCoke());

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
            bigmac:   AL.bigmac  ? 'bigmac-ext'   : 'bigmac',
            coke:     AL.coke    ? 'coke-ext'      : 'coke',
            lobbyist:     AL.lobbyist     ? 'lobbyist-ext'      : null,
            lobbyistCase: AL.lobbyistCase ? 'lobbyist-case-ext' : null,
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
        const sw = this.scale.width;
        const sh = this.scale.height;

        // Background: use game-cover-2.jpg, fall back to static
        this.cameras.main.setBackgroundColor('#000000');
        const hasMenuCover = this.textures.exists('menuCover');
        if (hasMenuCover) {
            const cover = this.add.image(sw/2, sh/2, 'menuCover');
            const coverScale = Math.min(sw / cover.width, sh / cover.height);
            cover.setScale(coverScale);
        } else if (T.menuBg) {
            this.add.image(sw/2, sh/2, T.menuBg).setDisplaySize(sw, sh);
        } else {
            this.add.image(sw/2, sh/2, T.sky || 'sky');
            this.add.image(sw/2, sh - 80, 'hillsFar');
            this.add.image(sw/2, sh - 40, 'hillsNear');
            for (let x = 0; x < sw; x += TILE) {
                this.add.image(x + TILE/2, sh - TILE/2, T.ground || 'ground');
            }

            // Title shadow
            this.add.text(sw/2 + 3, 83, 'SUPER MAGA BROS.', {
                fontSize: '48px', fontFamily: 'Arial Black, Impact, sans-serif',
                fontStyle: 'bold', color: '#000000',
            }).setOrigin(0.5);

            // Title text
            this.add.text(sw/2, 80, 'SUPER MAGA BROS.', {
                fontSize: '48px', fontFamily: 'Arial Black, Impact, sans-serif',
                fontStyle: 'bold', color: C.gold,
                stroke: C.capRed, strokeThickness: 5,
            }).setOrigin(0.5);

            // Subtitle
            this.add.text(sw/2, 130, 'MAKE PLATFORMING GREAT AGAIN', {
                fontSize: '14px', fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold', color: C.white,
            }).setOrigin(0.5);

            // Player character in center
            const pk = T.player || 'player';
            const p = this.add.sprite(sw/2, sh - TILE - 24, pk, 0).setScale(2.5);
            this.tweens.add({
                targets: p, y: p.y - 8, duration: 800,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });

            // Stars decoration
            const starL = this.add.image(sw/2 - 180, 80, 'star').setScale(1.5);
            const starR = this.add.image(sw/2 + 180, 80, 'star').setScale(1.5);
            this.tweens.add({ targets: [starL, starR], angle: 360, duration: 3000, repeat: -1 });
        }

        // "Press to play" prompt + credit (overlaid on cover image)
        const inst = this.add.text(sw/2, sh - 80, 'Press or touch anywhere to play', {
            fontSize: '22px', fontFamily: 'Arial Black, Impact, sans-serif',
            color: C.white, stroke: C.navy, strokeThickness: 3,
        }).setOrigin(0.5);
        this.tweens.add({ targets: inst, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
        this.add.rectangle(sw/2, sh - 48, 240, 24, 0x000000, 0.6).setOrigin(0.5);
        this.add.text(sw/2, sh - 48, 'created by Antonio Lamb', {
            fontSize: '15px', fontFamily: 'Arial Black, Impact, sans-serif',
            color: '#FFFFFF', stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5);

        // Menu background music
        if (this.cache.audio.has('bgmMenu')) {
            this.menuMusic = this.sound.add('bgmMenu', { loop: true, volume: 0.7 });
            if (!this.sound.locked) {
                this.menuMusic.play();
            }
        }

        // Start listener — first press unlocks audio and starts a 5-second
        // countdown so the player hears the menu music before advancing.
        let needsUnlock = this.sound.locked;
        let gameStarting = false;
        let canAdvance = !needsUnlock;  // if audio was never locked, can advance immediately
        const self = this;

        // Countdown text (hidden until audio unlocked)
        const countdownText = this.add.text(sw/2, sh - 110, '', {
            fontSize: '16px', fontFamily: 'Arial Black, Impact, sans-serif',
            color: C.gold, stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

        const startCountdown = () => {
            inst.setText('');
            let remaining = 5;
            countdownText.setText('Starting in ' + remaining + '...').setAlpha(1);
            self.time.addEvent({
                delay: 1000, repeat: 4,
                callback: () => {
                    remaining--;
                    if (remaining > 0) {
                        countdownText.setText('Starting in ' + remaining + '...');
                    } else {
                        countdownText.setText('Press or touch anywhere to play');
                        self.tweens.add({ targets: countdownText, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
                        canAdvance = true;
                    }
                },
            });
        };

        const handler = () => {
            if (gameStarting) return;
            if (needsUnlock) {
                needsUnlock = false;
                if (self.menuMusic && !self.menuMusic.isPlaying) {
                    self.menuMusic.play();
                }
                startCountdown();
                // Re-register for the real start
                self.input.keyboard.once('keydown', handler);
                self.input.once('pointerdown', handler);
                return;
            }
            if (!canAdvance) {
                // Re-register — countdown still running
                self.input.keyboard.once('keydown', handler);
                self.input.once('pointerdown', handler);
                return;
            }
            gameStarting = true;
            self._menuHandler = null;
            if (self.menuMusic) self.menuMusic.stop();
            self.cameras.main.fadeOut(300, 0, 0, 0);
            self.time.delayedCall(300, () => self.scene.start('Speech'));
        };
        this.input.keyboard.once('keydown', handler);
        this.input.once('pointerdown', handler);

        // Also detect touch-button presses (HTML overlay buttons don't reach Phaser input)
        this._menuHandler = handler;
        this._touchWasDown = false;
    }

    update() {
        const T = window.TOUCH;
        if (!T || !this._menuHandler) return;
        const down = T.left || T.right || T.jump || T.tweet;
        if (down && !this._touchWasDown) {
            this._menuHandler();
        }
        this._touchWasDown = !!down;
    }
}

// ── SPEECH SCENE ────────────────────────────────────────────
class SpeechScene extends Phaser.Scene {
    constructor() { super('Speech'); }

    create() {
        const sw = this.scale.width;
        const sh = this.scale.height;
        this.cameras.main.setBackgroundColor('#000000');
        this.cameras.main.fadeIn(300);
        this._skipping = false;
        this._canSkip = false;
        this.time.delayedCall(10000, () => { this._canSkip = true; });

        // ─ Background (500x333) scaled to fit viewport
        const bgScale = Math.min(sw / 500, sh / 333);
        const bgLeft = sw / 2 - (500 * bgScale) / 2;
        const bgTop  = sh / 2 - (333 * bgScale) / 2;
        if (this.textures.exists('speechBg')) {
            this.add.image(sw / 2, sh / 2, 'speechBg').setScale(bgScale);
        }

        // ─ Speech sprite at (250, 157) relative to background
        const spriteX = bgLeft + 250 * bgScale;
        const spriteY = bgTop + 157 * bgScale;
        if (this.textures.exists('speechSprite')) {
            this.speechChar = this.add.sprite(spriteX, spriteY, 'speechSprite', 0)
                .setScale(bgScale);
            // Random frame switching to simulate speaking
            this.time.addEvent({
                delay: 250,
                callback: () => {
                    if (this.speechChar && this.speechChar.active) {
                        this.speechChar.setFrame(Phaser.Math.Between(0, 3));
                    }
                },
                loop: true,
            });
        }

        // ─ Bystander girls waving next to the speaker
        const girlScale = bgScale * 1.3;
        // Girl1 (2 wave frames) — left of speaker
        const girl1X = bgLeft + 205 * bgScale;
        const girl1Y = bgTop + 185 * bgScale;
        const g1frames = ['girl1w1', 'girl1w2'].filter(k => this.textures.exists(k));
        if (g1frames.length > 0) {
            this.girl1 = this.add.image(girl1X, girl1Y, g1frames[0]).setScale(girlScale);
            if (g1frames.length > 1) {
                let g1i = 0;
                this.time.addEvent({
                    delay: 350,
                    callback: () => {
                        if (this.girl1 && this.girl1.active) {
                            g1i = (g1i + 1) % g1frames.length;
                            this.girl1.setTexture(g1frames[g1i]);
                        }
                    },
                    loop: true,
                });
            }
        }
        // Girl2 (4 frames including turn-around) — right of speaker
        const girl2X = bgLeft + 295 * bgScale;
        const girl2Y = bgTop + 185 * bgScale;
        const g2frames = ['girl2w1', 'girl2w2', 'girl2w3', 'girl2w4'].filter(k => this.textures.exists(k));
        if (g2frames.length > 0) {
            this.girl2 = this.add.image(girl2X, girl2Y, g2frames[0]).setScale(girlScale);
            if (g2frames.length > 1) {
                let g2i = 0;
                this.time.addEvent({
                    delay: 400,
                    callback: () => {
                        if (this.girl2 && this.girl2.active) {
                            g2i = (g2i + 1) % g2frames.length;
                            this.girl2.setTexture(g2frames[g2i]);
                        }
                    },
                    loop: true,
                });
            }
        }

        // ─ Text bubble above character
        const bubbleW = 340 * bgScale;
        const bubbleH = 105 * bgScale;
        const bubbleX = spriteX;
        const bubbleY = spriteY - 115 * bgScale;
        const gfx = this.add.graphics();
        // Bubble background
        gfx.fillStyle(0xffffff, 0.92);
        gfx.fillRoundedRect(bubbleX - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 10 * bgScale);
        gfx.lineStyle(2 * bgScale, 0x000000);
        gfx.strokeRoundedRect(bubbleX - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 10 * bgScale);
        // Small triangle pointer toward character
        const triY = bubbleY + bubbleH / 2;
        gfx.fillStyle(0xffffff, 0.92);
        gfx.fillTriangle(bubbleX - 8 * bgScale, triY, bubbleX + 8 * bgScale, triY, bubbleX, triY + 12 * bgScale);
        gfx.lineStyle(2 * bgScale, 0x000000);
        gfx.lineBetween(bubbleX - 8 * bgScale, triY, bubbleX, triY + 12 * bgScale);
        gfx.lineBetween(bubbleX + 8 * bgScale, triY, bubbleX, triY + 12 * bgScale);
        // Full speech text — continuous scroll inside bubble
        const speechText = 'Thank you.\n'
            + 'It is really a great crowd, truly, truly great.\n'
            + 'And I want to tell you something that\'s been weighing on my mind a lot lately.\n'
            + 'You see, there was this one guy, Jeffrey Epstein.\n'
            + 'We used to have some great times together, truly, truly great.\n'
            + 'But the fake news is trying to ruin everybody\'s good time with their facts and their evidence.\n'
            + 'We had some good times together, truly, truly great.\n'
            + 'But I swear, all of those girls were at least 18.\n'
            + 'So let me tell you something else.\n'
            + 'Let me tell you.\n'
            + 'I\'m going on a mission and I\'m embarking out of Mar-a-Lago on a journey to clear Jeffrey Epstein\'s name.\n'
            + 'I\'ll be also taking down the deep state and the fake news because when it comes to fighting for what\'s right, nobody, and I mean nobody truly, can match Donald J. Trump.\n'
            + 'Thank you for your attention to this matter.';
        const speechFontSize = Math.max(9, Math.round(11 * bgScale));
        const padX = 10 * bgScale;
        const padY = 6 * bgScale;

        // Mask to clip text inside bubble
        const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
        maskShape.fillStyle(0xffffff);
        maskShape.fillRoundedRect(
            bubbleX - bubbleW / 2 + padX, bubbleY - bubbleH / 2 + padY,
            bubbleW - padX * 2, bubbleH - padY * 2, 6 * bgScale
        );
        const textMask = maskShape.createGeometryMask();

        const textTopY = bubbleY - bubbleH / 2 + padY;
        this.bubbleText = this.add.text(
            bubbleX, textTopY,
            speechText, {
            fontSize: speechFontSize + 'px',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            wordWrap: { width: bubbleW - padX * 2 },
            lineSpacing: 2,
            align: 'center',
        }).setOrigin(0.5, 0).setMask(textMask);

        // Scroll from first lines visible to last lines visible over 65s
        const visibleH = bubbleH - padY * 2;
        const textH = this.bubbleText.height;
        const scrollDist = Math.max(0, textH - visibleH);
        if (scrollDist > 0) {
            this.tweens.add({
                targets: this.bubbleText,
                y: textTopY - scrollDist,
                duration: 65000,
                ease: 'Linear',
            });
        }

        // ─ Background music (Hail to the Chief)
        this.bgMusic = null;
        if (this.cache.audio.has('hailChief')) {
            this.bgMusic = this.sound.add('hailChief', { loop: true, volume: 0.1 });
            if (!this.sound.locked) {
                this.bgMusic.play();
            } else {
                this.sound.once('unlocked', () => {
                    if (this.bgMusic && !this._skipping) this.bgMusic.play();
                });
            }
        }

        // ─ Crowd cheering (looped, low volume)
        this.crowdSound = null;
        if (this.cache.audio.has('crowd')) {
            this.crowdSound = this.sound.add('crowd', { loop: true, volume: 0.03 });
            if (!this.sound.locked) {
                this.crowdSound.play();
            } else {
                this.sound.once('unlocked', () => {
                    if (this.crowdSound && !this._skipping) this.crowdSound.play();
                });
            }
        }

        // ─ Speech audio
        this.speechSound = null;
        if (this.cache.audio.has('speechAudio')) {
            this.speechSound = this.sound.add('speechAudio', { volume: 1.8 });
            if (!this.sound.locked) {
                this.speechSound.play();
            } else {
                this.sound.once('unlocked', () => {
                    if (this.speechSound && !this._skipping) this.speechSound.play();
                });
            }
            this.speechSound.once('complete', () => {
                if (!this._skipping) this._goToGame();
            });
        } else {
            // No audio — auto-advance after a short delay
            this.time.delayedCall(3000, () => { if (!this._skipping) this._goToGame(); });
        }

        // ─ Skip prompt with countdown
        const skipText = this.add.text(sw / 2, sh - 20, '', {
            fontSize: '14px', fontFamily: 'Arial, sans-serif',
            color: '#aaaaaa',
        }).setOrigin(0.5);
        let skipCountdown = 10;
        skipText.setText('Skip available in ' + skipCountdown + '...');
        this.time.addEvent({
            delay: 1000, repeat: 9,
            callback: () => {
                skipCountdown--;
                if (skipCountdown > 0) {
                    skipText.setText('Skip available in ' + skipCountdown + '...');
                } else {
                    skipText.setText('Press SPACE or tap JUMP to skip');
                }
            },
        });

        // ─ Skip handlers (only after 5-second delay)
        this.input.keyboard.on('keydown', (e) => {
            if (!this._canSkip) return;
            if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
                this._goToGame();
            }
        });
        this._skipCheckTimer = this.time.addEvent({
            delay: 100, loop: true,
            callback: () => {
                if (this._canSkip && window.TOUCH && window.TOUCH.jump) this._goToGame();
            },
        });
    }

    _goToGame() {
        if (this._skipping) return;
        this._skipping = true;
        if (this.speechSound && this.speechSound.isPlaying) {
            this.speechSound.stop();
        }
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.stop();
        }
        if (this.crowdSound && this.crowdSound.isPlaying) {
            this.crowdSound.stop();
        }
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start('Game', { lives: 3, score: 0, cholesterol: 0 }));
    }

    update() {
        // Detect touch-button presses (HTML overlay buttons don't reach Phaser input)
        if (!this._canSkip) return;
        const T = window.TOUCH;
        if (!T) return;
        const down = T.left || T.right || T.jump || T.tweet;
        if (down && !this._touchWasDown) {
            this._goToGame();
        }
        this._touchWasDown = !!down;
    }
}

// ── GAME SCENE ──────────────────────────────────────────────
class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    init(data) {
        this.score = data.score || 0;
        this.lives = data.lives !== undefined ? data.lives : 3;
        this.cholesterol = data.cholesterol || 0;
        this.earthquakeReady = this.cholesterol >= 50;
        this.earthquakeCooldown = false;
        // Power-up state resets on death (independent timers)
        this.playerPower = -1;   // kept for HUD display of most recent
        this.powerTimer = 0;     // kept for HUD display
        this.invincible = false;
        this.censorTimer = 0;
        this.hasTweetBlast = false;
        this.tweetBlastTimer = 0;
        this.hasHat = false;
        this.canDoubleJump = false;
        this.hasUsedDoubleJump = false;
        this.tweetCooldown = false;
    }

    create() {
        this.totalFood = LEVEL.food.length;
        this.dead = false;
        this.won = false;
        const T = window.TEX || {};

        // ─ Background layers (parallax)
        const sw = this.scale.width;
        const sh = this.scale.height;
        const skyKey = T.sky || 'sky';
        if (T.sky) {
            // External background: image anchored at bottom-left, height matches ground
            const tex = this.textures.get(skyKey).getSourceImage();
            const bgScale = (GROUND_Y + TILE) / tex.height;  // scale so image bottom = ground bottom
            this.skyImg = this.add.image(0, GROUND_Y + TILE, skyKey)
                .setOrigin(0, 1)           // anchor bottom-left
                .setScale(bgScale)
                .setScrollFactor(0.03, 0)  // slow horizontal parallax, fixed vertical
                .setDepth(-10);
        } else {
            // Procedural sky: tileSprite for seamless tiling
            this.skyImg = this.add.tileSprite(0, 0, sw, sh, skyKey).setOrigin(0).setScrollFactor(0).setDepth(-10);
        }
        this.farHills = this.add.tileSprite(0, sh - 180, sw, 200, 'hillsFar').setOrigin(0).setScrollFactor(0).setDepth(-9);
        this.nearHills = this.add.tileSprite(0, sh - 140, sw, 160, 'hillsNear').setOrigin(0).setScrollFactor(0).setDepth(-8);

        // Hide procedural hills when external background is loaded (it includes its own scenery)
        if (T.sky) {
            this.farHills.setVisible(false);
            this.nearHills.setVisible(false);
        }

        // ─ World bounds (clamp to ground bottom so camera never shows below ground)
        this.physics.world.setBounds(0, 0, WORLD_W, GROUND_Y + TILE);

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

        // ─ Food collectibles (bigmacs + cokes)
        const bmKey = T.bigmac || 'bigmac';
        const ckKey = T.coke || 'coke';
        this.foodGroup = this.physics.add.group({ allowGravity: false });
        LEVEL.food.forEach(([fx, fy, ftype], idx) => {
            const key = ftype === 0 ? bmKey : ckKey;
            const food = this.foodGroup.create(fx, fy, key);
            food.foodType = ftype;
            food.setDisplaySize(24, 24);
            food.setCircle(10, 2, 2);
            this.tweens.add({
                targets: food, y: fy - 6, duration: 800 + (idx % 5) * 100,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
        });

        // ─ Enemies (3 types + lobbyist)
        const ek = T.enemy || 'enemy';
        const enemyExt = T.enemyExt;
        this.enemyGroup = this.physics.add.group();

        // Pre-create lobbyist animations before spawn loop
        const AL0 = window.ASSETS_LOADED || {};
        if (AL0.lobbyist) {
            if (!this.anims.exists('lobbyistWalk')) {
                this.anims.create({
                    key: 'lobbyistWalk',
                    frames: this.anims.generateFrameNumbers('lobbyist-ext', { frames: [0, 1] }),
                    frameRate: 4, repeat: -1,
                });
            }
            if (!this.anims.exists('lobbyistDead')) {
                this.anims.create({
                    key: 'lobbyistDead',
                    frames: [{ key: 'lobbyist-ext', frame: 2 }],
                    frameRate: 1,
                });
            }
        }
        if (AL0.lobbyistCase) {
            if (!this.anims.exists('caseSlide')) {
                this.anims.create({
                    key: 'caseSlide',
                    frames: [{ key: 'lobbyist-case-ext', frame: 0 }],
                    frameRate: 1,
                });
            }
            if (!this.anims.exists('caseStill')) {
                this.anims.create({
                    key: 'caseStill',
                    frames: [{ key: 'lobbyist-case-ext', frame: 1 }],
                    frameRate: 1,
                });
            }
            if (!this.anims.exists('caseBurst')) {
                this.anims.create({
                    key: 'caseBurst',
                    frames: [{ key: 'lobbyist-case-ext', frame: 2 }],
                    frameRate: 1,
                    repeat: 0,
                });
            }
        }

        LEVEL.enemies.forEach(([ex, eL, eR, type]) => {
            const et = ENEMY_TYPES[type] || ENEMY_TYPES[0];
            let e;
            if (type === 3) {
                const AL2 = window.ASSETS_LOADED || {};
                if (AL2.lobbyist) {
                    e = this.enemyGroup.create(ex, GROUND_Y - 24, 'lobbyist-ext', 0);
                    e.play('lobbyistWalk');
                } else {
                    e = this.enemyGroup.create(ex, GROUND_Y - 14, ek, 0);
                    e.setTint(0xFFAA00);
                }
            } else if (enemyExt) {
                e = this.enemyGroup.create(ex, GROUND_Y - 24, ek, type * 4);
            } else {
                e = this.enemyGroup.create(ex, GROUND_Y - 14, ek, 0);
                if (et.tint) e.setTint(et.tint);
            }
            e.setSize(28, 36).setOffset(10, 12);
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

        const AL = window.ASSETS_LOADED || {};
        LEVEL.powerups.forEach(([pux, puy, type]) => {
            let pu;
            if (type === 0 && AL.hat) {
                pu = this.powerupGroup.create(pux, puy, 'hat-ext');
                pu.setDisplaySize(32, 32);
            } else if (type === 1 && AL.bar) {
                pu = this.powerupGroup.create(pux, puy, 'bar-ext');
                pu.setDisplaySize(32, 32);
            } else if (type === 2 && AL.classifiedDocs) {
                pu = this.powerupGroup.create(pux, puy, 'classified-docs-ext');
                pu.setDisplaySize(32, 32);
            } else if (powerExt) {
                pu = this.powerupGroup.create(pux, puy, 'powerups-ext', type);
            } else {
                pu = this.powerupGroup.create(pux, puy, 'powerup' + type);
            }
            pu.powerType = type;
            this.tweens.add({
                targets: pu, y: puy - 8, duration: 1000,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            // Censor bar items sparkle on the map
            if (type === 1) {
                pu._sparkleTimer = this.time.addEvent({
                    delay: 300,
                    loop: true,
                    callback: () => {
                        if (pu.active && this.sparkleEmitter) {
                            this.sparkleEmitter.emitParticleAt(
                                pu.x + (Math.random() - 0.5) * 30,
                                pu.y + (Math.random() - 0.5) * 30,
                                1
                            );
                        }
                    },
                });
            }
        });

        // ─ Tweet blast group
        this.tweetGroup = this.physics.add.group({ allowGravity: false });
        this.caseGroup = this.physics.add.group({ allowGravity: true });

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

        // ─ Censor bar overlay (hidden until Censor Bar power-up collected)
        this.censorBar = this.add.rectangle(0, 0, 52, 52, 0x000000)
            .setDepth(6)
            .setVisible(false);

        // ─ Player animations (only create once — anims are global)
        if (!this.anims.exists('idle')) {
            this.anims.create({ key: 'idle', frames: [{ key: pk, frame: 0 }], frameRate: 1 });
            this.anims.create({ key: 'run', frames: this.anims.generateFrameNumbers(pk, { frames: [1, 2] }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: 'jump', frames: [{ key: pk, frame: 3 }], frameRate: 1 });
            this.anims.create({ key: 'hurt', frames: [{ key: pk, frame: 4 }], frameRate: 1 });
            this.anims.create({ key: 'dead', frames: [{ key: pk, frame: 5 }], frameRate: 1 });
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
            if (e.enemyType === 3) return;
            e.play(enemyExt ? ('enemy' + e.enemyType + 'Walk') : 'enemyWalk');
        });

        // ─ Colliders
        this.physics.add.collider(this.player, this.groundGroup);
        this.physics.add.collider(this.player, this.platformGroup);
        this.physics.add.collider(this.enemyGroup, this.groundGroup);
        this.physics.add.collider(this.enemyGroup, this.platformGroup);

        this.physics.add.overlap(this.player, this.foodGroup, this.collectFood, null, this);
        this.physics.add.overlap(this.player, this.enemyGroup, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.flag, this.reachFlag, null, this);
        this.physics.add.overlap(this.player, this.powerupGroup, this.collectPowerUp, null, this);
        this.physics.add.overlap(this.tweetGroup, this.enemyGroup, this.tweetHitEnemy, null, this);

        this.physics.add.collider(this.caseGroup, this.groundGroup);
        this.physics.add.collider(this.caseGroup, this.platformGroup);
        this.physics.add.overlap(
            this.caseGroup, this.enemyGroup, this.caseHitEnemy, null, this
        );
        this.physics.add.overlap(
            this.player, this.caseGroup, this.playerHitCase, null, this
        );
        this.physics.add.overlap(
            this.tweetGroup, this.caseGroup, this.tweetHitCase, null, this
        );

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
        this.cameras.main.setBounds(0, 0, WORLD_W, GROUND_Y + TILE);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        const dzX = _isMobilePortrait ? 60 : 100;
        const dzY = _isMobilePortrait ? 40 : 50;
        this.cameras.main.setDeadzone(dzX, dzY);
        this.cameras.main.fadeIn(300);

        // ─ Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.xKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

        // ─ HUD
        const hudStyle = { fontSize: '18px', fontFamily: 'Arial Black, Impact, sans-serif', color: C.white, stroke: '#000', strokeThickness: 3 };
        this.scoreText = this.add.text(16, 12, 'SCORE: 0', hudStyle).setScrollFactor(0).setDepth(100);
        this.livesText = this.add.text(sw - 16, 12, 'LIVES: 3', hudStyle).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
        this.cholesterolText = this.add.text(sw / 2, 8, 'CHOLESTEROL: 0', { ...hudStyle, fontSize: '14px', color: C.gold }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
        this.powerText = this.add.text(16, 36, '', { ...hudStyle, fontSize: '14px', color: '#88FF88' }).setScrollFactor(0).setDepth(100);

        // ─ Keyboard controls hint (desktop only, fades out)
        var isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
        if (!isMobile) {
            var ctrlHint = this.add.text(sw / 2, sh - 16,
                'ARROWS/WASD: Move   SPACE: Jump   Z: Tweet   X: Shart', {
                fontSize: '12px', fontFamily: 'Arial, sans-serif',
                color: '#ffffff', stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0.8);
            this.tweens.add({
                targets: ctrlHint, alpha: 0, delay: 5000, duration: 1500,
                onComplete: () => ctrlHint.destroy(),
            });
        }

        // Cholesterol meter bar
        const barX = sw / 2 - 60, barY = 26;
        this.cholBarBg = this.add.rectangle(barX, barY, 120, 8, 0x333333).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.cholBarFill = this.add.rectangle(barX + 1, barY + 1, 0, 6, 0x44CC44).setOrigin(0, 0).setScrollFactor(0).setDepth(101);
        this.cholBarBorder = this.add.rectangle(barX, barY, 120, 8).setOrigin(0, 0).setScrollFactor(0).setDepth(102);
        this.cholBarBorder.setStrokeStyle(1, 0xFFFFFF, 0.5);
        this.cholBarBorder.setFillStyle(0, 0);  // transparent fill

        // Coyote time tracking
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.wasOnGround = false;

        // ─ Background music
        this.bgm = null;
        if (this.cache.audio.has('bgm')) {
            this.bgm = this.sound.add('bgm', { loop: true, volume: 0.3 });
            this.bgm.play();
        }

        // ─ Power-up tutorial popup (shown once per fresh game, not on death restart)
        this.tutorialShowing = false;
        if (this.lives === 3 && this.score === 0) {
            this.tutorialShowing = true;
            this.physics.pause();

            const ox = sw / 2, oy = sh / 2;
            const tutGroup = [];

            // Overlay
            const oBg = this.add.rectangle(ox, oy, sw, sh, 0x000000, 0.75)
                .setScrollFactor(0).setDepth(300);
            tutGroup.push(oBg);

            // Title
            const tTitle = this.add.text(ox, oy - 140, 'POWER-UPS & ABILITIES', {
                fontSize: '26px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.gold, stroke: '#000', strokeThickness: 4,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
            tutGroup.push(tTitle);

            // Power-up entries with actual sprites
            const AL = window.ASSETS_LOADED || {};
            const powerExt = T.powerExt;
            const tweetCtrl = _isTouchDevice ? 'Tap TWEET button' : 'Press Z';
            const shartCtrl = _isTouchDevice ? 'Tap SHART button' : 'Press X';
            const entries = [
                { texKey: AL.hat ? 'hat-ext' : (powerExt ? 'powerups-ext' : 'powerup0'), frame: powerExt ? 0 : undefined,
                  label: 'MAGA HAT', desc: 'Permanent double jump.\nTap jump again mid-air!' },
                { texKey: AL.bar ? 'bar-ext' : (powerExt ? 'powerups-ext' : 'powerup1'), frame: powerExt ? 1 : undefined,
                  label: 'CENSOR BAR', desc: 'Invincible for 10 seconds.\nRun through everything!' },
                { texKey: AL.classifiedDocs ? 'classified-docs-ext' : (powerExt ? 'powerups-ext' : 'powerup2'), frame: powerExt ? 2 : undefined,
                  label: 'CLASSIFIED DOCS', desc: tweetCtrl + ' to fire tweets\nfor 15 seconds!' },
                { texKey: AL.playerShart ? 'player-shart' : 'player', frame: undefined,
                  label: 'SHART', desc: shartCtrl + ' when cholesterol \u226550.\nShockwave kills nearby enemies!' },
            ];
            entries.forEach((e, i) => {
                const ey = oy - 75 + i * 55;
                // White backing circle so dark sprites (censor bar) are visible
                const iconBg = this.add.circle(ox - 160, ey, 24, 0xFFFFFF, 0.25)
                    .setScrollFactor(0).setDepth(301);
                tutGroup.push(iconBg);
                const icon = (e.frame !== undefined)
                    ? this.add.sprite(ox - 160, ey, e.texKey, e.frame)
                    : this.add.image(ox - 160, ey, e.texKey);
                icon.setDisplaySize(40, 40).setScrollFactor(0).setDepth(302);
                tutGroup.push(icon);
                const eName = this.add.text(ox - 130, ey - 14, e.label, {
                    fontSize: '16px', fontFamily: 'Arial Black, sans-serif',
                    color: '#FFFFFF', stroke: '#000', strokeThickness: 2,
                }).setOrigin(0, 0).setScrollFactor(0).setDepth(302);
                tutGroup.push(eName);
                const eDesc = this.add.text(ox - 130, ey + 6, e.desc, {
                    fontSize: '12px', fontFamily: 'Arial, sans-serif',
                    color: '#CCCCCC', stroke: '#000', strokeThickness: 1,
                }).setOrigin(0, 0).setScrollFactor(0).setDepth(302);
                tutGroup.push(eDesc);
            });

            // Dismiss prompt
            const dText = this.add.text(ox, oy + 155, _isTouchDevice ? 'TAP ANYWHERE TO START' : 'PRESS ANY KEY TO START', {
                fontSize: '16px', fontFamily: 'Arial, sans-serif',
                color: C.white, stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
            this.tweens.add({ targets: dText, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
            tutGroup.push(dText);

            const dismissTutorial = () => {
                if (!this.tutorialShowing) return;
                this.tutorialShowing = false;
                tutGroup.forEach(obj => obj.destroy());
                this.physics.resume();
            };
            this.input.keyboard.once('keydown', dismissTutorial);
            this.input.once('pointerdown', dismissTutorial);
            this._tutorialDismiss = dismissTutorial;
        }
    }

    update(_time, delta) {
        if (this.tutorialShowing) {
            // Allow touch-button dismiss
            const T = window.TOUCH;
            if (T && (T.left || T.right || T.jump || T.tweet) && this._tutorialDismiss) {
                this._tutorialDismiss();
            }
            return;
        }
        if (this.dead || this.won) return;

        const p = this.player;
        const onGround = p.body.touching.down || p.body.blocked.down;
        const dt = delta / 1000;

        // ─ Coyote time
        if (onGround) {
            this.coyoteTimer = 0.08;
            this.wasOnGround = true;
            this.hasUsedDoubleJump = false;
        } else {
            this.coyoteTimer -= dt;
        }

        // ─ Touch edge detection
        const T_CTRL = window.TOUCH || {};
        if (T_CTRL.jump && !this._lastTouchJump) {
            T_CTRL.jumpJustPressed = true;
        } else {
            T_CTRL.jumpJustPressed = false;
        }
        this._lastTouchJump = T_CTRL.jump;
        if (T_CTRL.tweet && !this._lastTouchTweet) {
            T_CTRL.tweetJustPressed = true;
        } else {
            T_CTRL.tweetJustPressed = false;
        }
        this._lastTouchTweet = T_CTRL.tweet;
        if (T_CTRL.shart && !this._lastTouchShart) {
            T_CTRL.shartJustPressed = true;
        } else {
            T_CTRL.shartJustPressed = false;
        }
        this._lastTouchShart = T_CTRL.shart;

        // ─ Jump buffer
        const jumpPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
                           Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                           Phaser.Input.Keyboard.JustDown(this.wasd.up) ||
                           T_CTRL.jumpJustPressed;
        if (jumpPressed) this.jumpBufferTimer = 0.1;
        else this.jumpBufferTimer -= dt;

        // ─ Frozen during SHART — skip movement, jump, and animations
        if (this.shartFrozen) {
            p.setVelocityX(0);
        } else {

        // ─ Horizontal movement
        const speed = 220;
        const leftDown  = this.cursors.left.isDown  || this.wasd.left.isDown  || T_CTRL.left;
        const rightDown = this.cursors.right.isDown || this.wasd.right.isDown || T_CTRL.right;

        if (leftDown) {
            p.setVelocityX(-speed);
            p.setFlipX(true);
        } else if (rightDown) {
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

        // ─ Double jump (MAGA Hat)
        if (jumpPressed && !onGround && this.canDoubleJump && !this.hasUsedDoubleJump && this.coyoteTimer <= 0) {
            p.setVelocityY(-400);
            this.hasUsedDoubleJump = true;
            this.jumpBufferTimer = 0;
            playSound(this, 'snd-jump', SFX.jump);
        }

        // Variable jump height
        const jumpHeld = this.spaceKey.isDown || this.cursors.up.isDown || this.wasd.up.isDown || T_CTRL.jump;
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

        } // end shartFrozen else

        // ─ Enemy patrol
        this.enemyGroup.children.iterate(e => {
            if (!e || !e.active) return;
            if (e.y > this.scale.height + 100) { e.destroy(); return; }
            // Reverse on patrol bounds OR when blocked by a wall/platform
            if (e.x <= e.patrolL || e.body.blocked.left) {
                e.setVelocityX(e.patrolSpeed);
            } else if (e.x >= e.patrolR || e.body.blocked.right) {
                e.setVelocityX(-e.patrolSpeed);
            }
            e.setFlipX(e.body.velocity.x > 0);
            if (e.enemyType === 3) { e.lastVelX = e.body.velocity.x; }
        });

        // ─ Sliding case wall-burst detection + flip direction
        this.caseGroup.children.iterate(sc => {
            if (!sc || !sc.active || !sc.isSliding) return;
            if (Math.abs(sc.body.velocity.x) < 10) {
                sc.isSliding = false;
                this.burstCase(sc);
            } else {
                sc.setFlipX(sc.body.velocity.x < 0);
            }
        });

        // ─ Parallax
        const camX = this.cameras.main.scrollX;
        this.farHills.tilePositionX = camX * 0.15;
        this.nearHills.tilePositionX = camX * 0.35;

        // ─ Censor bar follows player + sparkle
        if (this.censorBar && this.censorBar.visible) {
            this.censorBar.setPosition(this.player.x, this.player.y);
            // Emit sparkles periodically
            if (this.sparkleEmitter && Math.random() < 0.3) {
                this.sparkleEmitter.emitParticleAt(
                    this.player.x + (Math.random() - 0.5) * 40,
                    this.player.y + (Math.random() - 0.5) * 40,
                    1
                );
            }
        }

        // ─ Death by falling
        if (p.y > this.scale.height + 80) {
            this.playerDie();
        }

        // ─ Censor bar timer (independent)
        if (this.censorTimer > 0) {
            this.censorTimer -= dt;
            if (this.censorTimer <= 0) {
                this.censorTimer = 0;
                this.invincible = false;
                this.censorBar.setVisible(false);
                if (this.censorMusic) {
                    this.censorMusic.stop();
                    this.censorMusic = null;
                }
                if (this.bgm) this.bgm.resume();
            }
        }
        // ─ Tweet blast timer (independent)
        if (this.tweetBlastTimer > 0) {
            this.tweetBlastTimer -= dt;
            if (this.tweetBlastTimer <= 0) {
                this.tweetBlastTimer = 0;
                this.hasTweetBlast = false;
            }
        }
        // ─ HUD timer: show the longest remaining timer
        const maxTimer = Math.max(this.censorTimer, this.tweetBlastTimer);
        if (maxTimer > 0) {
            this.powerTimer = maxTimer;
        } else if (!this.hasHat) {
            this.playerPower = -1;
            this.powerTimer = 0;
            p.clearTint();
        }

        // ─ Z key / touch: fire tweet-blast
        if ((Phaser.Input.Keyboard.JustDown(this.zKey) || T_CTRL.tweetJustPressed) && this.hasTweetBlast) {
            this.fireTweetBlast();
        }

        // ─ X key / touch: earthquake (SHART)
        if ((Phaser.Input.Keyboard.JustDown(this.xKey) || T_CTRL.shartJustPressed) && this.earthquakeReady && !this.earthquakeCooldown) {
            this.triggerEarthquake();
        }

        // ─ Clean up off-screen tweets
        this.tweetGroup.children.iterate(t => {
            if (t && (t.x < camX - 100 || t.x > camX + this.scale.width + 100)) t.destroy();
        });

        // ─ Update HUD
        this.scoreText.setText('SCORE: ' + this.score);
        this.livesText.setText('LIVES: ' + this.lives);
        this.cholesterolText.setText('CHOLESTEROL: ' + this.cholesterol);
        this.updatePowerHUD();
        this.updateCholesterolBar();

        // ─ Touch button visibility
        var tweetBtn = document.getElementById('btn-tweet');
        if (tweetBtn) {
            tweetBtn.style.opacity = this.hasTweetBlast ? '1' : '0.25';
        }
        var shartBtn = document.getElementById('btn-shart');
        if (shartBtn) {
            shartBtn.style.opacity = this.earthquakeReady ? '1' : '0.25';
        }
    }

    // ── Collectibles ────────────────────────────────────────
    collectFood(_player, food) {
        if (food.foodType === 2) {
            this.sparkleEmitter.emitParticleAt(food.x, food.y, 5);
            food.destroy();
            this.score += 50;
            playSound(this, 'snd-coin', SFX.coin);
            const popup = this.add.text(food.x, food.y, '+50', {
                fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold',
                color: '#FFD700', stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setDepth(50);
            this.tweens.add({
                targets: popup, y: popup.y - 25, alpha: 0, duration: 500,
                onComplete: () => popup.destroy(),
            });
            return;
        }
        this.sparkleEmitter.emitParticleAt(food.x, food.y, 8);
        const pts = food.foodType === 0 ? 2 : 1;  // bigmac=2, coke=1
        food.destroy();
        this.cholesterol += pts;
        this.score += pts * 50;
        if (this.cholesterol >= 50) this.earthquakeReady = true;
        playSound(this, 'snd-coin', SFX.coin);

        const popup = this.add.text(food.x, food.y, '+' + pts, {
            fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold',
            color: '#FF6644', stroke: '#000', strokeThickness: 2,
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

        // Each powerup stacks independently — don't cancel existing ones
        this.playerPower = type;  // track most recent for HUD
        const pt = POWER_TYPES[type];

        if (type === 0) {
            // MAGA Hat: grants permanent double jump
            this.hasHat = true;
            this.canDoubleJump = true;
            this.powerTimer = 0;
            player.setTint(0xFFDD44);
        } else if (type === 1) {
            // Censor Bar: 10s invincibility (independent timer)
            this.invincible = true;
            this.censorTimer = pt.duration;
            this.powerTimer = pt.duration;
            this.censorBar.setVisible(true);
            // Swap music to censor track
            if (!this.censorMusic) {
                if (this.bgm) this.bgm.pause();
                if (this.cache.audio.has('bgm-censor')) {
                    this.censorMusic = this.sound.add('bgm-censor', { loop: true, volume: 1.5 });
                    this.censorMusic.play();
                }
            }
        } else if (type === 2) {
            // Classified Docs: 15s tweet-blast (independent timer)
            this.hasTweetBlast = true;
            this.tweetBlastTimer = pt.duration;
            this.powerTimer = pt.duration;
            player.setTint(0xFF8844);
        }

        const popupMsg = type === 0 ? 'DOUBLE JUMP!' : pt.name + '!';
        const popup = this.add.text(powerup.x, powerup.y, popupMsg, {
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
        if (this.tweetCooldown) return;
        this.tweetCooldown = true;
        this.time.delayedCall(700, () => { this.tweetCooldown = false; });

        playSound(this, 'snd-tweet', SFX.jump);

        const p = this.player;
        const dir = p.flipX ? -1 : 1;
        const tweet = this.tweetGroup.create(p.x + dir * 20, p.y, 'tweet');
        tweet.setVelocityX(dir * 400);
        tweet.setFlipX(dir < 0);
        tweet.body.setAllowGravity(false);
        playSound(this, 'snd-jump', SFX.jump);

        // Switch to tweet pose
        if (window.ASSETS_LOADED && window.ASSETS_LOADED.playerTweet) {
            p.setTexture('player-tweet');
            p.setDisplaySize(48, 48);
        } else {
            p.play('jump');
        }

        // Revert back after 600ms
        this.time.delayedCall(600, () => {
            if (this.dead || this.won) return;
            const T = window.TEX || {};
            p.setTexture(T.player || 'player');
            p.setDisplaySize(48, 48);
            p.play('idle');
        });

        // Screen flash
        const flash = this.add.rectangle(
            this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, 0xFFFFFF, 0.3
        ).setScrollFactor(0).setDepth(50);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 150,
            onComplete: () => flash.destroy()
        });

        this.time.delayedCall(2000, () => {
            if (tweet && tweet.active) tweet.destroy();
        });
    }

    tweetHitEnemy(tweet, enemy) {
        if (tweet && tweet.active) tweet.destroy();
        if (enemy && enemy.active) this.destroyEnemy(enemy);
    }

    caseHitEnemy(slidingCase, enemy) {
        if (!slidingCase.active || !enemy.active) return;
        const et = ENEMY_TYPES[enemy.enemyType] || ENEMY_TYPES[0];
        const bonus = et.score + 300;
        this.score += bonus;

        const popup = this.add.text(enemy.x, enemy.y - 10,
            '+' + bonus + ' CHAIN!', {
            fontSize: '13px', fontFamily: 'Arial Black',
            color: '#FF6666', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
            targets: popup, y: popup.y - 30, alpha: 0, duration: 600,
            onComplete: () => popup.destroy(),
        });

        // Play death animation then destroy
        if (enemy && enemy.active) {
            const T = window.TEX || {};
            if (enemy.enemyType === 3) {
                // Lobbyist — play dead frame, no sub-case spawn from chain kills
                const AL3 = window.ASSETS_LOADED || {};
                if (AL3.lobbyist) {
                    enemy.play('lobbyistDead');
                }
                enemy.setVelocity(0, 0);
                enemy.body.enable = false;
                this.time.delayedCall(400, () => {
                    if (enemy && enemy.active) enemy.destroy();
                });
            } else if (T.enemyExt && this.anims.exists('enemy' + enemy.enemyType + 'Die')) {
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
        // Case keeps sliding — do NOT destroy it
    }

    playerHitCase(player, slidingCase) {
        if (!slidingCase.active || this.dead) return;

        if (slidingCase.isSliding) {
            if (player.body.velocity.y > 0 &&
                player.body.prev.y + player.body.height <=
                slidingCase.body.y + slidingCase.body.height) {
                // Stomp from above
                player.setVelocityY(-280);
                this.score += 200;
                const popup = this.add.text(slidingCase.x, slidingCase.y,
                    '+200 CAUGHT!', {
                    fontSize: '13px', fontFamily: 'Arial Black',
                    color: '#FFD700', stroke: '#000', strokeThickness: 2,
                }).setOrigin(0.5).setDepth(50);
                this.tweens.add({
                    targets: popup, y: popup.y - 30, alpha: 0, duration: 600,
                    onComplete: () => popup.destroy(),
                });
                this.burstCase(slidingCase);
            } else {
                // Side collision
                if (!this.invincible) {
                    this.playerDie();
                } else {
                    this.burstCase(slidingCase);
                }
            }
        }
    }

    tweetHitCase(tweet, slidingCase) {
        if (!tweet.active || !slidingCase.active) return;
        if (tweet && tweet.active) tweet.destroy();
        this.score += 500;

        const popup = this.add.text(slidingCase.x, slidingCase.y,
            '+500 BIGLY!', {
            fontSize: '16px', fontFamily: 'Arial Black',
            color: '#FFD700', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
            targets: popup, y: popup.y - 40, alpha: 0, duration: 800,
            onComplete: () => popup.destroy(),
        });

        this.burstCase(slidingCase);
    }

    // ── Enemy helpers ───────────────────────────────────────
    destroyEnemy(enemy) {
        if (enemy.enemyType === 3) {
            this.destroyLobbyist(enemy);
            return;
        }
        const et = ENEMY_TYPES[enemy.enemyType] || ENEMY_TYPES[0];
        this.score += et.score;
        if (!this.invincible && !this.shartFrozen) {
            playSound(this, 'snd-stomp', SFX.stomp);
        }

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

    destroyLobbyist(enemy) {
        this.score += 250;
        if (!this.shartFrozen && !this.invincible) {
            playSound(this, 'snd-stomp', SFX.stomp);
        }

        const popup = this.add.text(enemy.x, enemy.y, '+250', {
            fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold',
            color: '#FFAA00', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
            targets: popup, y: popup.y - 30, alpha: 0, duration: 600,
            onComplete: () => popup.destroy(),
        });

        const AL = window.ASSETS_LOADED || {};
        if (AL.lobbyist) {
            enemy.play('lobbyistDead');
        }
        enemy.setVelocity(0, 0);
        enemy.body.enable = false;

        const dir = (enemy.lastVelX !== undefined && enemy.lastVelX >= 0) ? 1 : -1;

        this.time.delayedCall(300, () => {
            const ex = enemy.x, ey = enemy.y;
            if (enemy && enemy.active) enemy.destroy();
            this.spawnSlidingCase(ex, ey, dir);
        });
    }

    spawnSlidingCase(x, y, dir) {
        const AL = window.ASSETS_LOADED || {};
        const caseKey = AL.lobbyistCase ? 'lobbyist-case-ext' : 'dollar';
        const sc = this.caseGroup.create(x, y, caseKey, 0);
        sc.setSize(36, 32).setOffset(6, 8);
        sc.setBounce(0);
        sc.setVelocityX(dir * 200);
        sc.setFlipX(dir < 0);
        sc.setDepth(4);
        sc.isSliding = true;

        if (AL.lobbyistCase) {
            sc.play('caseSlide');
        } else {
            sc.setTint(0xFFAA00);
        }

        // Auto-burst after 8 seconds if still alive
        this.time.delayedCall(8000, () => {
            if (sc && sc.active) this.burstCase(sc);
        });
    }

    burstCase(sc) {
        if (!sc || !sc.active) return;
        const x = sc.x, y = sc.y;

        const AL = window.ASSETS_LOADED || {};
        if (AL.lobbyistCase) {
            sc.play('caseBurst');
            sc.setVelocity(0, 0);
            sc.body.enable = false;
            // Show opened frame briefly then destroy
            this.time.delayedCall(400, () => {
                if (sc && sc.active) sc.destroy();
            });
        } else {
            sc.destroy();
        }

        // Scatter cash coins using foodGroup
        const count = 4 + Math.floor(Math.random() * 3); // 4–6 coins
        for (let i = 0; i < count; i++) {
            const angle = (Math.random() * 160 + 10) * Math.PI / 180;
            const speed = 80 + Math.random() * 120;
            const cash = this.foodGroup.create(
                x + (Math.random() - 0.5) * 20,
                y - 10,
                'dollar'
            );
            cash.foodType = 2;
            cash.setDisplaySize(24, 16);
            cash.setCircle(8, 4, 0);
            cash.body.setAllowGravity(true);
            cash.setVelocity(
                Math.cos(angle) * speed,
                -Math.sin(angle) * speed
            );
            this.time.delayedCall(4000, () => {
                if (cash && cash.active) cash.destroy();
            });
        }

        const cashPopup = this.add.text(x, y, '+CASH!', {
            fontSize: '16px', fontFamily: 'Arial Black',
            color: '#FFD700', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
            targets: cashPopup, y: cashPopup.y - 40, alpha: 0, duration: 800,
            onComplete: () => cashPopup.destroy(),
        });

        playSound(this, 'snd-powerup', SFX.powerup);
    }

    hitEnemy(player, enemy) {
        if (this.dead || this.won) return;

        // Invincible: destroy on contact
        if (this.invincible) {
            this.destroyEnemy(enemy);
            return;
        }

        // Stomp check: use previous-frame body position so fast falls
        // still register, and disable the enemy body immediately so the
        // overlap can't re-fire during the stomp animation.
        const prevFeet = player.body.prev.y + player.body.height;
        const enemyMid = enemy.body.y + enemy.body.halfHeight;
        if (player.body.velocity.y > 0 && prevFeet <= enemyMid) {
            enemy.body.enable = false;          // prevent repeat overlap
            player.setVelocityY(-280);
            // Show stomp frame briefly before death animation
            const T = window.TEX || {};
            if (enemy.enemyType === 3) {
                // Lobbyist uses its own spritesheet — skip enemies-ext frame logic
                this.destroyEnemy(enemy);
            } else if (T.enemyExt) {
                enemy.setFrame(enemy.enemyType * 4 + 2);
                this.time.delayedCall(100, () => {
                    if (enemy && enemy.active) this.destroyEnemy(enemy);
                });
            } else {
                this.destroyEnemy(enemy);
            }
            return;
        }

        // Player dies
        this.playerDie();
    }

    // ── Power-up HUD ────────────────────────────────────────
    updatePowerHUD() {
        const parts = [];
        if (this.hasHat) parts.push('MAGA Hat');
        if (this.censorTimer > 0) parts.push('Censor ' + Math.ceil(this.censorTimer) + 's');
        if (this.tweetBlastTimer > 0) parts.push('Docs ' + Math.ceil(this.tweetBlastTimer) + 's');
        this.powerText.setText(parts.join(' | '));
    }

    // ── Cholesterol meter ──────────────────────────────────
    updateCholesterolBar() {
        const pct = Math.min(this.cholesterol / 50, 1);
        const w = Math.floor(118 * pct);
        this.cholBarFill.width = w;
        // Green → Yellow → Red
        let color;
        if (pct < 0.5) {
            const t = pct * 2;
            color = Phaser.Display.Color.GetColor(
                Math.floor(0x44 + (0xFF - 0x44) * t),
                Math.floor(0xCC - (0xCC - 0xCC) * t),
                Math.floor(0x44 * (1 - t))
            );
        } else {
            const t = (pct - 0.5) * 2;
            color = Phaser.Display.Color.GetColor(
                0xFF,
                Math.floor(0xCC * (1 - t)),
                0x00
            );
        }
        this.cholBarFill.setFillStyle(color);
        // Pulse when full
        if (pct >= 1 && !this._cholPulse) {
            this._cholPulse = this.tweens.add({
                targets: this.cholBarFill, alpha: 0.4, duration: 300,
                yoyo: true, repeat: -1,
            });
        } else if (pct < 1 && this._cholPulse) {
            this._cholPulse.stop();
            this._cholPulse = null;
            this.cholBarFill.setAlpha(1);
        }
    }

    // ── Earthquake (SHART) ──────────────────────────────────
    triggerEarthquake() {
        const p = this.player;
        this.earthquakeCooldown = true;
        this.cholesterol -= 50;
        this.earthquakeReady = this.cholesterol >= 50;

        // Freeze player for 1 second
        this.shartFrozen = true;
        p.setVelocityX(0);
        p.setVelocityY(0);

        // Swap to shart sprite
        const AL = window.ASSETS_LOADED || {};
        this._preShartTexture = p.texture.key;
        if (AL.playerShart) {
            p.anims.stop();
            p.setTexture('player-shart', 0);
            p.setFrame(0);
            p.setDisplaySize(48, 48);
        }

        // Play shart sound
        playSound(this, 'snd-shart', SFX.stomp);

        // Screen shake
        this.cameras.main.shake(600, 0.025);

        // Brown shockwave ring
        const RADIUS = 350;
        const ring = this.add.circle(p.x, p.y, 20, 0x884400, 0.5).setDepth(50);
        this.tweens.add({
            targets: ring, scaleX: RADIUS / 20, scaleY: RADIUS / 20, alpha: 0,
            duration: 500, ease: 'Sine.easeOut',
            onComplete: () => ring.destroy(),
        });

        // Kill enemies within radius
        const enemies = this.enemyGroup.getChildren().filter(e => e && e.active);
        enemies.forEach(enemy => {
            const dist = Phaser.Math.Distance.Between(p.x, p.y, enemy.x, enemy.y);
            if (dist <= RADIUS) {
                this.destroyEnemy(enemy);
            }
        });

        // Unfreeze after 2 seconds, restore sprite
        this.time.delayedCall(2000, () => {
            this.shartFrozen = false;
            const T = window.TEX || {};
            const restoreKey = T.player || this._preShartTexture || 'player';
            p.setTexture(restoreKey, 0);
            p.setDisplaySize(48, 48);
            p.play('idle', true);
            this._preShartTexture = null;
        });

        // Cooldown (2.5s total, movement returns at 2s)
        this.time.delayedCall(2500, () => { this.earthquakeCooldown = false; });
    }

    // ── Death & Game Over ───────────────────────────────────
    playerDie() {
        if (this.dead) return;
        if (this.censorBar) this.censorBar.setVisible(false);
        this.dead = true;
        this.lives--;
        playSound(this, 'snd-die', SFX.die);
        if (this.cache.audio.has('snd-death-song')) {
            try { this.sound.play('snd-death-song', { volume: 0.3 }); } catch(e) {}
        }
        if (this.censorMusic) {
            this.censorMusic.stop();
            this.censorMusic = null;
        }
        if (this.bgm) this.bgm.stop();

        const p = this.player;
        p.play('hurt');
        p.body.setAllowGravity(false);
        p.setVelocity(0, -300);

        this.time.delayedCall(2000, () => {
            p.clearTint();
            p.play('dead');
            p.body.setAllowGravity(true);
            p.setVelocity(0, 0);
        });

        this.time.delayedCall(3500, () => {
            if (this.lives > 0) {
                this.showDeathScreen();
            } else {
                this.showGameOver();
            }
        });
    }

    // Helper: create donate + crypto buttons, returns { donateClicked } flag object
    _addDonateButtons(cx, y, fontSize) {
        const flag = { clicked: false };
        const fs = fontSize || '16px';
        const btnW = 170, btnH = 44, gap = 10;

        // Tagline above buttons
        this.add.text(cx, y - btnH / 2 - 18, 'Enjoyed the game? Fund open science!', {
            fontSize: '13px', fontFamily: 'Arial Black, sans-serif',
            color: C.gold, stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(203);

        if (DONATE_URL) {
            const bg1 = this.add.rectangle(cx - btnW/2 - gap/2, y, btnW, btnH, 0xDD8800, 1)
                .setOrigin(0.5).setScrollFactor(0).setDepth(202).setStrokeStyle(3, 0xFFDD44)
                .setInteractive({ useHandCursor: true });
            this.add.text(cx - btnW/2 - gap/2, y - 2, '\u2764 SUPPORT US', {
                fontSize: fs, fontFamily: 'Arial Black, sans-serif',
                color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
            this.tweens.add({ targets: bg1, scaleX: 1.06, scaleY: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            bg1.on('pointerdown', () => {
                flag.clicked = true;
                window.open(DONATE_URL, '_blank');
                this.time.delayedCall(500, () => { flag.clicked = false; });
            });
        }
        if (CRYPTO_URL) {
            const bg2 = this.add.rectangle(cx + btnW/2 + gap/2, y, btnW, btnH, 0x2255CC, 1)
                .setOrigin(0.5).setScrollFactor(0).setDepth(202).setStrokeStyle(3, 0x66AAFF)
                .setInteractive({ useHandCursor: true });
            this.add.text(cx + btnW/2 + gap/2, y - 2, '\u20BF CRYPTO', {
                fontSize: fs, fontFamily: 'Arial Black, sans-serif',
                color: '#FFFFFF', stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
            this.tweens.add({ targets: bg2, scaleX: 1.06, scaleY: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 250 });
            bg2.on('pointerdown', () => {
                flag.clicked = true;
                window.open(CRYPTO_URL, '_blank');
                this.time.delayedCall(500, () => { flag.clicked = false; });
            });
        }
        this.add.text(cx, y + btnH / 2 + 10, 'Lambda Biolab \u2022 Open Science for Everyone', {
            fontSize: '11px', fontFamily: 'Arial, sans-serif',
            color: '#cccccc', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);
        return flag;
    }

    showDeathScreen() {
        const ow = this.scale.width, oh = this.scale.height;
        const overlay = this.add.rectangle(ow/2, oh/2, ow, oh, 0x000000, 0.7).setScrollFactor(0).setDepth(200);
        overlay.setAlpha(0);
        this.tweens.add({ targets: overlay, alpha: 1, duration: 400 });

        this.time.delayedCall(400, () => {
            this.add.text(ow/2, oh/2 - 30, 'LIVES: ' + this.lives, {
                fontSize: '32px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.white, stroke: '#000', strokeThickness: 4,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            const cont = this.add.text(ow/2, oh/2 + 20, _isTouchDevice ? 'TAP JUMP TO CONTINUE' : 'PRESS SPACE TO CONTINUE', {
                fontSize: '16px', fontFamily: 'Arial, sans-serif',
                color: C.white, stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            this.tweens.add({ targets: cont, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

            const flag = this._addDonateButtons(ow/2, oh/2 + 75, '14px');

            const doRestart = () => {
                this.scene.restart({ lives: this.lives, score: 0, cholesterol: 0 });
            };
            this.input.keyboard.once('keydown-SPACE', doRestart);
            this.input.once('pointerdown', () => {
                if (flag.clicked) return;
                doRestart();
            });
            this._deathSkipTimer = this.time.addEvent({
                delay: 100, loop: true,
                callback: () => {
                    if (window.TOUCH && window.TOUCH.jump) doRestart();
                },
            });
        });
    }

    showGameOver() {
        let gameOverSound = null;
        let canSkipGameOver = true;
        if (this.cache.audio.has('snd-game-over')) {
            try {
                gameOverSound = this.sound.add('snd-game-over', { volume: 0.3 });
                gameOverSound.play();
                canSkipGameOver = false;
                gameOverSound.once('complete', () => { canSkipGameOver = true; });
            } catch(e) {}
        }
        const ow = this.scale.width, oh = this.scale.height;
        const overlay = this.add.rectangle(ow/2, oh/2, ow, oh, 0x000000, 0.7).setScrollFactor(0).setDepth(200);
        overlay.setAlpha(0);
        this.tweens.add({ targets: overlay, alpha: 1, duration: 500 });

        this.time.delayedCall(500, () => {
            this.add.text(ow/2, oh/2 - 40, 'GAME OVER', {
                fontSize: '48px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.capRed, stroke: '#000', strokeThickness: 5,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            this.add.text(ow/2, oh/2 + 20, 'FINAL SCORE: ' + this.score, {
                fontSize: '22px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.gold, stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            const restart = this.add.text(ow/2, oh/2 + 70, _isTouchDevice ? 'TAP JUMP TO TRY AGAIN' : 'PRESS SPACE TO TRY AGAIN', {
                fontSize: '18px', fontFamily: 'Arial, sans-serif',
                color: C.white, stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            this.tweens.add({ targets: restart, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

            const flag = this._addDonateButtons(ow/2, oh/2 + 160, '16px');

            const goMenu = () => {
                if (!canSkipGameOver) return;
                if (gameOverSound && gameOverSound.isPlaying) gameOverSound.stop();
                this.scene.start('Menu', { reset: true });
            };
            this.input.keyboard.on('keydown-SPACE', goMenu);
            this.input.on('pointerdown', () => {
                if (flag.clicked) return;
                goMenu();
            });
            this._gameOverSkipTimer = this.time.addEvent({
                delay: 100, loop: true,
                callback: () => {
                    if (window.TOUCH && window.TOUCH.jump) goMenu();
                },
            });
        });
    }

    // ── Victory ─────────────────────────────────────────────
    reachFlag(player, _flag) {
        if (this.won) return;
        this.won = true;
        playSound(this, 'snd-win', SFX.win);
        if (this.bgm) this.bgm.stop();

        this.score += 1000 + this.cholesterol * 50;

        player.setVelocity(0, 0);
        player.body.setAllowGravity(false);
        player.body.enable = false;  // disable physics so it doesn't reposition

        // Swap to pole slide sprite if available
        const AL = window.ASSETS_LOADED || {};
        if (AL.playerPole) {
            player.anims.stop();
            player.setTexture('player-pole', 0);
            player.setFrame(0);
            player.setDisplaySize(48, 48);
            player.setFlipX(false);
        } else {
            player.play('idle');
        }
        // Position player on the pole (offset so hand grips pole)
        player.x = this.flag.x - 8;

        this.tweens.add({
            targets: player, y: GROUND_Y - 24, duration: 800, ease: 'Sine.easeIn',
            onComplete: () => this.showVictory(),
        });
    }

    showVictory() {
        const ow = this.scale.width, oh = this.scale.height;
        const overlay = this.add.rectangle(ow/2, oh/2, ow, oh, 0x000033, 0.6).setScrollFactor(0).setDepth(200);
        overlay.setAlpha(0);
        this.tweens.add({ targets: overlay, alpha: 1, duration: 500 });

        this.time.delayedCall(400, () => {
            this.add.text(ow/2, oh/2 - 60, 'LEVEL COMPLETE!', {
                fontSize: '42px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.gold, stroke: C.capRed, strokeThickness: 5,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            this.add.text(ow/2, oh/2, 'SCORE: ' + this.score, {
                fontSize: '26px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.white, stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            this.add.text(ow/2, oh/2 + 40, 'CHOLESTEROL: ' + this.cholesterol, {
                fontSize: '20px', fontFamily: 'Arial Black, Impact, sans-serif',
                color: C.gold, stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            const cont = this.add.text(ow/2, oh/2 + 90, _isTouchDevice ? 'TAP JUMP FOR MENU' : 'PRESS SPACE FOR MENU', {
                fontSize: '18px', fontFamily: 'Arial, sans-serif',
                color: C.white, stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            this.tweens.add({ targets: cont, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

            const flag = this._addDonateButtons(ow/2, oh/2 + 130, '16px');

            const goMenu = () => { this.scene.start('Menu', { reset: true }); };
            this.input.keyboard.once('keydown-SPACE', goMenu);
            this.input.once('pointerdown', () => {
                if (flag.clicked) return;
                goMenu();
            });
            this._victorySkipTimer = this.time.addEvent({
                delay: 100, loop: true,
                callback: () => {
                    if (window.TOUCH && window.TOUCH.jump) goMenu();
                },
            });
        });
    }

    shutdown() {
        if (this.censorBar) this.censorBar.setVisible(false);
    }
}

// ── Phaser Configuration ────────────────────────────────────
const _isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
const _isMobilePortrait = _isTouchDevice && (window.innerHeight > window.innerWidth) && (window.innerWidth < 600);
const _configW = _isMobilePortrait ? 500 : GW;
const _configH = _isMobilePortrait ? 500 : GH;

const config = {
    type: Phaser.CANVAS,
    width: _configW,
    height: _configH,
    parent: document.body,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 },
            debug: false,
        },
    },
    scene: [PreloadScene, BootScene, MenuScene, SpeechScene, GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: _isMobilePortrait ? Phaser.Scale.NO_CENTER : Phaser.Scale.CENTER_BOTH,
    },
};

const game = new Phaser.Game(config);

// ── Wake Lock — prevent mobile screen from sleeping during gameplay ──
let _wakeLock = null;
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try { _wakeLock = await navigator.wakeLock.request('screen'); }
        catch (e) { /* Wake Lock denied or unsupported — ignore */ }
    }
}
requestWakeLock();
// Re-acquire wake lock when tab becomes visible again (lock is released on tab hide)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestWakeLock();
});

// Force canvas to top of screen on mobile (CSS media query may not match all browsers)
if (_isMobilePortrait) {
    const applyMobileLayout = () => {
        // Body: switch from flex-center to block layout so canvas sits at top
        document.body.style.setProperty('display', 'block', 'important');
        document.body.style.setProperty('padding', '0', 'important');
        document.body.style.setProperty('margin', '0', 'important');
        document.body.style.setProperty('text-align', 'center');
        // Canvas: top of page, centered horizontally, no border
        const c = game.canvas;
        c.style.setProperty('display', 'block', 'important');
        c.style.setProperty('margin', '0 auto', 'important');
        c.style.setProperty('border', 'none', 'important');
        c.style.setProperty('border-radius', '0', 'important');
    };
    game.events.once('ready', () => {
        applyMobileLayout();
        // Re-apply after a frame in case ScaleManager defers positioning
        requestAnimationFrame(applyMobileLayout);
    });
}
