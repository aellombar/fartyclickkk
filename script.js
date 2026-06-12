/* ============================================================
   FART CLICKER: BRAINROT EDITION — single-file logic
   Features: phonk track rotation, egg FX, pet fusion, pet index,
   prestige (Aura), combo, golden farts, offline earnings.
   ============================================================ */

// ---------- Game State ----------
function freshGameState() {
    return {
        points: 0,
        baseClickPower: 1,
        rebirths: 0,
        worldIdx: 0,
        upgrades: {},
        pets: [],
        equippedPets: [],
        maxPets: 3,
        totalClicks: 0,
        totalEarned: 0,
        aura: 0,
        auraUpgrades: {},
        discovered: {},
        redeemedCodes: {},
        lastSeen: Date.now(),
        settings: {
            musicVol: 0.35, sfxVol: 0.70,
            musicOn: true, particles: true, screenShake: true, brainrot: true
        }
    };
}
let game = freshGameState();

// runtime (not saved)
let spamMultiplier = 1, clickStreak = 0, lastClickTime = 0, criticalMultiplier = 1;
let comboValue = 0, comboDecayTimer = null;
let upgradesRendered = false, audioStarted = false, hatchActive = false;
let audioCtx = null, pendingHatch = null;
let petTabCur = "collection", indexWorld = 0;
let buyMode = 1; // 1, 10, 100, or "max"

const domCache = Object.create(null);
const textCache = Object.create(null);
const FX_NODE_LIMIT = 260;
let fxNodeCount = 0;

function byId(id) {
    const cached = domCache[id];
    if (cached && cached.isConnected) return cached;
    const node = document.getElementById(id);
    if (node) domCache[id] = node;
    return node;
}

function appendFxNode(parent, node, ttl, important) {
    if (!parent || !node) return false;
    if (!important && fxNodeCount >= FX_NODE_LIMIT) return false;
    fxNodeCount++;
    parent.appendChild(node);
    setTimeout(() => {
        if (node.isConnected) node.remove();
        fxNodeCount = Math.max(0, fxNodeCount - 1);
    }, ttl);
    return true;
}


// ---------- 20 Worlds ----------
const WORLDS = [
    { name: "Basement",         reqRebirths: 0,    icon: "🏚️", theme: { p:"#7FFF00", s:"#B14EFF", a:"#00E0FF", bg1:"#160a2e", bg2:"#08040f" } },
    { name: "Sewer Tunnels",    reqRebirths: 3,    icon: "🕳️", theme: { p:"#8db300", s:"#5a7d2c", a:"#a0ffaa", bg1:"#1a2a14", bg2:"#0a1408" } },
    { name: "Skibidi Toilet",   reqRebirths: 8,    icon: "🚽", theme: { p:"#5dd2ff", s:"#ffffff", a:"#ffd54a", bg1:"#0e2236", bg2:"#06121f" } },
    { name: "Rizz Dojo",        reqRebirths: 16,   icon: "😎", theme: { p:"#ff3d9a", s:"#ff6b35", a:"#ffd54a", bg1:"#2e0a1c", bg2:"#170510" } },
    { name: "Ohio",             reqRebirths: 28,   icon: "🌽", theme: { p:"#ffd54a", s:"#ff8a3d", a:"#7fff00", bg1:"#2e1f08", bg2:"#170f04" } },
    { name: "Outer Space",      reqRebirths: 45,   icon: "🚀", theme: { p:"#5d8eff", s:"#b14eff", a:"#00e0ff", bg1:"#0a0a3a", bg2:"#04041a" } },
    { name: "Gyatt Canyon",     reqRebirths: 68,   icon: "🏜️", theme: { p:"#ff8a3d", s:"#ffd54a", a:"#ff3d9a", bg1:"#3a1808", bg2:"#1a0a04" } },
    { name: "Nether Realm",     reqRebirths: 98,   icon: "🔥", theme: { p:"#ff3030", s:"#ff8030", a:"#ffd54a", bg1:"#2a0606", bg2:"#140303" } },
    { name: "Sigma City",       reqRebirths: 136,  icon: "🏙️", theme: { p:"#c0c0d0", s:"#00e0ff", a:"#ffffff", bg1:"#1a1a2a", bg2:"#0a0a14" } },
    { name: "Dimension X",      reqRebirths: 182,  icon: "🛸", theme: { p:"#7fff80", s:"#00ff80", a:"#b14eff", bg1:"#0e2410", bg2:"#061206" } },
    { name: "Quantum Realm",    reqRebirths: 238,  icon: "⚛️", theme: { p:"#00e0ff", s:"#5d8eff", a:"#ffd54a", bg1:"#0a1a3a", bg2:"#04081a" } },
    { name: "Grimace Shake",    reqRebirths: 305,  icon: "🟣", theme: { p:"#a040ff", s:"#ff3d9a", a:"#ffd54a", bg1:"#2a0a3a", bg2:"#14041a" } },
    { name: "Mewing Heights",   reqRebirths: 385,  icon: "☁️", theme: { p:"#bfdfff", s:"#7fa8ff", a:"#ffffff", bg1:"#1a2840", bg2:"#0a141f" } },
    { name: "Inferno Depths",   reqRebirths: 480,  icon: "👹", theme: { p:"#ff2020", s:"#ff5010", a:"#ffd54a", bg1:"#1a0202", bg2:"#0a0101" } },
    { name: "Crystal Cavern",   reqRebirths: 590,  icon: "💎", theme: { p:"#40ffd0", s:"#80ffff", a:"#b14eff", bg1:"#0a2828", bg2:"#041414" } },
    { name: "Mirror Dimension", reqRebirths: 720,  icon: "🪞", theme: { p:"#e0e0ff", s:"#a0a0ff", a:"#ff3d9a", bg1:"#1a1a30", bg2:"#0a0a18" } },
    { name: "Galactic Core",    reqRebirths: 870,  icon: "🌌", theme: { p:"#ffd54a", s:"#b14eff", a:"#00e0ff", bg1:"#0a0428", bg2:"#040214" } },
    { name: "Time Rift",        reqRebirths: 1050, icon: "⏳", theme: { p:"#ffe080", s:"#40ffd0", a:"#ff3d9a", bg1:"#2a200a", bg2:"#141004" } },
    { name: "Gigachad Nexus",   reqRebirths: 1260, icon: "💪", theme: { p:"#ff1050", s:"#ffd54a", a:"#00e0ff", bg1:"#2a0820", bg2:"#140410" } },
    { name: "The Final Stench", reqRebirths: 1500, icon: "👑", theme: { p:"#ffd700", s:"#ff00ff", a:"#00ffd0", bg1:"#1a001a", bg2:"#0a000a" } }
];

// ---------- Number format (NaN-safe) ----------
function fmt(num) {
    if (num === undefined || num === null || isNaN(num)) return "0";
    const a = Math.abs(num);
    if (a < 1000) return Math.floor(num).toString();
    const u = ["K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc","Ud","Dd"];
    let t = Math.floor(Math.log10(a) / 3);
    if (t > u.length) return num.toExponential(2);
    return (num / Math.pow(1000, t)).toFixed(2).replace(/\.?0+$/, '') + u[t - 1];
}

// ---------- Icon atlas (121 unique transparent icons) ----------
const ICON_ATLAS = { cols: 12, rows: 11, cell: 128 };
const ICON_BY_EMOJI = {
    "💨":0, "🛒":1, "🐾":2, "🌍":3, "✦":4, "🚽":5, "🥚":6, "👑":7, "•":8,
    "⏳":9, "☁️":10, "☢️":11, "☣️":12, "♾️":13, "⚛️":14, "⚡":15, "✨":16, "⭐":17,
    "🌀":18, "🌊":19, "🌌":20, "🌟":21, "🌪️":22, "🌬️":23, "🌮":24, "🌰":25, "🌱":26,
    "🌽":27, "🌾":28, "🌿":29, "🍀":30, "🍄":31, "🍈":32, "🍑":33, "🍔":34, "🏆":35,
    "🏇":36, "🏋️":37, "🏙️":38, "🏚️":39, "🏜️":40, "🏭":41, "🐀":42, "🐉":43, "🐊":44,
    "🐌":45, "🐍":46, "🐕":47, "🐣":48, "🐭":49, "🐰":50, "🐲":51, "🐸":52, "🐺":53,
    "👁️":54, "👟":55, "👹":56, "👺":57, "👻":58, "👾":59, "💀":60, "💅":61, "💎":62,
    "💚":63, "💜":64, "💞":65, "💥":66, "💩":67, "💪":68, "💫":69, "💻":70, "📡":71,
    "📴":72, "🔄":73, "🔥":74, "🔧":75, "🔬":76, "🔮":77, "🔯":78, "🔱":79, "🔷":80,
    "🕊️":81, "🕰️":82, "🕳️":83, "🗣️":84, "🗿":85, "😇":86, "😈":87, "😎":88, "😏":89,
    "😐":90, "😤":91, "😰":92, "😶":93, "😺":94, "🚀":95, "🚿":96, "🛸":97, "🟢":98,
    "🟣":99, "🟤":100, "🤔":101, "🤖":102, "🤢":103, "🥋":104, "🥬":105, "🦀":106,
    "🦁":107, "🦊":108, "🦌":109, "🦎":110, "🧙":111, "🧛":112, "🧟":113, "🧲":114,
    "🪐":115, "🪞":116, "🪠":117, "🪣":118, "🪲":119, "🪺":120
};
function iconIndex(value) {
    if (value && ICON_BY_EMOJI[value] !== undefined) return ICON_BY_EMOJI[value];
    return ICON_BY_EMOJI["💨"];
}
function escAttr(s) {
    return String(s || "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function iconHTML(value, cls, label) {
    const idx = iconIndex(value);
    const col = idx % ICON_ATLAS.cols;
    const row = Math.floor(idx / ICON_ATLAS.cols);
    return '<span class="game-icon' + (cls ? ' ' + cls : '') + '" style="--ix:' + col + ';--iy:' + row + '" role="img" aria-label="' + escAttr(label || value || "icon") + '"></span>';
}
function iconOrTextHTML(value, cls, label) {
    if (ICON_BY_EMOJI[value] !== undefined) return iconHTML(value, cls, label);
    return escAttr(value || "");
}
function setIconNode(el, value, cls, label) {
    if (!el) return;
    el.innerHTML = iconOrTextHTML(value, cls, label);
}
function applyChromeIcons() {
    const logo = document.querySelector(".logo-mini .logo-icon-img");
    if (logo) logo.outerHTML = iconHTML("💨", "logo-icon-img", "Fart Clicker");
    const main = document.querySelector(".main-icon-img");
    if (main) main.outerHTML = iconHTML("💨", "main-icon-img", "Click");
    const offline = document.querySelector(".offline-icon-img");
    if (offline) offline.outerHTML = iconHTML("💨", "offline-icon-img", "Offline stink");
    [["upgrades","🛒"],["pets","🐾"],["worlds","🌍"],["aura","✦"]].forEach(([sheet, emoji]) => {
        const wrap = document.querySelector('.nav-btn[data-sheet="' + sheet + '"] .nav-ico');
        if (wrap) wrap.innerHTML = iconHTML(emoji, "nav-icon-img", sheet);
    });
}


// ---------- Upgrades (brainrot themed) ----------
const UPGRADES = [
    { name: "Fart Bean",          baseCost: 15,            clickPower: 1,          type: "click", icon: "🌱" },
    { name: "Rizzler Cabbage",    baseCost: 100,           clickPower: 4,          type: "click", icon: "🥬" },
    { name: "Taco Bomb",          baseCost: 600,           clickPower: 18,         type: "click", icon: "🌮" },
    { name: "Skibidi Gas",        baseCost: 3500,          clickPower: 70,         type: "click", icon: "🚽" },
    { name: "Gyatt Blast",        baseCost: 20000,         clickPower: 300,        type: "click", icon: "🍑" },
    { name: "Fanum Tax Fart",     baseCost: 120000,        clickPower: 1300,       type: "click", icon: "🍔" },
    { name: "Sigma Stench",       baseCost: 750000,        clickPower: 5500,       type: "click", icon: "😤" },
    { name: "Durian Nuke",        baseCost: 4500000,       clickPower: 24000,      type: "click", icon: "🍈" },
    { name: "Ohio Cannon",        baseCost: 28000000,      clickPower: 110000,     type: "click", icon: "🌽" },
    { name: "Mewing Methane",     baseCost: 180000000,     clickPower: 520000,     type: "click", icon: "😐" },
    { name: "Grimace Eruption",   baseCost: 1200000000,    clickPower: 2500000,    type: "click", icon: "🟣" },
    { name: "Gigachad Surge",     baseCost: 8000000000,    clickPower: 12500000,   type: "click", icon: "💪" },
    { name: "Quantum Flatulence", baseCost: 55000000000,   clickPower: 65000000,   type: "click", icon: "⚛️" },
    { name: "Apocalyptic Gas",    baseCost: 400000000000,  clickPower: 350000000,  type: "click", icon: "☢️" },
    { name: "Reality Fart",       baseCost: 3000000000000, clickPower: 2000000000, type: "click", icon: "🌊" },
    { name: "Sus Fan",            baseCost: 50,            passivePower: 1,        type: "passive", icon: "📴" },
    { name: "NPC Blower",         baseCost: 400,           passivePower: 6,        type: "passive", icon: "🤖" },
    { name: "Industrial Vent",    baseCost: 2500,          passivePower: 28,       type: "passive", icon: "🏭" },
    { name: "Wind Turbine",       baseCost: 15000,         passivePower: 130,      type: "passive", icon: "🌬️" },
    { name: "Tornado Gen",        baseCost: 90000,         passivePower: 600,      type: "passive", icon: "🌪️" },
    { name: "Sheesh Cannon",      baseCost: 550000,        passivePower: 2800,     type: "passive", icon: "🗣️" },
    { name: "Stink Reactor",      baseCost: 3400000,       passivePower: 13000,    type: "passive", icon: "☣️" },
    { name: "Nuclear Plant",      baseCost: 21000000,      passivePower: 62000,    type: "passive", icon: "⚡" },
    { name: "Black Hole Gen",     baseCost: 140000000,     passivePower: 300000,   type: "passive", icon: "🕳️" },
    { name: "Galaxy Engine",      baseCost: 950000000,     passivePower: 1500000,  type: "passive", icon: "🌌" },
    { name: "Supernova Core",     baseCost: 6500000000,    passivePower: 7500000,  type: "passive", icon: "💥" },
    { name: "Quantum CPU",        baseCost: 45000000000,   passivePower: 38000000, type: "passive", icon: "💻" },
    { name: "Cosmic Amp",         baseCost: 320000000000,  passivePower: 200000000,type: "passive", icon: "📡" },
    { name: "Dimension Pump",     baseCost: 2300000000000, passivePower: 1100000000,type:"passive", icon: "🔄" },
    { name: "Reality Warper",     baseCost: 17000000000000,passivePower: 6000000000,type:"passive", icon: "✨" },
    // more click upgrades
    { name: "Skibidi Singularity",baseCost: 22000000000000,   clickPower: 11000000000,  type: "click", icon: "🌀" },
    { name: "Mewing Mastery",     baseCost: 150000000000000,  clickPower: 65000000000,  type: "click", icon: "😶" },
    { name: "Aura Overload",      baseCost: 1100000000000000, clickPower: 380000000000, type: "click", icon: "🔮" },
    { name: "NPC Apocalypse",     baseCost: 8000000000000000, clickPower: 2200000000000,type: "click", icon: "🧟" },
    { name: "Final Boss Fart",    baseCost: 60000000000000000,clickPower: 13000000000000,type:"click", icon: "👹" },
    { name: "Omega Rizz",         baseCost: 450000000000000000,clickPower:78000000000000,type:"click", icon: "💞" },
    // more passive upgrades
    { name: "Multiverse Pump",    baseCost: 130000000000000,  passivePower: 35000000000,  type: "passive", icon: "🪐" },
    { name: "Infinity Reactor",   baseCost: 900000000000000,  passivePower: 200000000000, type: "passive", icon: "♾️" },
    { name: "Aura Generator",     baseCost: 6500000000000000, passivePower: 1200000000000,type: "passive", icon: "🔯" },
    { name: "Cosmic Singularity", baseCost: 48000000000000000,passivePower: 7000000000000,type: "passive", icon: "🌟" },
    { name: "Omega Stench Engine",baseCost: 340000000000000000,passivePower:42000000000000,type:"passive",icon: "👑" }
];

const PET_SLOTS = [
    { slot: 4,  cost: 5000000,            reqRebirths: 1 },
    { slot: 5,  cost: 400000000,          reqRebirths: 3 },
    { slot: 6,  cost: 35000000000,        reqRebirths: 6 },
    { slot: 7,  cost: 3000000000000,      reqRebirths: 10 },
    { slot: 8,  cost: 280000000000000,    reqRebirths: 16 },
    { slot: 9,  cost: 25000000000000000,  reqRebirths: 24 },
    { slot: 10, cost: 2400000000000000000,reqRebirths: 34 },
    { slot: 11, cost: 2.2e23,             reqRebirths: 48 },
    { slot: 12, cost: 2e26,               reqRebirths: 64 }
];

// ---------- Prestige: Aura upgrades (permanent) ----------
const AURA_UPGRADES = [
    { name: "Sigma Click Aura", icon: "😤", base: 2, effect: "click",    per: 0.25, desc: "+25% click power / level" },
    { name: "Passive Aura",     icon: "🌬️", base: 2, effect: "passive",  per: 0.25, desc: "+25% passive income / level" },
    { name: "Lucky Aura",       icon: "🍀", base: 5, effect: "luck",     per: 1,    desc: "+1 luck roll on eggs / level" },
    { name: "Golden Aura",      icon: "🌟", base: 4, effect: "golden",   per: 0.5,  desc: "Golden farts: +50% reward / level" },
    { name: "Aura Magnet",      icon: "🧲", base: 8, effect: "auragain", per: 0.25, desc: "+25% Aura per rebirth / level" },
    { name: "Combo Master",     icon: "🔥", base: 6, effect: "combo",    per: 0.30, desc: "Combo builds +30% faster / level" },
    { name: "Triple Hatch",     icon: "🥚", base: 60, effect: "multi",   per: 1,    desc: "Unlock Open x3 eggs at once", max: 1 },
    { name: "Mega Hatch",       icon: "🪺", base: 400, effect: "mega",    per: 1,    desc: "Unlock Open x10 eggs at once", max: 1 }
];


// ---------- Rarity + Eggs ----------
const RARITY = {
    common:    { label: "Common",    color: "#9fb0c9", tier: 0 },
    rare:      { label: "Rare",      color: "#3da5ff", tier: 1 },
    epic:      { label: "Epic",      color: "#b14eff", tier: 2 },
    legendary: { label: "Legendary", color: "#ffd54a", tier: 3 },
    mythic:    { label: "MYTHIC",    color: "#ff3d9a", tier: 4 },
    secret:    { label: "✦ SECRET ✦",color: "#00ffd0", tier: 5 }
};

// ---------- Per-world egg sets — each world has 3 unique eggs with unique pets ----------
const WORLD_EGGS = [
    // 0 Basement
    [{ id:"common",  name:"Musty Egg",      emoji:"🥚", color:"#9fb0c9", baseCost:800,   growth:2.2, pets:[
        {name:"Toot",        base:1.1, odds:45, rarity:"common",    emoji:"💨"},
        {name:"Squeaker",    base:1.3, odds:30, rarity:"common",    emoji:"🐭"},
        {name:"Puff",        base:1.8, odds:18, rarity:"rare",      emoji:"☁️"},
        {name:"Skibidi Jr",  base:3.0, odds:6,  rarity:"epic",      emoji:"🚽"},
        {name:"Gigachad",    base:6.0, odds:1,  rarity:"legendary", emoji:"💪"}]},
     {id:"rare",    name:"Dank Egg",       emoji:"🟤", color:"#8B6914", baseCost:12000,  growth:2.4, pets:[
        {name:"Basement Rat",base:2.4, odds:45, rarity:"rare",      emoji:"🐀"},
        {name:"Drain Snake", base:3.6, odds:30, rarity:"rare",      emoji:"🐍"},
        {name:"Mold Demon",  base:5.5, odds:18, rarity:"epic",      emoji:"🍄"},
        {name:"Sewer Lord",  base:9.0, odds:6,  rarity:"legendary", emoji:"🕳️"},
        {name:"Bruh Beast",  base:18.0,odds:1,  rarity:"mythic",    emoji:"😤"}]},
     {id:"legendary",name:"Sigma Egg",     emoji:"🗿", color:"#ffd54a", baseCost:90000,  growth:2.6, pets:[
        {name:"Grind Ghost", base:7.0, odds:44, rarity:"epic",      emoji:"👻"},
        {name:"Hustle Hound",base:12.0,odds:30, rarity:"legendary", emoji:"🐕"},
        {name:"Sigma Wolf",  base:22.0,odds:18, rarity:"legendary", emoji:"🐺"},
        {name:"Ohio Boss",   base:45.0,odds:7,  rarity:"mythic",    emoji:"🌽"},
        {name:"NPC God",     base:120.0,odds:1, rarity:"secret",    emoji:"🗿"}]}],
    // 1 Sewer Tunnels
    [{ id:"common",  name:"Slime Egg",      emoji:"🥚", color:"#8db300", baseCost:800,   growth:2.2, pets:[
        {name:"Drain Bug",   base:1.1, odds:45, rarity:"common",    emoji:"🪲"},
        {name:"Sewer Rat",   base:1.3, odds:30, rarity:"common",    emoji:"🐀"},
        {name:"Slime Pup",   base:1.8, odds:18, rarity:"rare",      emoji:"🐸"},
        {name:"Gunk Golem",  base:3.0, odds:6,  rarity:"epic",      emoji:"🤢"},
        {name:"Pipe Master", base:6.0, odds:1,  rarity:"legendary", emoji:"🔧"}]},
     {id:"rare",    name:"Muck Egg",       emoji:"🟢", color:"#4a8c00", baseCost:12000,  growth:2.4, pets:[
        {name:"Tunnel Toad", base:2.4, odds:45, rarity:"rare",      emoji:"🐊"},
        {name:"Sludge Sprite",base:3.6,odds:30, rarity:"rare",      emoji:"💚"},
        {name:"Moss Monk",   base:5.5, odds:18, rarity:"epic",      emoji:"🌿"},
        {name:"Sewage Sage", base:9.0, odds:6,  rarity:"legendary", emoji:"🧙"},
        {name:"Grime Titan", base:18.0,odds:1,  rarity:"mythic",    emoji:"🏚️"}]},
     {id:"legendary",name:"Toxic Egg",     emoji:"☣️", color:"#a0ffaa", baseCost:90000,  growth:2.6, pets:[
        {name:"Toxin Drake", base:7.0, odds:44, rarity:"epic",      emoji:"🐉"},
        {name:"Waste Wraith",base:12.0,odds:30, rarity:"legendary", emoji:"👾"},
        {name:"Neon Newt",   base:22.0,odds:18, rarity:"legendary", emoji:"🦎"},
        {name:"Sewer King",  base:45.0,odds:7,  rarity:"mythic",    emoji:"👑"},
        {name:"The Stench",  base:120.0,odds:1, rarity:"secret",    emoji:"☣️"}]}],
    // 2 Skibidi Toilet
    [{ id:"common",  name:"Toilet Egg",     emoji:"🥚", color:"#5dd2ff", baseCost:800,   growth:2.2, pets:[
        {name:"Flush Pup",   base:1.1, odds:45, rarity:"common",    emoji:"🚿"},
        {name:"Bowl Buddy",  base:1.3, odds:30, rarity:"common",    emoji:"🪣"},
        {name:"Skibidi Jr",  base:1.8, odds:18, rarity:"rare",      emoji:"🚽"},
        {name:"Plunge Lord", base:3.0, odds:6,  rarity:"epic",      emoji:"🪠"},
        {name:"Toilet God",  base:6.0, odds:1,  rarity:"legendary", emoji:"💪"}]},
     {id:"rare",    name:"Rizz Egg",       emoji:"😎", color:"#ffffff", baseCost:12000,  growth:2.4, pets:[
        {name:"Rizz Rookie", base:2.4, odds:45, rarity:"rare",      emoji:"😏"},
        {name:"Swagger Cat", base:3.6, odds:30, rarity:"rare",      emoji:"😺"},
        {name:"Drip Demon",  base:5.5, odds:18, rarity:"epic",      emoji:"👟"},
        {name:"W Rizz Wolf", base:9.0, odds:6,  rarity:"legendary", emoji:"🐺"},
        {name:"Rizz God",    base:18.0,odds:1,  rarity:"mythic",    emoji:"😎"}]},
     {id:"legendary",name:"Golden Toilet",  emoji:"🌟", color:"#ffd54a", baseCost:90000,  growth:2.6, pets:[
        {name:"Gyatt Ghost", base:7.0, odds:44, rarity:"epic",      emoji:"👻"},
        {name:"Flush Phoenix",base:12.0,odds:30,rarity:"legendary", emoji:"🔥"},
        {name:"Chrome Commode",base:22.0,odds:18,rarity:"legendary",emoji:"🪞"},
        {name:"Skibidi KING",base:45.0, odds:7, rarity:"mythic",    emoji:"👑"},
        {name:"Skibidi GOD", base:120.0,odds:1, rarity:"secret",    emoji:"🚽"}]}],
    // 3 Rizz Dojo
    [{ id:"common",  name:"Drip Egg",       emoji:"🥚", color:"#ff3d9a", baseCost:800,   growth:2.2, pets:[
        {name:"Swag Slug",   base:1.1, odds:45, rarity:"common",    emoji:"🐌"},
        {name:"Chill Crab",  base:1.3, odds:30, rarity:"common",    emoji:"🦀"},
        {name:"Rizz Rabbit", base:1.8, odds:18, rarity:"rare",      emoji:"🐰"},
        {name:"Drip Dragon", base:3.0, odds:6,  rarity:"epic",      emoji:"🐲"},
        {name:"Sigma Sensei",base:6.0, odds:1,  rarity:"legendary", emoji:"🥋"}]},
     {id:"rare",    name:"Gyatt Egg",      emoji:"🍑", color:"#ff6b35", baseCost:12000,  growth:2.4, pets:[
        {name:"Gyatt Goblin",base:2.4, odds:45, rarity:"rare",      emoji:"👺"},
        {name:"Thicc Toad",  base:3.6, odds:30, rarity:"rare",      emoji:"🐸"},
        {name:"Slay Sphinx", base:5.5, odds:18, rarity:"epic",      emoji:"🦁"},
        {name:"W Rizz Rider",base:9.0, odds:6,  rarity:"legendary", emoji:"🏇"},
        {name:"Rizz Titan",  base:18.0,odds:1,  rarity:"mythic",    emoji:"🗿"}]},
     {id:"legendary",name:"Aura Egg",      emoji:"✨", color:"#ffd54a", baseCost:90000,  growth:2.6, pets:[
        {name:"Aura Angel",  base:7.0, odds:44, rarity:"epic",      emoji:"😇"},
        {name:"Vibe Vampire",base:12.0,odds:30, rarity:"legendary", emoji:"🧛"},
        {name:"Drip Deity",  base:22.0,odds:18, rarity:"legendary", emoji:"💅"},
        {name:"Rizz Reaper", base:45.0,odds:7,  rarity:"mythic",    emoji:"💀"},
        {name:"The Rizzler", base:120.0,odds:1, rarity:"secret",    emoji:"😎"}]}],
    // 4 Ohio
    [{ id:"common",  name:"Corn Egg",       emoji:"🌽", color:"#ffd54a", baseCost:800,   growth:2.2, pets:[
        {name:"Corn Cob",    base:1.1, odds:45, rarity:"common",    emoji:"🌽"},
        {name:"Flat Fox",    base:1.3, odds:30, rarity:"common",    emoji:"🦊"},
        {name:"Ohio Deer",   base:1.8, odds:18, rarity:"rare",      emoji:"🦌"},
        {name:"Buckeye Beast",base:3.0,odds:6,  rarity:"epic",      emoji:"🌰"},
        {name:"Ohio Legend", base:6.0, odds:1,  rarity:"legendary", emoji:"🏆"}]},
     {id:"rare",    name:"Only In Ohio",   emoji:"🤔", color:"#ff8a3d", baseCost:12000,  growth:2.4, pets:[
        {name:"Ohio Cryptid",base:2.4, odds:45, rarity:"rare",      emoji:"👁️"},
        {name:"Midwest Myth",base:3.6, odds:30, rarity:"rare",      emoji:"🌀"},
        {name:"Corn Golem",  base:5.5, odds:18, rarity:"epic",      emoji:"🌾"},
        {name:"Buckeye God", base:9.0, odds:6,  rarity:"legendary", emoji:"🌰"},
        {name:"Ohio Omen",   base:18.0,odds:1,  rarity:"mythic",    emoji:"😰"}]},
     {id:"legendary",name:"Rare Ohio Egg", emoji:"🌟", color:"#7fff00", baseCost:90000,  growth:2.6, pets:[
        {name:"Corn King",   base:7.0, odds:44, rarity:"epic",      emoji:"👑"},
        {name:"Ohio Oracle", base:12.0,odds:30, rarity:"legendary", emoji:"🔮"},
        {name:"Flat Earth God",base:22.0,odds:18,rarity:"legendary",emoji:"🌍"},
        {name:"Ohio Overlord",base:45.0,odds:7, rarity:"mythic",    emoji:"😤"},
        {name:"Only In Ohio",base:120.0,odds:1, rarity:"secret",    emoji:"🌽"}]}],
    // 5-19: generate remaining worlds procedurally with unique names
];

// Fill worlds 5-19 with unique themed pet sets
const WORLD_PET_THEMES = [
    { world:"Outer Space",   c:["Space Slug","Moon Mutt","Comet Cat"],     r:["Nebula Newt","Star Shark","Void Viper"],   l:["Pulsar Pup","Quasar Queen","Galaxy Ghost","Black Hole Bear","The Void"],       ce:"🚀",re:"⭐",le:"🌌", cc:"#5d8eff",rc:"#b14eff",lc:"#00e0ff" },
    { world:"Gyatt Canyon",  c:["Dust Bunny","Canyon Cat","Rock Rat"],     r:["Mesa Monster","Gulch Ghost","Dune Drake"], l:["Canyon Colossus","Sandstorm Sage","Desert Deity","Mirage Master","The Gyatt"],   ce:"🏜️",re:"🔥",le:"🌟", cc:"#ff8a3d",rc:"#ffd54a",lc:"#ff3d9a" },
    { world:"Nether Realm",  c:["Ember Imp","Cinder Cat","Ash Ant"],       r:["Flame Fox","Lava Lizard","Blaze Bear"],    l:["Inferno Idol","Magma Monk","Hellfire Hound","Brimstone Boss","The Infernal"],    ce:"🔥",re:"😈",le:"👹", cc:"#ff3030",rc:"#ff8030",lc:"#ffd54a" },
    { world:"Sigma City",    c:["Grid Gecko","Pixel Pup","Byte Bug"],      r:["Chrome Cat","Neon Newt","Data Drake"],     l:["Silicon Sage","Cyber Colossus","Quantum Cat","Matrix Master","The Algorithm"],   ce:"🏙️",re:"💻",le:"🌟", cc:"#c0c0d0",rc:"#00e0ff",lc:"#ffffff" },
    { world:"Dimension X",   c:["Glitch Gnat","Phase Pup","Warp Worm"],    r:["Rift Raven","Void Vole","Portal Panther"],l:["Dimension Drake","Phase Phantom","Reality Ripper","Nexus Noble","The Glitch"],    ce:"🛸",re:"🌀",le:"💥", cc:"#7fff80",rc:"#00ff80",lc:"#b14eff" },
    { world:"Quantum Realm", c:["Quark Cat","Boson Bug","Lepton Lizard"],  r:["Photon Fox","Neutrino Newt","Higgs Hound"],l:["Quantum Queen","Superstring Sage","Entangle Eagle","Wave Wolf","The Collapse"],   ce:"⚛️",re:"🔬",le:"🌌", cc:"#00e0ff",rc:"#5d8eff",lc:"#ffd54a" },
    { world:"Grimace Shake", c:["Purple Pup","Grape Ghost","Plum Pixie"],  r:["Violet Viper","Mauve Monster","Lilac Lord"],l:["Grimace God","Purple Phantom","Grape Titan","Violet Void","The Grimace"],        ce:"🟣",re:"💜",le:"🌟", cc:"#a040ff",rc:"#ff3d9a",lc:"#ffd54a" },
    { world:"Mewing Heights",c:["Cloud Cat","Sky Slug","Mist Mutt"],       r:["Nimbus Newt","Cirrus Crow","Stratus Snake"],l:["Heaven Hound","Celestial Cat","Sky Sovereign","Cloud Colossus","The Mewer"],     ce:"☁️",re:"🕊️",le:"✨", cc:"#bfdfff",rc:"#7fa8ff",lc:"#ffffff" },
    { world:"Inferno Depths",c:["Char Crab","Scorch Slug","Ember Eel"],    r:["Magma Mantis","Inferno Imp","Forge Fox"],  l:["Hellbound Hound","Brimstone Bird","Lava Lord","Inferno Idol","The Eternal Flame"], ce:"👹",re:"🔥",le:"💀", cc:"#ff2020",rc:"#ff5010",lc:"#ffd54a" },
    { world:"Crystal Cavern",c:["Gem Gnat","Shard Shrew","Quartz Quail"],  r:["Crystal Cat","Prism Pup","Diamond Drake"], l:["Gemstone Giant","Crystal Colossus","Prism Phantom","Jewel Jaguar","The Gem God"],  ce:"💎",re:"🔷",le:"🌟", cc:"#40ffd0",rc:"#80ffff",lc:"#b14eff" },
    { world:"Mirror Dim.",   c:["Echo Eel","Reflect Rat","Clone Cat"],     r:["Mirror Monster","Shadow Sprite","Twin Tiger"],l:["Reflection Reaper","Clone Colossus","Mirror Master","Doppel Deity","The Mirror"],ce:"🪞",re:"👁️",le:"✨", cc:"#e0e0ff",rc:"#a0a0ff",lc:"#ff3d9a" },
    { world:"Galactic Core", c:["Stardust Slug","Pulsar Pup","Comet Cat"], r:["Galaxy Gecko","Quasar Quail","Nova Newt"],  l:["Cosmic Colossus","Galactic God","Stellar Sage","Universe Unicorn","The Cosmos"],  ce:"🌌",re:"⭐",le:"🌟", cc:"#ffd54a",rc:"#b14eff",lc:"#00e0ff" },
    { world:"Time Rift",     c:["Chrono Cat","Epoch Eel","Era Eagle"],     r:["Temporal Tiger","Paradox Pup","Loop Lizard"],l:["Time Lord","Chrono Colossus","Epoch Entity","Paradox Phantom","The Timeless"],   ce:"⏳",re:"🕰️",le:"✨", cc:"#ffe080",rc:"#40ffd0",lc:"#ff3d9a" },
    { world:"Gigachad Nexus",c:["Flex Frog","Gains Gecko","Pump Pup"],     r:["Bulk Beast","Mass Monster","Iron Imp"],    l:["Gigachad Ghost","Max Muscle","Ultra Gains","Omega Lifter","THE GIGACHAD"],        ce:"💪",re:"🏋️",le:"🌟", cc:"#ff1050",rc:"#ffd54a",lc:"#00e0ff" },
    { world:"Final Stench",  c:["Doom Dog","End Eagle","Last Lizard"],     r:["Omega Ooze","Final Fox","Last Light"],     l:["Apocalypse Angel","Armageddon Ant","Omega Oracle","End Entity","THE FINAL ONE"],   ce:"👑",re:"💀",le:"✨", cc:"#ffd700",rc:"#ff00ff",lc:"#00ffd0" },
];

// Build WORLD_EGGS entries 5-19 from themes
WORLD_PET_THEMES.forEach((t, i) => {
    const w = i + 5;
    const mk = (names, emojis, bases, odds, rarities) => names.map((n,j) => ({name:n, base:bases[j], odds:odds[j], rarity:rarities[j], emoji:emojis[j]}));
    WORLD_EGGS[w] = [
        { id:"common",    name:t.world+" Egg",        emoji:t.ce, color:t.cc, baseCost:800,   growth:2.2, pets:mk(
            [t.c[0],t.c[1],t.c[2],t.c[0]+" Elite",t.r[0]],
            ["🐣","🐾","✨","⚡","🌟"],
            [1.1,1.3,1.8,3.0,6.0],[45,30,18,6,1],["common","common","rare","epic","legendary"]) },
        { id:"rare",      name:t.world+" Rare Egg",   emoji:t.re, color:t.rc, baseCost:12000,  growth:2.4, pets:mk(
            [t.r[0],t.r[1],t.r[2],t.l[0],t.l[1]],
            ["💫","🔥","🌀","👑","💎"],
            [2.4,3.6,5.5,9.0,18.0],[45,30,18,6,1],["rare","rare","epic","legendary","mythic"]) },
        { id:"legendary", name:t.world+" Legend Egg", emoji:t.le, color:t.lc, baseCost:90000,  growth:2.6, pets:mk(
            [t.l[0],t.l[1],t.l[2],t.l[3],t.l[4]],
            ["🌟","✨","💥","👑","🔱"],
            [7.0,12.0,22.0,45.0,120.0],[44,30,18,7,1],["epic","legendary","legendary","mythic","secret"]) }
    ];
});

// Current world's egg templates
function getEggTemplates() { return WORLD_EGGS[game.worldIdx] || WORLD_EGGS[0]; }

function eggCost(t, world) {
    const w = Math.max(0, world || 0);
    const base = t.baseCost * Math.pow(t.growth, w);
    const unlockReq = (WORLDS[w] && WORLDS[w].reqRebirths) || 0;
    const unlockPressure = 1 + unlockReq / 20;
    const lateWorldPressure = Math.pow(1.55, (w * w) / 9);
    const tierPressure = t.id === "legendary" ? (1 + w * 0.35) : (t.id === "rare" ? (1 + w * 0.18) : 1);
    return Math.floor(base * unlockPressure * lateWorldPressure * tierPressure);
}
// pet power: flatter base values, gentler world scaling
function petPower(base, world) { return +(Math.sqrt(base) * Math.pow(1.15, world)).toFixed(2); }
function rollBestFromEgg(egg) {
    const tries = 1 + Math.min(auraLevel("luck"), 5);
    let chosen = pickFromEgg(egg);
    for (let k = 1; k < tries; k++) {
        const c = pickFromEgg(egg);
        if (RARITY[c.rarity].tier > RARITY[chosen.rarity].tier) chosen = c;
    }
    return chosen;
}
function allPetsForWorld(w) {
    const eggs = WORLD_EGGS[w !== undefined ? w : (game.worldIdx || 0)] || WORLD_EGGS[0];
    let arr = [];
    eggs.forEach(e => e.pets.forEach(p => arr.push(p)));
    return arr;
}
function dexKey(world, name) { return world + ":" + name; }


// ============================================================
//  AUDIO: multi-track procedural AMBIENT + SFX (WebAudio)
// ============================================================
function getCtx() {
    try {
        // Never create AudioContext before a user gesture — required on iOS
        if (!audioCtx) return null;
        if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { audioCtx = null; }
    return audioCtx;
}
function createCtx() {
    // Call this only from within a user gesture handler
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { audioCtx = null; }
    return audioCtx;
}
let noiseBuffer = null;
function getNoise(ctx) {
    if (noiseBuffer) return noiseBuffer;
    const len = ctx.sampleRate * 0.4;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuffer;
}
function tone(freq, dur, type, vol, slideTo) {
    try {
        const ctx = getCtx(); if (!ctx) return;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, ctx.currentTime);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
        const v = (vol || 0.1) * game.settings.sfxVol;
        g.gain.setValueAtTime(v, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + dur);
    } catch (e) {}
}
function sfxClick()  { tone(520 + Math.random()*80, 0.07, "sine", 0.07, 360); }
function sfxBuy()    { tone(660, 0.10, "sine", 0.09); setTimeout(()=>tone(880,0.12,"sine",0.08),60); setTimeout(()=>tone(1100,0.12,"sine",0.06),130); }
function sfxCrit()   { tone(880, 0.18, "sine", 0.10, 1320); }
function sfxError()  { tone(200, 0.16, "triangle", 0.07, 140); }
function sfxWhoosh() { tone(300, 0.25, "sine", 0.06, 1200); }
function sfxRare(tier) {
    const notes = [523,659,784,1047,1319,1568];
    for (let i = 0; i <= Math.min(tier+1,5); i++) setTimeout(()=>tone(notes[i],0.25,"sine",0.10),i*100);
}


// ============================================================
//  GENERATIVE MUSIC ENGINE — one unique evolving song per world
//  Each song has: intro → verse → chorus → bridge → chorus → outro
//  Total ~3 min, loops seamlessly. 20 world songs.
// ============================================================
function midiHz(s) { return 220 * Math.pow(2, s / 12); }

// ---------- Master audio bus ----------
let masterGain = null, reverbNode = null, reverbSend = null;
function ensureMaster() {
    const ctx = getCtx(); if (!ctx) return null;
    if (masterGain) return masterGain;
    masterGain = ctx.createGain(); masterGain.gain.value = 0.72;
    const warm = ctx.createBiquadFilter(); warm.type = "lowpass"; warm.frequency.value = 5200; warm.Q.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 30; comp.ratio.value = 3;
    comp.attack.value = 0.006; comp.release.value = 0.25;
    masterGain.connect(warm); warm.connect(comp); comp.connect(ctx.destination);
    try {
        reverbNode = ctx.createConvolver();
        const len = ctx.sampleRate * 2.8, buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.2);
        }
        reverbNode.buffer = buf;
        reverbSend = ctx.createGain(); reverbSend.gain.value = 0.38;
        reverbSend.connect(reverbNode); reverbNode.connect(masterGain);
    } catch(e) { reverbNode = null; }
    return masterGain;
}
function routeWet(node) { if (reverbSend) node.connect(reverbSend); }

// ---------- Envelope helper ----------
function vEnv(ctx, peak, atk, dec, t) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec);
    return g;
}

// ---------- Instrument voices ----------
function vPad(ctx, t, freq, vol, master) {
    const g = vEnv(ctx, vol * 0.65, 0.14, 1.4, t);
    [1,2,3].forEach((h,i) => {
        const o = ctx.createOscillator(); o.type = "sine";
        o.frequency.value = freq * h; o.detune.value = (i%2===0?4:-4);
        const hg = ctx.createGain(); hg.gain.value = 1/(i*2+1);
        o.connect(hg); hg.connect(g); o.start(t); o.stop(t+1.6);
    });
    g.connect(master); routeWet(g);
}
function vMarimba(ctx, t, freq, vol, master) {
    const g = vEnv(ctx, vol, 0.002, 0.5, t);
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq*4;
    const g2 = ctx.createGain(); g2.gain.value = 0.07; o2.connect(g2); g2.connect(g);
    o.connect(g); g.connect(master); routeWet(g);
    o.start(t); o2.start(t); o.stop(t+0.55); o2.stop(t+0.55);
}
function vEP(ctx, t, freq, vol, master) {
    const car = ctx.createOscillator(); car.type = "sine"; car.frequency.value = freq;
    const mod = ctx.createOscillator(); mod.type = "sine"; mod.frequency.value = freq*1.999;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(freq*1.1, t); mg.gain.exponentialRampToValueAtTime(0.4, t+0.45);
    mod.connect(mg); mg.connect(car.frequency);
    const g = vEnv(ctx, vol, 0.005, 0.75, t);
    car.connect(g); g.connect(master); routeWet(g);
    mod.start(t); car.start(t); mod.stop(t+0.85); car.stop(t+0.85);
}
function vChime(ctx, t, freq, vol, master) {
    const g = vEnv(ctx, vol*0.8, 0.002, 1.1, t);
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq*5.1;
    const g2 = ctx.createGain(); g2.gain.value = 0.11; o2.connect(g2); g2.connect(g);
    o.connect(g); g.connect(master); routeWet(g);
    o.start(t); o2.start(t); o.stop(t+1.2); o2.stop(t+1.2);
}
function vBass(ctx, t, freq, vol, master) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 380;
    const g = vEnv(ctx, vol, 0.005, 0.65, t);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); o.stop(t+0.7);
}
function vKick(ctx, t, vol) {
    const m = ensureMaster();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(88, t);
    o.frequency.exponentialRampToValueAtTime(40, t+0.2);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.3);
    o.connect(g); g.connect(m||ctx.destination); o.start(t); o.stop(t+0.32);
}
function vHat(ctx, t, vol) {
    const m = ensureMaster();
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = getNoise(ctx); f.type = "bandpass"; f.frequency.value = 7000; f.Q.value = 2.5;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.06);
    s.connect(f); f.connect(g); g.connect(m||ctx.destination); s.start(t); s.stop(t+0.07);
}

// ---------- 20 world song definitions ----------
// Each song: bpm, key (semitones from A2), voice, and 4 melody sections
// (intro=sparse, verse=melodic, chorus=full+energetic, bridge=different chord feel)
// Chord prog rotates through sections. Melodies are 16-step arrays (null=rest).
const WORLD_SONGS = [
    { name:"Basement Dreams",    bpm:70,  key:0,  voice:"pad",
      progs:[[0,-3,5,-2],[0,-3,5,-2],[0,2,-3,5],[5,-2,0,-3]],
      melodies:[
        [0,null,null,7,null,5,null,null,3,null,null,5,null,null,7,null],  // intro
        [0,null,3,null,5,3,null,7,5,null,3,null,0,null,null,null],        // verse
        [7,7,null,5,3,null,5,7,10,null,7,5,3,null,5,null],               // chorus
        [null,3,null,null,7,null,5,null,null,3,5,null,7,null,null,3]      // bridge
      ],
      kicks:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      hats:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0] },
    { name:"Sewer Groove",       bpm:82,  key:-2, voice:"marimba",
      progs:[[0,-2,3,-5],[0,-2,3,-5],[3,-5,0,-2],[-2,0,-5,3]],
      melodies:[
        [5,null,3,null,0,null,3,null,5,null,7,null,5,null,3,null],
        [0,3,5,null,7,5,3,null,0,3,5,7,null,5,3,null],
        [7,null,7,5,3,5,7,null,10,7,5,null,3,5,7,null],
        [3,null,5,null,7,null,5,3,0,null,3,null,5,null,null,3]
      ],
      kicks:[1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],
      hats:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0] },
    { name:"Toilet Lounge",      bpm:88,  key:3,  voice:"ep",
      progs:[[0,-3,5,-2],[0,-3,5,3],[2,-3,0,5],[-3,5,-2,0]],
      melodies:[
        [0,null,3,null,5,3,null,null,7,null,5,null,3,null,null,0],
        [5,3,null,7,5,3,null,5,7,null,5,3,0,null,3,null],
        [7,null,10,null,7,5,null,7,10,null,12,10,7,null,5,null],
        [3,5,null,3,0,null,3,5,7,null,5,null,3,null,null,null]
      ],
      kicks:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],
      hats:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1] },
    { name:"Rizz Waltz",         bpm:76,  key:-5, voice:"chime",
      progs:[[0,3,-2,5],[0,3,-2,5],[5,-2,3,0],[-2,5,0,3]],
      melodies:[
        [7,null,null,10,null,7,null,5,3,null,null,7,null,5,null,null],
        [5,7,null,10,7,null,5,3,null,5,7,null,10,null,7,null],
        [10,null,12,null,10,7,null,10,12,null,10,7,5,null,7,null],
        [3,null,5,null,7,5,null,3,0,null,3,5,null,7,null,5]
      ],
      kicks:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
      hats:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0] },
    { name:"Ohio Breeze",        bpm:66,  key:5,  voice:"pad",
      progs:[[0,-2,3,5],[0,-2,3,5],[3,5,-2,0],[5,0,-2,3]],
      melodies:[
        [0,null,null,null,5,null,null,null,3,null,null,null,7,null,null,null],
        [0,null,3,null,5,null,7,null,5,null,3,null,0,null,null,null],
        [7,null,5,null,3,5,7,null,10,null,7,5,3,null,5,null],
        [null,3,null,null,7,null,null,5,null,3,null,null,0,null,null,null]
      ],
      kicks:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
      hats:[0,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0] },
    { name:"Starfield",          bpm:72,  key:-4, voice:"ep",
      progs:[[0,5,-2,3],[0,5,-2,3],[-2,3,5,0],[3,-2,0,5]],
      melodies:[
        [12,null,null,10,null,null,7,null,5,null,null,7,null,10,null,null],
        [5,null,7,null,10,7,null,5,3,null,5,null,7,null,10,null],
        [12,10,null,7,null,10,12,null,14,null,12,10,7,null,10,null],
        [7,null,null,5,3,null,null,5,7,null,null,10,null,7,null,null]
      ],
      kicks:[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],
      hats:[0,0,0,1,0,0,1,0,0,0,0,1,0,1,0,0] },
    { name:"Canyon Winds",       bpm:80,  key:2,  voice:"marimba",
      progs:[[0,-2,5,3],[0,-2,5,3],[5,3,-2,0],[3,0,-2,5]],
      melodies:[
        [5,null,7,null,10,null,7,null,5,null,3,null,0,null,3,null],
        [0,3,5,null,7,5,3,5,7,null,5,3,0,null,3,null],
        [10,null,10,7,5,null,7,10,12,null,10,7,5,7,null,null],
        [3,5,null,7,null,5,3,null,0,3,null,5,7,null,null,5]
      ],
      kicks:[1,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0],
      hats:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0] },
    { name:"Ember Glow",         bpm:68,  key:-7, voice:"chime",
      progs:[[0,-3,5,-2],[0,-3,2,-5],[5,-2,-3,0],[-2,0,-5,3]],
      melodies:[
        [0,null,null,3,null,null,5,null,7,null,null,5,null,3,null,null],
        [3,null,5,null,7,5,null,3,0,null,3,null,5,null,7,null],
        [7,5,null,7,10,null,7,5,3,null,5,7,null,10,null,7],
        [null,3,5,null,7,null,5,3,null,0,null,3,5,null,null,null]
      ],
      kicks:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],
      hats:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1] },
    { name:"Sigma Pulse",        bpm:90,  key:7,  voice:"ep",
      progs:[[0,2,-3,5],[0,2,-3,5],[-3,5,2,0],[2,0,5,-3]],
      melodies:[
        [0,null,3,null,5,null,3,null,0,null,3,null,5,null,7,null],
        [5,null,7,null,5,3,null,5,7,null,5,3,0,3,null,null],
        [7,7,null,10,null,7,5,null,7,10,null,12,10,null,7,null],
        [3,5,null,7,5,null,3,null,0,null,3,5,null,null,null,3]
      ],
      kicks:[1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0],
      hats:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1] },
    { name:"Dimension Drift",    bpm:74,  key:1,  voice:"pad",
      progs:[[0,3,5,-2],[0,3,5,-2],[5,-2,0,3],[-2,5,3,0]],
      melodies:[
        [7,null,null,5,null,null,3,null,null,5,null,null,7,null,null,null],
        [0,null,3,5,null,7,5,null,3,null,5,7,null,null,5,null],
        [10,null,7,null,5,7,10,null,12,null,10,7,5,null,7,null],
        [5,null,null,3,null,0,null,3,5,null,null,7,null,5,null,null]
      ],
      kicks:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0],
      hats:[0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0] },
    { name:"Quantum Flow",       bpm:78,  key:-1, voice:"chime",
      progs:[[0,-2,3,-5],[0,-2,3,-5],[-5,3,-2,0],[3,0,-5,-2]],
      melodies:[
        [5,null,3,null,0,null,null,3,5,null,7,null,null,5,null,null],
        [0,3,null,5,7,null,5,3,null,0,3,null,5,null,7,null],
        [7,null,10,null,12,10,null,7,5,null,7,10,null,12,null,10],
        [3,null,5,null,7,null,5,null,3,null,0,null,3,5,null,null]
      ],
      kicks:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      hats:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0] },
    { name:"Grimace Wave",       bpm:84,  key:4,  voice:"ep",
      progs:[[0,3,-3,5],[0,3,-3,5],[3,5,0,-3],[-3,0,5,3]],
      melodies:[
        [0,null,3,null,7,null,5,null,3,null,0,null,null,3,null,null],
        [5,3,null,5,7,null,10,7,null,5,3,null,0,null,3,null],
        [10,null,12,null,10,7,null,10,12,14,null,12,10,null,7,null],
        [7,null,5,3,null,5,7,null,5,null,3,null,0,null,null,null]
      ],
      kicks:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],
      hats:[0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,1] },
    { name:"Mewing Clouds",      bpm:65,  key:-3, voice:"pad",
      progs:[[0,-2,5,3],[0,-2,5,3],[5,3,-2,0],[3,-2,0,5]],
      melodies:[
        [null,null,7,null,null,null,5,null,null,null,3,null,null,null,5,null],
        [0,null,null,3,null,5,null,7,null,5,null,3,null,null,null,null],
        [7,null,5,null,7,null,10,null,7,null,5,null,3,null,5,null],
        [null,5,null,null,7,null,null,5,null,3,null,null,0,null,null,null]
      ],
      kicks:[1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
      hats:[0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1] },
    { name:"Inferno March",      bpm:92,  key:6,  voice:"marimba",
      progs:[[0,-3,2,-5],[0,-3,2,-5],[2,-5,-3,0],[-5,2,0,-3]],
      melodies:[
        [0,null,3,null,5,null,3,null,0,null,3,null,5,3,null,null],
        [5,3,5,null,7,5,3,null,5,7,null,10,7,null,5,null],
        [10,7,null,10,12,null,10,7,5,null,7,10,null,12,null,10],
        [3,null,5,3,null,0,null,3,5,null,7,null,5,3,null,null]
      ],
      kicks:[1,0,1,0,1,0,0,0,1,0,1,0,1,0,0,0],
      hats:[1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0] },
    { name:"Crystal Bells",      bpm:72,  key:-6, voice:"chime",
      progs:[[0,3,-2,5],[0,3,-2,5],[3,5,-2,0],[-2,0,5,3]],
      melodies:[
        [7,null,null,5,null,null,3,null,5,null,null,7,null,null,null,null],
        [3,null,5,null,7,null,10,null,7,5,null,3,null,5,null,null],
        [10,null,12,null,14,12,null,10,7,null,10,null,12,null,null,10],
        [5,null,7,null,5,3,null,5,7,null,null,5,3,null,null,null]
      ],
      kicks:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
      hats:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0] },
    { name:"Mirror Echo",        bpm:76,  key:8,  voice:"ep",
      progs:[[0,5,2,-3],[0,5,2,-3],[2,-3,5,0],[-3,2,0,5]],
      melodies:[
        [0,null,null,5,null,null,0,null,null,7,null,null,5,null,null,null],
        [5,null,7,null,5,3,null,0,null,3,5,null,7,null,null,5],
        [7,10,null,12,null,10,7,null,5,7,null,10,12,null,10,null],
        [3,null,0,null,3,5,null,7,null,5,null,3,null,null,null,null]
      ],
      kicks:[1,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0],
      hats:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0] },
    { name:"Galactic Drift",     bpm:68,  key:-8, voice:"pad",
      progs:[[0,-2,3,5],[0,-2,3,5],[3,5,-2,0],[5,0,3,-2]],
      melodies:[
        [12,null,null,null,10,null,null,null,7,null,null,null,5,null,null,null],
        [5,null,7,null,10,null,7,null,5,null,3,null,5,null,7,null],
        [10,null,12,null,14,null,12,10,7,null,10,12,null,14,null,12],
        [7,null,null,5,null,null,3,null,5,null,null,7,null,null,null,null]
      ],
      kicks:[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],
      hats:[0,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0] },
    { name:"Time Spiral",        bpm:80,  key:2,  voice:"chime",
      progs:[[0,3,-5,2],[0,3,-5,2],[-5,2,3,0],[2,-5,0,3]],
      melodies:[
        [0,null,3,null,null,5,null,null,7,null,5,null,null,3,null,null],
        [3,5,null,7,null,5,3,null,0,null,3,5,7,null,null,5],
        [7,null,10,null,12,null,10,7,5,7,null,10,null,12,null,10],
        [5,null,null,3,null,0,null,null,3,null,5,null,null,7,null,null]
      ],
      kicks:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      hats:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1] },
    { name:"Gigachad Anthem",    bpm:94,  key:-4, voice:"ep",
      progs:[[0,2,-3,5],[0,2,-3,5],[5,-3,2,0],[2,0,5,-3]],
      melodies:[
        [0,null,3,null,5,3,null,0,null,3,null,5,7,null,null,null],
        [5,3,5,7,null,10,7,null,5,null,3,5,7,null,null,5],
        [10,10,null,12,null,10,7,null,10,12,null,14,12,null,10,null],
        [7,null,5,null,3,5,null,7,null,5,3,null,0,null,null,null]
      ],
      kicks:[1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0],
      hats:[1,0,1,1,0,1,1,0,1,0,1,1,0,1,1,1] },
    { name:"Final Stench",       bpm:88,  key:5,  voice:"marimba",
      progs:[[0,-2,5,3],[2,-5,0,3],[5,3,-2,0],[0,5,2,-3]],
      melodies:[
        [0,3,null,5,null,7,null,5,3,null,5,null,7,null,null,null],
        [5,null,7,null,10,7,null,5,3,5,null,7,null,10,null,7],
        [12,null,10,null,12,14,null,12,10,null,12,null,14,12,null,10],
        [7,null,5,3,null,5,7,null,5,null,3,null,0,null,3,null]
      ],
      kicks:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
      hats:[1,1,0,1,1,1,0,1,1,1,0,1,1,0,1,1] }
];

// ---------- Section structure (bars per section, repeating song form) ----------
// Form: intro(4) → verse(8) → chorus(8) → verse(8) → bridge(4) → chorus(8) → outro(4) = 44 bars ~3min
const SONG_FORM = [
    { section: 0, bars: 4  },  // intro  (sparse melody 0)
    { section: 1, bars: 8  },  // verse  (melody 1, light drums)
    { section: 2, bars: 8  },  // chorus (melody 2, full drums)
    { section: 1, bars: 8  },  // verse2 (melody 1)
    { section: 3, bars: 4  },  // bridge (melody 3, minimal drums)
    { section: 2, bars: 8  },  // chorus2(melody 2, full drums)
    { section: 0, bars: 4  },  // outro  (melody 0, fade)
]; // total 44 bars, then loops

const PHONK = { idx: 0, step: 0, timer: null, playing: false, bars: 0, formIdx: 0, formBar: 0 };

function getSong() { return WORLD_SONGS[game.worldIdx % WORLD_SONGS.length]; }

function currentSection() {
    let bar = PHONK.bars % 44;
    let acc = 0;
    for (let i = 0; i < SONG_FORM.length; i++) {
        acc += SONG_FORM[i].bars;
        if (bar < acc) return SONG_FORM[i];
    }
    return SONG_FORM[0];
}

function phonkTick() {
    const ctx = getCtx(); if (!ctx) return;
    const song = getSong();
    const t = ctx.currentTime + 0.02;
    const s = PHONK.step % 16;
    const sec = currentSection();
    const secIdx = sec.section;

    // chord root: pick from song's progression for current section
    const prog = song.progs[secIdx] || song.progs[0];
    const barInSec = PHONK.bars % prog.length;
    const root = prog[barInSec] + song.key;

    // pad chord every bar start
    if (s === 0) {
        const master = ensureMaster(); if (master) {
            const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1900; f.Q.value = 0.5;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.028 * game.settings.musicVol, t + 0.9);
            g.gain.linearRampToValueAtTime(0.0001, t + 2.3);
            [0, 4, 7, 11, 12].forEach(iv => {
                const o = ctx.createOscillator(); o.type = "sine";
                o.frequency.value = midiHz(root + iv - 12); o.detune.value = Math.random()*6-3;
                o.connect(f); o.start(t); o.stop(t+2.4);
            });
            f.connect(g); g.connect(master); routeWet(g);
        }
    }

    // drums — chorus sections (2) get full kit, bridge/intro get sparse
    const drumVol = game.settings.musicVol;
    const fullDrums = secIdx === 2;
    const noDrums   = secIdx === 0;
    if (!noDrums && song.kicks[s]) vKick(ctx, t, 0.32 * drumVol);
    if (!noDrums && song.hats[s] && (fullDrums || Math.random() < 0.55)) vHat(ctx, t, 0.028 * drumVol);

    // melody
    const mel = song.melodies[secIdx] || song.melodies[0];
    const note = mel[s];
    if (note !== null && note !== undefined) {
        const freq = midiHz(note + root + 12);
        const vol = 0.10 * game.settings.musicVol;
        const master = ensureMaster(); if (master) {
            switch (song.voice) {
                case "marimba": vMarimba(ctx, t, freq, vol, master); break;
                case "ep":      vEP(ctx, t, freq, vol, master); break;
                case "chime":   vChime(ctx, t, freq, vol*1.1, master); break;
                default:        vPad(ctx, t, freq, vol*0.85, master);
            }
        }
    }

    // bass on beat 1 and 3 of bar
    if (s === 0 || s === 8) {
        const master = ensureMaster(); if (master)
            vBass(ctx, t, midiHz(root - 12), 0.28 * drumVol, master);
    }

    PHONK.step++;
    if (PHONK.step % 16 === 0) PHONK.bars++;
}

function worldTrackIdx() { return game.worldIdx % WORLD_SONGS.length; }
function worldKey() { return getSong().key; }
function announceTrack() {
    const song = getSong();
    const el = document.getElementById("now-playing");
    if (el) el.textContent = "♪ " + song.name;
}
function curStepMs() { return (60000 / getSong().bpm) / 4; }

function startMusic() {
    if (PHONK.playing || !game.settings.musicOn) return;
    const ctx = getCtx(); if (!ctx) return;
    ensureMaster();
    PHONK.playing = true;
    PHONK.step = 0; PHONK.bars = 0;
    announceTrack();
    const loop = () => {
        if (!PHONK.playing) return;
        phonkTick();
        PHONK.timer = setTimeout(loop, curStepMs());
    };
    loop();
}
function stopMusic() { PHONK.playing = false; if (PHONK.timer) { clearTimeout(PHONK.timer); PHONK.timer = null; } }
function skipTrack() {
    stopMusic();
    setTimeout(() => { if (game.settings.musicOn) startMusic(); }, 80);
}


// ---------- ROBUST audio unlock (fixes mobile/iOS no-sound) ----------
// On iOS, AudioContext MUST be created AND resumed inside a user-gesture handler.
function unlockAudio() {
    try {
        const ctx = createCtx(); // creates context if not yet made — must be inside gesture
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        // Silent 1-sample buffer tricks iOS into fully unlocking audio output
        const b = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = b; src.connect(ctx.destination); src.start(0);
    } catch (e) {}
}
function startAudio() {
    unlockAudio(); // always call inside gesture so iOS context gets created
    if (audioStarted) {
        if (game.settings.musicOn && !PHONK.playing) startMusic();
        return;
    }
    audioStarted = true;
    ensureMaster();
    if (game.settings.musicOn) startMusic();
}
// attach to every gesture type for max mobile compatibility
["pointerdown","touchstart","touchend","click","keydown"].forEach(ev => {
    document.addEventListener(ev, function once() {
        startAudio();
    }, { once: true, passive: true });
});
// keep context alive on every interaction (iOS suspends AudioContext on app switch)
["pointerdown","touchstart","touchend"].forEach(ev => {
    document.addEventListener(ev, () => {
        if (!audioCtx) return;
        if (audioCtx.state === "suspended") audioCtx.resume();
        if (audioStarted && game.settings.musicOn && !PHONK.playing) startMusic();
    }, { passive: true });
});
document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveGame(true);
    if (!document.hidden && audioCtx && audioCtx.state === "suspended") audioCtx.resume();
});
window.addEventListener("beforeunload", () => saveGame(true));


// ============================================================
//  CORE MATH (NaN-safe) + prestige/dex multipliers
// ============================================================
function auraLevel(effect) {
    let lvl = 0;
    AURA_UPGRADES.forEach((u, i) => { if (u.effect === effect) lvl = game.auraUpgrades[i] || 0; });
    return lvl;
}
function auraMult(effect) { return 1 + auraLevel(effect) * (AURA_UPGRADES.find(u=>u.effect===effect).per); }
function rebirthBonus() { return 1 + (game.rebirths || 0) * 0.08; }

function completedWorlds() {
    let c = 0;
    for (let w = 0; w < WORLDS.length; w++) {
        let all = true;
        allPetsForWorld(w).forEach(p => { if (!game.discovered[dexKey(w, p.name)]) all = false; });
        if (all) c++;
    }
    return c;
}
function dexBonus() { return 1 + completedWorlds() * 0.03; } // +3% per fully-dex'd world

function getClickPower() {
    let p = game.baseClickPower || 1;
    UPGRADES.forEach((u, i) => { if (u.type === "click" && game.upgrades[i]) p += (u.clickPower||0) * game.upgrades[i]; });
    return p * rebirthBonus() * auraMult("click") * dexBonus();
}
function getPassive() {
    let p = 0;
    UPGRADES.forEach((u, i) => { if (u.type === "passive" && game.upgrades[i]) p += (u.passivePower||0) * game.upgrades[i]; });
    return p * rebirthBonus() * auraMult("passive") * dexBonus();
}
function getPetMult() {
    // additive stacking so 3 pets don't multiply into insane numbers
    let m = 1;
    (game.equippedPets || []).forEach(p => { m += (p.power || 1) - 1; });
    return Math.max(1, m);
}
function upgradeCost(i) {
    const u = UPGRADES[i]; if (!u) return Infinity;
    return Math.floor(u.baseCost * Math.pow(1.15, game.upgrades[i] || 0));
}
function getRebirthCost() { return 5000000 * Math.pow(4, game.rebirths || 0); }
function auraGainPreview() {
    return Math.max(1, Math.floor(Math.pow(game.rebirths + 1, 1.35) * auraMult("auragain")));
}
function auraUpCost(i) {
    const u = AURA_UPGRADES[i]; return Math.floor(u.base * Math.pow(1.7, game.auraUpgrades[i] || 0));
}
function initUpgrades() {
    if (!game.upgrades) game.upgrades = {};
    UPGRADES.forEach((_, i) => { if (typeof game.upgrades[i] !== "number") game.upgrades[i] = 0; });
    if (!game.auraUpgrades) game.auraUpgrades = {};
    if (!game.discovered) game.discovered = {};
}


// ============================================================
//  SAVE / LOAD (+ offline earnings)
// ============================================================
const SAVE_KEY = "fartSave_v6";
let offlinePending = 0;

function clearAllSaveData() {
    try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.indexOf("fartSave") === 0) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
}

function sanitizeGameState() {
    if (!game.maxPets) game.maxPets = 3;
    if (!Array.isArray(game.pets)) game.pets = [];
    if (!Array.isArray(game.equippedPets)) game.equippedPets = [];
    if (typeof game.points !== "number" || isNaN(game.points) || game.points < 0) game.points = 0;
    if (typeof game.worldIdx !== "number" || game.worldIdx < 0) game.worldIdx = 0;
    if (typeof game.rebirths !== "number" || game.rebirths < 0) game.rebirths = 0;
    if (typeof game.aura !== "number" || isNaN(game.aura) || game.aura < 0) game.aura = 0;
    if (!game.auraUpgrades || typeof game.auraUpgrades !== "object") game.auraUpgrades = {};
    if (!game.redeemedCodes || typeof game.redeemedCodes !== "object") game.redeemedCodes = {};
    AURA_UPGRADES.forEach((u, i) => {
        let lvl = game.auraUpgrades[i] || 0;
        if (typeof lvl !== "number" || isNaN(lvl) || lvl < 0) lvl = 0;
        if (u.max && lvl > u.max) lvl = u.max;
        game.auraUpgrades[i] = lvl;
    });
    initUpgrades();
}

let saveTimer = null;
function writeSaveNow() {
    try {
        game.lastSeen = Date.now();
        localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } catch (e) {}
}
function saveGame(force) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (force) { writeSaveNow(); return; }
    saveTimer = setTimeout(() => {
        saveTimer = null;
        writeSaveNow();
    }, 650);
}
function loadGame() {
    try {
        const s = localStorage.getItem(SAVE_KEY);
        if (s) {
            const p = JSON.parse(s);
            if (p && typeof p === "object") {
                const base = freshGameState();
                game = Object.assign(base, p);
                game.settings = Object.assign(base.settings, p.settings || {});
            }
        } else {
            game = freshGameState();
        }
    } catch (e) {
        game = freshGameState();
    }
    sanitizeGameState();
    indexWorld = game.worldIdx;
    computeOffline();
}
function computeOffline() {
    const now = Date.now();
    const elapsed = Math.min((now - (game.lastSeen || now)) / 1000, 8 * 3600);
    const rate = getPassive() * getPetMult();
    offlinePending = Math.floor(rate * elapsed * 0.5);
    if (offlinePending > 10 && elapsed > 30) {
        const amt = document.getElementById("offline-amount");
        if (amt) amt.innerText = fmt(offlinePending) + " 💨";
        const m = document.getElementById("offline-modal"); if (m) m.classList.remove("hidden");
    } else offlinePending = 0;
}
function claimOffline() {
    game.points += offlinePending; offlinePending = 0;
    const m = document.getElementById("offline-modal"); if (m) m.classList.add("hidden");
    sfxBuy(); burstAt(window.innerWidth/2, window.innerHeight/2, "#7FFF00", 24); updateDisplay(); saveGame();
}


// ============================================================
//  MAIN CLICK + COMBO
// ============================================================
function handleMainClick(e) {
    startAudio();
    const now = Date.now();
    const dt = now - lastClickTime;
    const comboGain = 7 * auraMult("combo");
    if (dt < 400 && dt >= 0) { clickStreak++; comboValue = Math.min(comboValue + comboGain, 100); }
    else clickStreak = 0;
    lastClickTime = now;
    spamMultiplier = 1 + (comboValue / 100) * 2.5;
    game.totalClicks++;

    const critChance = Math.min(0.05 + comboValue * 0.0015, 0.25);
    criticalMultiplier = 1;
    if (Math.random() < critChance) { criticalMultiplier = 3 + Math.random() * 4; showCritFx(e); }

    let dmg = getClickPower() * spamMultiplier * getPetMult() * criticalMultiplier;
    if (isNaN(dmg) || dmg < 0) dmg = 1;
    game.points += dmg; game.totalEarned += dmg;

    sfxClick();
    const w = WORLDS[game.worldIdx || 0];
    const wColor = (w && w.theme) ? w.theme.p : "#7FFF00";
    const textColor = criticalMultiplier > 1 ? "#FFD54A" : (comboValue > 60 ? "#00E0FF" : wColor);
    floatText(e.clientX, e.clientY, "+" + fmt(dmg), textColor, criticalMultiplier > 1);
    // rings scale with combo
    if (comboValue > 30) ringAt(e.clientX, e.clientY, wColor);
    if (comboValue > 60) ringAt(e.clientX, e.clientY, comboValue > 80 ? "#FF3D9A" : "#00E0FF");
    if (comboValue > 90) ringAt(e.clientX, e.clientY, "#FFD54A");
    clickPuff(e.clientX, e.clientY);
    // extra world-colored puffs at high combo
    if (comboValue > 50 && Math.random() < 0.5) burstAt(e.clientX, e.clientY, wColor, 6);
    if (comboValue > 80 && Math.random() < 0.4) burstAt(e.clientX, e.clientY, "#FF3D9A", 8);
    // milestone combo flash
    if (comboValue >= 100 && Math.random() < 0.08) screenFlash(wColor);
    popButton();
    maybeBrainrotPop();
    refreshCombo();
    updateDisplay();
    if (upgradesRendered && sheetOpen("upgrades")) renderUpgradeTabs();
    saveGame();
}
function refreshCombo() {
    const bar = document.getElementById("combo-bar"), label = document.getElementById("combo-label");
    if (bar) { bar.style.width = comboValue + "%"; }
    if (label) label.innerText = "COMBO x" + spamMultiplier.toFixed(1);
    const mb = document.getElementById("main-btn");
    if (mb) mb.classList.toggle("on-fire", comboValue > 75);
    const decayRate = 4 / auraMult("combo");
    if (comboDecayTimer) clearInterval(comboDecayTimer);
    comboDecayTimer = setInterval(() => {
        comboValue = Math.max(0, comboValue - decayRate);
        spamMultiplier = 1 + (comboValue / 100) * 2.5;
        if (bar) bar.style.width = comboValue + "%";
        if (label) label.innerText = "COMBO x" + spamMultiplier.toFixed(1);
        if (mb) mb.classList.toggle("on-fire", comboValue > 75);
        if (comboValue <= 0) { clearInterval(comboDecayTimer); comboDecayTimer = null; }
    }, 200);
}
const BRAINROT_POPS = ["SKIBIDI! 🚽","RIZZ +∞ 😎","GYATT! 🍑","ONLY IN OHIO 🌽","SHEEESH 🗣️","SIGMA GRINDSET 🗿","FANUM TAX 🍔","W RIZZ 🔥","MEWING 😐","GET REAL 💀","NO CAP 🧢","BUSSIN 🤤","it's giving 💅","CAUGHT IN 4K 📸"];
function maybeBrainrotPop() {
    if (!game.settings.brainrot) return;
    if (Math.random() < 0.02) showToast(BRAINROT_POPS[Math.floor(Math.random()*BRAINROT_POPS.length)], 1500);
}


function levelCost(i, lvl) { return Math.floor(UPGRADES[i].baseCost * Math.pow(1.15, lvl)); }
// how many levels you'd buy in current mode, and total cost
function bulkInfo(i) {
    const cur = game.upgrades[i] || 0;
    let count = 0, total = 0;
    const cap = (buyMode === "max") ? 100000 : buyMode;
    if (buyMode === "max") {
        const first = levelCost(i, cur);
        if (!isFinite(first) || first <= 0 || game.points < first) return { count: 0, total: first, affordable: false };
        const growth = 1.15;
        count = Math.min(cap, Math.max(1, Math.floor(Math.log(game.points * (growth - 1) / first + 1) / Math.log(growth))));
        total = first * (Math.pow(growth, count) - 1) / (growth - 1);
        while (count > 0 && total > game.points) {
            count--;
            total = first * (Math.pow(growth, count) - 1) / (growth - 1);
        }
        while (count < cap) {
            const nextTotal = first * (Math.pow(growth, count + 1) - 1) / (growth - 1);
            if (nextTotal > game.points) break;
            count++;
            total = nextTotal;
        }
        return { count: count, total: Math.floor(total), affordable: count > 0 };
    }
    for (let k = 0; k < cap; k++) {
        const c = levelCost(i, cur + k);
        total += c; count++;
    }
    return { count: count, total: total, affordable: game.points >= total };
}
function upCard(i) {
    const u = UPGRADES[i], lvl = game.upgrades[i] || 0;
    const info = bulkInfo(i);
    const ok = info.affordable && info.count > 0;
    const stat = u.type === "click" ? "+" + fmt(u.clickPower) + " / click" : "+" + fmt(u.passivePower) + " / sec";
    const buyLabel = (buyMode === "max") ? ("MAX (" + (info.count||0) + ")") : ("x" + buyMode);
    return '<button class="up-card ' + (ok ? "" : "locked") + '" onclick="buyUpgrade(' + i + ')">' +
        '<div class="up-ico">' + iconHTML(u.icon, "up-ico-img", u.name) + '</div>' +
        '<div class="up-mid"><div class="up-name">' + u.name + ' <span class="buy-badge">' + buyLabel + '</span></div>' +
        '<div class="up-stat">' + stat + '</div><div class="up-cost">' + fmt(info.total) + ' 💨</div></div>' +
        '<div class="up-lvl">Lv ' + lvl + '</div></button>';
}
function renderUpgradeTabs() {
    let c = "", p = "", s = "";
    UPGRADES.forEach((u, i) => { if (u.type === "click") c += upCard(i); else p += upCard(i); });
    PET_SLOTS.forEach((u, idx) => {
        if (game.maxPets >= u.slot) return;
        const lockedRb = game.rebirths < (u.reqRebirths || 0);
        const ok = game.points >= u.cost && !lockedRb;
        const sub = lockedRb ? ('🔒 Needs ' + u.reqRebirths + ' rebirths') : 'Equip one more pet';
        s += '<button class="up-card ' + (ok ? "" : "locked") + '" onclick="buyPetSlot(' + idx + ')">' +
            '<div class="up-ico">' + iconHTML("🐾", "up-ico-img", "Pet Slot") + '</div><div class="up-mid"><div class="up-name">Pet Slot ' + u.slot + '</div>' +
            '<div class="up-stat">' + sub + '</div><div class="up-cost">' + fmt(u.cost) + ' 💨</div></div></button>';
    });
    if (!s) s = '<p class="empty-text">All pet slots unlocked! 🎉</p>';
    const ce = document.getElementById("up-click"), pe = document.getElementById("up-passive"), se = document.getElementById("up-slots");
    if (ce) ce.innerHTML = c; if (pe) pe.innerHTML = p; if (se) se.innerHTML = s;
    upgradesRendered = true;
}


// ============================================================
//  BUYING
// ============================================================
function buyUpgrade(i) {
    const u = UPGRADES[i]; if (!u) return;
    const info = bulkInfo(i);
    if (info.count > 0 && info.affordable && game.points >= info.total) {
        game.points -= info.total; game.upgrades[i] = (game.upgrades[i] || 0) + info.count;
        sfxBuy(); updateDisplay(); renderUpgradeTabs(); saveGame();
    } else sfxError();
}
function setBuyMode(m, btn) {
    buyMode = m;
    document.querySelectorAll("#sheet-upgrades .buymode-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderUpgradeTabs();
}
function buyPetSlot(idx) {
    const u = PET_SLOTS[idx]; if (!u) return;
    if (game.rebirths < (u.reqRebirths || 0)) { sfxError(); showToast("🔒 Needs " + u.reqRebirths + " rebirths!", 2200); return; }
    if (game.points >= u.cost) {
        game.points -= u.cost; if (u.slot > game.maxPets) game.maxPets = u.slot;
        sfxBuy(); burstAt(window.innerWidth/2, window.innerHeight*0.4, "#7FFF00", 22); updateDisplay(); renderUpgradeTabs(); renderPets(); saveGame();
        showToast("🐾 Pet slot " + u.slot + " unlocked!", 2000);
    } else sfxError();
}

// ============================================================
//  BOTTOM SHEETS
// ============================================================
function sheetOpen(name) { const s = document.getElementById("sheet-" + name); return s && s.classList.contains("open"); }
function openSheet(name) {
    closeSheet();
    const sheet = document.getElementById("sheet-" + name), overlay = document.getElementById("sheet-overlay");
    if (!sheet || !overlay) return;
    if (name === "upgrades") renderUpgradeTabs();
    if (name === "pets") renderPetSheet();
    if (name === "worlds") renderWorlds();
    if (name === "aura") renderAura();
    if (name === "settings") syncSettingsUI();
    overlay.classList.add("visible"); sheet.classList.add("open");
    // highlight the active nav button
    document.querySelectorAll(".nav-btn").forEach(b => {
        b.classList.toggle("sel", b.dataset.sheet === name);
    });
}
function closeSheet() {
    document.querySelectorAll(".sheet").forEach(s => s.classList.remove("open"));
    const overlay = document.getElementById("sheet-overlay"); if (overlay) overlay.classList.remove("visible");
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("sel"));
}
function showUpTab(name, btn) {
    document.querySelectorAll("#sheet-upgrades .up-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll("#sheet-upgrades .stab").forEach(b => b.classList.remove("active"));
    const tab = document.getElementById("up-" + name); if (tab) tab.classList.add("active");
    if (btn) btn.classList.add("active");
}


// ============================================================
//  SETTINGS
// ============================================================
function setMusicVol(v) { game.settings.musicVol = v/100; const e=document.getElementById("music-vol-val"); if(e)e.innerText=v+"%"; saveGame(); }
function setSfxVol(v) { game.settings.sfxVol = v/100; const e=document.getElementById("sfx-vol-val"); if(e)e.innerText=v+"%"; sfxClick(); saveGame(); }
function toggleSetting(key, btn) {
    game.settings[key] = !game.settings[key];
    const pill = btn.querySelector(".toggle-pill");
    if (pill) { pill.innerText = game.settings[key] ? "ON" : "OFF"; btn.classList.toggle("off", !game.settings[key]); }
    if (key === "musicOn") { game.settings.musicOn ? startAudio() : stopMusic(); }
    if (key === "particles") { const o=document.getElementById("particle-overlay"); if(o)o.style.display=game.settings.particles?"block":"none"; }
    saveGame();
}
function syncSettingsUI() {
    const mv=document.getElementById("music-vol"), sv=document.getElementById("sfx-vol");
    if (mv) mv.value = Math.round(game.settings.musicVol*100);
    if (sv) sv.value = Math.round(game.settings.sfxVol*100);
    const mvv=document.getElementById("music-vol-val"); if(mvv)mvv.innerText=Math.round(game.settings.musicVol*100)+"%";
    const svv=document.getElementById("sfx-vol-val"); if(svv)svv.innerText=Math.round(game.settings.sfxVol*100)+"%";
    [["tg-music","musicOn"],["tg-particles","particles"],["tg-shake","screenShake"],["tg-brainrot","brainrot"]].forEach(([id,k])=>{
        const b=document.getElementById(id); if(!b)return; const p=b.querySelector(".toggle-pill");
        if(p)p.innerText=game.settings[k]?"ON":"OFF"; b.classList.toggle("off",!game.settings[k]);
    });
}
function setCodeStatus(text, ok) {
    const el = document.getElementById("code-status");
    if (el) {
        el.textContent = text;
        el.classList.toggle("ok", !!ok);
        el.classList.toggle("bad", !ok);
    }
}
function secretPetForCurrentWorld() {
    const pets = allPetsForWorld(game.worldIdx || 0);
    return pets.find(p => p.rarity === "secret") || pets[pets.length - 1];
}
function grantPetFromTemplate(template) {
    if (!template) return null;
    const pet = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        name: template.name,
        emoji: template.emoji,
        rarity: template.rarity || "secret",
        star: 0,
        power: petPower(template.base || 120, game.worldIdx || 0)
    };
    game.pets.push(pet);
    game.discovered[dexKey(game.worldIdx || 0, pet.name)] = true;
    return pet;
}
function refreshRewardViews() {
    updateDisplay();
    if (sheetOpen("upgrades")) renderUpgradeTabs();
    if (sheetOpen("pets")) renderPetSheet();
    const eggModal = document.getElementById("egg-modal");
    if (eggModal && !eggModal.classList.contains("hidden")) renderEggShop();
}
function redeemCode() {
    const input = document.getElementById("code-input");
    const raw = input ? input.value : "";
    const code = raw.trim().toLowerCase();
    if (!code) { setCodeStatus("Enter a code first.", false); return; }

    if (code === "release") {
        const world = game.worldIdx || 0;
        const key = "release:" + world;
        if (game.redeemedCodes[key]) {
            setCodeStatus("release was already redeemed in this world.", false);
            sfxError();
            return;
        }
        const template = secretPetForCurrentWorld();
        const pet = grantPetFromTemplate(template);
        if (!pet) { setCodeStatus("No secret pet found for this world.", false); sfxError(); return; }
        game.redeemedCodes[key] = Date.now();
        if (input) input.value = "";
        sfxRare(5);
        burstAt(window.innerWidth / 2, window.innerHeight * 0.42, (RARITY[pet.rarity] || RARITY.secret).color, 45);
        showToast("🎁 release: " + pet.name + " joined you!", 2600);
        const worldName = (WORLDS[world] && WORLDS[world].name) || "this world";
        setCodeStatus("Unlocked " + pet.name + " for " + worldName + ".", true);
        refreshRewardViews();
        saveGame(true);
        return;
    }

    if (code === "admin") {
        game.points = Math.max(game.points || 0, 1e300);
        game.totalEarned = Math.max(game.totalEarned || 0, game.points);
        game.redeemedCodes.admin = Date.now();
        if (input) input.value = "";
        sfxRare(4);
        screenFlash("#FFD54A");
        showToast("🛠️ Admin mode: unlimited Stink added!", 2600);
        setCodeStatus("Admin testing Stink added.", true);
        refreshRewardViews();
        saveGame(true);
        return;
    }

    setCodeStatus("Invalid code.", false);
    sfxError();
}
function exportSave() { try{navigator.clipboard.writeText(btoa(JSON.stringify(game)));showToast("📋 Save copied!",2200);}catch(e){showToast("Export failed",1500);} }
function importSave() {
    const c = prompt("Paste save code:");
    if (!c) return;
    try {
        const p = JSON.parse(atob(c));
        game = Object.assign(freshGameState(), p);
        sanitizeGameState();
        updateDisplay();
        saveGame();
        showToast("✅ Imported!", 2000);
    } catch (e) { showToast("❌ Invalid code", 2000); }
}
function hardReset() {
    if (!confirm("Wipe EVERYTHING? This clears your saved progress (browser storage).")) return;
    clearAllSaveData();
    game = freshGameState();
    location.reload();
}

// ============================================================
//  REBIRTH + WORLDS
// ============================================================
function rebirth() {
    const cost = getRebirthCost();
    if (game.points < cost) { sfxError(); showToast("❌ Need " + fmt(cost) + " Stink to Rebirth!", 2500); return; }
    const gain = auraGainPreview();
    game.rebirths++; game.aura += gain;
    game.points = 0; game.upgrades = {}; initUpgrades();
    comboValue = 0; spamMultiplier = 1;
    sfxRare(4); screenFlash("#ffd54a"); shake(); shockwave("#ffd54a"); emojiRain(["🔄","✦","💨","🌟"], 24);
    updateDisplay(); renderUpgradeTabs(); renderWorlds(); saveGame();
    bigBanner("REBIRTH #" + game.rebirths, "#ffd54a");
    showToast("🔄 REBORN! +25% power · +" + gain + " ✦ Aura!", 3200);
}
function renderWorlds() {
    let html = '<div class="world-grid">';
    WORLDS.forEach((w, i) => {
        const unlocked = game.rebirths >= w.reqRebirths, current = game.worldIdx === i;
        html += '<div class="world-card ' + (unlocked?"unlocked":"locked") + (current?" current":"") +
            '" onclick="' + (unlocked?"selectWorld("+i+")":"") + '"><div class="world-icon">' + iconHTML(w.icon, "world-icon-img", w.name) + '</div>' +
            '<div class="world-name">' + w.name + '</div><div class="world-req">' +
            (unlocked?(current?"★ Current":"Travel"):"🔒 "+w.reqRebirths+" RB") + '</div></div>';
    });
    html += '</div>';
    const el = document.getElementById("worlds-body"); if (el) el.innerHTML = html;
}
function selectWorld(i) {
    const w = WORLDS[i]; if (!w || game.rebirths < w.reqRebirths) { sfxError(); return; }
    game.worldIdx = i; indexWorld = i; sfxBuy(); updateDisplay(); renderWorlds(); saveGame();
    PHONK.idx = worldTrackIdx(); PHONK.step = 0; announceTrack();
    applyWorldTheme(); updateCornerGlows();
    screenFlash(w.theme && w.theme.p ? w.theme.p : "#ffd54a");
    showToast("🌍 Travelled to " + w.name + " · 🎵 " + TRACKS[PHONK.idx].name, 2400);
}


// ============================================================
//  AURA (prestige shop)
// ============================================================
function renderAura() {
    let html = '<div class="aura-hero"><div class="aura-bal">✦ ' + fmt(game.aura) + '</div>' +
        '<div class="aura-sub">Aura · permanent power. Next rebirth grants <b>+' + auraGainPreview() + ' ✦</b></div></div>';
    html += '<div class="aura-list">';
    AURA_UPGRADES.forEach((u, i) => {
        const lvl = game.auraUpgrades[i] || 0;
        const maxed = u.max && lvl >= u.max;
        const cost = auraUpCost(i), ok = game.aura >= cost && !maxed;
        html += '<button class="aura-card ' + (ok?"":"locked") + (maxed?" maxed":"") + '" onclick="buyAura(' + i + ')">' +
            '<div class="up-ico">' + iconHTML(u.icon, "up-ico-img", u.name) + '</div><div class="up-mid">' +
            '<div class="up-name">' + u.name + '</div><div class="up-stat">' + u.desc + '</div>' +
            '<div class="aura-cost">' + (maxed ? "✅ UNLOCKED" : "✦ " + fmt(cost)) + '</div></div><div class="up-lvl">' + (u.max ? (maxed?"MAX":"") : "Lv " + lvl) + '</div></button>';
    });
    html += '</div>';
    const el = document.getElementById("aura-body"); if (el) el.innerHTML = html;
}
function buyAura(i) {
    const u = AURA_UPGRADES[i]; if (!u) return;
    const lvl = game.auraUpgrades[i] || 0;
    if (u.max && lvl >= u.max) { sfxError(); return; }
    const cost = auraUpCost(i);
    if (game.aura >= cost) {
        game.aura -= cost; game.auraUpgrades[i] = lvl + 1;
        sfxRare(2); burstAt(window.innerWidth/2, window.innerHeight*0.4, "#b14eff", 18);
        renderAura(); updateDisplay(); saveGame();
        if (u.effect === "multi" || u.effect === "mega") showToast("🥚 Multi-hatch unlocked!", 2200);
    } else sfxError();
}

// ============================================================
//  PETS SHEET (tabs: collection / fuse / index)
// ============================================================
function renderPetSheet() {
    if (petTabCur === "collection") renderPets();
    else if (petTabCur === "fuse") renderFuse();
    else renderIndex();
}
function showPetTab(name, btn) {
    petTabCur = name;
    document.querySelectorAll("#sheet-pets .stab").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderPetSheet();
}


function petChip(p, equipped) {
    const r = RARITY[p.rarity] || RARITY.common;
    const stars = p.star ? '<span class="pet-stars">' + "⭐".repeat(Math.min(p.star,5)) + '</span>' : '';
    return '<div class="pet-chip ' + (equipped?"equipped":"") + '" style="border-color:' + r.color + ';color:' + r.color + '" onclick="openPetModal(' + p.id + ')">' +
        '<span class="pet-chip-emoji">' + iconHTML(p.emoji||"🐾", "pet-icon-img", p.name) + '</span>' + stars +
        '<span class="pet-chip-name">' + p.name + '</span>' +
        '<span class="pet-chip-pow">' + p.power.toFixed(2) + 'x</span>' +
        (equipped?'<span class="pet-chip-badge">✓</span>':'') + '</div>';
}
let petSortMode = "power"; // "power" | "rarity" | "newest"
function renderPets() {
    const eq = game.equippedPets||[];
    // sort collection
    let pets = [...(game.pets||[])];
    if (petSortMode === "power")   pets.sort((a,b) => b.power - a.power);
    if (petSortMode === "rarity")  pets.sort((a,b) => (RARITY[b.rarity]||RARITY.common).tier - (RARITY[a.rarity]||RARITY.common).tier);
    if (petSortMode === "newest")  pets.sort((a,b) => b.id - a.id);

    const sortBtns = ['power','rarity','newest'].map(m =>
        '<button class="sort-btn' + (petSortMode===m?' active':'') + '" onclick="setPetSort(\'' + m + '\')">' +
        (m==='power'?'⚡ Best':m==='rarity'?'🌟 Rarity':'🆕 Newest') + '</button>'
    ).join('');

    let html = '<div class="pet-toolbar">' +
        '<button class="action-btn slim" onclick="openEggModal()">🥚 Open Eggs</button>' +
        '<button class="action-btn slim equip-best-btn" onclick="equipBestPets()">⚡ Equip Best</button>' +
        '</div>' +
        '<div class="sort-row">' + sortBtns + '</div>';

    html += '<div class="pet-block-title">Equipped (' + eq.length + '/' + (game.maxPets||3) + ') · Boost x' + getPetMult().toFixed(2) + '</div><div class="pet-grid">';
    if (eq.length===0) html += '<p class="empty-text">Equip pets to multiply click power!</p>';
    else eq.forEach(p => { html += petChip(p, true); });
    html += '</div><div class="pet-block-title">Collection (' + pets.length + ')</div><div class="pet-grid">';
    if (pets.length===0) html += '<p class="empty-text">No pets yet — open an egg!</p>';
    else pets.forEach(p => { html += petChip(p, eq.some(q=>q.id===p.id)); });
    html += '</div>';
    const el = document.getElementById("pets-body"); if (el) el.innerHTML = html;
}
function setPetSort(mode) { petSortMode = mode; renderPets(); }
function equipBestPets() {
    // pick top N pets by power, equip them
    const slots = game.maxPets || 3;
    const sorted = [...(game.pets||[])].sort((a,b) => b.power - a.power);
    game.equippedPets = sorted.slice(0, slots);
    sfxBuy(); showToast("⚡ Best " + game.equippedPets.length + " pets equipped!", 1800);
    updateDisplay(); renderPets(); saveGame();
}

// ---------- FUSION: combine 3 identical pets into a stronger one ----------
function fuseGroups() {
    const map = {};
    (game.pets||[]).forEach(p => {
        const key = p.name + "|" + (p.star||0);
        if (!map[key]) map[key] = { name: p.name, emoji: p.emoji, rarity: p.rarity, star: p.star||0, items: [] };
        map[key].items.push(p);
    });
    return Object.values(map);
}
// ---------- FUSION: combine N identical pets → one ⭐ stronger pet ----------
const MAX_STAR = 5;
function fuseNeeded(star) { return Math.min(4 + star * 4, 20); } // 4,8,12,16,20 — caps at 20
function renderFuse() {
    let html = '<p class="fuse-info">Fuse identical pets into a ⭐ stronger one (2.2x power each star). Higher stars need more pets — starts at 4, scales up, max <b>' + MAX_STAR + '⭐</b>.</p><div class="pet-grid">';
    const groups = fuseGroups();
    const fusable = groups.filter(g => g.star < MAX_STAR && g.items.length >= fuseNeeded(g.star));
    if (fusable.length === 0) html += '<p class="empty-text">No fusions ready. Collect more copies of the same pet (same ⭐ level).</p>';
    else fusable.forEach(g => {
        const r = RARITY[g.rarity] || RARITY.common;
        const stars = g.star ? "⭐".repeat(g.star) : "";
        const need = fuseNeeded(g.star);
        html += '<div class="fuse-card" style="border-color:' + r.color + '">' +
            '<span class="pet-chip-emoji">' + iconHTML(g.emoji, "pet-icon-img", g.name) + '</span><span class="pet-stars">' + stars + '</span>' +
            '<span class="pet-chip-name" style="color:' + r.color + '">' + g.name + '</span>' +
            '<span class="fuse-count">' + g.items.length + ' / ' + need + '</span>' +
            '<button class="fuse-btn" onclick="fusePet(\'' + g.name.replace(/'/g,"\\'") + '\',' + g.star + ')">FUSE ' + need + ' →</button></div>';
    });
    html += '</div>';
    // also show groups that are close but not ready
    const pending = groups.filter(g => g.star < MAX_STAR && g.items.length < fuseNeeded(g.star) && g.items.length > 1);
    if (pending.length) {
        html += '<div class="pet-block-title">In progress</div><div class="pet-grid">';
        pending.forEach(g => {
            const r = RARITY[g.rarity] || RARITY.common;
            html += '<div class="fuse-card dim" style="border-color:' + r.color + '">' +
                '<span class="pet-chip-emoji">' + iconHTML(g.emoji, "pet-icon-img", g.name) + '</span>' +
                '<span class="pet-chip-name" style="color:' + r.color + '">' + g.name + '</span>' +
                '<span class="fuse-count">' + g.items.length + ' / ' + fuseNeeded(g.star) + '</span></div>';
        });
        html += '</div>';
    }
    const el = document.getElementById("pets-body"); if (el) el.innerHTML = html;
}
function fusePet(name, star) {
    if (star >= MAX_STAR) { sfxError(); showToast("⭐ Max star reached!", 1800); return; }
    const need = fuseNeeded(star);
    const matches = (game.pets||[]).filter(p => p.name === name && (p.star||0) === star);
    if (matches.length < need) { sfxError(); return; }
    matches.sort((a,b) => b.power - a.power);
    const consumed = matches.slice(0, need);
    const ids = consumed.map(p => p.id);
    game.equippedPets = (game.equippedPets||[]).filter(p => !ids.includes(p.id));
    game.pets = game.pets.filter(p => !ids.includes(p.id));
    const top = consumed[0];
    const fused = { id: Date.now()+Math.floor(Math.random()*100000), name: top.name, emoji: top.emoji,
        rarity: top.rarity, star: (star||0)+1, power: +(top.power * 2.2).toFixed(2) };
    game.pets.push(fused);
    sfxRare(4); screenFlash(RARITY[fused.rarity].color); burstAt(window.innerWidth/2, window.innerHeight*0.4, RARITY[fused.rarity].color, 36); shake(); emojiRain(["✨","⭐",fused.emoji],18);
    showToast("✨ Fused " + fused.name + " " + "⭐".repeat(fused.star) + " (" + fused.power.toFixed(2) + "x)!", 3000);
    renderFuse(); updateDisplay(); saveGame();
}


// ============================================================
//  PET INDEX (Pokédex) — per world, silhouettes for undiscovered
// ============================================================
function renderIndex() {
    const allPets = allPetsForWorld();
    // world selector chips (unlocked worlds only)
    let chips = '<div class="dex-worlds">';
    WORLDS.forEach((w, i) => {
        if (game.rebirths < w.reqRebirths) return;
        chips += '<button class="dex-chip ' + (indexWorld===i?"active":"") + '" onclick="setIndexWorld(' + i + ')">' + iconHTML(w.icon, "dex-chip-img", w.name) + ' ' + w.name + '</button>';
    });
    chips += '</div>';

    const found = allPets.filter(p => game.discovered[dexKey(indexWorld, p.name)]).length;
    const pct = Math.round((found / allPets.length) * 100);
    let bar = '<div class="dex-progress"><div class="dex-bar" style="width:' + pct + '%"></div></div>' +
        '<div class="dex-count">' + found + '/' + allPets.length + ' discovered · ' + pct + '%' +
        (found === allPets.length ? ' · ✅ COMPLETE (+3% global!)' : '') + '</div>';

    let grid = '<div class="dex-grid">';
    allPets.forEach(p => {
        const r = RARITY[p.rarity] || RARITY.common;
        const got = game.discovered[dexKey(indexWorld, p.name)];
        const pw = petPower(p.base, indexWorld);
        grid += '<div class="dex-cell ' + (got?"found":"locked") + '" style="border-color:' + (got?r.color:"rgba(120,110,160,0.3)") + '">' +
            '<span class="dex-emoji ' + (got?"":"silhouette") + '">' + iconHTML(p.emoji, "dex-icon-img", got ? p.name : "Unknown pet") + '</span>' +
            '<span class="dex-name" style="color:' + (got?r.color:"#6b6088") + '">' + (got?p.name:"???") + '</span>' +
            '<span class="dex-rarity" style="color:' + (got?r.color:"#6b6088") + '">' + (got?r.label:"???") + '</span>' +
            '<span class="dex-pow">' + (got?pw.toFixed(2)+"x":"—") + '</span></div>';
    });
    grid += '</div>';

    const dexBonusPct = Math.round((dexBonus()-1)*100);
    const footer = '<div class="dex-footer">🏆 Dex Bonus: <b>+' + dexBonusPct + '% to all income</b> (' + completedWorlds() + ' worlds completed)</div>';
    const el = document.getElementById("pets-body");
    if (el) el.innerHTML = chips + bar + grid + footer;
}
function setIndexWorld(i) { indexWorld = i; renderIndex(); }


// ============================================================
//  PET DETAIL MODAL
// ============================================================
let selectedPetId = null;
function openPetModal(id) {
    selectedPetId = id;
    const p = (game.pets||[]).find(x => x.id === id); if (!p) return;
    const r = RARITY[p.rarity] || RARITY.common;
    const equipped = (game.equippedPets||[]).some(x => x.id === id);
    const stars = p.star ? "⭐".repeat(Math.min(p.star,5)) : "";
    const d = document.getElementById("pet-details");
    if (d) d.innerHTML = '<div class="pet-modal-emoji" style="filter:drop-shadow(0 0 18px ' + r.color + ')">' + iconHTML(p.emoji||"🐾", "pet-modal-icon-img", p.name) + '</div>' +
        '<div class="pet-modal-rarity" style="color:' + r.color + '">' + r.label + ' ' + stars + '</div>' +
        '<h3 class="pet-modal-name">' + p.name + '</h3>' +
        '<div class="pet-modal-row">Click Multiplier <b>' + p.power.toFixed(2) + 'x</b></div>' +
        '<div class="pet-modal-row">Status <b>' + (equipped?"✅ Equipped":"Not equipped") + '</b></div>';
    const b = document.getElementById("equip-btn"); if (b) b.innerText = equipped ? "Unequip" : "Equip";
    const m = document.getElementById("pet-modal"); if (m) m.classList.remove("hidden");
}
function closePetModal() { const m=document.getElementById("pet-modal"); if(m)m.classList.add("hidden"); selectedPetId=null; }
function equipPet() {
    const p = (game.pets||[]).find(x => x.id === selectedPetId); if (!p) return;
    const equipped = (game.equippedPets||[]).some(x => x.id === selectedPetId);
    if (equipped) game.equippedPets = game.equippedPets.filter(x => x.id !== selectedPetId);
    else {
        if (game.equippedPets.length >= (game.maxPets||3)) { sfxError(); showToast("All slots full! Unlock more in Upgrades.", 2200); return; }
        game.equippedPets.push(p); sfxBuy();
    }
    closePetModal(); updateDisplay(); renderPets(); saveGame();
}

// ============================================================
//  EGG SHOP + ROLL (Lucky Aura + discovery)
// ============================================================
let hatchQueue = [];
let hatchMultiSession = false;
let hatchChargeInt = null;
let hatchAnimTimers = [];
let hatchTimeout = null;

function clearHatchAnim() {
    if (hatchChargeInt) { clearInterval(hatchChargeInt); hatchChargeInt = null; }
    hatchAnimTimers.forEach(t => clearTimeout(t));
    hatchAnimTimers = [];
    if (hatchTimeout) { clearTimeout(hatchTimeout); hatchTimeout = null; }
    clearHatchFX();
}
function hatchDelay(fn, ms) {
    hatchAnimTimers.push(setTimeout(fn, ms));
}
function clearHatchFX() {
    document.querySelectorAll(".hfx-temp").forEach(el => el.remove());
}
function buildHatchFX(overlay, color, tier, emoji) {
    clearHatchFX();
    const layer = document.createElement("div");
    layer.className = "hatch-fx-layer hfx-temp tier" + tier;
    layer.style.setProperty("--rc", color);

    const halo = document.createElement("div");
    halo.className = "hfx-halo";
    layer.appendChild(halo);

    const lens = document.createElement("div");
    lens.className = "hfx-lens";
    layer.appendChild(lens);

    const core = document.createElement("div");
    core.className = "hfx-core";
    setIconNode(core, emoji, "hfx-core-img", "hatch core");
    layer.appendChild(core);

    const tunnel = document.createElement("div");
    tunnel.className = "hfx-tunnel";
    layer.appendChild(tunnel);

    const orbit = document.createElement("div");
    orbit.className = "hfx-orbit";
    const dotCount = 12 + tier * 4;
    for (let i = 0; i < dotCount; i++) {
        const dot = document.createElement("span");
        dot.className = "hfx-dot";
        setIconNode(dot, i % 5 === 0 ? emoji : (i % 2 ? "✦" : "•"), "hfx-dot-img", "hatch orbit");
        const angle = 360 / dotCount * i;
        const distance = 126 + tier * 14 + (i % 3) * 18;
        dot.style.setProperty("--a", angle + "deg");
        dot.style.setProperty("--na", (-angle) + "deg");
        dot.style.setProperty("--nd", (-distance) + "px");
        dot.style.animationDelay = (-i * 0.12) + "s";
        orbit.appendChild(dot);
    }
    layer.appendChild(orbit);

    const ringCount = 3 + Math.min(tier, 3);
    for (let i = 0; i < ringCount; i++) {
        const ring = document.createElement("div");
        ring.className = "hfx-ring";
        ring.style.animationDelay = (i * 0.22) + "s";
        ring.style.opacity = String(0.85 - i * 0.09);
        layer.appendChild(ring);
    }

    for (let i = 0; i < 4 + tier; i++) {
        const band = document.createElement("div");
        band.className = "hfx-band";
        band.style.setProperty("--tilt", (-26 + i * 13) + "deg");
        band.style.animationDelay = (-i * 0.28) + "s";
        layer.appendChild(band);
    }

    const shardCount = 22 + tier * 8;
    for (let i = 0; i < shardCount; i++) {
        const shard = document.createElement("i");
        shard.className = "hfx-shard";
        shard.style.left = (Math.random() * 100) + "%";
        shard.style.top = (Math.random() * 100) + "%";
        shard.style.setProperty("--rot", (Math.random() * 360) + "deg");
        shard.style.setProperty("--delay", (Math.random() * -2.4) + "s");
        shard.style.setProperty("--len", (22 + Math.random() * (44 + tier * 8)) + "px");
        layer.appendChild(shard);
    }

    const glyphs = ["✦", "◆", "◇", "✧", "✹", "✺", "⬡", emoji];
    for (let i = 0; i < 16 + tier * 5; i++) {
        const glyph = document.createElement("span");
        glyph.className = "hfx-glyph";
        setIconNode(glyph, glyphs[i % glyphs.length], "hfx-glyph-img", "hatch glyph");
        glyph.style.left = (8 + Math.random() * 84) + "%";
        glyph.style.top = (10 + Math.random() * 78) + "%";
        glyph.style.fontSize = (0.8 + Math.random() * (0.8 + tier * 0.14)) + "rem";
        glyph.style.animationDelay = (Math.random() * -2.8) + "s";
        layer.appendChild(glyph);
    }

    const scan = document.createElement("div");
    scan.className = "hfx-scan";
    layer.appendChild(scan);

    overlay.insertBefore(layer, overlay.firstChild);
    return layer;
}
function hatchBurstFX(color, tier, emoji) {
    if (!game.settings.particles) return;
    const layer = document.body;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.42;
    const flare = document.createElement("div");
    flare.className = "hatch-flare";
    flare.style.left = cx + "px";
    flare.style.top = cy + "px";
    flare.style.background = "radial-gradient(circle, #fff 0%, " + color + " 34%, transparent 70%)";
    appendFxNode(layer, flare, 900, true);

    for (let i = 0; i < 4 + tier; i++) {
        const ring = document.createElement("div");
        ring.className = "hatch-screen-ring";
        ring.style.left = cx + "px";
        ring.style.top = cy + "px";
        ring.style.borderColor = i % 2 ? "#fff" : color;
        ring.style.animationDelay = (i * 0.08) + "s";
        appendFxNode(layer, ring, 1000, true);
    }

    const count = 14 + tier * 7;
    for (let i = 0; i < count; i++) {
        const ray = document.createElement("div");
        ray.className = "hatch-speedline";
        ray.style.left = cx + "px";
        ray.style.top = cy + "px";
        ray.style.background = "linear-gradient(90deg, transparent, " + (i % 4 ? color : "#fff") + ", transparent)";
        const ang = (Math.PI * 2 / count) * i + Math.random() * 0.18;
        const dist = 220 + Math.random() * (260 + tier * 80);
        ray.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        ray.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        ray.style.setProperty("--rot", (ang * 180 / Math.PI) + "deg");
        appendFxNode(layer, ray, 850, true);
    }
    const symbols = [emoji, "✦", "✨", "💫", "⭐", "◆"];
    for (let i = 0; i < 10 + tier * 5; i++) {
        const sigil = document.createElement("div");
        sigil.className = "hatch-sigil";
        setIconNode(sigil, symbols[i % symbols.length], "hatch-sigil-img", "hatch sigil");
        sigil.style.left = (14 + Math.random() * 72) + "vw";
        sigil.style.top = (16 + Math.random() * 62) + "vh";
        sigil.style.color = i % 3 ? color : "#fff";
        sigil.style.fontSize = (1 + Math.random() * (1.1 + tier * 0.18)) + "rem";
        sigil.style.animationDelay = (Math.random() * 0.18) + "s";
        appendFxNode(layer, sigil, 1250, true);
    }
    for (let i = 0; i < 20 + tier * 10; i++) {
        const star = document.createElement("div");
        star.className = "hatch-star";
        star.style.left = (Math.random() * 100) + "vw";
        star.style.top = (Math.random() * 100) + "vh";
        star.style.background = i % 3 ? color : "#fff";
        star.style.animationDelay = (Math.random() * 0.22) + "s";
        appendFxNode(layer, star, 1100, true);
    }
}

function openEggModal() { closeSheet(); renderEggShop(); const m=document.getElementById("egg-modal"); if(m)m.classList.remove("hidden"); }
function closeEggModal() { const m=document.getElementById("egg-modal"); if(m)m.classList.add("hidden"); }
function renderEggShop() {
    const bal = document.getElementById("egg-balance"); if (bal) bal.innerText = fmt(game.points);
    const multiLvl = auraLevel("multi"), megaLvl = auraLevel("mega");
    let html = '<div class="egg-grid">';
    getEggTemplates().forEach((egg, idx) => {
        const cost = eggCost(egg, game.worldIdx), ok = game.points >= cost;
        let odds = egg.pets.map(p => { const r=RARITY[p.rarity];
            return '<div class="odds-row"><span style="color:' + r.color + '">' + iconHTML(p.emoji, "odds-icon-img", p.name) + ' ' + p.name + '</span><span class="odds-pct">' + p.odds + '%</span></div>'; }).join("");
        let multiBtns = '';
        if (multiLvl > 0) {
            const ok3 = game.points >= cost * 3;
            multiBtns += '<button class="egg-buy-multi' + (ok3 ? '' : ' locked') + '" onclick="rollEggMulti(' + idx + ',3)">x3 · ' + fmt(cost * 3) + '</button>';
        }
        if (megaLvl > 0) {
            const ok10 = game.points >= cost * 10;
            multiBtns += '<button class="egg-buy-multi mega' + (ok10 ? '' : ' locked') + '" onclick="rollEggMulti(' + idx + ',10)">x10 · ' + fmt(cost * 10) + '</button>';
        }
        html += '<div class="egg-card" style="border-color:' + egg.color + '">' +
            '<div class="egg-emoji" style="filter:drop-shadow(0 0 12px ' + egg.color + ')">' + iconHTML(egg.emoji, "egg-icon-img", egg.name) + '</div>' +
            '<div class="egg-name" style="color:' + egg.color + '">' + egg.name + '</div>' +
            '<div class="egg-odds">' + odds + '</div>' +
            '<button class="egg-buy ' + (ok?"":"locked") + '" onclick="rollEgg(' + idx + ')">Open · ' + fmt(cost) + '</button>' +
            multiBtns + '</div>';
    });
    html += '</div>';
    const sel = document.getElementById("egg-selection"); if (sel) sel.innerHTML = html;
}
function rollEggMulti(idx, count) {
    const egg = getEggTemplates()[idx]; if (!egg) return;
    const cost = eggCost(egg, game.worldIdx) * count;
    if (game.points < cost) { sfxError(); showToast("❌ Not enough Stink!", 1500); return; }
    game.points -= cost;
    const results = [];
    for (let i=0; i<count; i++) {
        const chosen = rollBestFromEgg(egg);
        const pet = { id: Date.now()+Math.floor(Math.random()*100000)+i, name: chosen.name, emoji: chosen.emoji,
            rarity: chosen.rarity, star: 0, power: petPower(chosen.base, game.worldIdx) };
        game.pets.push(pet);
        game.discovered[dexKey(game.worldIdx, pet.name)] = true;
        results.push({ pet, egg });
    }
    updateDisplay(); saveGame();
    hatchMultiSession = true;
    hatchQueue = results.slice(1);
    playHatch(results[0].pet, results[0].egg);
}
function pickFromEgg(egg) {
    let roll = Math.random() * 100, chosen = egg.pets[0];
    for (const p of egg.pets) { if (roll < p.odds) { chosen = p; break; } roll -= p.odds; }
    return chosen;
}
function rollEgg(idx) {
    const egg = getEggTemplates()[idx]; if (!egg) return;
    const cost = eggCost(egg, game.worldIdx);
    if (game.points < cost) { sfxError(); showToast("❌ Not enough Stink!", 1500); return; }
    game.points -= cost;
    hatchMultiSession = false;
    hatchQueue = [];
    const chosen = rollBestFromEgg(egg);
    const pet = { id: Date.now()+Math.floor(Math.random()*100000), name: chosen.name, emoji: chosen.emoji,
        rarity: chosen.rarity, star: 0, power: petPower(chosen.base, game.worldIdx) };
    game.pets.push(pet);
    game.discovered[dexKey(game.worldIdx, pet.name)] = true;
    updateDisplay(); saveGame();
    playHatch(pet, egg);
}


// ============================================================
//  HATCH ANIMATION — cinematic, rarity-scaled suspense
// ============================================================
function playHatch(pet, egg) {
    clearHatchAnim();
    hatchActive = true; pendingHatch = pet;
    const r = RARITY[pet.rarity] || RARITY.common;
    const overlay = document.getElementById("hatch-overlay");
    const eggEl = document.getElementById("hatch-egg");
    const resEl = document.getElementById("hatch-result");
    const rays = document.getElementById("hatch-rays");
    const skip = document.getElementById("hatch-skip");
    if (!overlay || !eggEl || !resEl) return;
    closeEggModal();

    const multiActive = hatchMultiSession;

    // reset
    resEl.innerHTML = ""; resEl.className = "hatch-result";
    setIconNode(eggEl, egg.emoji, "hatch-egg-img", egg.name); eggEl.className = "hatch-egg"; eggEl.style.filter = "";
    eggEl.style.transform = ""; eggEl.style.transition = ""; eggEl.style.opacity = "1";
    if (rays) { rays.style.opacity = "0"; rays.classList.remove("spin");
        rays.style.background = "conic-gradient(from 0deg," + r.color + "00," + r.color + "88," + r.color + "00," + r.color + "88," + r.color + "00)"; }
    overlay.style.setProperty("--rc", r.color);
    overlay.className = "hatch-overlay tier" + r.tier;
    overlay.style.background = "rgba(5,2,12,0.97)";
    if (skip) { skip.textContent = multiActive ? "Next egg..." : "Tap to continue"; skip.style.opacity = "0"; skip.style.pointerEvents = "none"; }
    overlay.classList.remove("hidden");

    const tier = r.tier;
    const hatchFx = buildHatchFX(overlay, r.color, tier, pet.emoji || egg.emoji);

    // ---- PHASE 1: suspense build-up (scales by tier) ----
    const buildTimes = [600, 1000, 1600, 2400, 3400, 4800];
    const buildTime = buildTimes[tier] || 600;

    eggEl.style.transition = "transform " + (buildTime/1000).toFixed(1) + "s cubic-bezier(0.2,0,0.8,1), filter " + (buildTime/1000).toFixed(1) + "s ease";
    hatchDelay(() => {
        eggEl.style.transform = "scale(" + (1.1 + tier * 0.12) + ")";
        eggEl.style.filter = "drop-shadow(0 0 " + (10 + tier * 20) + "px " + r.color + ") brightness(1.2)";
    }, 50);

    if (tier >= 2) {
        overlay.style.transition = "background " + (buildTime * 0.8 / 1000).toFixed(1) + "s ease";
        hatchDelay(() => {
            overlay.style.background = "radial-gradient(ellipse at center, " + r.color + "22 0%, rgba(5,2,12,0.97) 70%)";
        }, 100);
    }

    let ticks = 0;
    const totalTicks = Math.floor(buildTime / Math.max(40, 130 - tier * 18));
    const tickInterval = buildTime / totalTicks;
    hatchChargeInt = setInterval(() => {
        const progress = ticks / totalTicks;
        const freq = 150 + progress * (200 + tier * 120);
        tone(freq, 0.07, "sine", 0.04 + tier * 0.012 + progress * 0.06);
        sparkleRise(r.color);
        if (tier >= 2 && ticks % 2 === 0) sparkleRise(r.color);
        if (tier >= 4 && ticks % 2 === 0) sparkleRise("#ffffff");
        if (tier >= 3 && progress > 0.6) burstAt(window.innerWidth/2, window.innerHeight*0.42, r.color, 3);
        if (hatchFx) {
            hatchFx.style.setProperty("--charge", progress.toFixed(2));
            hatchFx.style.setProperty("--halo-opacity", (0.28 + progress * 0.42).toFixed(2));
            hatchFx.style.setProperty("--tunnel-opacity", (0.12 + progress * 0.22).toFixed(2));
        }
        ticks++;
    }, tickInterval);

    if (tier >= 3 && rays) {
        hatchDelay(() => {
            rays.style.opacity = "0.4";
            rays.style.transition = "opacity 0.8s ease";
            rays.classList.add("spin");
        }, buildTime * 0.55);
    }

    if (tier >= 2) hatchDelay(() => shake(), buildTime * 0.7);
    if (tier >= 3) hatchDelay(() => shake(), buildTime * 0.85);

    const crackDelay = buildTime * 0.88;
    if (tier >= 1) {
        hatchDelay(() => {
            eggEl.style.transform = "scale(" + (1.25 + tier * 0.1) + ") rotate(-4deg)";
            tone(80 + tier * 20, 0.15, "sine", 0.12);
            if (tier >= 3) shake();
        }, crackDelay);
    }

    // ---- PHASE 3: BURST ----
    hatchDelay(() => {
        if (hatchChargeInt) { clearInterval(hatchChargeInt); hatchChargeInt = null; }
        if (hatchFx) hatchFx.classList.add("bursting");

        eggEl.style.transition = "transform 0.12s ease, filter 0.12s ease";
        eggEl.style.transform = "scale(0.05)";
        eggEl.style.opacity = "0";

        overlay.style.transition = "background 0.12s ease";
        overlay.style.background = r.color + "cc";
        hatchDelay(() => { overlay.style.background = "rgba(5,2,12,0.97)"; }, 120);

        shockwave(r.color);
        hatchBurstFX(r.color, tier, pet.emoji || egg.emoji);
        spawnConfetti(r.color, 25 + tier * 45);
        sfxRare(tier);

        if (tier >= 1) screenFlash(r.color);
        if (tier >= 2) {
            lightBurst(r.color);
            hatchDelay(() => shockwave(r.color), 150);
            spawnConfetti(r.color, 40);
        }
        if (tier >= 3) {
            shake();
            if (rays) rays.style.opacity = "1";
            burstAt(window.innerWidth/2, window.innerHeight*0.4, r.color, 50);
            hatchDelay(() => { sfxRare(tier); shake(); }, 200);
        }
        if (tier >= 4) {
            emojiRain([pet.emoji,"🌟","✨","💫","⭐","💥"], 80);
            document.body.classList.add("slowmo");
            hatchDelay(() => shockwave(r.color), 100);
            hatchDelay(() => shockwave(r.color), 300);
            hatchDelay(() => shockwave(r.color), 500);
            hatchDelay(() => sfxRare(tier), 350);
            hatchDelay(() => screenFlash(r.color), 80);
            hatchDelay(() => screenFlash("#ffffff"), 250);
            hatchDelay(() => screenFlash(r.color), 500);
            if (!multiActive) hatchDelay(() => bigBanner("⚡ MYTHIC ⚡", r.color), 400);
            burstAt(window.innerWidth/2, window.innerHeight*0.4, r.color, 60);
            burstAt(window.innerWidth*0.2, window.innerHeight*0.3, r.color, 30);
            burstAt(window.innerWidth*0.8, window.innerHeight*0.3, r.color, 30);
        }
        if (tier >= 5) {
            emojiRain(["✦","💎",pet.emoji,"💥","🌈","🔱","⭐","🌟"], 140);
            rainbowFlash();
            shockwave("#ffffff");
            spawnConfetti("#ffffff", 100);
            spawnConfetti(r.color, 100);
            burstAt(window.innerWidth/2, window.innerHeight*0.4, "#ffffff", 80);
            burstAt(window.innerWidth*0.1, window.innerHeight*0.5, r.color, 40);
            burstAt(window.innerWidth*0.9, window.innerHeight*0.5, r.color, 40);
            hatchDelay(() => { shake(); rainbowFlash(); sfxRare(5); shockwave(r.color); }, 200);
            hatchDelay(() => { shake(); shockwave("#ffffff"); emojiRain(["✦","💎","🔱","👑","🌟"], 80); }, 500);
            hatchDelay(() => { rainbowFlash(); shockwave(r.color); sfxRare(5); }, 800);
            hatchDelay(() => { shake(); rainbowFlash(); shockwave("#ffffff"); }, 1100);
            overlay.style.transition = "background 0.08s";
            hatchDelay(() => { overlay.style.background = "#000000f0"; }, 100);
            hatchDelay(() => { overlay.style.background = r.color + "bb"; rainbowFlash(); }, 300);
            hatchDelay(() => { overlay.style.background = "#000000f0"; }, 550);
            hatchDelay(() => { overlay.style.background = "radial-gradient(ellipse at center," + r.color + "55 0%,rgba(5,2,12,0.97) 65%)"; rainbowFlash(); }, 750);
            if (!multiActive) hatchDelay(() => bigBanner("✦ SECRET FOUND ✦", r.color), 250);
        }

        // ---- PHASE 4: REVEAL ----
        const revealDelay = 280 + tier * 120;
        hatchDelay(() => {
            if (hatchFx) hatchFx.classList.add("revealed");
            setIconNode(eggEl, pet.emoji, "hatch-pet-img", pet.name);
            eggEl.style.opacity = "1";
            eggEl.style.transition = "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), filter 0.5s ease";
            eggEl.style.transform = "scale(1)";
            eggEl.style.filter = "drop-shadow(0 0 " + (24 + tier * 24) + "px " + r.color + ") brightness(1.3)";
            eggEl.className = "hatch-egg reveal tier" + tier;

            overlay.style.transition = "background 0.6s ease";
            overlay.style.background = "radial-gradient(ellipse at center, " + r.color + "33 0%, rgba(5,2,12,0.97) 65%)";

            if (tier >= 3 && rays) {
                rays.style.opacity = "0.85";
                rays.style.transition = "opacity 0.4s ease";
            }

            hatchDelay(() => {
                const stars = pet.star ? "⭐".repeat(Math.min(pet.star,5)) : "";
                const nameSize = Math.min(1.35 + tier * 0.1, 1.85);
                resEl.innerHTML =
                    '<div class="hatch-rarity" style="color:' + r.color + ';border-color:' + r.color + ';text-shadow:0 0 16px ' + r.color + '">' + r.label + (stars ? " " + stars : "") + '</div>' +
                    '<div class="hatch-name" style="font-size:' + nameSize + 'rem">' + pet.name + '</div>' +
                    '<div class="hatch-power" style="color:' + r.color + '">' + pet.power.toFixed(2) + 'x click power</div>';
                resEl.classList.add("show");
                if (tier >= 2 && !multiActive) bigBanner(r.label + "!!!", r.color);
                document.body.classList.remove("slowmo");

                if (multiActive) {
                    if (skip) { skip.textContent = "Next egg..."; skip.style.opacity = "0.45"; skip.style.pointerEvents = "none"; }
                    hatchTimeout = setTimeout(finishHatch, 900 + tier * 100);
                } else if (tier === 0) {
                    if (skip) { skip.style.opacity = "0.35"; skip.style.pointerEvents = "none"; }
                    hatchTimeout = setTimeout(finishHatch, 1400);
                } else if (skip) {
                    skip.textContent = "Tap to continue";
                    skip.style.opacity = "1";
                    skip.style.pointerEvents = "auto";
                }
            }, 350 + tier * 80);
        }, revealDelay);

    }, buildTime);
}
function overlayTap() {
    if (hatchMultiSession) return;
    const skip = document.getElementById("hatch-skip");
    if (skip && skip.style.pointerEvents !== "none") finishHatch();
}
function finishHatch() {
    if (!hatchActive) return;
    hatchActive = false;
    if (hatchChargeInt) { clearInterval(hatchChargeInt); hatchChargeInt = null; }
    if (hatchTimeout) { clearTimeout(hatchTimeout); hatchTimeout = null; }
    hatchAnimTimers.forEach(t => clearTimeout(t));
    hatchAnimTimers = [];
    clearHatchFX();
    const overlay = document.getElementById("hatch-overlay"), rays = document.getElementById("hatch-rays");
    const resEl = document.getElementById("hatch-result");
    if (rays) rays.classList.remove("spin");
    if (resEl) { resEl.innerHTML = ""; resEl.className = "hatch-result"; }
    if (overlay) overlay.classList.add("hidden");
    document.body.classList.remove("slowmo");
    if (hatchQueue.length > 0) {
        const next = hatchQueue.shift();
        hatchAnimTimers.push(setTimeout(() => playHatch(next.pet, next.egg), 350));
        return;
    }
    hatchMultiSession = false;
    updateDisplay();
    renderEggShop();
    const m = document.getElementById("egg-modal"); if (m) m.classList.remove("hidden");
    petTabCur = "collection";
}


// ============================================================
//  VISUAL FX LIBRARY
// ============================================================
function fxLayer() { return byId("golden-layer"); }

// little fart-cloud puffs + sparks on every click
const PUFFS = ["💨","💨","💨","✨","⭐","💫","🌟","💥","🔥","⚡"];
function clickPuff(x, y) {
    if (!game.settings.particles) return;
    const layer = fxLayer(); if (!layer) return;
    if (fxNodeCount >= FX_NODE_LIMIT) return;
    const w = WORLDS[game.worldIdx || 0];
    const wColor = (w && w.theme) ? w.theme.p : "#7FFF00";
    // more puffs at higher combo
    const budget = Math.max(0, FX_NODE_LIMIT - fxNodeCount);
    const n = Math.min(3 + Math.floor(comboValue / 20) + Math.floor(Math.random()*3), budget);
    for (let i = 0; i < n; i++) {
        const p = document.createElement("div");
        p.className = "click-puff";
        setIconNode(p, PUFFS[Math.floor(Math.random()*PUFFS.length)], "fx-icon-img", "click puff");
        p.style.left = x + "px"; p.style.top = y + "px";
        const ang = -Math.PI/2 + (Math.random()-0.5)*2.2, dist = 35 + Math.random()*80;
        p.style.setProperty("--dx", Math.cos(ang)*dist + "px");
        p.style.setProperty("--dy", (Math.sin(ang)*dist) + "px");
        p.style.fontSize = (0.7 + Math.random()*1.1) + "rem";
        appendFxNode(layer, p, 700);
    }
    // spark dots in world color
    const sparks = Math.min(4 + Math.floor(comboValue / 15), Math.max(0, FX_NODE_LIMIT - fxNodeCount));
    for (let i = 0; i < sparks; i++) {
        const s = document.createElement("div"); s.className = "confetti";
        s.style.left = x + "px"; s.style.top = y + "px";
        s.style.width = s.style.height = (3 + Math.random()*4) + "px";
        s.style.borderRadius = "50%";
        s.style.background = Math.random() < 0.6 ? wColor : "#ffffff";
        const ang = Math.random()*Math.PI*2, dist = 20 + Math.random()*70;
        s.style.setProperty("--dx", Math.cos(ang)*dist + "px");
        s.style.setProperty("--dy", Math.sin(ang)*dist + "px");
        appendFxNode(layer, s, 600);
    }
    const streaks = Math.min(2 + Math.floor(comboValue / 35), Math.max(0, FX_NODE_LIMIT - fxNodeCount));
    for (let i = 0; i < streaks; i++) {
        const line = document.createElement("div");
        line.className = "click-streak";
        line.style.left = x + "px"; line.style.top = y + "px";
        line.style.color = i % 2 ? wColor : "#fff";
        line.style.background = "linear-gradient(90deg, transparent, " + (i % 2 ? wColor : "#fff") + ", transparent)";
        const ang = Math.random() * Math.PI * 2;
        const dist = 90 + Math.random() * 160;
        line.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        line.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        line.style.setProperty("--rot", (ang * 180 / Math.PI) + "deg");
        appendFxNode(layer, line, 520);
    }
    const glint = document.createElement("div");
    glint.className = "click-glint";
    glint.style.left = x + "px"; glint.style.top = y + "px";
    glint.style.color = wColor;
    glint.style.borderColor = wColor;
    appendFxNode(layer, glint, 520);
}

// ambient floating particles around the button
let ambientTimer = null;
function startAmbientParticles() {
    if (ambientTimer) return;
    ambientTimer = setInterval(() => {
        if (document.hidden || !game.settings.particles) return;
        const layer = fxLayer(); if (!layer) return;
        if (fxNodeCount >= FX_NODE_LIMIT) return;
        const w = WORLDS[game.worldIdx || 0];
        const wColor = (w && w.theme) ? w.theme.p : "#7FFF00";
        const btn = byId("main-btn"); if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
        const angle = Math.random() * Math.PI * 2;
        const r = rect.width/2 + 10 + Math.random()*20;
        const sx = cx + Math.cos(angle)*r, sy = cy + Math.sin(angle)*r;
        const p = document.createElement("div"); p.className = "click-puff";
        const emojis = ["✨","💫","⭐","🌟","💨"];
        setIconNode(p, emojis[Math.floor(Math.random()*emojis.length)], "fx-icon-img", "ambient puff");
        p.style.left = sx + "px"; p.style.top = sy + "px";
        p.style.fontSize = (0.5 + Math.random()*0.7) + "rem";
        p.style.opacity = "0.7";
        const drift = -30 - Math.random()*40;
        p.style.setProperty("--dx", (Math.random()*20-10) + "px");
        p.style.setProperty("--dy", drift + "px");
        appendFxNode(layer, p, 900);
    }, 300);
}

function floatText(x, y, txt, color, big) {
    const el = document.createElement("div");
    el.className = "float-text" + (big ? " big" : "");
    el.textContent = txt; el.style.left = x + "px"; el.style.top = y + "px"; el.style.color = color;
    appendFxNode(document.body, el, 900, true);
}
function popButton() { const b=byId("main-btn"); if(!b)return; b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
function showCritFx(e) {
    const c = document.createElement("div"); c.className = "crit-fx"; c.textContent = "⚡ CRIT x" + criticalMultiplier.toFixed(1);
    c.style.left = (e.clientX-40)+"px"; c.style.top = (e.clientY-60)+"px";
    appendFxNode(document.body, c, 800, true); sfxCrit(); ringAt(e.clientX, e.clientY, "#FFD54A");
}
function showToast(text, dur) {
    const t = document.createElement("div"); t.className = "toast"; t.innerHTML = text;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(()=>t.remove(),400); }, dur||2000);
}
function screenFlash(color) { const f=document.getElementById("screen-flash"); if(!f)return; f.style.background=color; f.classList.remove("flash"); void f.offsetWidth; f.classList.add("flash"); }
function rainbowFlash() { const f=document.getElementById("screen-flash"); if(!f)return; f.style.background="linear-gradient(90deg,#ff3d9a,#ffd54a,#7fff00,#00e0ff,#b14eff)"; f.classList.remove("flash"); void f.offsetWidth; f.classList.add("flash"); }
function shake() {
    if (!game.settings.screenShake) return;
    const c = document.getElementById("game-container"); if (!c) return;
    c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); setTimeout(()=>c.classList.remove("shake"),500);
}
function spawnConfetti(color, count) {
    if (!game.settings.particles) return; const layer = fxLayer(); if (!layer) return;
    const colors = [color, "#fff", "#FFD54A", "#00E0FF", "#FF3D9A"];
    for (let i=0;i<count;i++) {
        if (fxNodeCount >= FX_NODE_LIMIT) break;
        const p = document.createElement("div"); p.className = "confetti";
        p.style.left="50%"; p.style.top="44%"; p.style.background = colors[i%colors.length];
        const ang = Math.random()*Math.PI*2, dist = 90+Math.random()*300;
        p.style.setProperty("--dx", Math.cos(ang)*dist+"px");
        p.style.setProperty("--dy", (Math.sin(ang)*dist-50)+"px");
        appendFxNode(layer, p, 1200);
    }
}
function burstAt(x, y, color, count) {
    if (!game.settings.particles) return; const layer = fxLayer(); if (!layer) return;
    for (let i=0;i<count;i++) {
        if (fxNodeCount >= FX_NODE_LIMIT) break;
        const p = document.createElement("div"); p.className = "confetti";
        p.style.left = x+"px"; p.style.top = y+"px"; p.style.background = Math.random()<0.5?color:"#fff";
        const ang = Math.random()*Math.PI*2, dist = 40+Math.random()*150;
        p.style.setProperty("--dx", Math.cos(ang)*dist+"px");
        p.style.setProperty("--dy", (Math.sin(ang)*dist)+"px");
        appendFxNode(layer, p, 1000);
    }
}
function ringAt(x, y, color) {
    const layer = fxLayer(); if (!layer) return;
    const r = document.createElement("div"); r.className = "fx-ring";
    r.style.left = x+"px"; r.style.top = y+"px"; r.style.borderColor = color;
    appendFxNode(layer, r, 600, true);
}


function shockwave(color) {
    const layer = fxLayer(); if (!layer) return;
    const s = document.createElement("div"); s.className = "shockwave";
    s.style.left = "50%"; s.style.top = "44%"; s.style.borderColor = color;
    appendFxNode(layer, s, 700, true);
}
function lightBurst(color) {
    const layer = fxLayer(); if (!layer) return;
    const b = document.createElement("div"); b.className = "light-burst";
    b.style.left = "50%"; b.style.top = "44%";
    b.style.background = "radial-gradient(circle," + color + "cc 0%, transparent 70%)";
    appendFxNode(layer, b, 600, true);
}
function sparkleRise(color) {
    if (!game.settings.particles) return; const layer = fxLayer(); if (!layer) return;
    const s = document.createElement("div"); s.className = "sparkle";
    s.style.left = (40 + Math.random()*20) + "%"; s.style.top = "52%"; s.style.background = color;
    appendFxNode(layer, s, 900);
}
function emojiRain(emojis, count) {
    if (!game.settings.particles) return; const layer = fxLayer(); if (!layer) return;
    for (let i=0;i<count;i++) {
        if (fxNodeCount >= FX_NODE_LIMIT) break;
        const e = document.createElement("div"); e.className = "emoji-rain";
        setIconNode(e, emojis[i % emojis.length], "rain-icon-img", "emoji rain");
        e.style.left = Math.random()*100 + "%";
        e.style.animationDelay = (Math.random()*0.6) + "s";
        e.style.fontSize = (1.2 + Math.random()*1.4) + "rem";
        appendFxNode(layer, e, 2200);
    }
}
function bigBanner(text, color) {
    const b = document.createElement("div"); b.className = "rarity-banner";
    b.textContent = text; b.style.color = color; b.style.textShadow = "0 0 30px " + color;
    appendFxNode(document.body, b, 2200, true);
}

// ============================================================
//  GOLDEN FART (scaled by Golden Aura)
// ============================================================
function spawnGoldenFart() {
    const layer = fxLayer(); if (!layer) return;
    const el = document.createElement("div"); el.className = "golden-fart"; setIconNode(el, "💨", "bonus-icon-img", "Golden fart");
    el.style.top = (18 + Math.random()*52) + "%"; el.style.left = "-60px";
    layer.appendChild(el);
    requestAnimationFrame(() => { el.style.left = "112%"; });
    el.onclick = () => {
        const goldMult = 1 + auraLevel("golden") * 0.5;
        // world scaling: each world makes golden farts exponentially more valuable
        const worldScale = Math.pow(1.6, game.worldIdx || 0);
        // reward = 5 minutes passive OR 1000 clicks, whichever bigger, times world scale
        const incomeBase = getPassive() * getPetMult() * 300;
        const clickBase  = getClickPower() * getPetMult() * 1000;
        const reward = Math.max(incomeBase, clickBase, game.points * 0.08, 100) * goldMult * worldScale;
        game.points += reward;
        floatText(window.innerWidth/2, window.innerHeight/2, "🤑 +" + fmt(reward), "#FFD54A", true);
        screenFlash("#ffd54a"); sfxRare(4); shake(); burstAt(window.innerWidth/2, window.innerHeight/2, "#FFD54A", 36);
        emojiRain(["💨","🌟","💰","✦"], 20);
        showToast("🌟 GOLDEN FART! +" + fmt(reward) + " Stink!", 2500);
        el.remove(); updateDisplay(); saveGame();
    };
    setTimeout(() => el.remove(), 9000);
}
setInterval(() => { if (Math.random() < 0.5) spawnGoldenFart(); }, 35000);

// ============================================================
//  FLYING LEGENDARY EGG — rare bonus stink (not a free hatch)
// ============================================================
function spawnFlyingEgg() {
    if ((game.totalClicks || 0) < 50) return;
    const layer = fxLayer(); if (!layer) return;
    const eggs = getEggTemplates();
    const egg = eggs[Math.floor(Math.random() * eggs.length)];
    const el = document.createElement("div");
    el.className = "golden-fart";
    el.style.fontSize = "2.2rem";
    el.style.filter = "drop-shadow(0 0 12px " + egg.color + ") drop-shadow(0 0 24px " + egg.color + ")";
    el.style.top = (15 + Math.random() * 50) + "%";
    el.style.left = "-70px";
    setIconNode(el, egg.emoji, "bonus-icon-img", egg.name);
    el.style.transition = "left 7s linear";
    layer.appendChild(el);
    requestAnimationFrame(() => { el.style.left = "115%"; });
    el.onclick = () => {
        el.remove();
        sfxRare(2);
        screenFlash(egg.color);
        burstAt(window.innerWidth/2, window.innerHeight/2, egg.color, 30);
        emojiRain([egg.emoji, "🌟", "✨", "⭐"], 20);
        const reward = Math.max(getClickPower() * getPetMult() * 50, eggCost(egg, game.worldIdx), 100);
        game.points += reward;
        floatText(window.innerWidth/2, window.innerHeight * 0.45, "+" + fmt(reward) + " 💨", egg.color, true);
        showToast("🥚 Lucky egg! +" + fmt(reward) + " Stink!", 2200);
        updateDisplay(); saveGame();
    };
    setTimeout(() => el.remove(), 8000);
}
setInterval(() => { if (Math.random() < 0.12) spawnFlyingEgg(); }, 120000);


// ============================================================
//  DISPLAY + BOOT
// ============================================================
function setTxt(id, v) {
    if (textCache[id] === v) return;
    const e = byId(id);
    if (e) {
        e.textContent = v;
        textCache[id] = v;
    }
}
function updateDisplay() {
    setTxt("points", fmt(game.points));
    setTxt("per-click", fmt(getClickPower() * getPetMult()));
    setTxt("passive-income", fmt(getPassive() * getPetMult()) + "/s");
    setTxt("rebirths", String(game.rebirths || 0));
    setTxt("aura-mini", "✦ " + fmt(game.aura));
    if (WORLDS[game.worldIdx]) setTxt("world-name", WORLDS[game.worldIdx].name);
    const rb = byId("rebirth-btn");
    if (rb) {
        const cost = getRebirthCost();
        setTxt("rebirth-cost", fmt(cost) + " 💨");
        rb.classList.toggle("ready", game.points >= cost);
    }
}
function createParticles() {
    const overlay = document.getElementById("particle-overlay"); if (!overlay) return; overlay.innerHTML = "";
    for (let i=0;i<16;i++) {
        const p = document.createElement("div"); p.className = "particle";
        p.style.left = Math.random()*100 + "%"; p.style.animationDuration = (10+Math.random()*14)+"s"; p.style.animationDelay = (Math.random()*8)+"s";
        overlay.appendChild(p);
    }
}
// passive tick
setInterval(() => {
    const inc = getPassive() * getPetMult();
    if (!isNaN(inc) && inc > 0) { game.points += inc; updateDisplay(); if (upgradesRendered && sheetOpen("upgrades")) renderUpgradeTabs(); }
}, 1000);
setInterval(() => saveGame(true), 5000);

function initGame() {
    loadGame();
    hatchActive = false;
    hatchMultiSession = false;
    hatchQueue = [];
    clearHatchAnim();
    const hatchOverlay = document.getElementById("hatch-overlay");
    const eggModal = document.getElementById("egg-modal");
    if (hatchOverlay) hatchOverlay.classList.add("hidden");
    if (eggModal) eggModal.classList.add("hidden");
    closeSheet();
    if (!game.settings.particles) { const o=document.getElementById("particle-overlay"); if(o)o.style.display="none"; }
    createParticles();
    applyWorldTheme();
    updateDisplay();
    renderUpgradeTabs();
    renderPets();
    renderWorlds();
    syncSettingsUI();
    const codeInput = document.getElementById("code-input");
    if (codeInput && !codeInput.dataset.bound) {
        codeInput.addEventListener("keydown", ev => { if (ev.key === "Enter") redeemCode(); });
        codeInput.dataset.bound = "1";
    }
    const mainBtn = document.getElementById("main-btn");
    if (mainBtn) {
        mainBtn.addEventListener("click", handleMainClick);
        mainBtn.addEventListener("touchstart", function(ev){ ev.preventDefault(); const tp = ev.touches&&ev.touches[0]; handleMainClick({clientX: tp?tp.clientX:innerWidth/2, clientY: tp?tp.clientY:innerHeight/2}); }, { passive:false });
    }
    buildButtonDecor();
    applyChromeIcons();
    startAmbientParticles();
    startAmbientEffects();
    addCornerGlows();
}

// ============================================================
//  AMBIENT SCREEN EFFECTS
// ============================================================
function getWorldColors() {
    const w = WORLDS[game.worldIdx || 0];
    return w && w.theme ? [w.theme.p, w.theme.s, w.theme.a] : ["#7FFF00","#B14EFF","#00E0FF"];
}

// Corner glows — 4 permanent blobs in screen corners
function addCornerGlows() {
    if (!game.settings.particles || byId("corner-glow-tl")) return;
    ["tl","tr","bl","br"].forEach((pos, i) => {
        const el = document.createElement("div");
        el.className = "corner-glow " + pos;
        el.id = "corner-glow-" + pos;
        el.style.animationDelay = (i * 1.2) + "s";
        document.body.appendChild(el);
    });
    updateCornerGlows();
}
function updateCornerGlows() {
    const colors = getWorldColors();
    ["tl","tr","bl","br"].forEach((pos, i) => {
        const el = document.getElementById("corner-glow-" + pos);
        if (el) el.style.background = colors[i % colors.length];
    });
}

// Floating orbs that drift slowly across the screen
function spawnAmbOrb() {
    if (document.hidden || !game.settings.particles || fxNodeCount >= FX_NODE_LIMIT) return;
    const colors = getWorldColors();
    const el = document.createElement("div");
    el.className = "amb-orb";
    const size = 80 + Math.random() * 180;
    el.style.width = size + "px"; el.style.height = size + "px";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.left = (Math.random() * 90) + "vw";
    el.style.top  = (Math.random() * 80) + "vh";
    const dur = 8 + Math.random() * 14;
    el.style.animationDuration = dur + "s";
    el.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
    el.style.setProperty("--dy", (Math.random() * 120 - 60) + "px");
    el.style.setProperty("--dx2", (Math.random() * 200 - 100) + "px");
    el.style.setProperty("--dy2", (Math.random() * 200 - 100) + "px");
    appendFxNode(document.body, el, dur * 1000);
}

// Shooting streaks flying across the screen
function spawnAmbStreak() {
    if (document.hidden || !game.settings.particles || fxNodeCount >= FX_NODE_LIMIT) return;
    const colors = getWorldColors();
    const el = document.createElement("div");
    el.className = "amb-streak";
    const w = 60 + Math.random() * 140;
    el.style.width = w + "px";
    el.style.top = (10 + Math.random() * 80) + "vh";
    const color = colors[Math.floor(Math.random() * colors.length)];
    el.style.background = "linear-gradient(90deg, transparent, " + color + ", transparent)";
    const ang = (Math.random() * 20 - 10);
    el.style.setProperty("--ang", ang + "deg");
    const dur = 1.2 + Math.random() * 1.8;
    el.style.animationDuration = dur + "s";
    appendFxNode(document.body, el, dur * 1000 + 100);
}

// Pulsing rings that expand from random spots
function spawnAmbRing() {
    if (document.hidden || !game.settings.particles || fxNodeCount >= FX_NODE_LIMIT) return;
    const colors = getWorldColors();
    const el = document.createElement("div");
    el.className = "amb-ring";
    const size = 30 + Math.random() * 60;
    el.style.width = size + "px"; el.style.height = size + "px";
    el.style.left = (10 + Math.random() * 80) + "vw";
    el.style.top  = (10 + Math.random() * 70) + "vh";
    const color = colors[Math.floor(Math.random() * colors.length)];
    el.style.borderColor = color;
    el.style.boxShadow = "0 0 12px " + color;
    el.style.animationDuration = (1.5 + Math.random()) + "s";
    appendFxNode(document.body, el, 2600);
}

// Floating sparkle dots
function spawnAmbSpark() {
    if (document.hidden || !game.settings.particles || fxNodeCount >= FX_NODE_LIMIT) return;
    const colors = getWorldColors();
    const el = document.createElement("div");
    el.className = "amb-spark";
    el.style.left = (5 + Math.random() * 90) + "vw";
    el.style.top  = (20 + Math.random() * 70) + "vh";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.setProperty("--rise", -(40 + Math.random() * 80) + "px");
    el.style.animationDuration = (1 + Math.random() * 1.5) + "s";
    appendFxNode(document.body, el, 2600);
}

function spawnAmbRune() {
    if (document.hidden || !game.settings.particles || fxNodeCount >= FX_NODE_LIMIT) return;
    const colors = getWorldColors();
    const el = document.createElement("div");
    el.className = "amb-rune";
    const runes = ["✦", "◆", "◇", "✧", "⬡", "✺", "✹"];
    el.textContent = runes[Math.floor(Math.random() * runes.length)];
    el.style.left = (6 + Math.random() * 88) + "vw";
    el.style.top = (12 + Math.random() * 72) + "vh";
    el.style.color = colors[Math.floor(Math.random() * colors.length)];
    el.style.fontSize = (1 + Math.random() * 1.4) + "rem";
    el.style.animationDuration = (3.5 + Math.random() * 3) + "s";
    appendFxNode(document.body, el, 6800);
}

let ambientEffectsStarted = false;
function startAmbientEffects() {
    if (ambientEffectsStarted) return;
    ambientEffectsStarted = true;
    // orbs every 2s
    setInterval(spawnAmbOrb, 2000);
    // streaks every 3-5s
    setInterval(spawnAmbStreak, 3500);
    // rings every 1.5s
    setInterval(spawnAmbRing, 1500);
    // sparks every 400ms
    setInterval(spawnAmbSpark, 400);
    // floating neon glyphs
    setInterval(spawnAmbRune, 1800);
    // spawn a few immediately
    for (let i = 0; i < 3; i++) setTimeout(spawnAmbOrb, i * 600);
    for (let i = 0; i < 4; i++) setTimeout(spawnAmbSpark, i * 200);
    for (let i = 0; i < 3; i++) setTimeout(spawnAmbRune, i * 450);
}

// inject decorative orbiting emojis inside the main button
function buildButtonDecor() {
    const btn = document.getElementById("main-btn");
    if (!btn || btn.querySelector(".btn-orbit")) return;
    const orbit = document.createElement("div"); orbit.className = "btn-orbit";
    const orbEmojis = ["💨","✨","💩","🌟","💚","⭐","🔥","💫"];
    for (let i=0;i<8;i++) {
        const d = document.createElement("span"); d.className = "orb"; setIconNode(d, orbEmojis[i], "orbit-icon-img", "button orbit");
        d.style.transform = "rotate(" + (i*45) + "deg) translateY(-160px)";
        orbit.appendChild(d);
    }
    btn.appendChild(orbit);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initGame);
else initGame();



// ============================================================
//  WORLD THEMING — recolor whole UI per world
// ============================================================
function applyWorldTheme() {
    const w = WORLDS[game.worldIdx || 0]; if (!w || !w.theme) return;
    const t = w.theme;
    const root = document.documentElement;
    // core palette
    root.style.setProperty("--green",  t.p);
    root.style.setProperty("--purple", t.s);
    root.style.setProperty("--cyan",   t.a);
    root.style.setProperty("--pink",   t.p);
    root.style.setProperty("--bg0",    t.bg2);
    root.style.setProperty("--bg1",    t.bg1);
    root.style.setProperty("--stroke", t.s + "66");
    // panel bg uses world bg tinted by secondary color
    root.style.setProperty("--panel",  hexToRgba(t.bg1, 0.75));
    // muted text slightly tinted by primary
    root.style.setProperty("--muted",  hexToRgba(t.p, 0.55));
    // update bottom nav border glow
    const nav = document.querySelector(".bottom-nav");
    if (nav) nav.style.borderTopColor = t.s + "99";
    // update body gradient
    document.body.style.background =
        "linear-gradient(160deg," + t.bg1 + "," + t.bg2 + ")";
    // recolor particles to primary
    const overlay = document.getElementById("particle-overlay");
    if (overlay) overlay.querySelectorAll(".particle").forEach(p => {
        p.style.background = "radial-gradient(circle, " + t.p + "e6, " + t.p + "00)";
    });
}
function hexToRgba(hex, alpha) {
    // handles 6-char hex like #1a2b3c
    try {
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    } catch(e) { return "rgba(30,18,55," + alpha + ")"; }
}

// ============================================================
//  EXTRA HATCH FX — only fire on rarer pets (tier 3+)
// ============================================================
function lightningStrike(color) {
    const layer = fxLayer(); if (!layer) return;
    const bolt = document.createElement("div");
    bolt.className = "lightning-bolt";
    bolt.style.background = "linear-gradient(180deg, transparent, " + color + ", #fff, " + color + ", transparent)";
    bolt.style.left = (10 + Math.random() * 80) + "%";
    layer.appendChild(bolt);
    setTimeout(() => bolt.remove(), 400);
}
function spotlightBeam(color) {
    const layer = fxLayer(); if (!layer) return;
    const beam = document.createElement("div");
    beam.className = "spot-beam";
    beam.style.background = "linear-gradient(180deg, " + color + "00, " + color + "70, " + color + "00)";
    layer.appendChild(beam);
    setTimeout(() => beam.remove(), 1200);
}
function fanfareSfx(tier) {
    // layered melodic fanfare — gets richer with rarity
    const ctx = getCtx(); if (!ctx) return;
    const m = ensureMaster(); if (!m) return;
    const notes = [
        [262, 330, 392],          // C major triad
        [330, 392, 494],          // E minor
        [392, 494, 587],          // G
        [523, 659, 784, 988],     // C5 maj
        [523, 659, 784, 988, 1175], // bigger
        [523, 659, 784, 988, 1175, 1397] // mythic
    ];
    const set = notes[Math.min(tier, notes.length - 1)];
    set.forEach((freq, i) => {
        setTimeout(() => {
            const t = ctx.currentTime;
            const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
            const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2;
            const g = vEnv(ctx, 0.18 * (game.settings.sfxVol || 0.7), 0.005, 0.45, t);
            const g2 = ctx.createGain(); g2.gain.value = 0.4;
            o.connect(g); o2.connect(g2); g2.connect(g); g.connect(m); routeWet(g);
            o.start(t); o2.start(t); o.stop(t + 0.5); o2.stop(t + 0.5);
        }, i * 90);
    });
}
function chargeUpSfx() {
    // rising "anticipation" sweep
    const ctx = getCtx(); if (!ctx) return;
    const m = ensureMaster(); if (!m) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(800, t + 0.9);
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1200; f.Q.value = 8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.18 * (game.settings.sfxVol || 0.7), t + 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    o.connect(f); f.connect(g); g.connect(m); routeWet(g);
    o.start(t); o.stop(t + 1.05);
}

// patch playHatch with extra FX based on tier
const _originalPlayHatch = playHatch;
playHatch = function(pet, egg) {
    const r = RARITY[pet.rarity] || RARITY.common;
    // tier 3+: anticipation charge-up sweep at start
    if (r.tier >= 3) chargeUpSfx();
    // tier 4+: spotlight beam appears
    if (r.tier >= 4) setTimeout(() => spotlightBeam(r.color), 200);
    // tier 5: lightning strikes during shake
    if (r.tier >= 5) {
        let bolts = 0;
        const li = setInterval(() => {
            lightningStrike(r.color);
            screenFlash(r.color);
            bolts++;
            if (bolts >= 4) clearInterval(li);
        }, 220);
    }
    _originalPlayHatch(pet, egg);
    // schedule reveal-time fanfare
    const shakeTime = 850 + r.tier * 160;
    setTimeout(() => {
        fanfareSfx(r.tier);
        // tier 3+: extra stacked shockwaves
        if (r.tier >= 3) {
            setTimeout(() => shockwave(r.color), 100);
            setTimeout(() => shockwave("#fff"), 250);
            setTimeout(() => shockwave(r.color), 400);
        }
        // tier 4+: even more confetti waves
        if (r.tier >= 4) {
            setTimeout(() => spawnConfetti(r.color, 40), 500);
            setTimeout(() => spawnConfetti("#fff", 40), 800);
        }
        // tier 5: epic rainbow burst
        if (r.tier >= 5) {
            ["#ff3d9a","#ffd54a","#7fff00","#00e0ff","#b14eff"].forEach((c, i) => {
                setTimeout(() => { spawnConfetti(c, 25); shockwave(c); }, i * 200);
            });
        }
    }, shakeTime);
};
