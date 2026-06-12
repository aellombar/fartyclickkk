/* ============================================================
   META SYSTEMS — achievements, buildings, ascension, garden,
   stocks, quests, pet depth, secrets, invasion, meme week
   ============================================================ */

function freshMetaState() {
    return {
        achievements: {},
        stats: {
            totalClicks: 0, totalHatches: 0, totalRebirths: 0, totalAscensions: 0,
            minesLost: 0, minesWon: 0, wheelSpins: 0, scratchWins: 0, crateOpens: 0,
            gambles: 0, stocksTrades: 0, gardenHarvests: 0, invasionWins: 0,
            secretsFound: 0, bankruptcies: 0, legendariesHatched: 0, secretsHatched: 0,
            petsFused: 0, questTokens: 0, hiddenClicks: 0, toiletClicks: 0
        },
        buildings: {},
        ascension: 0,
        ascensionMutator: null,
        garden: { plots: [], unlocked: false },
        stocks: { holdings: { SKIB: 0, RIZZ: 0, STINK: 0 }, prices: { SKIB: 42, RIZZ: 88, STINK: 12 }, lastTick: 0, history: [] },
        quests: { daily: [], weekly: [], lastDaily: "", lastWeekly: "", tokens: 0 },
        petJobs: {},
        secrets: { konami: false, secretWorld: false, foundHidden: {} },
        invasion: null,
        memeWeek: { id: "", start: 0 },
        saveSlots: {}
    };
}

function ensureMeta() {
    if (!game.meta) game.meta = freshMetaState();
    const m = game.meta;
    if (!m.stats) m.stats = freshMetaState().stats;
    if (!m.achievements) m.achievements = {};
    if (!m.buildings) m.buildings = {};
    if (!m.garden) m.garden = { plots: [], unlocked: false };
    if (!m.stocks) m.stocks = freshMetaState().stocks;
    if (!m.stocks.history) m.stocks.history = [];
    if (!m.quests) m.quests = { daily: [], weekly: [], lastDaily: "", lastWeekly: "", tokens: 0 };
    if (!m.petJobs) m.petJobs = {};
    if (!m.secrets) m.secrets = freshMetaState().secrets;
    if (!m.saveSlots) m.saveSlots = {};
    if (m.ascension) game.ascension = m.ascension;
    return m;
}

function trackStat(key, n) {
    const m = ensureMeta();
    m.stats[key] = (m.stats[key] || 0) + (n || 1);
    checkAchievements();
    maybeRefreshQuests();
}

// ---------- ACHIEVEMENTS (200+) ----------
const BRAINROT_TITLES = [
    "Certified Fart Novice", "Basement Dweller", "Sewer Rat", "Skibidi Apprentice", "Rizz Intern",
    "Ohio Resident", "Certified Ohio Resident", "Sigma Grindset", "Brainrot Scholar", "Mold Farmer",
    "Casino Degen", "Pet Hoarder", "Ascended Stinker", "Garden Goblin", "Wall Street Brat",
    "Invasion Hero", "Divine Toucher", "The Final Stench"
];

function buildAchievementList() {
    const list = [];
    function add(id, name, desc, stat, need, milk, bonus) {
        list.push({ id, name, desc, stat, need, milk: milk || 1, bonus: bonus || { stink: 0.01 } });
    }
    [1,10,50,100,500,1000,5000,10000,50000,100000,500000,1e6,1e7,1e8].forEach((t, i) =>
        add("click_" + t, "Click " + fmt(t), "Click " + fmt(t) + " times", "totalClicks", t, 1 + i * 0.1));
    [1,5,10,25,50,100,250,500,1000,2500,5000].forEach((t, i) =>
        add("hatch_" + t, "Hatch " + t, "Hatch " + t + " eggs", "totalHatches", t, 1.2 + i * 0.1, { luck: 0.005 }));
    [1,2,5,10,20,50,100].forEach((t, i) =>
        add("rebirth_" + t, "Rebirth " + t, "Rebirth " + t + " times", "totalRebirths", t, 2 + i * 0.2));
    [1,2,3,5,10].forEach((t, i) =>
        add("asc_" + t, "Ascend " + t, "Ascend " + t + " times", "totalAscensions", t, 5 + i));
    [1,5,10,25,50,100,200].forEach((t, i) =>
        add("mineL_" + t, "Mine Boom " + t, "Hit " + t + " mines", "minesLost", t, 0.8 + i * 0.05));
    [1,5,10,25,50].forEach((t, i) =>
        add("mineW_" + t, "Mine Cash " + t, "Cash out mines " + t + " times", "minesWon", t, 1 + i * 0.1));
    [1,5,10,20,50,100].forEach((t, i) =>
        add("wheel_" + t, "Wheel " + t, "Spin wheel " + t + " times", "wheelSpins", t, 1 + i * 0.08));
    [1,10,25,50,100,200].forEach((t, i) =>
        add("gamble_" + t, "Gamble " + t, "Gamble " + t + " times", "gambles", t, 0.5 + i * 0.05));
    [1,5,10,25].forEach((t, i) =>
        add("leg_" + t, "Legendary " + t, "Hatch " + t + " legendaries+", "legendariesHatched", t, 2 + i * 0.3, { luck: 0.01 }));
    [1,2,5,10].forEach((t, i) =>
        add("sec_" + t, "Secret " + t, "Hatch " + t + " secrets+", "secretsHatched", t, 4 + i, { luck: 0.02 }));
    [1,5,10,25,50].forEach((t, i) =>
        add("fuse_" + t, "Fuse " + t, "Fuse pets " + t + " times", "petsFused", t, 1.5 + i * 0.15));
    [1,10,25,50,100].forEach((t, i) =>
        add("garden_" + t, "Harvest " + t, "Garden harvests " + t, "gardenHarvests", t, 1 + i * 0.1));
    [1,10,50,100].forEach((t, i) =>
        add("trade_" + t, "Trade " + t, "Stock trades " + t, "stocksTrades", t, 1 + i * 0.08));
    [1,3,5,10].forEach((t, i) =>
        add("inv_" + t, "Defend " + t, "Win invasions " + t, "invasionWins", t, 2 + i * 0.5));
    add("bankrupt_1", "Bankrupt", "Go bankrupt in stocks", "bankruptcies", 1, 3);
    add("toilet_1000", "Skibidi Scholar", "Click toilet 1000× in Skibidi world", "toiletClicks", 1000, 8, { luck: 0.03 });
    add("hidden_20", "Easter Hunter", "Find 20 hidden secrets", "secretsFound", 20, 6);
    add("konami_1", "Konami Code", "Enter the konami code", "konamiUnlocked", 1, 5);
    // world dex achievements
    for (let w = 0; w < 20; w++) {
        add("dex_w" + w, WORLDS[w].name + " Dex", "Discover all pets in " + WORLDS[w].name, "dexWorld_" + w, 1, 3 + w * 0.2, { stink: 0.02 });
    }
    // building count achievements
    [10,25,50,100,250,500].forEach((t, i) =>
        add("bld_" + t, "Builder " + t, "Own " + t + " total buildings", "totalBuildings", t, 1 + i * 0.15, { passive: 0.01 }));
    // chips earned proxy via gambles
    [100,500,1000].forEach((t, i) =>
        add("chipper_" + t, "High Roller " + t, "Complete " + t + " gambles", "gambles", t, 1 + i));
    [1,2,3,5,8,12,15,18,22,30,40,60,80,120,150,200,300,400,600,800,1000,1500,2000,3000,5000,7500,10000].forEach((t, i) =>
        add("click2_" + t, "Mega Click " + fmt(t), "Reach " + fmt(t) + " total clicks", "totalClicks", t, 0.5 + i * 0.02));
    [15,35,75,150,350,750,1500,3000,6000,12000,25000].forEach((t, i) =>
        add("hatch2_" + t, "Egg Maniac " + t, "Hatch " + t + " total eggs", "totalHatches", t, 0.8 + i * 0.05, { luck: 0.003 }));
    [150,200,300,400,600,800,1200,2000].forEach((t, i) =>
        add("rb2_" + t, "Rebirth King " + t, "Reach " + t + " rebirths", "totalRebirths", t, 1 + i * 0.1));
    [15,30,45,60,75,90,120,150,200,300].forEach((t, i) =>
        add("mineL2_" + t, "Boomer " + t, "Lose mines " + t + " times", "minesLost", t, 0.4 + i * 0.03));
    [150,300,500,750,1000].forEach((t, i) =>
        add("wheel2_" + t, "Spinner " + t, "Spin wheel " + t + " times", "wheelSpins", t, 0.6 + i * 0.05));
    [15,35,75,150,300,600].forEach((t, i) =>
        add("garden2_" + t, "Farmer " + t, "Garden harvests " + t, "gardenHarvests", t, 0.7 + i * 0.06));
    [15,40,80,150,300].forEach((t, i) =>
        add("trade2_" + t, "Trader " + t, "Stock trades " + t, "stocksTrades", t, 0.7 + i * 0.07));
    [5,15,25,40,75,125].forEach((t, i) =>
        add("hidden2_" + t, "Secret Hunter " + t, "Find " + t + " secrets", "secretsFound", t, 1 + i * 0.2));
    [250,500,750,1000,1500,2000,3000,5000].forEach((t, i) =>
        add("bld2_" + t, "Tycoon " + t, "Own " + t + " buildings", "totalBuildings", t, 1.2 + i * 0.1, { passive: 0.008 }));
    return list;
}
let ACHIEVEMENTS = [];
function initAchievementList() { ACHIEVEMENTS = buildAchievementList(); }

function checkAchievements() {
    initAchievementList();
    const m = ensureMeta();
    let newUnlock = false;
    ACHIEVEMENTS.forEach(a => {
        if (m.achievements[a.id]) return;
        let val = 0;
        if (a.stat && a.stat.indexOf("dexWorld_") === 0) {
            const w = parseInt(a.stat.split("_")[1], 10);
            let all = true, count = 0;
            allPetsForWorld(w).forEach(p => {
                if (game.discovered[dexKey(w, p.name)]) count++;
                else all = false;
            });
            if (all && allPetsForWorld(w).length > 0) val = 1;
        } else if (a.stat === "konamiUnlocked") {
            val = m.secrets.konami ? 1 : 0;
        } else if (a.stat === "totalBuildings") {
            val = Object.values(m.buildings).reduce((s, n) => s + (n || 0), 0);
        } else {
            val = m.stats[a.stat] || 0;
        }
        if (val >= a.need) {
            m.achievements[a.id] = Date.now();
            newUnlock = true;
            showToast("🏆 " + a.name + "!", 2800);
            sfxRare(2);
        }
    });
    if (newUnlock) saveGame();
}

function achievementMilk() {
    const m = ensureMeta();
    initAchievementList();
    let milk = 0;
    ACHIEVEMENTS.forEach(a => { if (m.achievements[a.id]) milk += a.milk || 1; });
    return milk;
}

function brainrotLevel() {
    const milk = achievementMilk();
    return Math.floor(Math.pow(milk, 0.45));
}

function brainrotTitle() {
    const lvl = brainrotLevel();
    const idx = Math.min(BRAINROT_TITLES.length - 1, Math.floor(lvl / 8));
    return BRAINROT_TITLES[idx];
}

function metaBonus(type) {
    initAchievementList();
    const m = ensureMeta();
    let bonus = 0;
    ACHIEVEMENTS.forEach(a => {
        if (!m.achievements[a.id] || !a.bonus) return;
        if (a.bonus[type]) bonus += a.bonus[type];
    });
    const lvl = brainrotLevel();
    if (type === "stink") bonus += lvl * 0.005;
    if (type === "passive") bonus += lvl * 0.004;
    if (type === "luck") bonus += lvl * 0.002;
    return bonus;
}

// ---------- BUILDINGS ----------
const BUILDINGS = [
    { id: "vent", name: "Vent Stack", icon: "🌬️", baseCost: 50, baseProd: 0.5, reqWorld: 0 },
    { id: "mold", name: "Mold Farm", icon: "🍄", baseCost: 250, baseProd: 2, reqWorld: 0 },
    { id: "sewer", name: "Sewer Pump", icon: "🕳️", baseCost: 1200, baseProd: 8, reqWorld: 1 },
    { id: "skib", name: "Skibidi Plant", icon: "🚽", baseCost: 8000, baseProd: 35, reqWorld: 2 },
    { id: "ohio", name: "Ohio Reactor", icon: "🌽", baseCost: 50000, baseProd: 150, reqWorld: 4 },
    { id: "sigma", name: "Sigma Engine", icon: "🗿", baseCost: 350000, baseProd: 600, reqWorld: 8 },
    { id: "void", name: "Void Siphon", icon: "🕳️", baseCost: 2e6, baseProd: 2500, reqWorld: 12 },
    { id: "final", name: "Final Mint", icon: "👑", baseCost: 2e7, baseProd: 12000, reqWorld: 16 }
];
const BUILDING_SYNERGIES = [
    { id: "vent", count: 50, bonus: "pet", mult: 1.05, label: "50 Vent Stacks → +5% pet power" },
    { id: "mold", count: 40, bonus: "passive", mult: 1.08, label: "40 Mold Farms → +8% passive" },
    { id: "ohio", count: 25, bonus: "luck", mult: 1.1, label: "25 Ohio Reactors → +10% hatch luck" }
];

function buildingCost(b, owned) {
    return Math.floor(b.baseCost * Math.pow(1.15, owned));
}

function buildingPetMult() {
    const m = ensureMeta();
    let mult = 1;
    BUILDING_SYNERGIES.forEach(s => {
        if (s.bonus === "pet" && (m.buildings[s.id] || 0) >= s.count) mult *= s.mult;
    });
    return mult;
}

function buildingProduction() {
    const m = ensureMeta();
    let total = 0;
    BUILDINGS.forEach(b => {
        const n = m.buildings[b.id] || 0;
        if (n <= 0) return;
        if ((game.worldIdx || 0) < b.reqWorld && (game.peakWorldIdx || 0) < b.reqWorld) return;
        total += b.baseProd * n * Math.pow(1.05, Math.log10(n + 1));
    });
    BUILDING_SYNERGIES.forEach(s => {
        if ((m.buildings[s.id] || 0) >= s.count && s.bonus === "passive") total *= s.mult;
    });
    return total;
}

function buyBuilding(id, count) {
    const b = BUILDINGS.find(x => x.id === id);
    if (!b) return;
    const m = ensureMeta();
    const owned = m.buildings[id] || 0;
    if (peakWorld() < b.reqWorld) { sfxError(); return; }
    let n = count === "max" ? 0 : (count || 1);
    let cost = 0, bought = 0;
    if (count === "max") {
        while (game.points >= buildingCost(b, owned + bought)) {
            cost += buildingCost(b, owned + bought);
            bought++;
            if (bought > 500) break;
        }
    } else {
        for (let i = 0; i < n; i++) {
            const c = buildingCost(b, owned + i);
            if (game.points < cost + c) break;
            cost += c; bought++;
        }
    }
    if (bought <= 0) { sfxError(); return; }
    game.points -= cost;
    m.buildings[id] = owned + bought;
    sfxBuy(); saveGame(); updateDisplay();
    renderBuildingsTab();
    checkAchievements();
}

function renderBuildingsTab() {
    const el = document.getElementById("up-factories");
    if (!el) return;
    const m = ensureMeta();
    let html = '<p class="meta-hint">Stink factories — Cookie Clicker style. Synergies at milestones.</p>';
    BUILDING_SYNERGIES.forEach(s => {
        const ok = (m.buildings[s.id] || 0) >= s.count;
        html += '<div class="synergy-row ' + (ok ? "active" : "") + '">' + s.label + (ok ? " ✓" : "") + '</div>';
    });
    if (typeof ensureFeatures === "function") ensureFeatures();
    const mgr = (typeof ensureFeatures === "function" ? ensureFeatures().buildingManagers : {}) || {};
    html += '<p class="meta-hint">👔 Building managers auto-buy when you can afford.</p>';
    BUILDINGS.forEach(b => {
        const owned = m.buildings[b.id] || 0;
        const locked = peakWorld() < b.reqWorld;
        const cost = buildingCost(b, owned);
        const bm = (typeof buyMode !== "undefined") ? buyMode : 1;
        const bmArg = bm === "max" ? "'max'" : bm;
        const bmLabel = bm === "max" ? "MAX" : ("x" + bm);
        const mgrOn = !!mgr[b.id];
        html += '<div class="building-mgr-row ' + (mgrOn ? "on" : "") + '"><span>' + b.icon + ' ' + b.name + ' mgr</span>' +
            '<button class="meta-btn small" onclick="toggleBuildingManager(\'' + b.id + '\')">' + (mgrOn ? "ON" : "OFF") + '</button></div>';
        html += '<button class="up-card ' + (locked ? "locked" : "") + '" onclick="buyBuilding(\'' + b.id + '\',' + bmArg + ')">' +
            '<span class="up-ico">' + b.icon + '</span><div class="up-mid"><div class="up-name">' + b.name + ' <span class="buy-badge">' + bmLabel + '</span></div>' +
            '<div class="up-stat">+' + b.baseProd + '/s each · own ' + owned + '</div>' +
            '<div class="up-cost">' + (locked ? "🔒 World " + (WORLDS[b.reqWorld]?.name || b.reqWorld) : fmt(cost) + " 💨") + '</div></div></button>';
    });
    el.innerHTML = html;
}

// ---------- ASCENSION ----------
const ASCENSION_MUTATORS = [
    { id: "egg_luck", name: "Cursed Eggs", desc: "Eggs cost 2× · Secret+ luck 2×", eggCost: 2, luck: 2 },
    { id: "passive_king", name: "Passive King", desc: "+50% passive · -20% click", passive: 1.5, click: 0.8 },
    { id: "click_god", name: "Click God", desc: "+80% click · -30% passive", click: 1.8, passive: 0.7 },
    { id: "casino_rat", name: "Casino Rat", desc: "+40% chip gains · Aura gain -25%", chips: 1.4, aura: 0.75 },
    { id: "garden_sage", name: "Garden Sage", desc: "Garden grows 2× fast · Rebirth cost +30%", garden: 2, rebirth: 1.3 },
    { id: "ohio_mode", name: "Only In Ohio", desc: "All gains +15% · Random debuffs", all: 1.15 }
];

function ascensionCost() {
    const asc = (game.ascension || (game.meta && game.meta.ascension) || 0) + 1;
    return Math.floor(50 + Math.pow((game.rebirths || 0) + 1, 2.2) * asc * 8 + (game.aura || 0) * 2);
}

function ascensionMutatorMult(type) {
    const m = ensureMeta();
    if (!m.ascensionMutator) return 1;
    const mut = ASCENSION_MUTATORS.find(x => x.id === m.ascensionMutator);
    if (!mut) return 1;
    if (type === "all" && mut.all) return mut.all;
    return mut[type] || 1;
}

function canAscend() {
    return (game.rebirths || 0) >= 5 && (game.aura || 0) >= 10;
}

function doAscension(mutatorId) {
    if (!canAscend()) { sfxError(); showToast("Need 5+ rebirths and 10+ Aura", 2500); return; }
    const m = ensureMeta();
    m.ascension = (m.ascension || 0) + 1;
    m.ascensionMutator = mutatorId;
    game.ascension = m.ascension;
    trackStat("totalAscensions", 1);
    game.rebirths = 0; game.aura = 0; game.auraUpgrades = {};
    game.points = 0; game.upgrades = {}; initUpgrades();
    game.worldIdx = 0; game.peakWorldIdx = 0;
    m.garden.unlocked = true;
  m.stocks.unlocked = true;
    game.points = 1000;
    sfxRare(5); rainbowFlash(); bigBanner("ASCENDED!", "#ffffff");
    showToast("☄ ASCENSION " + m.ascension + " — mutator active!", 3500);
    saveGame(); updateDisplay(); renderAscension(); checkAchievements();
}

function renderAscension() {
    const el = document.getElementById("hub-ascension");
    if (!el) return;
    const m = ensureMeta();
    let html = '<div class="asc-hero">☄ Ascension: <b>' + (m.ascension || 0) + '</b></div>';
    html += '<p class="meta-hint">Reset rebirths, aura, worlds for permanent mutators. Unlocks Garden + Stock Market.</p>';
    if (!canAscend()) html += '<p class="meta-warn">Requires 5 rebirths + 10 Aura</p>';
    else html += '<p class="meta-ok">Ready to ascend! Pick a mutator:</p>';
    ASCENSION_MUTATORS.forEach(mut => {
        html += '<button class="asc-card" onclick="doAscension(\'' + mut.id + '\')">' +
            '<div class="asc-name">' + mut.name + '</div><div class="asc-desc">' + mut.desc + '</div></button>';
    });
    if (m.ascensionMutator) {
        const cur = ASCENSION_MUTATORS.find(x => x.id === m.ascensionMutator);
        if (cur) html += '<p class="meta-ok">Active: <b>' + cur.name + '</b></p>';
    }
    html += '<button class="meta-btn" onclick="rerollAscensionMutator()">🎲 Reroll next mutator (5 quest tokens)</button>';
    el.innerHTML = html;
}

// ---------- GARDEN ----------
const GARDEN_SEEDS = [
    { id: "fart", name: "Fart Bean", icon: "🌱", growMs: 60000, reward: "stink" },
    { id: "golden", name: "Golden Bean", icon: "🌟", growMs: 180000, reward: "chips" },
    { id: "cursed", name: "Cursed Corn", icon: "🌽", growMs: 300000, reward: "luck" },
    { id: "spore", name: "Secret Spore", icon: "💎", growMs: 600000, reward: "shard" }
];

function initGardenPlots() {
    const g = ensureMeta().garden;
    if (g.plots.length >= 12) return;
    while (g.plots.length < 12) g.plots.push({ seed: null, plantedAt: 0 });
}

function gardenUnlocked() {
    const m = ensureMeta();
    return m.garden.unlocked || (m.ascension || 0) >= 1;
}

function plantGarden(idx, seedId) {
    if (!gardenUnlocked()) { sfxError(); return; }
    initGardenPlots();
    const plot = ensureMeta().garden.plots[idx];
    if (!plot || plot.seed) return;
    plot.seed = seedId;
    plot.plantedAt = Date.now();
    const growMult = ascensionMutatorMult("garden");
    plot.readyAt = plot.plantedAt + (GARDEN_SEEDS.find(s => s.id === seedId)?.growMs || 60000) / (growMult > 1 ? growMult : 1);
    sfxBuy(); saveGame(); renderGarden();
}

function harvestGarden(idx) {
    const plot = ensureMeta().garden.plots[idx];
    if (!plot || !plot.seed || Date.now() < (plot.readyAt || 0)) return;
    const seed = GARDEN_SEEDS.find(s => s.id === plot.seed);
    if (seed.reward === "stink") game.points += getClickPower() * getPetMult() * 500;
    else if (seed.reward === "chips") grantChips(3 + Math.floor(Math.random() * 5), "garden");
    else if (seed.reward === "luck") showToast("🍀 Luck buff next hatch!", 2000);
    else if (seed.reward === "shard") { ensureCasino().secretShards++; }
    plot.seed = null; plot.plantedAt = 0;
    trackStat("gardenHarvests", 1);
    const m = ensureMeta();
    const qs = m.quests.session;
    if (qs) qs.gardenSession = (qs.gardenSession || 0) + 1;
    maybeRefreshQuests();
    sfxRare(2); saveGame(); updateDisplay(); renderGarden(); checkAchievements();
}

function renderGarden() {
    const el = document.getElementById("hub-garden");
    if (!el) return;
    if (!gardenUnlocked()) { el.innerHTML = '<p class="meta-warn">🔒 Ascend once to unlock Stink Garden</p>'; return; }
    initGardenPlots();
    const plots = ensureMeta().garden.plots;
    let html = '<p class="meta-hint">Plant seeds — real-time growth. Crossbreed by planting adjacent types.</p><div class="garden-grid">';
    plots.forEach((p, i) => {
        const ready = p.seed && Date.now() >= (p.readyAt || 0);
        const seed = GARDEN_SEEDS.find(s => s.id === p.seed);
        html += '<div class="garden-plot ' + (ready ? "ready" : "") + '" onclick="' + (ready ? "harvestGarden(" + i + ")" : "") + '">' +
            (seed ? seed.icon : "+") + '</div>';
    });
    html += '</div><div class="garden-seeds">';
    GARDEN_SEEDS.forEach(s => {
        html += '<button class="garden-seed-btn" onclick="plantGardenNextEmpty(\'' + s.id + '\')">' + s.icon + " " + s.name + '</button>';
    });
    html += '</div><div id="garden-chart"></div>';
    el.innerHTML = html;
    if (typeof renderGardenChart === "function") renderGardenChart();
}

function plantGardenNextEmpty(seedId) {
    initGardenPlots();
    const plots = ensureMeta().garden.plots;
    const idx = plots.findIndex(p => !p.seed);
    if (idx < 0) { showToast("No empty plots!", 1800); return; }
    plantGarden(idx, seedId);
}

// ---------- STOCK MARKET ----------
const STOCK_TICKERS = ["SKIB", "RIZZ", "STINK"];

function tickStocks() {
    const m = ensureMeta();
    if (!m.stocks.unlocked && (m.ascension || 0) < 1) return;
    const now = Date.now();
    if (now - (m.stocks.lastTick || 0) < 8000) return;
    m.stocks.lastTick = now;
    STOCK_TICKERS.forEach(t => {
        const shock = (Math.random() - 0.48) * 0.12;
        if (Math.random() < 0.04) {
            const news = ["Ohio incident", "Skibidi rally", "Rizz collapse", "Stink IPO"];
            showToast("📰 " + news[Math.floor(Math.random() * news.length)] + " — $" + t + "!", 2200);
            m.stocks.prices[t] *= 0.6 + Math.random() * 0.8;
        } else {
            m.stocks.prices[t] = Math.max(1, m.stocks.prices[t] * (1 + shock));
        }
    });
    const avg = STOCK_TICKERS.reduce((s, t) => s + m.stocks.prices[t], 0) / STOCK_TICKERS.length;
    m.stocks.history = (m.stocks.history || []).concat(avg).slice(-40);
}

function buyStock(ticker, amt) {
    const m = ensureMeta();
    if (!m.stocks.unlocked && (m.ascension || 0) < 1) { sfxError(); return; }
    const price = m.stocks.prices[ticker] || 10;
    const cost = price * amt;
    if (game.points < cost) { sfxError(); return; }
    game.points -= cost;
    m.stocks.holdings[ticker] = (m.stocks.holdings[ticker] || 0) + amt;
    trackStat("stocksTrades", 1);
    saveGame(); renderStocks();
}

function sellStock(ticker, amt) {
    const m = ensureMeta();
    const held = m.stocks.holdings[ticker] || 0;
    if (held < amt) { sfxError(); return; }
    const price = m.stocks.prices[ticker] || 10;
    game.points += price * amt;
    m.stocks.holdings[ticker] = held - amt;
    trackStat("stocksTrades", 1);
    saveGame(); renderStocks();
}

function renderStocks() {
    const el = document.getElementById("hub-stocks");
    if (!el) return;
    const m = ensureMeta();
    if (!m.stocks.unlocked && (m.ascension || 0) < 1) {
        el.innerHTML = '<p class="meta-warn">🔒 Ascend to unlock Brainrot Stock Market</p>'; return;
    }
    tickStocks();
    let html = '<p class="meta-hint">Buy low, sell high. News events shake prices.</p>';
    STOCK_TICKERS.forEach(t => {
        const p = m.stocks.prices[t].toFixed(2);
        const h = m.stocks.holdings[t] || 0;
        html += '<div class="stock-row"><span class="stock-tick">$' + t + '</span><span class="stock-price">' + p + '</span>' +
            '<span class="stock-held">x' + h + '</span>' +
            '<button onclick="buyStock(\'' + t + '\',1)">Buy</button>' +
            '<button onclick="sellStock(\'' + t + '\',1)">Sell</button></div>';
    });
    html += '<div id="stock-sparkline"></div>';
    html += '<button class="meta-btn danger" onclick="sellAllStocksPanic()">💀 PANIC SELL ALL</button>';
    html += '<button class="meta-btn danger" onclick="declareBankruptcy()">📉 Declare Bankruptcy</button>';
    el.innerHTML = html;
    if (typeof renderStockSparkline === "function") renderStockSparkline();
}

function declareBankruptcy() {
    const m = ensureMeta();
    let had = false;
    STOCK_TICKERS.forEach(t => { if ((m.stocks.holdings[t] || 0) > 0) had = true; });
    if (!had && game.points > 500) { showToast("You're not broke enough!", 2000); return; }
    STOCK_TICKERS.forEach(t => { m.stocks.holdings[t] = 0; });
    game.points = Math.max(0, Math.floor(game.points * 0.1));
    trackStat("bankruptcies", 1);
    showToast("📉 BANKRUPT! Achievement unlocked?", 2800);
    checkAchievements();
    saveGame(); renderStocks(); updateDisplay();
}

function sellAllStocksPanic() {
    const m = ensureMeta();
    let total = 0;
    STOCK_TICKERS.forEach(t => {
        const h = m.stocks.holdings[t] || 0;
        if (h > 0) { total += h * m.stocks.prices[t]; m.stocks.holdings[t] = 0; }
    });
    if (total <= 0) return;
    game.points += Math.floor(total * 0.7);
    showToast("📉 Panic sold for " + fmt(Math.floor(total * 0.7)), 2500);
    saveGame(); renderStocks();
}

// ---------- QUESTS ----------
const QUEST_POOL = [
    { id: "rebirth", label: "Rebirth once", stat: "rebirthsSession", need: 1, reward: { chips: 5 } },
    { id: "hatch5", label: "Hatch 5 eggs", stat: "hatchesSession", need: 5, reward: { chips: 4 } },
    { id: "mines3", label: "Cash out mines 3×", stat: "minesWonSession", need: 3, reward: { chips: 6, key: 1 } },
    { id: "legend", label: "Hatch a legendary+", stat: "legendSession", need: 1, reward: { tokens: 2 } },
    { id: "click1k", label: "Click 1000 times", stat: "clicksSession", need: 1000, reward: { chips: 3 } },
    { id: "garden5", label: "Harvest garden 5×", stat: "gardenSession", need: 5, reward: { tokens: 1 } }
];

function todayKey() { return new Date().toDateString(); }
function weekKey() { const d = new Date(); return d.getFullYear() + "-W" + Math.floor(d.getDate() / 7); }

function rollQuests() {
    const m = ensureMeta();
    const today = todayKey();
    if (m.quests.lastDaily !== today) {
        m.quests.lastDaily = today;
        m.quests.daily = [];
        m.quests.session = { rebirthsSession: 0, hatchesSession: 0, minesWonSession: 0, legendSession: 0, clicksSession: 0, gardenSession: 0 };
        const pool = QUEST_POOL.slice();
        for (let i = 0; i < 3 && pool.length; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            m.quests.daily.push(Object.assign({ progress: 0, done: false }, pool.splice(idx, 1)[0]));
        }
    }
    const wk = weekKey();
    if (m.quests.lastWeekly !== wk) {
        m.quests.lastWeekly = wk;
        m.quests.weekly = [{
            id: "mega", label: "Hatch 20 eggs this week", stat: "weeklyHatches", need: 20,
            progress: 0, done: false,
            startHatches: m.stats.totalHatches || 0, startAsc: m.stats.totalAscensions || 0,
            reward: { tokens: 10, chips: 20 }
        }];
    }
    if (!m.quests.session) m.quests.session = {};
}

function maybeRefreshQuests() { rollQuests(); checkQuestProgress(); }

function checkQuestProgress() {
    rollQuests();
    const m = ensureMeta();
    const s = m.quests.session || {};
    m.quests.daily.forEach(q => {
        if (q.done) return;
        q.progress = s[q.stat] || 0;
        if (q.progress >= q.need) completeQuest(q);
    });
    (m.quests.weekly || []).forEach(q => {
        if (q.done) return;
        if (q.id === "mega") {
            const hatchProg = (m.stats.totalHatches || 0) - (q.startHatches || 0);
            const ascProg = (m.stats.totalAscensions || 0) > (q.startAsc || 0);
            q.progress = ascProg ? q.need : Math.min(q.need, hatchProg);
            if (q.progress >= q.need) completeQuest(q);
        }
    });
}

function completeQuest(q) {
    if (q.done) return;
    q.done = true;
    if (q.reward.chips) grantChips(q.reward.chips, "quest");
    if (q.reward.tokens) { ensureMeta().quests.tokens = (ensureMeta().quests.tokens || 0) + q.reward.tokens; }
    if (q.reward.key && game.casino) game.casino.crateKeys = (game.casino.crateKeys || 0) + q.reward.key;
    showToast("✅ Quest: " + q.label, 2800);
    saveGame();
}

function renderQuests() {
    const el = document.getElementById("hub-quests");
    if (!el) return;
    rollQuests();
    const m = ensureMeta();
    let html = '<p class="meta-hint">Quest tokens: <b>' + (m.quests.tokens || 0) + '</b></p>';
    m.quests.daily.forEach(q => {
        html += '<div class="quest-card ' + (q.done ? "done" : "") + '"><div>' + q.label + '</div>' +
            '<div class="quest-prog">' + Math.min(q.progress || 0, q.need) + '/' + q.need + '</div></div>';
    });
    (m.quests.weekly || []).forEach(q => {
        html += '<div class="quest-card weekly ' + (q.done ? "done" : "") + '"><div>📅 ' + q.label + '</div>' +
            '<div class="quest-prog">' + Math.min(q.progress || 0, q.need) + '/' + q.need + '</div></div>';
    });
    el.innerHTML = html;
}

// ---------- PET TRAITS & JOBS ----------
const PET_TRAITS = [
    { id: "ohio", name: "Ohio Born", desc: "+10% power in Ohio", world: 4, mult: 1.1 },
    { id: "casino", name: "Casino Addict", desc: "+15% chip rewards", mult: 1.15, chips: true },
    { id: "clicker", name: "Click Fiend", desc: "+8% click power when equipped", click: 1.08 },
    { id: "shiny", name: "Shiny", desc: "+25% power", mult: 1.25 },
    { id: "lazy", name: "Lazy", desc: "-5% power, +garden growth", mult: 0.95 }
];
const PET_JOBS = [
    { id: "vent", name: "Work Vent", bonus: "passive", per: 0.02, label: "+2% passive per pet power" },
    { id: "casino", name: "Guard Casino", bonus: "chips", per: 0.03, label: "+3% chip gains" },
    { id: "garden", name: "Tend Garden", bonus: "garden", per: 0.05, label: "Faster garden" },
    { id: "scout", name: "Scout", bonus: "luck", per: 0.01, label: "+1% hatch luck" }
];

function rollPetTrait(pet) {
    if (pet.trait) return;
    const t = PET_TRAITS[Math.floor(Math.random() * PET_TRAITS.length)];
    pet.trait = t.id;
    if (Math.random() < 0.02 + (RARITY[pet.rarity]?.tier || 0) * 0.005) pet.shiny = true;
}

function petTraitMult(pet) {
    if (!pet || !pet.trait) return 1;
    const t = PET_TRAITS.find(x => x.id === pet.trait);
    if (!t) return 1;
    if (t.world !== undefined && game.worldIdx !== t.world) return 1;
    let m = t.mult || 1;
    if (pet.shiny) m *= 1.25;
    return m;
}

function assignPetJob(petId, jobId) {
    ensureMeta().petJobs[petId] = jobId;
    saveGame(); renderPetJobs();
}

function jobBonuses() {
    const m = ensureMeta();
    const out = { passive: 0, chips: 0, luck: 0 };
    Object.keys(m.petJobs).forEach(pid => {
        const job = PET_JOBS.find(j => j.id === m.petJobs[pid]);
        const pet = game.pets.find(p => String(p.id) === String(pid));
        if (!job || !pet) return;
        out[job.bonus] = (out[job.bonus] || 0) + (pet.power || 1) * job.per;
    });
    return out;
}

function renderPetJobs() {
    const el = document.getElementById("pets-body");
    if (!el) return;
    const m = ensureMeta();
    let html = '<p class="meta-hint">Assign pets to jobs for passive bonuses.</p>';
    game.pets.slice(0, 40).forEach(p => {
        const job = m.petJobs[p.id] || "";
        html += '<div class="job-row">' + (p.emoji || "🐾") + ' ' + p.name +
            ' <select onchange="assignPetJob(' + p.id + ', this.value)">' +
            '<option value="">—</option>' +
            PET_JOBS.map(j => '<option value="' + j.id + '"' + (job === j.id ? ' selected' : '') + '>' + j.name + '</option>').join("") +
            '</select></div>';
    });
    el.innerHTML = html;
}

// ---------- SECRETS ----------
let konamiBuf = [];
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

function onKonamiKey(e) {
    konamiBuf.push(e.key);
    if (konamiBuf.length > 12) konamiBuf.shift();
    if (konamiBuf.join(",") === KONAMI.join(",")) {
        ensureMeta().secrets.konami = true;
        trackStat("secretsFound", 1);
        grantChips(50, "konami");
        showToast("🎮 KONAMI CODE!!!", 3000);
        checkAchievements();
    }
}
document.addEventListener("keydown", onKonamiKey);

function onHiddenWorldClick(w) {
    const m = ensureMeta();
    m.secrets.foundHidden[w] = (m.secrets.foundHidden[w] || 0) + 1;
    trackStat("hiddenClicks", 1);
    trackStat("secretsFound", 1);
    game.points += getClickPower() * 10;
    showToast("👀 Secret found in " + WORLDS[w].name + "!", 2000);
    tryUnlockSecretWorld();
    saveGame();
}

function tryUnlockSecretWorld() {
    const m = ensureMeta();
    const shards = (game.casino && game.casino.secretShards) || 0;
    if (m.secrets.secretWorld || shards < 15) return;
    if (Object.keys(m.achievements).length < 30) return;
    m.secrets.secretWorld = true;
    showToast("🌌 SECRET WORLD UNLOCKED!", 4000);
    bigBanner("SECRET WORLD", "#00ffd0");
}

function onToiletClick() {
    if (game.worldIdx !== 2) return;
    trackStat("toiletClicks", 1);
}

// ---------- INVASION ----------
function maybeStartInvasion() {
    const m = ensureMeta();
    if (m.invasion && m.invasion.ends > Date.now()) return;
    if (m.invasionEnded && Date.now() - m.invasionEnded < 300000) return;
    if (Math.random() > 0.0008) return;
    const maxHp = 5000 + brainrotLevel() * 200;
    m.invasion = { hp: maxHp, max: maxHp, ends: Date.now() + 120000, dps: 0 };
    showToast("🚨 SKIBIDI WAVE INCOMING!", 3500);
    bigBanner("INVASION!", "#ff3030");
}

function invasionClick(dmg) {
    const m = ensureMeta();
    if (!m.invasion || m.invasion.ends < Date.now()) return;
    const hit = dmg || getClickPower() * getPetMult();
    m.invasion.hp -= hit;
    m.invasion.clicks = (m.invasion.clicks || 0) + 1;
    if (m.invasion.hp <= 0) {
        const clickBonus = 1 + Math.min(2, (m.invasion.clicks || 0) / 500);
        const reward = Math.floor(getClickPower() * getPetMult() * 800 * clickBonus);
        game.points += reward;
        grantChips(5 + brainrotLevel(), "invasion");
        trackStat("invasionWins", 1);
        if (typeof recordInvasionScore === "function") recordInvasionScore(reward);
        m.invasion = null;
        m.invasionEnded = Date.now();
        showToast("🛡️ Invasion repelled! +" + fmt(reward), 3000);
        checkAchievements();
    }
    saveGame();
}

function renderInvasionHud() {
    const hud = document.getElementById("invasion-hud");
    if (!hud) return;
    const inv = ensureMeta().invasion;
    if (!inv || inv.ends < Date.now()) {
        hud.classList.add("hidden");
        hud.innerHTML = "";
        return;
    }
    hud.classList.remove("hidden");
    const pct = Math.max(0, (inv.hp / inv.max) * 100);
    hud.innerHTML = '<div class="inv-hud-label">🚨 SKIBIDI WAVE · Server HP</div><div class="inv-bar"><div class="inv-fill" style="width:' + pct + '%"></div></div>';
}

function renderInvasion() {
    if (typeof renderInvasionLeaderboard === "function") return renderInvasionLeaderboard();
    const el = document.getElementById("hub-invasion");
    if (!el) return;
    const inv = ensureMeta().invasion;
    if (!inv || inv.ends < Date.now()) {
        el.innerHTML = '<p class="meta-hint">Random Skibidi waves attack. Click main button during invasion!</p>'; return;
    }
    const pct = Math.max(0, (inv.hp / inv.max) * 100);
    el.innerHTML = '<div class="inv-bar"><div class="inv-fill" style="width:' + pct + '%"></div></div>' +
        '<p>🚨 HP: ' + fmt(inv.hp) + ' — KEEP CLICKING!</p>';
}

// ---------- MEME OF THE WEEK ----------
function memeWeekDaysLeft() {
    const now = Date.now();
    const weekMs = 7 * 24 * 3600 * 1000;
    const weekStart = Math.floor(now / weekMs) * weekMs;
    const left = weekMs - (now - weekStart);
    return Math.max(0, Math.ceil(left / (24 * 3600 * 1000)));
}

function currentMemePet() {
    const m = ensureMeta();
    const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
    if (m.memeWeek.id && m.memeWeek.start === week) return m.memeWeek;
    const names = ["Rizzler Bean", "Gyatt Goblin", "Mewing Cat", "Fanum Taxer", "Grimace Jr"];
    const emojis = ["😎", "🍑", "😐", "🍔", "🟣"];
    const i = week % names.length;
    m.memeWeek = { id: "meme_" + week, name: names[i], emoji: emojis[i], start: week, ends: week + 1 };
    return m.memeWeek;
}

// ---------- STATS & PHOTO ----------
function renderStats() {
    const el = document.getElementById("hub-stats");
    if (!el) return;
    const m = ensureMeta();
    const unlocked = Object.keys(m.achievements).length;
    let html = '<div class="stats-grid-meta">';
    const rows = [
        ["Total clicks", m.stats.totalClicks], ["Total hatches", m.stats.totalHatches],
        ["Rebirths", m.stats.totalRebirths], ["Ascensions", m.stats.totalAscensions],
        ["Achievements", unlocked + "/" + ACHIEVEMENTS.length],
        ["Brainrot Level", brainrotLevel()], ["Title", brainrotTitle()],
        ["Total earned", fmt(game.totalEarned)], ["Mines lost", m.stats.minesLost],
        ["Wheel spins", m.stats.wheelSpins], ["Garden harvests", m.stats.gardenHarvests]
    ];
    rows.forEach(r => { html += '<div class="stat-row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; });
    html += '</div><button class="meta-btn" onclick="(typeof exportPhotoCardEnhanced===\'function\'?exportPhotoCardEnhanced:exportPhotoCard)()">📸 Photo Card (last hatch)</button>';
    el.innerHTML = html;
}

function achCategory(a) {
    if (/^click/.test(a.id)) return "click";
    if (/^(hatch|leg_|sec_|fuse_|dex_)/.test(a.id)) return "hatch";
    if (/^(mine|wheel|gamble|chipper)/.test(a.id)) return "casino";
    return "meta";
}
function isSecretAch(a) {
    return /^(konami|hidden|toilet|bankrupt)/.test(a.id);
}
let achFilter = "all";
function setAchFilter(cat, btn) {
    achFilter = cat;
    document.querySelectorAll(".ach-filter").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderAchievements();
}

function renderAchievements() {
    const el = document.getElementById("hub-achievements");
    if (!el) return;
    initAchievementList();
    const m = ensureMeta();
    const lvl = brainrotLevel();
    let html = '<div class="brainrot-bar-wrap' + (lvl > 0 && lvl % 10 === 0 ? " milestone" : "") + '"><div class="brainrot-label">🧠 ' + brainrotTitle() + ' · Lv ' + lvl + '</div>' +
        '<div class="brainrot-bar"><div class="brainrot-fill" style="width:' + Math.min(100, lvl) + '%"></div></div>' +
        '<div class="brainrot-bonus">+' + (lvl * 0.5).toFixed(1) + '% global Stink' +
        (lvl > 0 && lvl % 10 === 0 ? " · 🎖️ Milestone border unlocked!" : "") + '</div></div>';
    html += '<div class="ach-filters">' +
        ['all','click','hatch','casino','meta'].map(c =>
            '<button class="ach-filter' + (achFilter === c ? ' active' : '') + '" onclick="setAchFilter(\'' + c + '\', this)">' + c + '</button>'
        ).join("") + '</div>';
    html += '<div class="ach-list">';
    ACHIEVEMENTS.forEach(a => {
        if (achFilter !== "all" && achCategory(a) !== achFilter) return;
        const got = !!m.achievements[a.id];
        const secret = isSecretAch(a) && !got;
        html += '<div class="ach-row ' + (got ? "got" : "") + (secret ? " secret" : "") + '"><span>' + (got ? "🏆" : (secret ? "❓" : "🔒")) + '</span> ' +
            '<span class="ach-name">' + (secret ? "???" : a.name) + '</span><span class="ach-desc">' + (secret ? "Secret achievement" : a.desc) + '</span></div>';
    });
    html += '</div>';
    el.innerHTML = html;
}

function exportPhotoCard() {
    if (!window._lastHatchPhoto) { showToast("Hatch something first!", 2000); return; }
    const p = window._lastHatchPhoto;
    const canvas = document.createElement("canvas");
    canvas.width = 400; canvas.height = 220;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1a0a38";
    ctx.fillRect(0, 0, 400, 220);
    ctx.fillStyle = p.color || "#fff";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.emoji || "🐾", 200, 90);
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(p.name, 200, 140);
    ctx.fillStyle = p.color;
    ctx.font = "16px sans-serif";
    ctx.fillText(p.rarity, 200, 170);
    const a = document.createElement("a");
    a.download = "fart-hatch.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    showToast("📸 Photo saved!", 2000);
}

function savePhotoHatch(pet) {
    const r = RARITY[pet.rarity] || RARITY.common;
    window._lastHatchPhoto = { name: pet.name, emoji: pet.emoji, rarity: r.label, color: r.color };
}

// ---------- HUB RENDER ----------
function showHubTab(name, btn) {
    document.querySelectorAll("#sheet-hub .hub-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll("#sheet-hub .hstab").forEach(b => b.classList.remove("active"));
    const tab = document.getElementById("hub-" + name);
    if (tab) tab.classList.add("active");
    if (btn) btn.classList.add("active");
    if (name === "achievements") renderAchievements();
    if (name === "quests") renderQuests();
    if (name === "garden") renderGarden();
    if (name === "stocks") renderStocks();
    if (name === "ascension") renderAscension();
    if (name === "stats") renderStats();
    if (name === "invasion") renderInvasion();
    if (name === "season" && typeof renderSeasonPass === "function") renderSeasonPass();
    if (typeof updateHubNavBadge === "function") updateHubNavBadge();
}

function renderHub() { showHubTab("achievements", document.querySelector("#sheet-hub .hstab")); }

function initMeta() {
    ensureMeta();
    initAchievementList();
    rollQuests();
    currentMemePet();
    if (!document.getElementById("hidden-world-btns")) {
        const bg = document.getElementById("animated-bg");
        if (bg) {
            const wrap = document.createElement("div");
            wrap.id = "hidden-world-btns";
            wrap.className = "hidden-secrets";
            WORLDS.forEach((w, i) => {
                const b = document.createElement("button");
                b.className = "hidden-secret-btn";
                b.title = "???";
                b.style.left = (8 + (i * 17) % 80) + "%";
                b.style.top = (12 + (i * 23) % 70) + "%";
                b.onclick = () => onHiddenWorldClick(i);
                wrap.appendChild(b);
            });
            bg.appendChild(wrap);
        }
    }
    if (!document.getElementById("toilet-secret")) {
        const zone = document.querySelector(".clicker-zone");
        if (zone) {
            const toilet = document.createElement("button");
            toilet.id = "toilet-secret";
            toilet.className = "toilet-secret-btn hidden";
            toilet.textContent = "🚽";
            toilet.title = "???";
            zone.appendChild(toilet);
        }
    }
    setInterval(() => {
        tickStocks();
        maybeStartInvasion();
        const toilet = document.getElementById("toilet-secret");
        if (toilet) toilet.classList.toggle("hidden", game.worldIdx !== 2);
    }, 10000);
}

function saveSlotExport(slot) {
    const m = ensureMeta();
    m.saveSlots[slot] = JSON.stringify(game);
    localStorage.setItem("fartSlot_" + slot, m.saveSlots[slot]);
    showToast("💾 Saved to slot " + slot, 2000);
    saveGame();
    if (typeof renderSaveSlotsUI === "function") renderSaveSlotsUI();
}

function saveSlotLoad(slot) {
    const raw = localStorage.getItem("fartSlot_" + slot) || ensureMeta().saveSlots[slot];
    if (!raw) { showToast("Empty slot", 1800); return; }
    try {
        game = Object.assign(freshGameState(), JSON.parse(raw));
        sanitizeGameState();
        if (typeof initMeta === "function") initMeta();
        showToast("📂 Loaded slot " + slot, 2000);
        location.reload();
    } catch (e) { sfxError(); }
}
