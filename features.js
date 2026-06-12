/* ============================================================
   FEATURES BACKLOG — HUD, casino extras, pets, meta, retention
   ============================================================ */

function freshFeaturesState() {
    return {
        loginStreak: 0, lastLoginDay: "", loginClaimed: false,
        pityHatches: 0, pityLegendaryAt: 45,
        petNicknames: {},
        loadouts: [{ ids: [] }, { ids: [] }, { ids: [] }],
        activeLoadout: 0,
        showcasePetId: null,
        buildingManagers: {},
        seasonPass: { xp: 0, tier: 0, claimed: [] },
        invasionLb: [],
        toiletPos: null
    };
}

function ensureFeatures() {
    if (!game.features) game.features = freshFeaturesState();
    const f = game.features;
    if (!f.loadouts) f.loadouts = [{ ids: [] }, { ids: [] }, { ids: [] }];
    if (!f.buildingManagers) f.buildingManagers = {};
    if (!f.petNicknames) f.petNicknames = {};
    if (!f.seasonPass) f.seasonPass = { xp: 0, tier: 0, claimed: [] };
    if (!f.invasionLb) f.invasionLb = [];
    return f;
}

// ---------- HAPTICS ----------
function hapticTap(kind) {
    if (!game.settings.haptics) return;
    try {
        if (navigator.vibrate) {
            if (kind === "hatch") navigator.vibrate([12, 40, 18]);
            else if (kind === "rare") navigator.vibrate([20, 30, 40, 30, 60]);
            else navigator.vibrate(8);
        }
    } catch (e) {}
}

// ---------- iOS SAFARI / PWA INSETS ----------
function detectBrowserInsets() {
    const ua = navigator.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    const safari = ios && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
    document.documentElement.classList.toggle("ios-safari", safari && !standalone);
    document.documentElement.classList.toggle("ios-pwa", ios && !!standalone);
    if (safari && !standalone) {
        document.documentElement.style.setProperty("--safari-chrome", "28px");
    } else {
        document.documentElement.style.setProperty("--safari-chrome", "0px");
    }
}

// ---------- COMPACT HUD ----------
function toggleCompactHud(btn) {
    game.settings.compactHud = !game.settings.compactHud;
    applyCompactHud();
    if (btn) {
        const pill = btn.querySelector(".toggle-pill");
        if (pill) pill.textContent = game.settings.compactHud ? "ON" : "OFF";
        btn.classList.toggle("off", !game.settings.compactHud);
    }
    saveGame();
}

function applyCompactHud() {
    const panel = document.querySelector(".stats-panel");
    if (panel) panel.classList.toggle("compact-hud", !!game.settings.compactHud);
    const compact = document.getElementById("hud-compact-line");
    if (compact) compact.classList.toggle("hidden", !game.settings.compactHud);
}

function updateCompactHudLine() {
    const el = document.getElementById("hud-compact-line");
    if (!el) return;
    const title = typeof brainrotTitle === "function" ? brainrotTitle() : "";
    const lvl = typeof brainrotLevel === "function" ? brainrotLevel() : 0;
    el.textContent = fmt(game.points) + " 💨 · " + fmt(getClickPower() * getPetMult()) + "/clk · " +
        fmt(getPassive() * getPetMult()) + "/s · " + fmt(game.chips || 0) + " chips · " + title + " Lv" + lvl;
}

// ---------- REBIRTH PILL ----------
function toggleRebirthExpand() {
    const btn = document.getElementById("rebirth-btn");
    if (!btn) return;
    btn.classList.toggle("expanded");
    game.settings.rebirthExpanded = btn.classList.contains("expanded");
    document.documentElement.style.setProperty("--footer-h", btn.classList.contains("expanded") ? "64px" : "52px");
    saveGame();
}

function applyRebirthPill() {
    const btn = document.getElementById("rebirth-btn");
    if (!btn) return;
    if (game.settings.rebirthExpanded) btn.classList.add("expanded");
    else btn.classList.remove("expanded");
    document.documentElement.style.setProperty("--footer-h", btn.classList.contains("expanded") ? "64px" : "52px");
}

// ---------- UI SCALE / LITE PARTICLES / FPS ----------
function setUiScale(v) {
    game.settings.uiScale = (parseInt(v, 10) || 100) / 100;
    document.documentElement.style.setProperty("--ui-scale", game.settings.uiScale);
    const el = document.getElementById("ui-scale-val");
    if (el) el.textContent = Math.round(game.settings.uiScale * 100) + "%";
    saveGame();
}

function applyUiScale() {
    const s = game.settings.uiScale || 1;
    document.documentElement.style.setProperty("--ui-scale", s);
}

function particleMode() {
    if (!game.settings.particles) return "off";
    if (game.settings.particlesLite) return "lite";
    return "full";
}

let fpsFrames = 0, fpsLast = performance.now(), fpsLowSince = 0;
function startFpsMonitor() {
    if (window._fpsMon) return;
    window._fpsMon = true;
    function tick(now) {
        fpsFrames++;
        if (now - fpsLast >= 1000) {
            const fps = fpsFrames;
            fpsFrames = 0;
            fpsLast = now;
            if (fps < 30) {
                if (!fpsLowSince) fpsLowSince = now;
                if (now - fpsLowSince > 5000 && !game.settings.performanceMode && !game.settings.disableAutoPerf) {
                    game.settings.performanceMode = true;
                    game.settings.particlesLite = true;
                    if (typeof applyPerformanceProfile === "function") applyPerformanceProfile();
                    showToast("⚡ Auto performance mode (low FPS)", 2800);
                    saveGame();
                }
            } else fpsLowSince = 0;
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ---------- DRAGGABLE TOILET ----------
function toggleLiteParticles(btn) {
    game.settings.particlesLite = !game.settings.particlesLite;
    if (!game.settings.particles) game.settings.particles = true;
    if (btn) {
        const pill = btn.querySelector(".toggle-pill");
        if (pill) pill.textContent = game.settings.particlesLite ? "ON" : "OFF";
        btn.classList.toggle("off", !game.settings.particlesLite);
    }
    if (typeof applyPerformanceProfile === "function") applyPerformanceProfile();
    saveGame();
}

function handleRebirthTap(e) {
    if (e) e.stopPropagation();
    rebirth();
}

function initDraggableToilet() {
    const toilet = document.getElementById("toilet-secret");
    const zone = document.querySelector(".clicker-zone");
    if (!toilet || !zone || toilet.dataset.dragBound) return;
    toilet.dataset.dragBound = "1";
    const f = ensureFeatures();
    if (f.toiletPos) {
        toilet.style.left = f.toiletPos.x + "%";
        toilet.style.top = f.toiletPos.y + "%";
        toilet.style.right = "auto";
        toilet.style.bottom = "auto";
    }
    let drag = false, moved = false, ox = 0, oy = 0;
    function pt(e) {
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX, y: t.clientY };
    }
    function onStart(e) {
        e.stopPropagation();
        e.preventDefault();
        drag = true;
        moved = false;
        const p = pt(e);
        const r = toilet.getBoundingClientRect();
        ox = p.x - r.left; oy = p.y - r.top;
    }
    function onMove(e) {
        if (!drag) return;
        moved = true;
        e.stopPropagation();
        e.preventDefault();
        const p = pt(e);
        const zr = zone.getBoundingClientRect();
        let x = p.x - zr.left - ox;
        let y = p.y - zr.top - oy;
        x = Math.max(0, Math.min(zr.width - 36, x));
        y = Math.max(0, Math.min(zr.height - 36, y));
        toilet.style.left = (x / zr.width * 100) + "%";
        toilet.style.top = (y / zr.height * 100) + "%";
        toilet.style.right = "auto";
        toilet.style.bottom = "auto";
    }
    function onEnd() {
        if (!drag) return;
        drag = false;
        const zr = zone.getBoundingClientRect();
        const tr = toilet.getBoundingClientRect();
        f.toiletPos = {
            x: ((tr.left - zr.left) / zr.width) * 100,
            y: ((tr.top - zr.top) / zr.height) * 100
        };
        saveGame();
    }
    toilet.addEventListener("pointerdown", onStart);
    toilet.addEventListener("pointermove", onMove);
    toilet.addEventListener("pointerup", onEnd);
    toilet.addEventListener("pointercancel", onEnd);
    toilet.addEventListener("click", (e) => {
        if (moved) { e.stopPropagation(); e.preventDefault(); return; }
        e.stopPropagation();
        if (typeof onToiletClick === "function") onToiletClick();
        showToast("Skibidi...", 1200);
    });
}

// ---------- DAILY LOGIN ----------
function checkDailyLogin() {
    const f = ensureFeatures();
    if (typeof checkDailyLoginGrace === "function") checkDailyLoginGrace();
    const today = new Date().toDateString();
    if (f.lastLoginDay === today) return;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (f.lastLoginDay === yesterday) f.loginStreak = (f.loginStreak || 0) + 1;
    else if (f.lastLoginDay && f.lastLoginDay !== yesterday) f.loginStreak = 1;
    else f.loginStreak = 1;
    f.lastLoginDay = today;
    f.loginClaimed = false;
    showDailyLoginModal();
    saveGame();
}

function showDailyLoginModal() {
    const m = document.getElementById("daily-login-modal");
    if (m) {
        renderDailyLoginCalendar();
        m.classList.remove("hidden");
    }
}

function renderDailyLoginCalendar() {
    const el = document.getElementById("daily-login-body");
    if (!el) return;
    const f = ensureFeatures();
    const streak = f.loginStreak || 1;
    let html = '<p class="meta-hint">Day ' + streak + ' streak 🔥</p><div class="login-cal">';
    for (let d = 1; d <= 7; d++) {
        const done = d < streak;
        const cur = d === streak;
        html += '<div class="login-day ' + (done ? "done" : "") + (cur ? " today" : "") + '">D' + d +
            '<span>' + (d === 7 ? "50 chips" : (d * 3) + " chips") + '</span></div>';
    }
    html += '</div>';
    if (!f.loginClaimed) html += '<button class="meta-btn" onclick="claimDailyLogin()">Claim today\'s reward</button>';
    else html += '<p class="meta-ok">✅ Claimed today!</p>';
    el.innerHTML = html;
}

function claimDailyLogin() {
    const f = ensureFeatures();
    if (f.loginClaimed) return;
    f.loginClaimed = true;
    const day = Math.min(7, f.loginStreak || 1);
    const chips = day === 7 ? 50 : day * 3;
    grantChips(chips, "daily login");
    if (day === 7) {
        game.points += getClickPower() * getPetMult() * 200;
        if (typeof ensurePhase3 === "function") ensurePhase3().cosmetics.titleBorder = true;
        showToast("👑 Day 7: Exclusive title border unlocked!", 3000);
    }
    renderDailyLoginCalendar();
    saveGame();
    showToast("🎁 Day " + day + " reward!", 2500);
}

// ---------- PITY METER ----------
function bumpPity(rarity) {
    const f = ensureFeatures();
    const tier = (RARITY[rarity] || RARITY.common).tier;
    if (tier >= 4) { f.pityHatches = 0; return; }
    f.pityHatches = (f.pityHatches || 0) + 1;
}

function getPityProgress() {
    const f = ensureFeatures();
    const need = f.pityLegendaryAt || 45;
    return { current: f.pityHatches || 0, need, pct: Math.min(100, ((f.pityHatches || 0) / need) * 100) };
}

function renderPityMeter() {
    const el = document.getElementById("pity-meter");
    if (!el) return;
    const p = getPityProgress();
    el.innerHTML = '<div class="pity-label">🍀 Legendary pity · ' + p.current + '/' + p.need + '</div>' +
        '<div class="pity-bar"><div class="pity-fill" style="width:' + p.pct + '%"></div></div>';
}

// ---------- PET NICKNAME / LOADOUTS / SHOWCASE ----------
function petDisplayName(pet) {
    const f = ensureFeatures();
    return (f.petNicknames && f.petNicknames[pet.id]) || pet.name;
}

function setPetNickname(petId, name) {
    ensureFeatures().petNicknames[petId] = (name || "").trim().slice(0, 20);
    saveGame();
}

function saveLoadout(idx) {
    const f = ensureFeatures();
    f.loadouts[idx] = { ids: (game.equippedPets || []).map(p => p.id) };
    f.activeLoadout = idx;
    saveGame();
    showToast("💾 Loadout " + (idx + 1) + " saved!", 2000);
}

function applyLoadout(idx) {
    const f = ensureFeatures();
    const lo = f.loadouts[idx];
    if (!lo || !lo.ids) return;
    game.equippedPets = lo.ids.map(id => game.pets.find(p => p.id === id)).filter(Boolean);
    f.activeLoadout = idx;
    updateDisplay();
    renderPets();
    saveGame();
    showToast("✅ Loadout " + (idx + 1) + " equipped!", 2000);
}

function setShowcasePet(petId) {
    ensureFeatures().showcasePetId = petId;
    renderShowcasePet();
    saveGame();
}

function renderShowcasePet() {
    const el = document.getElementById("showcase-pet");
    if (!el) return;
    const f = ensureFeatures();
    const pet = game.pets.find(p => p.id === f.showcasePetId);
    if (!pet) { el.innerHTML = ""; el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    const r = RARITY[pet.rarity] || RARITY.common;
    el.innerHTML = '<span class="showcase-emoji">' + (pet.emoji || "🐾") + '</span>' +
        '<span class="showcase-name" style="color:' + r.color + '">' + petDisplayName(pet) + '</span>';
    el.onclick = typeof onShowcaseTap === "function" ? onShowcaseTap : null;
}

function renderPetExtrasInModal(pet) {
    const box = document.getElementById("pet-nickname-row");
    if (!box || !pet) return;
    const nick = (ensureFeatures().petNicknames[pet.id] || "");
    box.innerHTML = '<label>Nickname</label><input class="pet-nick-input" id="pet-nick-input" value="' + nick.replace(/"/g, "&quot;") + '" placeholder="Custom name" onchange="setPetNickname(' + pet.id + ', this.value)">' +
        '<button class="meta-btn small" onclick="setShowcasePet(' + pet.id + ')">⭐ Showcase</button>';
}

function renderLoadoutsTab() {
    const el = document.getElementById("pets-body");
    if (!el) return;
    const f = ensureFeatures();
    if (typeof ensurePhase3 === "function") ensurePhase3();
    const names = f.loadoutNames || ["Team 1", "Team 2", "Team 3"];
    let html = '<p class="meta-hint">Save up to 3 equip teams.</p><div class="loadout-row">';
    for (let i = 0; i < 3; i++) {
        const active = f.activeLoadout === i;
        const lo = f.loadouts[i] || { ids: [] };
        const emojis = typeof loadoutPetEmojis === "function" ? loadoutPetEmojis(lo.ids) : "";
        const nm = names[i] || ("Team " + (i + 1));
        html += '<div class="loadout-card ' + (active ? "active" : "") + '">' +
            '<input class="pet-nick-input" value="' + nm.replace(/"/g, "&quot;") + '" onchange="renameLoadout(' + i + ', this.value)">' +
            '<div class="loadout-emojis">' + emojis + '</div>' +
            '<button onclick="applyLoadout(' + i + ')">Equip</button>' +
            '<button onclick="saveLoadout(' + i + ')">Save</button></div>';
    }
    html += '</div>';
    el.innerHTML = html;
}

// ---------- BUILDING MANAGERS ----------
function toggleBuildingManager(id) {
    const f = ensureFeatures();
    f.buildingManagers[id] = !f.buildingManagers[id];
    saveGame();
    if (typeof renderBuildingsTab === "function") renderBuildingsTab();
}

function tickBuildingManagers() {
    if (typeof BUILDINGS === "undefined") return;
    const f = ensureFeatures();
    if (typeof ensurePhase3 === "function") ensurePhase3().managerBuysSession = {};
    const m = ensureMeta();
    BUILDINGS.forEach(b => {
        if (!f.buildingManagers[b.id]) return;
        if (peakWorld() < b.reqWorld) return;
        const owned = m.buildings[b.id] || 0;
        if (typeof managerBuyAllowed === "function" && !managerBuyAllowed(b.id, owned)) return;
        const cost = typeof buildingCost === "function" ? buildingCost(b, owned) : Infinity;
        if (game.points >= cost) {
            buyBuilding(b.id, 1);
            if (typeof recordManagerBuy === "function") recordManagerBuy(b.id);
        }
    });
}

// ---------- ASCENSION REROLL ----------
function rerollAscensionMutator() {
    const tokens = ensureMeta().quests.tokens || 0;
    if (tokens < 5) { showToast("Need 5 quest tokens!", 2200); return; }
    ensureMeta().quests.tokens = tokens - 5;
    if (typeof renderAscension === "function") renderAscension();
    showToast("🎲 Pick a new mutator on ascend!", 2500);
    ensureMeta().pendingReroll = true;
    saveGame();
}

// ---------- HUB BADGE ----------
function hubAchievementPct() {
    if (typeof ACHIEVEMENTS === "undefined" || !ACHIEVEMENTS.length) return 0;
    const m = ensureMeta();
    const n = Object.keys(m.achievements || {}).length;
    return Math.round((n / ACHIEVEMENTS.length) * 100);
}

function updateHubNavBadge() {
    const btn = document.querySelector('.nav-btn[data-sheet="hub"] .nav-txt');
    if (!btn) return;
    const pct = hubAchievementPct();
    btn.textContent = pct > 0 ? "Hub " + pct + "%" : "Hub";
}

// ---------- INVASION LEADERBOARD ----------
function recordInvasionScore(score) {
    const f = ensureFeatures();
    f.invasionLb = (f.invasionLb || []).concat([{ score, at: Date.now() }]).slice(-20);
    saveGame();
}

function renderInvasionLeaderboard() {
    const el = document.getElementById("hub-invasion");
    if (!el) return;
    const inv = ensureMeta().invasion;
    let base = '<p class="meta-hint">Random Skibidi waves attack. Click main button during invasion!</p>';
    if (inv && inv.ends > Date.now()) {
        const pct = Math.max(0, (inv.hp / inv.max) * 100);
        base = '<div class="inv-bar"><div class="inv-fill" style="width:' + pct + '%"></div></div>' +
            '<p>🚨 HP: ' + fmt(inv.hp) + ' — KEEP CLICKING!</p>';
    }
    const f = ensureFeatures();
    let html = base + '<div class="inv-lb"><h4>🏆 Server Heroes (fake)</h4>';
    const fake = ["xXSkibidiKingXx", "OhioFinalBoss", "RizzlerPrime", "You"];
    const scores = (f.invasionLb || []).slice(-5).reverse();
    if (!scores.length) html += '<p class="meta-hint">Repel invasions to rank up!</p>';
    scores.forEach((s, i) => {
        html += '<div class="inv-lb-row"><span>' + fake[i % fake.length] + '</span><b>' + fmt(s.score) + '</b></div>';
    });
    html += '</div>';
    el.innerHTML = html;
}

// ---------- SEASON PASS STUB ----------
function addSeasonXp(n) {
    const sp = ensureFeatures().seasonPass;
    sp.xp = (sp.xp || 0) + n;
    while (sp.xp >= 100 && sp.tier < 30) { sp.xp -= 100; sp.tier++; }
    saveGame();
}

function renderSeasonPass() {
    const el = document.getElementById("hub-season");
    if (!el) return;
    const sp = ensureFeatures().seasonPass;
    let html = '<div class="season-hero">🎫 Brainrot Pass · Tier <b>' + (sp.tier || 0) + '</b>/30</div>' +
        '<div class="pity-bar"><div class="pity-fill" style="width:' + (sp.xp || 0) + '%"></div></div>' +
        '<p class="meta-hint">Earn XP from quests & clicks. Free track rewards.</p>';
    for (let t = 1; t <= Math.min(30, (sp.tier || 0) + 3); t++) {
        const claimed = (sp.claimed || []).indexOf(t) >= 0;
        const ok = (sp.tier || 0) >= t;
        html += '<div class="season-tier ' + (claimed ? "claimed" : "") + '">T' + t + ': ' +
            (t % 5 === 0 ? "10 chips" : "5 chips") +
            (ok && !claimed ? ' <button onclick="claimSeasonTier(' + t + ')">Claim</button>' : (claimed ? " ✓" : "")) + '</div>';
    }
    el.innerHTML = html;
}

function claimSeasonTier(t) {
    const sp = ensureFeatures().seasonPass;
    if ((sp.tier || 0) < t || (sp.claimed || []).indexOf(t) >= 0) return;
    sp.claimed = sp.claimed || [];
    sp.claimed.push(t);
    grantChips(t % 5 === 0 ? 10 : 5, "season pass");
    if (typeof grantSeasonCosmetic === "function") grantSeasonCosmetic(t);
    renderSeasonPass();
    saveGame();
}

// ---------- GARDEN CROSSBREED CHART ----------
function renderGardenChart() {
    const el = document.getElementById("garden-chart");
    if (!el) return;
    el.innerHTML = '<div class="cross-chart"><h4>🧬 Crossbreed chart</h4>' +
        '<div class="cross-row">🌱 + 🌟 → Golden Bean</div>' +
        '<div class="cross-row">🌱 + 🌽 → Cursed Corn</div>' +
        '<div class="cross-row">🌟 + 🌽 → Secret Spore</div>' +
        '<p class="meta-hint">Plant adjacent different seeds to crossbreed (live in garden).</p></div>';
}

// ---------- STOCK SPARKLINE ----------
function renderStockSparkline() {
    const el = document.getElementById("stock-sparkline");
    if (!el || typeof ensureMeta !== "function") return;
    const hist = ensureMeta().stocks.history || [];
    if (hist.length < 2) { el.innerHTML = ""; return; }
    const w = 200, h = 40;
    const min = Math.min.apply(null, hist), max = Math.max.apply(null, hist);
    const pts = hist.map((v, i) => {
        const x = (i / (hist.length - 1)) * w;
        const y = h - ((v - min) / (max - min || 1)) * h;
        return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    el.innerHTML = '<svg width="' + w + '" height="' + h + '" class="stock-spark"><polyline points="' + pts + '" fill="none" stroke="#00e0ff" stroke-width="2"/></svg>';
}

// ---------- MEME EGG ART ----------
function memeEggEmoji() {
    if (typeof currentMemePet !== "function") return null;
    return currentMemePet().emoji;
}

// ---------- PHOTO CARD ENHANCED ----------
function exportPhotoCardEnhanced() {
    if (typeof exportPhotoCardWithQr === "function") return exportPhotoCardWithQr();
    if (!window._lastHatchPhoto) { showToast("Hatch something first!", 2000); return; }
    const p = window._lastHatchPhoto;
    const canvas = document.createElement("canvas");
    canvas.width = 400; canvas.height = 280;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1a0a38";
    ctx.fillRect(0, 0, 400, 280);
    ctx.strokeStyle = p.color || "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 384, 264);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    const wname = (WORLDS[game.worldIdx] && WORLDS[game.worldIdx].name) || "Ohio";
    const title = typeof brainrotTitle === "function" ? brainrotTitle() : "";
    ctx.fillText("Fart Clicker · " + wname, 20, 32);
    ctx.fillStyle = "#9b8fc7";
    ctx.font = "12px sans-serif";
    ctx.fillText(title, 20, 50);
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = p.color || "#fff";
    ctx.fillText(p.emoji || "🐾", 200, 130);
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(p.name, 200, 175);
    ctx.fillStyle = p.color;
    ctx.font = "16px sans-serif";
    ctx.fillText(p.rarity, 200, 205);
    ctx.fillStyle = "#666";
    ctx.font = "10px monospace";
    ctx.fillText("fartclicker://hatch", 200, 255);
    const a = document.createElement("a");
    a.download = "fart-hatch.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    showToast("📸 Photo card saved!", 2000);
}

// ---------- INIT ----------
function initFeatures() {
    ensureFeatures();
    detectBrowserInsets();
    applyCompactHud();
    applyRebirthPill();
    applyUiScale();
    initDraggableToilet();
    renderShowcasePet();
    startFpsMonitor();
    checkDailyLogin();
    setInterval(tickBuildingManagers, 3000);
    if (game.settings.haptics === undefined) game.settings.haptics = game.settings.platform === "mobile";
}
