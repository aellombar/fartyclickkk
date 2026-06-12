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
    { key: "sym-fart", label: "Trash Buff", weight: 700, tier: 0 },
    { key: "sym-paw", label: "Rare Paw", weight: 200, tier: 1 },
    { key: "sym-crown", label: "Epic Crown", weight: 80, tier: 2 },
    { key: "sym-gem", label: "Legendary Gem", weight: 18, tier: 3 },
    { key: "shard", label: "Secret Shard", weight: 1.8, tier: 4 },
    { key: "skibidi-god", label: "SKIBIDI GOD", weight: 0.2, tier: 5 }
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
        crateKeys: 0
    };
}

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
                '<span class="casino-stat-pill"><span class="cs-ico">🪙</span><b>' + fmt(game.chips || 0) + '</b></span>' +
                '<span class="casino-stat-pill"><span class="cs-ico">💎</span><b>' + c.secretShards + '</b> shards</span>' +
                '<span class="casino-stat-pill"><span class="cs-ico">🎲</span><b>' + c.dailyGambles + '/' + DAILY_GAMBLE_CAP + '</b></span>' +
                (c.crateKeys > 0 ? '<span class="casino-stat-pill"><span class="cs-ico">🔑</span><b>' + c.crateKeys + '</b></span>' : '') +
                (buffActive ? '<span class="casino-stat-pill casino-hot">🔥 x' + c.slotBuffMult + ' · ' + buffLeft + '</span>' : '') +
            '</div>' +
        '</div>' +
        '<div class="casino-grid">' +
            casinoCard("scratch", "🎫 Dank Scratch", "Scratch foil grid · match top row", chipPrice("scratch") + " 🪙", "buyScratch()", !casinoUnlocked("scratch")) +
            casinoCard("mines", "💣 Stink Mines", "5×5 · cash out or boom", chipPrice("mines") + " 🪙", "startMines()", !casinoUnlocked("mines") || c.minesActive) +
            casinoCard("crate", "📦 Brainrot Crate", "CSGO-style roller · win pets", (c.crateKeys > 0 ? "🔑 1 Key" : chipPrice("crate") + " 🪙"), "openCrate()", !casinoUnlocked("crate")) +
            casinoCard("loot", "🚽 Ohio Case", "Cursed · 0.001% Skibidi God", chipPrice("loot") + " 🪙", "openOhioCase()", !casinoUnlocked("loot")) +
            casinoCard("wheel", "🎡 Lucky Wheel", wheelReady() ? "FREE SPIN READY!" : ("Next: " + wheelCountdown()), "FREE", "spinWheel()", !wheelReady()) +
            casinoCard("ad", "📺 Ad Spin", adWheelReady() ? "Watch ad · bonus spin" : "Cooldown", "FREE", "offerAdWheel()", !adWheelReady()) +
        '</div>' +
        (c.secretShards >= 10
            ? '<button class="casino-shard-btn" onclick="redeemSecretShards()">💎 Redeem 10 Shards → Secret Pet</button>'
            : '<p class="casino-shard-hint">Jackpots drop 💎 shards · 10 = guaranteed secret pet</p>') +
        '<p class="casino-disclaimer">⚠️ Chips are scarce. Near-misses intentional. Gambling taxes Aura rebirth.</p>';
}

function casinoCard(id, title, desc, cost, onclick, disabled) {
    return '<button class="casino-card ' + id + (disabled ? " disabled" : "") + '" onclick="' + onclick + '"' + (disabled ? ' disabled' : '') + '>' +
        '<div class="casino-card-title">' + title + '</div>' +
        '<div class="casino-card-desc">' + desc + '</div>' +
        '<div class="casino-card-cost">' + cost + '</div></button>';
}

function openCasinoModal(title, inner) {
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
}

function closeCasinoModal() {
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

    const html = '<div class="scratch-outer">' + symHtml +
        '<canvas id="scratch-canvas" width="320" height="240" class="scratch-foil-canvas"></canvas>' +
        '</div>' +
        '<p class="scratch-hint" id="scratch-hint">👆 Scratch to reveal · drag finger/mouse</p>';
    openCasinoModal("🎫 Dank Scratch", html);
    window._scratchGrid = grid;
    window._scratchBet = betChips;
    window._scratchDone = false;
    window._scratchCols = cols;
    setTimeout(initScratchCanvas, 40);
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
    let totalErased = 0;
    const totalPixels = canvas.width * canvas.height;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const src = e.touches ? e.touches[0] : e;
        return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
    }

    function scratchAt(px, py) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        sfxClick();
        // auto-finish when ~55% scratched
        totalErased += Math.PI * 22 * 22;
        if (totalErased > totalPixels * 0.55 && !window._scratchDone) {
            autoRevealScratch();
        }
    }

    function onStart(e) { e.preventDefault(); scratching = true; const p = getPos(e); scratchAt(p.x, p.y); }
    function onMove(e) { e.preventDefault(); if (scratching) { const p = getPos(e); scratchAt(p.x, p.y); } }
    function onEnd() { scratching = false; }

    canvas.addEventListener("pointerdown", onStart);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onEnd);
    canvas.addEventListener("pointerleave", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);

    window._scratchCleanup = () => { scratching = false; };
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
    if (win) {
        resolveScratchJackpot(hint);
    } else if (near) {
        if (hint) hint.textContent = "😭 SO CLOSE — 3 in a row but not 4!";
        showToast("Near miss! The foil knew.", 2800);
        screenFlash("#ff3d9a");
        saveGame(); updateDisplay();
        setTimeout(closeCasinoModal, 2400);
    } else {
        if (hint) hint.textContent = "No match. L + ratio.";
        grantChips(Math.max(1, Math.floor((window._scratchBet || 1) * 0.15)), "consolation");
        saveGame(); updateDisplay();
        setTimeout(closeCasinoModal, 2400);
    }
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
    showToast("🎉 JACKPOT! " + msg, 3200);
    sfxRare(4); shake();
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
    saveGame(); updateDisplay();
    renderMinesBoard();
}

function renderMinesBoard() {
    const st = ensureCasino().minesState;
    if (!st) return;
    let html = '<div class="mines-hud">Mult: <b id="mines-mult">x' + st.mult.toFixed(2) + '</b> · Mines: ' + st.mines.size + '</div>' +
        '<div class="mines-grid">';
    for (let i = 0; i < st.size * st.size; i++) {
        const rev = st.revealed.indexOf(i) >= 0;
        const isMine = st.mines.has(i);
        let inner = "?";
        let cls = "mine-tile";
        if (rev) {
            cls += isMine ? " boom" : " safe";
            inner = isMine ? premiumHTML("mine-bomb", "mine-tile-ico", "Bomb") : premiumHTML("mine-safe", "mine-tile-ico", "Safe");
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
    st.revealed.push(i);
    if (st.mines.has(i)) {
        st.alive = false;
        c.minesActive = false;
        c.minesCooldownUntil = Date.now() + 3 * 60 * 1000;
        showToast("💥 BOOM! Ohio got you.", 2800);
        screenFlash("#ff2020");
        if (Math.random() < 0.4) showToast("👻 You would have had x" + (st.mult * 1.6).toFixed(1) + " if you stopped...", 3200);
        saveGame(); renderMinesBoard();
        setTimeout(closeCasinoModal, 2800);
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
    c.minesActive = false;
    c.minesCooldownUntil = Date.now() + 90 * 1000;
    st.alive = false;
    showToast("💰 Cashed x" + st.mult.toFixed(2) + " → " + payout + " chips!", 2800);
    saveGame(); updateDisplay(); renderCasino();
    setTimeout(closeCasinoModal, 2200);
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
    saveGame(); updateDisplay();
    const won = rollCrateItem(false);
    const near = won.tier < 5 && Math.random() < 0.34;
    const strip = buildCrateStrip(won, near);
    const html = '<div class="crate-stage">' + premiumHTML("crate", "crate-stage-ico", "Crate") + '</div>' +
        '<div class="crate-viewport"><div class="crate-marker"></div><div class="crate-strip" id="crate-strip"></div></div>' +
        '<p class="crate-status" id="crate-status">Opening...</p>';
    openCasinoModal("📦 Brainrot Crate", html);
    const stripEl = document.getElementById("crate-strip");
    stripEl.innerHTML = strip.map(it =>
        '<div class="crate-item tier-' + it.tier + '">' + premiumHTML(it.key, "crate-item-ico", it.label) + '<span>' + it.label + '</span></div>'
    ).join("");
    const itemW = 88;
    const winIdx = 28;
    const offset = -(winIdx * itemW - 140);
    stripEl.style.transition = "none";
    stripEl.style.transform = "translateX(0)";
    requestAnimationFrame(() => {
        stripEl.style.transition = "transform 5.5s cubic-bezier(0.12,0.7,0.1,1)";
        stripEl.style.transform = "translateX(" + offset + "px)";
    });
    sfxWhoosh();
    setTimeout(() => resolveCrateWin(won), 5600);
}

function rollCrateItem(forceGod) {
    if (forceGod) return CRATE_TABLE[5];
    const total = CRATE_TABLE.reduce((s, x) => s + x.weight, 0);
    let roll = Math.random() * total;
    for (const it of CRATE_TABLE) {
        roll -= it.weight;
        if (roll <= 0) return it;
    }
    return CRATE_TABLE[0];
}

function buildCrateStrip(won, nearMiss) {
    const strip = [];
    for (let i = 0; i < 40; i++) strip.push(rollCrateItem(false));
    strip[28] = won;
    if (nearMiss) strip[27] = CRATE_TABLE[5];
    return strip;
}

function resolveCrateWin(won) {
    const status = document.getElementById("crate-status");
    const c = ensureCasino();
    if (won.tier >= 5) {
        const pet = { id: Date.now(), name: "Skibidi God", emoji: "🚽", rarity: "secret", star: 0, power: petPower(200, game.worldIdx) };
        game.pets.push(pet);
        game.discovered[dexKey(game.worldIdx, "Skibidi God")] = true;
        if (status) status.innerHTML = "✦ SKIBIDI GOD!!!";
        rainbowFlash(); shake(); bigBanner("GOD ROLL", "#00ffd0"); sfxRare(5);
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
    setTimeout(closeCasinoModal, 3000);
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
        '<div class="crate-item tier-' + it.tier + '">' + premiumHTML(it.key, "crate-item-ico", it.label) + '</div>'
    ).join("");
    const offset = -(28 * 88 - 140);
    requestAnimationFrame(() => {
        stripEl.style.transition = "transform 6s cubic-bezier(0.08,0.82,0.12,1)";
        stripEl.style.transform = "translateX(" + offset + "px)";
    });
    setTimeout(() => {
        const status = document.getElementById("loot-status");
        if (forceGod) {
            resolveCrateWin(CRATE_TABLE[5]);
            if (status) status.textContent = "🚽🚽🚽 SKIBIDI GOD — ONLY IN OHIO";
        } else if (nearMiss) {
            grantChips(Math.max(1, Math.floor(cost * 0.06)));
            if (status) status.textContent = "🚽🚽 ...💩 MISSED GOD BY ONE";
            showToast("😱 SO CLOSE!!! Pain.", 3200);
            screenFlash("#ff3d9a");
        } else {
            resolveCrateWin(won);
            if (status) status.textContent = won.label;
        }
        saveGame(); updateDisplay(); renderCasino();
        setTimeout(closeCasinoModal, 3200);
    }, 6100);
}

/* ---- WHEEL ---- */
const WHEEL_SEGMENTS = [
    { label: "2 Chips", weight: 24, fn: () => grantChips(2) },
    { label: "5 Chips", weight: 18, fn: () => grantChips(5) },
    { label: "Golden Fart x2", weight: 14, fn: () => { const c = ensureCasino(); c.goldenBuffMult = 2; c.goldenBuffUntil = Date.now() + 4 * 60 * 1000; } },
    { label: "Egg -12%", weight: 12, fn: () => { const c = ensureCasino(); c.eggDiscountPct = 0.12; c.eggDiscountUntil = Date.now() + 8 * 60 * 1000; } },
    { label: "12 Chips", weight: 10, fn: () => grantChips(12) },
    { label: "1 Shard", weight: 6, fn: () => { ensureCasino().secretShards++; } },
    { label: "Crate Key", weight: 4, fn: () => { ensureCasino().crateKeys++; } },
    { label: "SECRET PET", weight: 0.08, fn: () => grantWheelSecretPet() }
];

function spinWheel(fromAd) {
    if (!fromAd && !wheelReady()) { sfxError(); showToast("⏳ " + wheelCountdown(), 2000); return; }
    if (!fromAd && !canGamble()) return;
    const c = ensureCasino();
    if (!fromAd) {
        c.lastWheelSpin = Date.now();
        registerGamble();
    }
    c.wheelSpins++;
    const totalW = WHEEL_SEGMENTS.reduce((s, x) => s + x.weight, 0);
    let roll = Math.random() * totalW;
    let picked = WHEEL_SEGMENTS[0];
    for (const seg of WHEEL_SEGMENTS) {
        roll -= seg.weight;
        if (roll <= 0) { picked = seg; break; }
    }
    const html = '<div class="wheel-wrap"><div class="wheel-spinner-emoji" id="wheel-spinner">🎡</div></div><p id="wheel-result" class="wheel-result">Spinning...</p>';
    openCasinoModal("🎡 Lucky Wheel", html);
    sfxWhoosh();
    setTimeout(() => {
        picked.fn();
        const res = document.getElementById("wheel-result");
        if (res) res.textContent = "🎉 " + picked.label + "!";
        if (picked.weight <= 0.2) { rainbowFlash(); shake(); bigBanner("SECRET!!!", "#00ffd0"); sfxRare(5); }
        else { screenFlash("#ffd54a"); sfxBuy(); }
        showToast("🎡 " + picked.label, 2800);
        saveGame(); updateDisplay(); renderCasino();
        setTimeout(closeCasinoModal, 2800);
    }, 3200);
}

function offerAdWheel() {
    if (!adWheelReady()) { sfxError(); showToast("Ad spin on cooldown", 2000); return; }
    showRewardedAd(() => {
        ensureCasino().lastAdWheel = Date.now();
        spinWheel(true);
    }, "Watch ad for a bonus wheel spin!");
}

function grantWheelSecretPet() {
    const pets = allPetsForWorld(game.worldIdx).filter(p => RARITY[p.rarity].tier >= 5);
    const template = pets.length ? pets[Math.floor(Math.random() * pets.length)] : { name: "Wheel God", emoji: "🚽", rarity: "secret", base: 150 };
    game.pets.push({
        id: Date.now() + Math.floor(Math.random() * 99999),
        name: template.name,
        emoji: template.emoji || "✦",
        rarity: "secret",
        star: 0,
        power: petPower(template.base || 120, game.worldIdx) * 1.15
    });
    game.discovered[dexKey(game.worldIdx, template.name)] = true;
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
