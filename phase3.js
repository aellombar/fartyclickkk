/* ============================================================
   PHASE 3 — polish, depth, mobile layout, casino juice, endgame
   ============================================================ */

const BUILDING_MGR_CAP = 25;
let ambOrbCount = 0;

function ensurePhase3() {
    ensureFeatures();
    const f = game.features;
    if (!f.loadoutNames) f.loadoutNames = ["Team 1", "Team 2", "Team 3"];
    if (f.loginGraceUsed === undefined) f.loginGraceUsed = false;
    if (!f.cosmetics) f.cosmetics = { titleBorder: false, clickSkin: null };
    if (!f.stockCostBasis) f.stockCostBasis = {};
    if (!f.invasionWave) f.invasionWave = 0;
    if (!f.managerBuysSession) f.managerBuysSession = {};
    return f;
}

// ---------- LAYOUT: compact HUD marquee + safe zones ----------
function updateCompactHudLineP3() {
    const el = document.getElementById("hud-compact-line");
    if (!el || el.classList.contains("hidden")) return;
    const title = typeof brainrotTitle === "function" ? brainrotTitle() : "";
    const lvl = typeof brainrotLevel === "function" ? brainrotLevel() : 0;
    const line = fmt(game.points) + " 💨 · " + fmt(getClickPower() * getPetMult()) + "/clk · " +
        fmt(getPassive() * getPetMult()) + "/s · " + fmt(game.chips || 0) + " chips · " + title + " Lv" + lvl;
    const narrow = window.innerWidth < 380;
    if (narrow && line.length > 42) {
        el.classList.add("marquee-wrap");
        el.innerHTML = '<span class="hud-marquee">' + line + "</span>";
    } else {
        el.classList.remove("marquee-wrap");
        el.textContent = line;
    }
}

function layoutSafeZones() {
    const btn = document.getElementById("main-btn");
    const zone = document.querySelector(".clicker-zone");
    if (!btn || !zone) return;
    const br = btn.getBoundingClientRect();
    const pad = 44;
    const safe = {
        left: br.left - pad, top: br.top - pad,
        right: br.right + pad, bottom: br.bottom + pad
    };
    const showcase = document.getElementById("showcase-pet");
    if (showcase && !showcase.classList.contains("hidden")) {
        const sr = showcase.getBoundingClientRect();
        if (sr.right > safe.left && sr.left < br.left + 20) {
            showcase.style.top = Math.max(0, br.top - zone.getBoundingClientRect().top - sr.height - 8) + "px";
        }
    }
    const toilet = document.getElementById("toilet-secret");
    if (toilet && !toilet.classList.contains("hidden")) {
        const tr = toilet.getBoundingClientRect();
        const overlaps = !(tr.right < safe.left || tr.left > safe.right || tr.bottom < safe.top || tr.top > safe.bottom);
        if (overlaps && !game.features?.toiletPos) {
            toilet.style.top = "0";
            toilet.style.right = "0";
            toilet.style.left = "auto";
            toilet.style.bottom = "auto";
        }
    }
}

function insetDocs() {
    const el = document.getElementById("inset-docs");
    if (!el) return;
    const root = document.documentElement;
    const safari = root.classList.contains("ios-safari");
    const pwa = root.classList.contains("ios-pwa");
    el.textContent = (safari ? "iOS Safari: +28px chrome inset" : pwa ? "iOS PWA: safe-area only" : "Desktop/PWA: env(safe-area)");
}

// ---------- PITY BIAS (soft, not guaranteed) ----------
function applyPityBias(egg) {
    const f = ensureFeatures();
    const pity = f.pityHatches || 0;
    if (pity < 40) return null;
    const pets = scaleEggPets(egg);
    const legendPlus = pets.filter(p => (RARITY[p.rarity] || RARITY.common).tier >= 4);
    if (!legendPlus.length) return null;
    const boost = Math.min(0.35, (pity - 40) * 0.008);
    if (Math.random() < boost) {
        const w = legendPlus.reduce((s, p) => s + p.odds, 0);
        let roll = Math.random() * w;
        for (const p of legendPlus) { roll -= p.odds; if (roll <= 0) return p; }
        return legendPlus[legendPlus.length - 1];
    }
    return null;
}

// ---------- INDEX FILTERS ----------
let indexFilterRarity = "all";
let indexFilterMissing = false;

function setIndexFilterRarity(r) { indexFilterRarity = r; renderIndex(); }
function setIndexFilterMissing(v) { indexFilterMissing = !!v; renderIndex(); }

function indexFilterBar() {
    const tiers = ["all", "common", "uncommon", "rare", "epic", "legendary", "secret"];
    let html = '<div class="index-filter-row">';
    tiers.forEach(t => {
        html += '<button class="sort-btn' + (indexFilterRarity === t ? " active" : "") + '" onclick="setIndexFilterRarity(\'' + t + '\')">' + t + '</button>';
    });
    html += '<button class="sort-btn' + (indexFilterMissing ? " active" : "") + '" onclick="setIndexFilterMissing(!' + indexFilterMissing + ')">Missing only</button>';
    html += "</div>";
    return html;
}

function indexPassesFilter(p) {
    if (indexFilterMissing && game.discovered[dexKey(indexWorld, p.name)]) return false;
    if (indexFilterRarity === "all") return true;
    return p.rarity === indexFilterRarity;
}

// ---------- LOADOUTS ENHANCED ----------
function renameLoadout(idx, name) {
    const f = ensurePhase3();
    f.loadoutNames[idx] = (name || "").trim().slice(0, 16) || ("Team " + (idx + 1));
    saveGame();
    renderLoadoutsTab();
}

function loadoutPetEmojis(ids) {
    if (!ids || !ids.length) return "—";
    return ids.map(id => {
        const p = game.pets.find(x => x.id === id);
        return p ? (p.emoji || "🐾") : "❓";
    }).join(" ");
}

function petInLoadout(petId) {
    const f = ensureFeatures();
    return (f.loadouts || []).some((lo, i) => lo.ids && lo.ids.indexOf(petId) >= 0);
}

function fuseLoadoutWarning(ids) {
    const names = [];
    ids.forEach(id => {
        (ensureFeatures().loadouts || []).forEach((lo, i) => {
            if (lo.ids && lo.ids.indexOf(id) >= 0) names.push((ensurePhase3().loadoutNames[i]) || ("Team " + (i + 1)));
        });
    });
    return names.length ? "⚠️ In loadout: " + [...new Set(names)].join(", ") : "";
}

// ---------- SHOWCASE TAP ----------
function onShowcaseTap() {
    const f = ensureFeatures();
    if (!f.showcasePetId) return;
    openPetModal(f.showcasePetId);
}

// ---------- COMBO BAR WORLD COLORS ----------
function updateComboBarTheme() {
    const bar = document.getElementById("combo-bar");
    if (!bar || isPerformanceMode()) return;
    const colors = typeof getWorldColors === "function" ? getWorldColors() : ["#7FFF00", "#B14EFF", "#00E0FF"];
    bar.style.background = "linear-gradient(90deg," + colors.join(",") + ")";
}

// ---------- AMB ORB CAP (lite mode) ----------
function trackAmbOrbSpawn() {
    ambOrbCount++;
    const pm = typeof particleMode === "function" ? particleMode() : "full";
    const cap = pm === "lite" ? 3 : 12;
    if (ambOrbCount > cap) return false;
    return true;
}
function ambOrbRemoved() { ambOrbCount = Math.max(0, ambOrbCount - 1); }

// ---------- QR DRAW (canvas pattern, no external lib) ----------
function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function drawQrPattern(ctx, text, x, y, size) {
    const n = 25;
    const cell = size / n;
    const seed = hashStr(text);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#000";
    function finder(fx, fy) {
        ctx.fillRect(x + fx * cell, y + fy * cell, cell * 7, cell);
        ctx.fillRect(x + fx * cell, y + fy * cell, cell, cell * 7);
        ctx.fillRect(x + (fx + 6) * cell, y + fy * cell, cell, cell * 7);
        ctx.fillRect(x + fx * cell, y + (fy + 6) * cell, cell * 7, cell);
        ctx.fillStyle = "#fff";
        ctx.fillRect(x + (fx + 1) * cell, y + (fy + 1) * cell, cell * 5, cell * 5);
        ctx.fillStyle = "#000";
        ctx.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, cell * 3, cell * 3);
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if ((r < 8 && c < 8) || (r < 8 && c > n - 9) || (r > n - 9 && c < 8)) continue;
            if (((seed + r * 17 + c * 31) % 100) < 48) {
                ctx.fillRect(x + c * cell, y + r * cell, cell - 0.5, cell - 0.5);
            }
        }
    }
}

function exportPhotoCardWithQr() {
    if (!window._lastHatchPhoto) { showToast("Hatch something first!", 2000); return; }
    const p = window._lastHatchPhoto;
    const payload = "fartclicker://pet/" + (p.id || hashStr(p.name));
    const canvas = document.createElement("canvas");
    canvas.width = 400; canvas.height = 320;
    const ctx = canvas.getContext("2d");
    const w = WORLDS[game.worldIdx] || WORLDS[0];
    const g = ctx.createLinearGradient(0, 0, 400, 320);
    g.addColorStop(0, (w.theme && w.theme.p) || "#1a0a38");
    g.addColorStop(1, (w.theme && w.theme.s) || "#2a1048");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 400, 320);
    ctx.strokeStyle = p.color || "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 384, 304);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    const title = typeof brainrotTitle === "function" ? brainrotTitle() : "";
    const asc = (game.meta && game.meta.ascension) || game.ascension || 0;
    ctx.fillText("Fart Clicker · " + (w.name || "Ohio"), 20, 30);
    ctx.fillStyle = "#9b8fc7";
    ctx.font = "12px sans-serif";
    ctx.fillText(title + " · ☄" + asc, 20, 48);
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = p.color || "#fff";
    ctx.fillText(p.emoji || "🐾", 200, 120);
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(p.name, 200, 165);
    ctx.fillStyle = p.color;
    ctx.font = "14px sans-serif";
    ctx.fillText(p.rarity, 200, 190);
    drawQrPattern(ctx, payload, 300, 220, 80);
    ctx.fillStyle = "#888";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(payload.slice(0, 28), 200, 310);
    const a = document.createElement("a");
    a.download = "fart-hatch.webp";
    canvas.toBlob(blob => {
        if (!blob) { a.download = "fart-hatch.png"; a.href = canvas.toDataURL("image/png"); a.click(); return; }
        a.href = URL.createObjectURL(blob);
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, "image/webp", 0.92);
    showToast("📸 Share card saved (WebP)!", 2000);
}

// ---------- PHOTO MODE ----------
function togglePhotoMode() {
    game.settings.photoMode = !game.settings.photoMode;
    document.documentElement.classList.toggle("photo-mode", !!game.settings.photoMode);
    const hud = document.querySelector(".stats-panel");
    const nav = document.querySelector(".bottom-nav");
    const footer = document.querySelector(".game-footer");
    if (hud) hud.style.opacity = game.settings.photoMode ? "0" : "";
    if (nav) nav.style.opacity = game.settings.photoMode ? "0.15" : "";
    if (footer) footer.style.opacity = game.settings.photoMode ? "0" : "";
    if (game.settings.photoMode) showToast("📷 Photo mode — tap again to export", 2200);
    else showToast("📷 Photo mode off", 1500);
    saveGame();
}

// ---------- INVASION RANK ----------
function invasionRankTitle() {
    const f = ensureFeatures();
    const scores = f.invasionLb || [];
    if (!scores.length) return null;
    const best = Math.max.apply(null, scores.map(s => s.score));
    if (best > 50000000) return "🛡️ Server General";
    if (best > 10000000) return "⚔️ Wave Captain";
    if (best > 1000000) return "🎖️ Skibidi Defender";
    return "🪖 Recruit";
}

// ---------- MEME WEEK VISUALS (egg foil only — main icon stays the fart) ----------
function applyMemeWeekVisuals() {
    document.documentElement.style.setProperty("--meme-egg-foil", "linear-gradient(135deg,#ffd54a33,#ff3d9a33)");
}

// ---------- NAV HEIGHT SYNC (keeps rebirth/footer above the real nav) ----------
function syncNavHeight() {
    const nav = document.querySelector(".bottom-nav");
    if (!nav) return;
    const h = Math.ceil(nav.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty("--nav-h", h + "px");
}

// ---------- BUILDING MANAGER CAP ----------
function managerBuyAllowed(bid, owned) {
    const f = ensurePhase3();
    const session = f.managerBuysSession[bid] || 0;
    if (owned >= BUILDING_MGR_CAP) return false;
    if (session >= 5) return false;
    return true;
}

function recordManagerBuy(bid) {
    const f = ensurePhase3();
    f.managerBuysSession[bid] = (f.managerBuysSession[bid] || 0) + 1;
}

// ---------- STOCK P/L ----------
function stockPortfolioPl() {
    const m = ensureMeta();
    let value = 0, cost = 0;
    const basis = ensurePhase3().stockCostBasis || {};
    STOCK_TICKERS.forEach(t => {
        const h = m.stocks.holdings[t] || 0;
        value += h * (m.stocks.prices[t] || 0);
        cost += h * (basis[t] || m.stocks.prices[t] || 0);
    });
    return { value, cost, pl: value - cost };
}

function recordStockBuy(ticker, amt, price) {
    const b = ensurePhase3().stockCostBasis;
    const prev = b[ticker] || price;
    const held = (ensureMeta().stocks.holdings[ticker] || 0) - amt;
    b[ticker] = held > 0 ? ((prev * held) + price * amt) / (held + amt) : price;
}

// ---------- GARDEN CROSSBREED ----------
const CROSSBREED_MAP = {
    "fart+golden": "golden", "golden+fart": "golden",
    "fart+cursed": "cursed", "cursed+fart": "cursed",
    "golden+cursed": "spore", "cursed+golden": "spore"
};

function gardenNeighbors(idx) {
    const cols = 4;
    const n = [];
    const r = Math.floor(idx / cols), c = idx % cols;
    if (c > 0) n.push(idx - 1);
    if (c < cols - 1) n.push(idx + 1);
    if (r > 0) n.push(idx - cols);
    if (r < 2) n.push(idx + cols);
    return n;
}

function tryGardenCrossbreed(idx) {
    const plots = ensureMeta().garden.plots;
    const plot = plots[idx];
    if (!plot || !plot.seed) return;
    gardenNeighbors(idx).forEach(ni => {
        const other = plots[ni];
        if (!other || !other.seed || other.seed === plot.seed) return;
        const key = plot.seed + "+" + other.seed;
        const result = CROSSBREED_MAP[key];
        if (result && Math.random() < 0.12) {
            plot.seed = result;
            plot.plantedAt = Date.now();
            const seed = GARDEN_SEEDS.find(s => s.id === result);
            plot.readyAt = Date.now() + ((seed && seed.growMs) || 120000);
            showToast("🧬 Crossbreed: " + (seed ? seed.name : result) + "!", 2800);
            if (typeof pushNotifyStub === "function") pushNotifyStub("Crossbreed sprouted!");
        }
    });
}

function pushNotifyStub(msg) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        try { new Notification("Fart Clicker", { body: msg, silent: true }); } catch (e) {}
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

// ---------- SEASON PASS COSMETICS ----------
function grantSeasonCosmetic(tier) {
    const f = ensurePhase3();
    if (tier % 10 === 0) f.cosmetics.titleBorder = true;
    if (tier % 7 === 0) f.cosmetics.clickSkin = "meme";
    saveGame();
}

// ---------- DAILY LOGIN GRACE ----------
function checkDailyLoginGrace() {
    const f = ensureFeatures();
    const today = new Date().toDateString();
    if (f.lastLoginDay === today) return;
    const twoDays = new Date(Date.now() - 2 * 86400000).toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (f.lastLoginDay === twoDays && !f.loginGraceUsed) {
        f.loginGraceUsed = true;
        f.loginStreak = Math.max(1, f.loginStreak || 1);
        f.lastLoginDay = yesterday;
        showToast("💚 Streak grace used (1/week)", 2500);
    }
}

// ---------- HIGH ROLLER ODDS TABLE ----------
function highRollerOddsHtml() {
    if (!ensureCasino().highRoller) return "";
    const normal = CRATE_TABLE.reduce((s, x) => s + x.weight, 0);
    const boosted = CRATE_TABLE.map((it, i) => i >= 2 ? it.weight * (i >= 4 ? 2.5 : 1.6) : it.weight).reduce((s, w) => s + w, 0);
    let html = '<div class="hr-odds-table"><h4>🎩 VIP odds vs normal</h4>';
    CRATE_TABLE.forEach((it, i) => {
        const nPct = (it.weight / normal * 100).toFixed(2);
        const w = i >= 2 ? it.weight * (i >= 4 ? 2.5 : 1.6) : it.weight;
        const vPct = (w / boosted * 100).toFixed(2);
        html += '<div class="hr-odds-row"><span>' + it.label + '</span><span>' + nPct + '% → <b>' + vPct + '%</b></span></div>';
    });
    html += '<p class="meta-hint">✦ 5% Aura tax on entry while High-Roller is ON</p></div>';
    return html;
}

// ---------- MUSIC CROSSFADE ----------
function crossfadeWorldMusic() {
    if (!masterGain || !audioCtx) { if (typeof restartWorldMusic === "function") restartWorldMusic(); return; }
    const g = masterGain.gain;
    const t = audioCtx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.05, t + 0.35);
    setTimeout(() => {
        if (typeof restartWorldMusic === "function") restartWorldMusic();
        if (masterGain && audioCtx) {
            const t2 = audioCtx.currentTime;
            masterGain.gain.setValueAtTime(0.05, t2);
            masterGain.gain.linearRampToValueAtTime(0.72, t2 + 0.5);
        }
    }, 380);
}

// ---------- INIT ----------
function initPhase3() {
    ensurePhase3();
    if (game.settings.crateSkipAnim === undefined) game.settings.crateSkipAnim = false;
    if (game.settings.hatchSfxMute === undefined) game.settings.hatchSfxMute = false;
    if (game.settings.disableAutoPerf === undefined) game.settings.disableAutoPerf = false;
    if (game.settings.photoMode === undefined) game.settings.photoMode = false;
    applyMemeWeekVisuals();
    updateComboBarTheme();
    syncNavHeight();
    layoutSafeZones();
    insetDocs();
    window.addEventListener("resize", () => { syncNavHeight(); layoutSafeZones(); updateCompactHudLineP3(); });
    window.addEventListener("orientationchange", () => setTimeout(syncNavHeight, 200));
    setTimeout(syncNavHeight, 300);
    setTimeout(syncNavHeight, 1200);
    setInterval(() => { syncNavHeight(); layoutSafeZones(); }, 3000);
}
