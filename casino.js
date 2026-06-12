/* ============================================================
   CASINO v2 — Chips currency, canvas scratch, mines, CSGO crates
   ============================================================ */

const WHEEL_COOLDOWN_MS = 10 * 60 * 1000;
const AD_WHEEL_COOLDOWN_MS = 30 * 60 * 1000;
const DAILY_GAMBLE_CAP = 48;
const CHIP_BASE = { scratch: 4, mines: 6, crate: 10, loot: 14, wheelPaid: 8 };
const CASINO_REQ = { scratch: 0, mines: 2, crate: 3, loot: 4, wheel: 0 };

const SCRATCH_SYMBOLS = ["💨", "🐾", "💎", "👑", "🌟", "🚽", "🔥", "⭐"];
const CRATE_TABLE = [
    { emoji: "💩", label: "Trash Buff", weight: 700, tier: 0 },
    { emoji: "🐾", label: "Rare Paw", weight: 200, tier: 1 },
    { emoji: "👑", label: "Epic Crown", weight: 80, tier: 2 },
    { emoji: "💎", label: "Legendary Gem", weight: 18, tier: 3 },
    { emoji: "✦", label: "Secret Shard", weight: 1.8, tier: 4 },
    { emoji: "🌈", label: "DIVINE PET", weight: 0.2, tier: 5 }
];

function ensureCasino() {
    if (!game.casino) game.casino = freshCasinoState();
    const c = game.casino;
    const today = new Date().toDateString();
    if (c.gambleDay !== today) { c.gambleDay = today; c.dailyGambles = 0; }
    if (c.sessionGambles && Date.now() - (c.sessionStart || 0) > 30 * 60 * 1000) {
        c.sessionGambles = 0; c.sessionStart = Date.now();
    }
    if (!c.sessionStart) c.sessionStart = Date.now();
    return c;
}

function freshCasinoState() {
    return {
        secretShards: 0,
        lastWheelSpin: 0,
        lastAdWheel: 0,
        wheelSpins: 0,
        slotBuffUntil: 0,
        slotBuffMult: 1,
        goldenBuffUntil: 0,
        goldenBuffMult: 1,
        eggDiscountUntil: 0,
        eggDiscountPct: 0,
        scratchPity: 0,
        lootPity: 0,
        totalGambles: 0,
        dailyGambles: 0,
        gambleDay: "",
        sessionGambles: 0,
        sessionStart: Date.now(),
        auraTaxStacks: 0,
        minesActive: false,
        minesCooldownUntil: 0,
        crateKeys: 0,
        casinoStreak: 0,
        lastCasinoDay: "",
        highRoller: false,
        minesFlags: []
    };
}

let minesFlagMode = false;
let _crateSkipTimer = null;

function chipPrice(kind) {
    const w = peakWorld();
    const pressure = Math.pow(1.42, Math.max(0, w));
    const c = ensureCasino();
    const esc = 1 + (c.sessionGambles || 0) * 0.11;
    const tier = Math.floor(w / 3);
    return Math.max(2, Math.ceil((CHIP_BASE[kind] || 5) * pressure * esc * Math.pow(1.18, tier)));
}

function casinoUnlocked(kind) {
    if (isAdminMode()) return true;
    return peakWorld() >= (CASINO_REQ[kind] || 0);
}

function canGamble() {
    if (isAdminMode()) return true;
    const c = ensureCasino();
    if (c.dailyGambles >= DAILY_GAMBLE_CAP) {
        showToast("🛑 Daily casino cap reached. Come back tomorrow!", 2800);
        return false;
    }
    return true;
}

function isAdminMode() { return !!(game.adminMode || (game.redeemedCodes && game.redeemedCodes.admin)); }

function spendChips(n) {
    if (isAdminMode()) return true;
    if ((game.chips || 0) < n) return false;
    game.chips -= n;
    return true;
}

function registerGamble() {
    const c = ensureCasino();
    c.totalGambles++;
    c.dailyGambles++;
    c.sessionGambles++;
    c.auraTaxStacks = Math.min(8, (c.auraTaxStacks || 0) + 1);
    const today = new Date().toDateString();
    if (c.lastCasinoDay !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (c.lastCasinoDay === yesterday) c.casinoStreak = (c.casinoStreak || 0) + 1;
        else c.casinoStreak = 1;
        c.lastCasinoDay = today;
        const bonus = Math.min(20, (c.casinoStreak || 1) * 2);
        grantChips(bonus, "casino streak");
        showToast("🎰 Casino streak day " + c.casinoStreak + " · +" + bonus + " chips", 2400);
    }
    if (typeof trackStat === "function") trackStat("gambles", 1);
}

function highRollerUnlocked() {
    return (game.rebirths || 0) >= 50 || isAdminMode();
}

function toggleHighRoller() {
    if (!highRollerUnlocked()) { showToast("🔒 Need 50 rebirths for High-Roller Room", 2500); return; }
    const c = ensureCasino();
    c.highRoller = !c.highRoller;
    if (c.highRoller && (game.aura || 0) > 0) {
        const tax = Math.max(1, Math.floor(game.aura * 0.05));
        game.aura = Math.max(0, game.aura - tax);
        showToast("✦ Aura tax: -" + tax + " (better odds active)", 2800);
    }
    saveGame(); updateDisplay(); renderCasino();
}

function casinoPassiveMult() {
    const c = game.casino;
    if (!c || !c.slotBuffUntil || Date.now() > c.slotBuffUntil) return 1;
    return c.slotBuffMult || 1;
}

function casinoGoldenMult() {
    const c = game.casino;
    if (!c || !c.goldenBuffUntil || Date.now() > c.goldenBuffUntil) return 1;
    return c.goldenBuffMult || 1;
}

function casinoEggDiscount() {
    const c = game.casino;
    if (!c || !c.eggDiscountUntil || Date.now() > c.eggDiscountUntil) return 0;
    return c.eggDiscountPct || 0;
}

function wheelReady() {
    return Date.now() - (ensureCasino().lastWheelSpin || 0) >= WHEEL_COOLDOWN_MS;
}

function wheelCountdown() {
    const left = WHEEL_COOLDOWN_MS - (Date.now() - (ensureCasino().lastWheelSpin || 0));
    if (left <= 0) return "READY!";
    return Math.floor(left / 60000) + "m " + Math.floor((left % 60000) / 1000) + "s";
}

function adWheelReady() {
    return Date.now() - (ensureCasino().lastAdWheel || 0) >= AD_WHEEL_COOLDOWN_MS;
}

/* ---- Rewarded ad stub (swap provider later) ---- */
function showRewardedAd(onComplete, label) {
    const overlay = document.getElementById("ad-overlay") || (function() {
        const el = document.createElement("div");
        el.id = "ad-overlay";
        el.className = "modal";
        el.innerHTML = '<div class="modal-content ad-modal-content"><h2>📺 Rewarded Ad</h2><p id="ad-status">Loading sponsor...</p><div class="ad-progress"><div id="ad-bar"></div></div><button class="modal-btn secondary" onclick="cancelRewardedAd()">Skip (dev)</button></div>';
        document.body.appendChild(el);
        return el;
    })();
    window._adCallback = onComplete;
    document.getElementById("ad-status").textContent = label || "Watch to claim reward...";
    overlay.classList.remove("hidden");
    let p = 0;
    const bar = document.getElementById("ad-bar");
    const tick = setInterval(() => {
        p += 4;
        if (bar) bar.style.width = p + "%";
        if (p >= 100) {
            clearInterval(tick);
            overlay.classList.add("hidden");
            if (window._adCallback) { window._adCallback(); window._adCallback = null; }
            showToast("✅ Reward claimed!", 1800);
        }
    }, 200);
    window._adTick = tick;
}

function cancelRewardedAd() {
    if (window._adTick) clearInterval(window._adTick);
    const overlay = document.getElementById("ad-overlay");
    if (overlay) overlay.classList.add("hidden");
    if (window._adCallback) { window._adCallback(); window._adCallback = null; }
}

function renderCasino() {
    const el = document.getElementById("casino-body");
    if (!el) return;
    const c = ensureCasino();
    const buffActive = c.slotBuffUntil > Date.now();
    const buffLeft = buffActive ? Math.ceil((c.slotBuffUntil - Date.now()) / 1000) + "s" : "";
    el.innerHTML =
        '<div class="casino-hero">' +
            '<div class="casino-hero-title">🎰 STINK CASINO</div>' +
            '<div class="casino-hero-sub">Chips only · peak world pricing · house always wins</div>' +
            '<div class="casino-stats">' +
                '<span class="casino-stat-pill">' + chipIcon() + '<b>' + fmt(game.chips || 0) + '</b></span>' +
                '<span class="casino-stat-pill"><span class="cs-ico">💎</span><b>' + c.secretShards + '</b> shards</span>' +
                '<span class="casino-stat-pill"><span class="cs-ico">🎲</span><b>' + c.dailyGambles + '/' + DAILY_GAMBLE_CAP + '</b></span>' +
                (c.crateKeys > 0 ? '<span class="casino-stat-pill"><span class="cs-ico">🔑</span><b>' + c.crateKeys + '</b></span>' : '') +
                (buffActive ? '<span class="casino-stat-pill casino-hot">🔥 x' + c.slotBuffMult + ' · ' + buffLeft + '</span>' : '') +
            '</div>' +
        '</div>' +
        '<div class="casino-grid">' +
            casinoCard("scratch", "🎫 Dank Scratch", "Scratch foil grid · match top row", chipPrice("scratch") + " " + chipIcon(), "buyScratch()", !casinoUnlocked("scratch")) +
            casinoCard("mines", "💣 Stink Mines", "5×5 · cash out or boom", chipPrice("mines") + " " + chipIcon(), "startMines()", !casinoUnlocked("mines") || c.minesActive) +
            casinoCard("crate", "📦 Brainrot Crate", "CSGO-style roller · win pets", (c.crateKeys > 0 ? "1 🔑" : chipPrice("crate") + " " + chipIcon()), "openCrate()", !casinoUnlocked("crate")) +
            casinoCard("loot", "🚽 Ohio Case", "Cursed · win DIVINE pet", chipPrice("loot") + " " + chipIcon(), "openOhioCase()", !casinoUnlocked("loot")) +
            casinoCard("wheel", "🎡 Lucky Wheel", wheelReady() ? "FREE SPIN READY!" : ("Next: " + wheelCountdown()), "FREE", "spinWheel()", !wheelReady()) +
            casinoCard("ad", "📺 Ad Spin", adWheelReady() ? "Watch ad · bonus spin" : "Cooldown", "FREE", "offerAdWheel()", !adWheelReady()) +
        '</div>' +
        (c.secretShards >= 10
            ? '<button class="casino-shard-btn" onclick="redeemSecretShards()">💎 Redeem 10 Shards → Secret Pet</button>'
            : '<p class="casino-shard-hint">Jackpots drop 💎 shards · 10 = guaranteed secret pet</p>') +
        (highRollerUnlocked()
            ? '<button class="casino-shard-btn high-roller-card" onclick="toggleHighRoller()">' +
              (c.highRoller ? "🎩 High-Roller ON · Aura tax active" : "🎩 Enter High-Roller Room (50+ rebirths)") +
              '</button>'
            : '') +
        (c.casinoStreak > 1 ? '<div class="casino-streak-pill">🔥 Casino streak: ' + c.casinoStreak + ' days</div>' : '') +
        '<p class="casino-disclaimer">⚠️ Chips are scarce. Near-misses intentional. Gambling taxes Aura rebirth.</p>';
}

function chipIcon() { return '<span class="chip-coin" aria-label="chips">C</span>'; }

function casinoCard(id, title, desc, cost, onclick, disabled) {
    return '<button class="casino-card ' + id + (disabled ? " disabled" : "") + '" onclick="' + onclick + '"' + (disabled ? ' disabled' : '') + '>' +
        '<div class="casino-card-title">' + title + '</div>' +
        '<div class="casino-card-desc">' + desc + '</div>' +
        '<div class="casino-card-cost">' + cost + '</div></button>';
}

let casinoSession = 0;
// run fn only if this casino session is still the active one (prevents stale timers
// from a previous game closing/altering a newly opened game)
function casinoDefer(sess, fn, ms) {
    setTimeout(() => { if (sess === casinoSession) fn(); }, ms);
}

function openCasinoModal(title, inner) {
    casinoSession++; // invalidate any pending timers from a prior game
    let m = document.getElementById("casino-modal");
    if (!m) {
        m = document.createElement("div");
        m.id = "casino-modal";
        m.className = "modal";
        m.innerHTML = '<div class="modal-content casino-modal-content"><button class="close-btn" onclick="closeCasinoModal()">&times;</button><h2 id="casino-modal-title"></h2><div id="casino-modal-body"></div></div>';
        document.body.appendChild(m);
    }
    document.getElementById("casino-modal-title").textContent = title;
    document.getElementById("casino-modal-body").innerHTML = inner;
    m.classList.remove("hidden");
    return casinoSession;
}

function closeCasinoModal() {
    casinoSession++; // invalidate pending timers
    const m = document.getElementById("casino-modal");
    if (m) m.classList.add("hidden");
    if (window._scratchCleanup) { window._scratchCleanup(); window._scratchCleanup = null; }
}

/* ---- CANVAS SCRATCH (4×3 grid) ---- */
function buyScratch() {
    if (!casinoUnlocked("scratch")) { sfxError(); return; }
    if (!canGamble()) return;
    const cost = chipPrice("scratch");
    if (!spendChips(cost)) { sfxError(); showToast("❌ Need " + cost + " Chips!", 2000); return; }
    registerGamble();
    ensureCasino().scratchPity++;
    saveGame(); updateDisplay();
    startScratchCanvas(cost);
}

function startScratchCanvas(betChips) {
    const cols = 4, rows = 3;
    const c = ensureCasino();
    const forceJackpot = c.scratchPity >= 22;
    const forceNearMiss = !forceJackpot && Math.random() < 0.36;
    const winSym = SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)];
    const grid = [];
    for (let i = 0; i < cols * rows; i++) {
        grid.push(SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)]);
    }
    if (forceJackpot) {
        for (let i = 0; i < cols; i++) grid[i] = winSym;
        c.scratchPity = 0;
    } else if (forceNearMiss) {
        grid[0] = grid[1] = grid[2] = winSym;
        grid[3] = SCRATCH_SYMBOLS.filter(s => s !== winSym)[0];
    } else {
        // prevent accidental jackpot
        if (grid[0] === grid[1] && grid[1] === grid[2] && grid[2] === grid[3]) {
            grid[3] = SCRATCH_SYMBOLS.filter(s => s !== grid[0])[0];
        }
    }

    // HTML symbols grid (shown beneath canvas)
    const symHtml = '<div class="scratch-sym-grid" id="scratch-sym-grid">' +
        grid.map(s => '<div class="scratch-sym">' + s + '</div>').join("") + '</div>';

    const autoCost = betChips * 2;
    const html = '<div class="scratch-touch-pad" id="scratch-touch-pad"><div class="scratch-outer">' + symHtml +
        '<canvas id="scratch-canvas" width="320" height="240" class="scratch-foil-canvas"></canvas>' +
        '</div></div>' +
        '<p class="scratch-hint" id="scratch-hint">👆 Scratch anywhere — edges are forgiving!</p>' +
        '<div class="scratch-auto-row"><button class="casino-shard-btn" onclick="autoScratchReveal()">⚡ Auto-scratch · ' + autoCost + ' ' + chipIcon() + ' (2×)</button></div>';
    openCasinoModal("🎫 Dank Scratch", html);
    window._scratchGrid = grid;
    window._scratchBet = betChips;
    window._scratchDone = false;
    window._scratchCols = cols;
    requestAnimationFrame(initScratchCanvas);
}

function initScratchCanvas() {
    const canvas = document.getElementById("scratch-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // Draw shiny silver foil that covers the symbols
    function drawFoil() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Silver foil gradient base
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, "#c8c8d8");
        grad.addColorStop(0.3, "#e8e8f8");
        grad.addColorStop(0.55, "#b0b0c8");
        grad.addColorStop(0.8, "#d8d8e8");
        grad.addColorStop(1, "#a0a0b8");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Texture streaks
        ctx.globalAlpha = 0.12;
        for (let x = 0; x < canvas.width; x += 14) {
            ctx.fillStyle = x % 28 === 0 ? "#fff" : "#888";
            ctx.fillRect(x, 0, 6, canvas.height);
        }
        ctx.globalAlpha = 1;
        // "SCRATCH ME" text
        ctx.fillStyle = "rgba(80,80,100,0.55)";
        ctx.font = "bold 18px Russo One, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("✦ SCRATCH ME ✦", canvas.width / 2, canvas.height / 2);
    }
    drawFoil();

    let scratching = false;
    let lastSampleAt = 0;
    let lastScratch = null;
    let activePointer = null;
    const EDGE_PAD = 28;
    const BRUSH = 24;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const src = (e.touches && e.touches[0]) ? e.touches[0] : e;
        return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
    }

    function clampPos(p) {
        return {
            x: Math.max(-EDGE_PAD, Math.min(canvas.width + EDGE_PAD, p.x)),
            y: Math.max(-EDGE_PAD, Math.min(canvas.height + EDGE_PAD, p.y))
        };
    }

    function scratchedFraction() {
        try {
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let clear = 0;
            // sample every 16th pixel for speed
            const step = 16 * 4;
            let count = 0;
            for (let i = 3; i < img.length; i += step) {
                count++;
                if (img[i] < 40) clear++;
            }
            return count ? clear / count : 0;
        } catch (e) { return 0; }
    }

    function scratchAt(px, py) {
        const cx = Math.max(0, Math.min(canvas.width, px));
        const cy = Math.max(0, Math.min(canvas.height, py));
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(cx, cy, BRUSH, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        const now = Date.now();
        if (now - lastSampleAt > 90) {
            lastSampleAt = now;
            sfxClick();
            if (!window._scratchDone && scratchedFraction() >= 0.8) {
                autoRevealScratch();
            }
        }
    }

    function scratchLine(a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / 10));
        for (let i = 0; i <= steps; i++) {
            scratchAt(a.x + dx * i / steps, a.y + dy * i / steps);
        }
    }

    function onStart(e) {
        e.preventDefault();
        scratching = true;
        activePointer = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        const p = clampPos(getPos(e));
        lastScratch = p;
        scratchAt(p.x, p.y);
    }
    function onMove(e) {
        if (!scratching || (activePointer != null && e.pointerId !== activePointer)) return;
        e.preventDefault();
        const p = clampPos(getPos(e));
        if (lastScratch) scratchLine(lastScratch, p);
        else scratchAt(p.x, p.y);
        lastScratch = p;
    }
    function onEnd(e) {
        if (activePointer != null && e && e.pointerId !== activePointer) return;
        scratching = false;
        lastScratch = null;
        activePointer = null;
        try { if (e) canvas.releasePointerCapture(e.pointerId); } catch (err) {}
        if (!window._scratchDone && scratchedFraction() >= 0.8) autoRevealScratch();
    }

    const pad = document.getElementById("scratch-touch-pad") || canvas;
    pad.addEventListener("pointerdown", onStart);
    pad.addEventListener("pointermove", onMove);
    pad.addEventListener("pointerup", onEnd);
    pad.addEventListener("pointercancel", onEnd);

    window._scratchCleanup = () => { scratching = false; lastScratch = null; activePointer = null; };
}

function autoRevealScratch() {
    if (window._scratchDone) return;
    window._scratchDone = true;
    const canvas = document.getElementById("scratch-canvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const top = (window._scratchGrid || []).slice(0, window._scratchCols || 4);
    const win = top[0] === top[1] && top[1] === top[2] && top[2] === top[3];
    const near = !win && (top[0] === top[1] && top[1] === top[2]);
    const hint = document.getElementById("scratch-hint");
    const sess = casinoSession;
    if (win) {
        resolveScratchJackpot(hint);
    } else if (near) {
        const grid = document.getElementById("scratch-sym-grid");
        if (grid) grid.classList.add("near-miss");
        if (hint) hint.textContent = "😭 SO CLOSE — 3 in a row but not 4!";
        showToast("Near miss! The foil knew.", 2800);
        screenFlash("#ff3d9a");
        saveGame(); updateDisplay();
        casinoDefer(sess, closeCasinoModal, 2400);
    } else {
        if (hint) hint.textContent = "No match. L + ratio.";
        grantChips(Math.max(1, Math.floor((window._scratchBet || 1) * 0.15)), "consolation");
        saveGame(); updateDisplay();
        casinoDefer(sess, closeCasinoModal, 2400);
    }
}

function autoScratchReveal() {
    if (window._scratchDone) return;
    const cost = (window._scratchBet || chipPrice("scratch")) * 2;
    if (!spendChips(cost)) { sfxError(); showToast("Need " + cost + " chips for auto-scratch!", 2000); return; }
    const canvas = document.getElementById("scratch-canvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    autoRevealScratch();
}

function resolveScratchJackpot(hint) {
    const roll = Math.random();
    const c = ensureCasino();
    let msg;
    if (roll < 0.4) {
        c.secretShards++;
        msg = "SECRET SHARD! (" + c.secretShards + ")";
        bigBanner("JACKPOT!!!", "#00ffd0");
    } else if (roll < 0.75) {
        const bonus = Math.max(3, Math.floor(chipPrice("scratch") * 8));
        grantChips(bonus);
        msg = "+" + bonus + " Chips!";
        screenFlash("#ffd54a");
    } else {
        grantChips(Math.max(2, chipPrice("crate")));
        msg = "Crate refund chips!";
        rainbowFlash();
    }
    c.eggDiscountPct = 0.12;
    c.eggDiscountUntil = Date.now() + 4 * 60 * 1000;
    if (hint) hint.textContent = "✨ JACKPOT! " + msg;
    if (typeof trackStat === "function") trackStat("scratchWins", 1);
    showToast("🎉 JACKPOT! " + msg, 3200);
    sfxRare(4); shake();
    saveGame(); updateDisplay();
    casinoDefer(casinoSession, closeCasinoModal, 2800);
}

/* ---- MINES ---- */
function startMines() {
    if (!casinoUnlocked("mines")) { sfxError(); return; }
    const c = ensureCasino();
    if (c.minesActive) { showToast("Finish your current board!", 1800); return; }
    if (Date.now() < (c.minesCooldownUntil || 0)) {
        showToast("⏳ Mines cooling down...", 2000); return;
    }
    if (!canGamble()) return;
    const cost = chipPrice("mines");
    if (!spendChips(cost)) { sfxError(); showToast("❌ Need " + cost + " Chips!", 2000); return; }
    registerGamble();
    c.minesActive = true;
    const size = 5, mines = 4;
    const cells = size * size;
    const mineSet = new Set();
    while (mineSet.size < mines) mineSet.add(Math.floor(Math.random() * cells));
    c.minesState = { size, mines: mineSet, revealed: [], mult: 1, bet: cost, alive: true };
    c.minesFlags = [];
    minesFlagMode = false;
    saveGame(); updateDisplay();
    renderMinesBoard();
}

function toggleMinesFlagMode() {
    minesFlagMode = !minesFlagMode;
    renderMinesBoard();
}

function renderMinesBoard() {
    const st = ensureCasino().minesState;
    if (!st) return;
    const flags = ensureCasino().minesFlags || [];
    let html = '<div class="mines-flag-bar">' +
        '<button class="' + (minesFlagMode ? "active" : "") + '" onclick="toggleMinesFlagMode()">🚩 Flag mode' + (minesFlagMode ? " ON" : "") + '</button>' +
        '<span class="meta-hint">Tap tiles to place flags</span></div>' +
        '<div class="mines-hud">Mult: <b id="mines-mult">x' + st.mult.toFixed(2) + '</b> · Mines: ' + st.mines.size + '</div>' +
        '<div class="mines-grid">';
    for (let i = 0; i < st.size * st.size; i++) {
        const rev = st.revealed.indexOf(i) >= 0;
        const flagged = flags.indexOf(i) >= 0;
        const isMine = st.mines.has(i);
        let inner = flagged ? "" : "?";
        let cls = "mine-tile" + (flagged ? " flagged" : "");
        if (rev) {
            cls += isMine ? " boom" : " safe";
            inner = isMine ? "💣" : "💎";
        }
        html += '<button class="' + cls + '" onclick="pickMine(' + i + ')"' + (rev ? ' disabled' : '') + '>' + inner + '</button>';
    }
    html += '</div><button class="casino-shard-btn mines-cashout" onclick="cashOutMines()">💰 Cash Out</button>';
    openCasinoModal("💣 Stink Mines", html);
}

function pickMine(i) {
    const c = ensureCasino();
    const st = c.minesState;
    if (!st || !st.alive || st.revealed.indexOf(i) >= 0) return;
    if (minesFlagMode) {
        c.minesFlags = c.minesFlags || [];
        const idx = c.minesFlags.indexOf(i);
        if (idx >= 0) c.minesFlags.splice(idx, 1);
        else c.minesFlags.push(i);
        renderMinesBoard();
        return;
    }
    st.revealed.push(i);
    if (st.mines.has(i)) {
        st.alive = false;
        c.minesActive = false;
        c.minesCooldownUntil = Date.now() + 3 * 60 * 1000;
        showToast("💥 BOOM! Ohio got you.", 2800);
        screenFlash("#ff2020");
        if (typeof trackStat === "function") trackStat("minesLost", 1);
        if (Math.random() < 0.4) showToast("👻 You would have had x" + (st.mult * 1.6).toFixed(1) + " if you stopped...", 3200);
        saveGame(); renderMinesBoard();
        casinoDefer(casinoSession, closeCasinoModal, 2800);
        return;
    }
    st.mult *= 1.12 + Math.random() * 0.35;
    sfxBuy();
    const el = document.getElementById("mines-mult");
    if (el) el.textContent = "x" + st.mult.toFixed(2);
    renderMinesBoard();
}

function cashOutMines() {
    const c = ensureCasino();
    const st = c.minesState;
    if (!st || !st.alive) return;
    const payout = Math.max(1, Math.floor(st.bet * st.mult * 0.88));
    grantChips(payout, "mines cashout");
    if (typeof trackStat === "function") {
        trackStat("minesWon", 1);
        if (typeof ensureMeta === "function") {
            const qs = ensureMeta().quests.session;
            if (qs) qs.minesWonSession = (qs.minesWonSession || 0) + 1;
        }
        if (typeof maybeRefreshQuests === "function") maybeRefreshQuests();
    }
    c.minesActive = false;
    c.minesCooldownUntil = Date.now() + 90 * 1000;
    st.alive = false;
    showToast("💰 Cashed x" + st.mult.toFixed(2) + " → " + payout + " chips!", 2800);
    saveGame(); updateDisplay(); renderCasino();
    casinoDefer(casinoSession, closeCasinoModal, 2200);
}

/* ---- CSGO CRATE ROLLER ---- */
function openCrate() {
    if (!casinoUnlocked("crate")) { sfxError(); return; }
    if (!canGamble()) return;
    const c = ensureCasino();
    let usedKey = false;
    if (c.crateKeys > 0) { c.crateKeys--; usedKey = true; }
    else {
        const cost = chipPrice("crate");
        if (!spendChips(cost)) { sfxError(); showToast("❌ Need " + cost + " Chips or a 🔑!", 2000); return; }
    }
    registerGamble();
    if (typeof trackStat === "function") trackStat("crateOpens", 1);
    saveGame(); updateDisplay();
    const won = rollCrateItem(false);
    const near = won.tier < 5 && Math.random() < 0.34;
    const strip = buildCrateStrip(won, near);
    window._cratePendingWin = won;
    const html = '<div class="crate-stage">📦</div>' +
        '<div class="crate-viewport"><div class="crate-marker"></div><div class="crate-strip" id="crate-strip"></div></div>' +
        '<p class="crate-status" id="crate-status">Opening...</p>' +
        '<button class="crate-skip-btn" onclick="skipCrateAnimation()">⏭ Skip to result</button>';
    openCasinoModal("📦 Brainrot Crate", html);
    const stripEl = document.getElementById("crate-strip");
    stripEl.innerHTML = strip.map(it =>
        '<div class="crate-item tier-' + it.tier + '"><span class="crate-item-emoji">' + it.emoji + '</span><span class="crate-item-label">' + it.label + '</span></div>'
    ).join("");
    animateCrateStrip(stripEl, 28, 5.5);
    sfxWhoosh();
    if (_crateSkipTimer) clearTimeout(_crateSkipTimer);
    _crateSkipTimer = setTimeout(() => { _crateSkipTimer = null; resolveCrateWin(won); }, 5600);
}

function skipCrateAnimation() {
    const won = window._cratePendingWin;
    if (!won) return;
    if (_crateSkipTimer) { clearTimeout(_crateSkipTimer); _crateSkipTimer = null; }
    const stripEl = document.getElementById("crate-strip");
    if (stripEl) { stripEl.style.transition = "none"; }
    resolveCrateWin(won);
}

function animateCrateStrip(stripEl, winIdx, durationSec) {
    const itemW = 88; // 84px + 4px gap
    const viewport = stripEl.parentElement;
    const vpW = viewport ? viewport.offsetWidth : 320;
    // center of winning item should align with viewport center, + tiny random jitter
    const jitter = (Math.random() * 40 - 20);
    const offset = vpW / 2 - (winIdx * itemW + itemW / 2) + jitter;
    stripEl.style.transition = "none";
    stripEl.style.transform = "translateX(0px)";
    void stripEl.offsetWidth; // force reflow
    requestAnimationFrame(() => {
        stripEl.style.transition = "transform " + durationSec + "s cubic-bezier(0.12,0.7,0.1,1)";
        stripEl.style.transform = "translateX(" + offset.toFixed(1) + "px)";
    });
}

function rollCrateItem(forceGod) {
    if (forceGod) return CRATE_TABLE[5];
    const table = ensureCasino().highRoller
        ? CRATE_TABLE.map((it, i) => i >= 2 ? Object.assign({}, it, { weight: it.weight * (i >= 4 ? 2.5 : 1.6) }) : it)
        : CRATE_TABLE;
    const total = table.reduce((s, x) => s + x.weight, 0);
    let roll = Math.random() * total;
    for (const it of table) {
        roll -= it.weight;
        if (roll <= 0) return it;
    }
    return table[0];
}

function buildCrateStrip(won, nearMiss) {
    const strip = [];
    for (let i = 0; i < 40; i++) strip.push(rollCrateItem(false));
    strip[28] = won;
    if (nearMiss) strip[27] = CRATE_TABLE[5];
    return strip;
}

function grantCasinoApexPet(wantDivine) {
    const tmpl = worldApexTemplate(game.worldIdx, wantDivine);
    const pet = {
        id: Date.now() + Math.floor(Math.random() * 99999),
        name: tmpl.name,
        emoji: tmpl.emoji,
        rarity: tmpl.rarity,
        star: 0,
        power: petPower(tmpl.base, game.worldIdx) * 1.1
    };
    game.pets.push(pet);
    game.discovered[dexKey(game.worldIdx, pet.name)] = true;
    return pet;
}

function resolveCrateWin(won) {
    const status = document.getElementById("crate-status");
    const c = ensureCasino();
    if (won.tier >= 5) {
        const pet = grantCasinoApexPet(true);
        if (status) status.innerHTML = "🌈 " + pet.name + "!!!";
        rainbowFlash(); shake(); bigBanner("DIVINE ROLL", "#ffffff"); sfxRare(5);
    } else if (won.tier >= 4) {
        c.secretShards += 2;
        if (status) status.textContent = "💎 2 Secret Shards!";
        screenFlash("#b14eff");
    } else if (won.tier >= 3) {
        c.slotBuffMult = 2.2;
        c.slotBuffUntil = Date.now() + 90000;
        if (status) status.textContent = "Legendary! Passive x2.2 · 90s";
        screenFlash("#7fff00");
    } else if (won.tier >= 2) {
        grantChips(chipPrice("crate") * 2);
        if (status) status.textContent = "Epic chips refund!";
    } else if (won.tier >= 1) {
        c.slotBuffMult = 1.35;
        c.slotBuffUntil = Date.now() + 45000;
        if (status) status.textContent = "Rare buff x1.35 · 45s";
    } else {
        c.slotBuffMult = 1.08;
        c.slotBuffUntil = Date.now() + 30000;
        if (status) status.textContent = "Trash buff x1.08 · 30s";
    }
    showToast("📦 " + won.label + "!", 2800);
    saveGame(); updateDisplay(); renderCasino();
    casinoDefer(casinoSession, closeCasinoModal, 3000);
}

/* ---- OHIO CASE (cursed loot box + roller) ---- */
function openOhioCase() {
    if (!casinoUnlocked("loot")) { sfxError(); return; }
    if (!canGamble()) return;
    const cost = chipPrice("loot");
    if (!spendChips(cost)) { sfxError(); showToast("❌ Need " + cost + " Chips!", 2000); return; }
    registerGamble();
    const c = ensureCasino();
    c.lootPity++;
    saveGame(); updateDisplay();
    const forceGod = c.lootPity >= 140 || Math.random() < 0.00008;
    const near = !forceGod && Math.random() < 0.38;
    openCrateVisualOhio(forceGod, near, cost);
}

function openCrateVisualOhio(forceGod, nearMiss, cost) {
    const won = forceGod ? CRATE_TABLE[5] : (nearMiss ? CRATE_TABLE[4] : rollCrateItem(false));
    if (forceGod) ensureCasino().lootPity = 0;
    const strip = buildCrateStrip(won, nearMiss && !forceGod);
    const html = '<div class="loot-odds">📊 Displayed: 0.001% Skibidi God · rigged · only in Ohio</div>' +
        '<div class="crate-viewport ohio"><div class="crate-marker"></div><div class="crate-strip" id="crate-strip"></div></div>' +
        '<p class="loot-status" id="loot-status">Cursed case opening...</p>';
    openCasinoModal("📦 Only In Ohio Case", html);
    const stripEl = document.getElementById("crate-strip");
    stripEl.innerHTML = strip.map(it =>
        '<div class="crate-item tier-' + it.tier + '"><span class="crate-item-emoji">' + it.emoji + '</span></div>'
    ).join("");
    animateCrateStrip(stripEl, 28, 6);
    const sess = casinoSession;
    casinoDefer(sess, () => {
        const status = document.getElementById("loot-status");
        if (forceGod) {
            resolveCrateWin(CRATE_TABLE[5]);
            if (status) status.textContent = "🚽🚽🚽 DIVINE GOD — ONLY IN OHIO";
        } else if (nearMiss) {
            grantChips(Math.max(1, Math.floor(cost * 0.06)));
            if (status) status.textContent = "🚽🚽 ...💩 MISSED GOD BY ONE";
            showToast("😱 SO CLOSE!!! Pain.", 3200);
            screenFlash("#ff3d9a");
            saveGame(); updateDisplay(); renderCasino();
            casinoDefer(sess, closeCasinoModal, 3200);
        } else {
            resolveCrateWin(won);
            if (status) status.textContent = won.label;
        }
    }, 6100);
}

/* ---- WHEEL (real spinning wheel with visible segments + odds) ---- */
const WHEEL_SEGMENTS = [
    { label: "2 Chips",   short: "2C",   weight: 24,   color: "#3da5ff", fn: () => grantChips(2) },
    { label: "5 Chips",   short: "5C",   weight: 18,   color: "#5dd2ff", fn: () => grantChips(5) },
    { label: "Golden x2", short: "GOLD", weight: 14,   color: "#ffd54a", fn: () => { const c = ensureCasino(); c.goldenBuffMult = 2; c.goldenBuffUntil = Date.now() + 4 * 60 * 1000; } },
    { label: "Egg -12%",  short: "-12%", weight: 12,   color: "#7fff00", fn: () => { const c = ensureCasino(); c.eggDiscountPct = 0.12; c.eggDiscountUntil = Date.now() + 8 * 60 * 1000; } },
    { label: "12 Chips",  short: "12C",  weight: 10,   color: "#b14eff", fn: () => grantChips(12) },
    { label: "1 Shard",   short: "💎",   weight: 6,    color: "#ff3d9a", fn: () => { ensureCasino().secretShards++; } },
    { label: "Crate Key", short: "🔑",   weight: 4,    color: "#ff8a3d", fn: () => { ensureCasino().crateKeys++; } },
    { label: "ULTRA PET", short: "✦",    weight: 0.08, color: "#00ffd0", fn: () => grantWheelSecretPet() }
];

function wheelOddsPct(seg, total) {
    const pct = (seg.weight / total) * 100;
    return pct < 0.1 ? pct.toFixed(2) : (pct < 1 ? pct.toFixed(1) : Math.round(pct));
}

function wheelSegLight(hex) {
    return hex + "cc";
}

function buildWheelSVG(totalW) {
    const cx = 130, cy = 130, rOut = 122, rIn = 34;
    let angle = -90;
    let defs = "<defs>";
    let paths = "";
    let labels = "";
    let dividers = "";
    let pegs = "";
    WHEEL_SEGMENTS.forEach((seg, i) => {
        defs += '<linearGradient id="wgrad' + i + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="' + wheelSegLight(seg.color) + '"/>' +
            '<stop offset="100%" stop-color="' + seg.color + '"/></linearGradient>';
    });
    defs += "</defs>";
    WHEEL_SEGMENTS.forEach((seg, i) => {
        const sweep = (seg.weight / totalW) * 360;
        const a0 = angle * Math.PI / 180;
        const a1 = (angle + sweep) * Math.PI / 180;
        const x0o = cx + rOut * Math.cos(a0), y0o = cy + rOut * Math.sin(a0);
        const x1o = cx + rOut * Math.cos(a1), y1o = cy + rOut * Math.sin(a1);
        const x0i = cx + rIn * Math.cos(a0), y0i = cy + rIn * Math.sin(a0);
        const x1i = cx + rIn * Math.cos(a1), y1i = cy + rIn * Math.sin(a1);
        const large = sweep > 180 ? 1 : 0;
        paths += '<path d="M' + x0i.toFixed(1) + ',' + y0i.toFixed(1) +
            ' L' + x0o.toFixed(1) + ',' + y0o.toFixed(1) +
            ' A' + rOut + ',' + rOut + ' 0 ' + large + ',1 ' + x1o.toFixed(1) + ',' + y1o.toFixed(1) +
            ' L' + x1i.toFixed(1) + ',' + y1i.toFixed(1) +
            ' A' + rIn + ',' + rIn + ' 0 ' + large + ',0 ' + x0i.toFixed(1) + ',' + y0i.toFixed(1) + ' Z" fill="url(#wgrad' + i + ')" stroke="#0a0418" stroke-width="1.5"/>';
        const mid = (angle + sweep / 2) * Math.PI / 180;
        const lr = (rOut + rIn) * 0.5;
        const lx = cx + lr * Math.cos(mid), ly = cy + lr * Math.sin(mid);
        const deg = (angle + sweep / 2);
        if (sweep > 7) {
            labels += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" fill="#0a0418" font-size="12" font-weight="800" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + deg.toFixed(1) + ' ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')">' + seg.short + '</text>';
        }
        dividers += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x0o.toFixed(1) + '" y2="' + y0o.toFixed(1) + '" stroke="rgba(0,0,0,0.35)" stroke-width="1.2"/>';
        const px = cx + (rOut - 6) * Math.cos(mid), py = cy + (rOut - 6) * Math.sin(mid);
        pegs += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="3.2" fill="#fff8d0" stroke="#8a6a10" stroke-width="1"/>';
        angle += sweep;
    });
    return '<svg viewBox="0 0 260 260" id="wheel-svg" class="wheel-svg">' + defs +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rOut + 4) + '" fill="none" stroke="#ffd54a" stroke-width="6"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rOut + 1) + '" fill="none" stroke="#1a0a38" stroke-width="2"/>' +
        paths + dividers + pegs + labels +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + rIn + '" fill="#1a0a38" stroke="#ffd54a" stroke-width="2.5"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="10" fill="#ffd54a"/></svg>';
}

function spinWheel(fromAd) {
    if (!fromAd && !wheelReady()) { sfxError(); showToast("⏳ " + wheelCountdown(), 2000); return; }
    if (!fromAd && !canGamble()) return;
    const c = ensureCasino();
    if (!fromAd) {
        c.lastWheelSpin = Date.now();
        registerGamble();
    }
    c.wheelSpins++;
    if (typeof trackStat === "function") trackStat("wheelSpins", 1);
    const totalW = WHEEL_SEGMENTS.reduce((s, x) => s + x.weight, 0);

    // pick winner + compute its mid-angle so the pointer lands on it
    let roll = Math.random() * totalW;
    let pickedIdx = 0, acc = 0, segStart = 0;
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
        if (roll < acc + WHEEL_SEGMENTS[i].weight) { pickedIdx = i; segStart = acc; break; }
        acc += WHEEL_SEGMENTS[i].weight;
    }
    const picked = WHEEL_SEGMENTS[pickedIdx];
    const sweep = (picked.weight / totalW) * 360;
    const segMid = ((segStart + picked.weight / 2) / totalW) * 360; // degrees from top
    // pointer is fixed at top; we rotate wheel so segMid lands under pointer
    const spins = 5;
    const targetRot = spins * 360 - segMid + (Math.random() * sweep - sweep / 2) * 0.6;

    const oddsList = WHEEL_SEGMENTS.map(s =>
        '<span class="wheel-odd"><span class="wheel-odd-dot" style="background:' + s.color + '"></span>' + s.label + ' <b>' + wheelOddsPct(s, totalW) + '%</b></span>'
    ).join("");

    const html = '<div class="wheel-cabinet">' +
        '<div class="wheel-lights"></div>' +
        '<div class="wheel-stage">' +
        '<div class="wheel-pointer"></div>' +
        '<div class="wheel-rotor" id="wheel-rotor">' + buildWheelSVG(totalW) + '</div>' +
        '<div class="wheel-cap"></div>' +
        '</div></div>' +
        '<div class="wheel-odds-list">' + oddsList + '</div>' +
        '<p id="wheel-result" class="wheel-result">Spinning...</p>';
    openCasinoModal("🎡 Lucky Wheel", html);
    sfxWhoosh();
    const rotor = document.getElementById("wheel-rotor");
    if (rotor) {
        rotor.style.transition = "none";
        rotor.style.transform = "rotate(0deg)";
        requestAnimationFrame(() => {
            rotor.style.transition = "transform 4.5s cubic-bezier(0.15,0.85,0.12,1)";
            rotor.style.transform = "rotate(" + targetRot.toFixed(1) + "deg)";
        });
    }
    const sess = casinoSession;
    casinoDefer(sess, () => {
        picked.fn();
        const res = document.getElementById("wheel-result");
        if (res) res.innerHTML = "🎉 <b style='color:" + picked.color + "'>" + picked.label + "</b>!";
        if (picked.weight <= 0.2) { rainbowFlash(); shake(); bigBanner("ULTRA PET!!!", "#00ffd0"); sfxRare(5); }
        else { screenFlash(picked.color); sfxBuy(); }
        showToast("🎡 " + picked.label, 2800);
        saveGame(); updateDisplay(); renderCasino();
        casinoDefer(sess, closeCasinoModal, 3000);
    }, 4700);
}

function offerAdWheel() {
    if (!adWheelReady()) { sfxError(); showToast("Ad spin on cooldown", 2000); return; }
    showRewardedAd(() => {
        ensureCasino().lastAdWheel = Date.now();
        spinWheel(true);
    }, "Watch ad for a bonus wheel spin!");
}

function grantWheelSecretPet() {
    // wheel grants the world's ultra (rarer than secret, below divine)
    grantCasinoApexPet(false);
}

function redeemSecretShards() {
    const c = ensureCasino();
    if (c.secretShards < 10) { sfxError(); showToast("Need 10 shards!", 1800); return; }
    c.secretShards -= 10;
    grantWheelSecretPet();
    showToast("💎 Shards → SECRET pet!", 3000);
    sfxRare(5); screenFlash("#00ffd0");
    saveGame(); updateDisplay(); renderCasino();
}
