/* ============================================================
   CASINO — scratch, slots, wheel, Ohio loot boxes
   ============================================================ */

const WHEEL_COOLDOWN_MS = 10 * 60 * 1000;
const SCRATCH_SYMBOLS = ["💨", "🌟", "💎", "🐾", "👑", "🌽"];
const SLOT_SYMBOLS = ["💨", "🐾", "🌟", "👑", "💎", "🌽", "🚽", "🔥"];

function ensureCasino() {
    if (!game.casino) game.casino = freshCasinoState();
    return game.casino;
}

function freshCasinoState() {
    return {
        secretShards: 0,
        lastWheelSpin: 0,
        wheelSpins: 0,
        slotBuffUntil: 0,
        slotBuffMult: 1,
        goldenBuffUntil: 0,
        goldenBuffMult: 1,
        eggDiscountUntil: 0,
        eggDiscountPct: 0,
        scratchPity: 0,
        lootPity: 0,
        totalGambles: 0
    };
}

function scratchCost() {
    return Math.max(8000, Math.floor(getClickPower() * getPetMult() * 120));
}

function slotsCost() {
    const passive = getPassive() * getPetMult();
    if (passive > 0) return Math.max(50000, Math.floor(passive * 180));
    return Math.max(25000, Math.floor(getClickPower() * getPetMult() * 400));
}

function lootBoxCost() {
    const eggs = getEggTemplates();
    const base = eggs[0] ? eggCost(eggs[0], game.worldIdx) : 100000;
    return Math.max(base * 6, Math.floor(getClickPower() * getPetMult() * 2500));
}

function wheelReady() {
    const c = ensureCasino();
    return Date.now() - (c.lastWheelSpin || 0) >= WHEEL_COOLDOWN_MS;
}

function wheelCountdown() {
    const left = WHEEL_COOLDOWN_MS - (Date.now() - (ensureCasino().lastWheelSpin || 0));
    if (left <= 0) return "READY!";
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    return m + "m " + s + "s";
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

function renderCasino() {
    const el = document.getElementById("casino-body");
    if (!el) return;
    const c = ensureCasino();
    const buffActive = c.slotBuffUntil > Date.now();
    el.innerHTML =
        '<div class="casino-hero">' +
            '<div class="casino-hero-title">🎰 STINK CASINO</div>' +
            '<div class="casino-hero-sub">The house always wins... unless you\'re built different.</div>' +
            '<div class="casino-stats">' +
                '<span>💎 Shards: <b>' + c.secretShards + '</b></span>' +
                '<span>🎲 Rolls: <b>' + c.totalGambles + '</b></span>' +
                (buffActive ? '<span class="casino-hot">🔥 Slot buff x' + c.slotBuffMult + '</span>' : '') +
            '</div>' +
        '</div>' +
        '<div class="casino-grid">' +
            casinoCard("scratch", "🎫 Dank Scratch", "Match 3 tiles for JACKPOT", fmt(scratchCost()) + " 💨", "buyScratch()") +
            casinoCard("slots", "🎰 Stink Slots", "3-of-a-kind = passive income boost", fmt(slotsCost()) + " 💨", "playSlots()") +
            casinoCard("wheel", "🎡 Lucky Wheel", wheelReady() ? "FREE SPIN READY!" : ("Next: " + wheelCountdown()), wheelReady() ? "SPIN NOW" : "Wait...", "spinWheel()", !wheelReady()) +
            casinoCard("loot", "📦 Ohio Loot Box", "0.001% Skibidi God · cursed odds", fmt(lootBoxCost()) + " 💨", "openLootBox()") +
        '</div>' +
        (c.secretShards >= 10
            ? '<button class="casino-shard-btn" onclick="redeemSecretShards()">💎 Redeem 10 Shards → Secret Pet</button>'
            : '<p class="casino-shard-hint">Collect 10 💎 shards from jackpots to craft a Secret pet.</p>') +
        '<p class="casino-disclaimer">⚠️ Gambling uses Stink. Near-misses are intentional. Good luck, nerd.</p>';
}

function redeemSecretShards() {
    const c = ensureCasino();
    if (c.secretShards < 10) { sfxError(); showToast("Need 10 shards!", 1800); return; }
    c.secretShards -= 10;
    grantWheelSecretPet();
    showToast("💎 Shards forged into a SECRET pet!", 3000);
    sfxRare(5); screenFlash("#00ffd0");
    saveGame(); updateDisplay(); renderCasino();
}

function casinoCard(id, title, desc, cost, onclick, disabled) {
    return '<button class="casino-card ' + id + (disabled ? " disabled" : "") + '" onclick="' + onclick + '"' + (disabled ? ' disabled' : '') + '>' +
        '<div class="casino-card-title">' + title + '</div>' +
        '<div class="casino-card-desc">' + desc + '</div>' +
        '<div class="casino-card-cost">' + cost + '</div></button>';
}

function openCasinoModal(id, title, inner) {
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
}

/* ---- SCRATCH CARDS ---- */
function buyScratch() {
    const cost = scratchCost();
    if (game.points < cost) { sfxError(); showToast("❌ Not enough Stink!", 1800); return; }
    game.points -= cost;
    ensureCasino().totalGambles++;
    ensureCasino().scratchPity++;
    saveGame();
    updateDisplay();
    startScratchGame(cost);
}

function startScratchGame(cost) {
    const forceJackpot = ensureCasino().scratchPity >= 18;
    const forceNearMiss = !forceJackpot && Math.random() < 0.38;
    const winSym = SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)];
    let tiles;
    if (forceJackpot) {
        tiles = [winSym, winSym, winSym];
        ensureCasino().scratchPity = 0;
    } else if (forceNearMiss) {
        const miss = SCRATCH_SYMBOLS.filter(s => s !== winSym)[Math.floor(Math.random() * 5)];
        tiles = [winSym, winSym, miss];
        if (Math.random() < 0.5) tiles.sort(() => Math.random() - 0.5);
    } else {
        tiles = [0, 1, 2].map(() => SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)]);
        if (tiles[0] === tiles[1] && tiles[1] === tiles[2] && !forceJackpot) {
            tiles[2] = SCRATCH_SYMBOLS.filter(s => s !== tiles[0])[0];
        }
    }
    const html = '<div class="scratch-board">' +
        tiles.map((s, i) => '<button class="scratch-tile covered" id="scratch-' + i + '" onclick="revealScratch(' + i + ')">?</button>').join("") +
        '</div><p class="scratch-hint" id="scratch-hint">Scratch all 3...</p>';
    openCasinoModal("scratch", "🎫 Dank Scratch", html);
    window._scratchTiles = tiles;
    window._scratchCost = cost;
    window._scratchRevealed = 0;
}

function revealScratch(i) {
    const btn = document.getElementById("scratch-" + i);
    if (!btn || !btn.classList.contains("covered")) return;
    btn.classList.remove("covered");
    btn.textContent = window._scratchTiles[i];
  btn.style.pointerEvents = "none";
    window._scratchRevealed = (window._scratchRevealed || 0) + 1;
    sfxBuy();
    if (window._scratchRevealed < 3) return;
    const tiles = window._scratchTiles;
    const hint = document.getElementById("scratch-hint");
    if (tiles[0] === tiles[1] && tiles[1] === tiles[2]) {
        resolveScratchJackpot(hint);
    } else if (tiles[0] === tiles[1] || tiles[1] === tiles[2] || tiles[0] === tiles[2]) {
        if (hint) hint.textContent = "SO CLOSE!!! Two matched... try again 👀";
        showToast("😭 Near miss! 2 matched — the house smells your pain.", 2800);
        screenFlash("#ff3d9a");
    } else {
        if (hint) hint.textContent = "No match. L + ratio + stink.";
        const crumb = Math.floor(window._scratchCost * 0.08);
        game.points += crumb;
        showToast("💨 Consolation: +" + fmt(crumb) + " Stink", 2000);
    }
    saveGame(); updateDisplay();
    setTimeout(closeCasinoModal, 2200);
}

function resolveScratchJackpot(hint) {
    const roll = Math.random();
    const c = ensureCasino();
    let msg;
    if (roll < 0.34) {
        c.secretShards++;
        msg = "💎 SECRET PET SHARD! (" + c.secretShards + " total)";
        bigBanner("JACKPOT!!!", "#00ffd0");
    } else if (roll < 0.67) {
        const bonus = Math.floor(window._scratchCost * 10);
        game.points += bonus;
        msg = "💰 +" + fmt(bonus) + " Stink (10x back!)";
        screenFlash("#ffd54a"); burstAt(innerWidth / 2, innerHeight / 2, "#ffd54a", 20);
    } else {
        game.aura = (game.aura || 0) + 2;
        msg = "✦ +2 AURA!";
        rainbowFlash();
    }
    c.eggDiscountPct = 0.2;
    c.eggDiscountUntil = Date.now() + 5 * 60 * 1000;
    if (hint) hint.textContent = "✨ JACKPOT! " + msg;
    showToast("🎉 JACKPOT! " + msg + " + 20% egg discount 5min!", 3500);
    sfxRare(4); shake();
    saveGame(); updateDisplay();
    setTimeout(closeCasinoModal, 2800);
}

/* ---- SLOTS ---- */
function playSlots() {
    const cost = slotsCost();
    if (game.points < cost) { sfxError(); showToast("❌ Not enough Stink!", 1800); return; }
    game.points -= cost;
    ensureCasino().totalGambles++;
    saveGame(); updateDisplay();
    const nearMiss = Math.random() < 0.32;
    const winSym = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    let reels;
    if (nearMiss) {
        const miss = SLOT_SYMBOLS.filter(s => s !== winSym)[0];
        reels = [winSym, winSym, miss];
    } else {
        reels = [0, 1, 2].map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
    }
    const html = '<div class="slots-machine">' +
        reels.map((_, i) => '<div class="slot-reel" id="slot-reel-' + i + '">❓</div>').join("") +
        '</div><p class="slots-status" id="slots-status">Spinning...</p>';
    openCasinoModal("slots", "🎰 Stink Slots", html);
    window._slotReels = reels;
    animateSlots(0);
}

function animateSlots(step) {
    if (step < 12) {
        [0, 1, 2].forEach(i => {
            const el = document.getElementById("slot-reel-" + i);
            if (el) el.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        });
        setTimeout(() => animateSlots(step + 1), 80 + step * 12);
        return;
    }
    const reels = window._slotReels;
    [0, 1, 2].forEach(i => {
        const el = document.getElementById("slot-reel-" + i);
        if (el) el.textContent = reels[i];
    });
    const status = document.getElementById("slots-status");
    const c = ensureCasino();
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
        c.slotBuffMult = 2.8;
        c.slotBuffUntil = Date.now() + 60000;
        if (status) status.textContent = "✨ TRIPLE! Passive x2.8 for 60s!";
        showToast("🎰 TRIPLE MATCH! Passive income x2.8!", 3000);
        screenFlash("#7fff00"); sfxRare(3); shake();
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
        c.slotBuffMult = 1.5;
        c.slotBuffUntil = Date.now() + 45000;
        if (status) status.textContent = "😮 So close! Double match — x1.5 passive 45s";
        showToast("Near miss pays! Passive x1.5 for 45s", 2500);
    } else {
        if (status) status.textContent = "No match. The slots hunger.";
        showToast("💀 No match. Feed the machine again?", 2000);
    }
    saveGame();
    setTimeout(closeCasinoModal, 2400);
}

/* ---- WHEEL ---- */
const WHEEL_SEGMENTS = [
    { label: "500 💨", weight: 22, fn: () => { game.points += 500; } },
    { label: "5K 💨", weight: 18, fn: () => { game.points += 5000; } },
    { label: "50K 💨", weight: 14, fn: () => { game.points += 50000; } },
    { label: "Golden Fart x2", weight: 12, fn: () => { const c = ensureCasino(); c.goldenBuffMult = 2; c.goldenBuffUntil = Date.now() + 5 * 60 * 1000; } },
    { label: "Egg -15%", weight: 10, fn: () => { const c = ensureCasino(); c.eggDiscountPct = 0.15; c.eggDiscountUntil = Date.now() + 10 * 60 * 1000; } },
    { label: "1M 💨", weight: 9, fn: () => { game.points += 1e6; } },
    { label: "✦ 1 Aura", weight: 8, fn: () => { game.aura = (game.aura || 0) + 1; } },
    { label: "🌟 SECRET PET", weight: 0.1, fn: () => grantWheelSecretPet() }
];

function spinWheel() {
    if (!wheelReady()) { sfxError(); showToast("⏳ Wheel ready in " + wheelCountdown(), 2000); return; }
    const c = ensureCasino();
    c.lastWheelSpin = Date.now();
    c.wheelSpins++;
    c.totalGambles++;
    const totalW = WHEEL_SEGMENTS.reduce((s, x) => s + x.weight, 0);
    let roll = Math.random() * totalW;
    let picked = WHEEL_SEGMENTS[0];
    for (const seg of WHEEL_SEGMENTS) {
        roll -= seg.weight;
        if (roll <= 0) { picked = seg; break; }
    }
    const html = '<div class="wheel-wrap"><div class="wheel-spinner" id="wheel-spinner">🎡</div></div><p id="wheel-result" class="wheel-result">Spinning...</p>';
    openCasinoModal("wheel", "🎡 Lucky Wheel", html);
    const spinner = document.getElementById("wheel-spinner");
    if (spinner) spinner.style.animation = "wheelSpin 3.5s cubic-bezier(0.2,0.8,0.3,1) forwards";
    sfxWhoosh();
    setTimeout(() => {
        picked.fn();
        const res = document.getElementById("wheel-result");
        if (res) res.textContent = "🎉 You won: " + picked.label + "!";
        if (picked.weight <= 0.2) {
            rainbowFlash(); shake(); bigBanner("SECRET!!!", "#00ffd0"); sfxRare(5);
        } else {
            screenFlash("#ffd54a"); sfxBuy();
        }
        showToast("🎡 Wheel: " + picked.label, 2800);
        saveGame(); updateDisplay(); renderCasino();
        setTimeout(closeCasinoModal, 2800);
    }, 3600);
}

function grantWheelSecretPet() {
    const pets = allPetsForWorld(game.worldIdx).filter(p => RARITY[p.rarity].tier >= 5);
    const template = pets.length ? pets[Math.floor(Math.random() * pets.length)] : { name: "Wheel God", emoji: "🚽", rarity: "secret", base: 150 };
    const pet = {
        id: Date.now() + Math.floor(Math.random() * 99999),
        name: template.name,
        emoji: template.emoji || "✦",
        rarity: "secret",
        star: 0,
        power: petPower(template.base || 120, game.worldIdx) * 1.2
    };
    game.pets.push(pet);
    game.discovered[dexKey(game.worldIdx, pet.name)] = true;
}

/* ---- OHIO LOOT BOX ---- */
function openLootBox() {
    const cost = lootBoxCost();
    if (game.points < cost) { sfxError(); showToast("❌ Not enough Stink!", 1800); return; }
    game.points -= cost;
    const c = ensureCasino();
    c.totalGambles++;
    c.lootPity++;
    saveGame(); updateDisplay();
    const forceGod = c.lootPity >= 120 || Math.random() < 0.00001;
    const nearMiss = !forceGod && Math.random() < 0.35;
    const html = '<div class="loot-odds">📊 Displayed odds: 0.001% Skibidi God · 4.99% Epic · 25% Rare · 70% Cursed Trash</div>' +
        '<div class="loot-slots" id="loot-slots">' +
        '<div class="loot-slot">?</div><div class="loot-slot">?</div><div class="loot-slot">?</div></div>' +
        '<p class="loot-status" id="loot-status">Opening cursed box...</p>';
    openCasinoModal("loot", "📦 Only In Ohio Loot Box", html);
    setTimeout(() => revealLootBox(forceGod, nearMiss, cost), 600);
}

function revealLootBox(forceGod, nearMiss, cost) {
    const slots = document.querySelectorAll(".loot-slot");
    const status = document.getElementById("loot-status");
    const godIcon = "🚽";
    const trashIcon = "💩";
    let outcome;
    if (forceGod) {
        outcome = "god";
        ensureCasino().lootPity = 0;
    } else if (nearMiss) {
        outcome = "near";
    } else {
        const r = Math.random();
        if (r < 0.7) outcome = "trash";
        else if (r < 0.95) outcome = "rare";
        else if (r < 0.999) outcome = "epic";
        else outcome = "god";
    }
    const sequence = outcome === "god" ? [godIcon, godIcon, godIcon]
        : outcome === "near" ? [godIcon, godIcon, trashIcon]
        : outcome === "epic" ? ["💎", "💎", "💎"]
        : outcome === "rare" ? ["🌟", "🌟", "🐾"]
        : [trashIcon, "🌽", "💨"];
    if (outcome === "near" && Math.random() < 0.5) sequence.sort(() => Math.random() - 0.5);
    slots.forEach((s, i) => {
        setTimeout(() => {
            s.textContent = sequence[i];
            s.classList.add("revealed");
            sfxClick();
            if (i === 2) resolveLootOutcome(outcome, cost, status);
        }, i * 700);
    });
}

function resolveLootOutcome(outcome, cost, status) {
    const c = ensureCasino();
    if (outcome === "god") {
        const pet = { id: Date.now(), name: "Skibidi God", emoji: "🚽", rarity: "secret", star: 0, power: petPower(200, game.worldIdx) };
        game.pets.push(pet);
        game.discovered[dexKey(game.worldIdx, "Skibidi God")] = true;
        if (status) status.textContent = "✦ SKIBIDI GOD!!! ONLY IN OHIO!!!";
        rainbowFlash(); shake(); bigBanner("SKIBIDI GOD", "#00ffd0"); sfxRare(5);
        showToast("🚽 YOU GOT SKIBIDI GOD!!!", 4000);
    } else if (outcome === "epic") {
        c.secretShards += 2;
        if (status) status.textContent = "💎 Epic shards acquired!";
        showToast("💎 +2 secret shards!", 2500);
        screenFlash("#b14eff");
    } else if (outcome === "rare") {
        const bonus = Math.floor(cost * 0.35);
        game.points += bonus;
        if (status) status.textContent = "🌟 Rare roll: +" + fmt(bonus) + " Stink";
        showToast("🌟 Rare! +" + fmt(bonus), 2200);
    } else if (outcome === "near") {
        if (status) status.textContent = "🚽🚽 ...💩 ONLY IN OHIO MISSED IT BY ONE";
        showToast("😱 SO CLOSE TO SKIBIDI GOD!!! Pain.", 3200);
        screenFlash("#ff3d9a");
        game.points += Math.floor(cost * 0.05);
    } else {
        if (status) status.textContent = "💩 Cursed trash. Only in Ohio moment.";
        showToast("💩 Cursed box. +10% consolation.", 2000);
        game.points += Math.floor(cost * 0.1);
    }
    saveGame(); updateDisplay(); renderCasino();
    setTimeout(closeCasinoModal, 3200);
}
