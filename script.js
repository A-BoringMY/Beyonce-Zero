const CURRENT_VERSION = "1.2"; // Version Terkini
let playerName = ""; 
let clicks = 0, diamonds = 0, clickPower = 1, basePower = 1, rebirthCost = 0, rebirths = 0, diaReward = 1, autoClickers = 0, diamondFarms = 0, musicStarted = false, endingReached = false;
let itemPower = 0; 
let inventory = { sword: false, wand: false, glove: false, laser: false, quantum: false }; 

const SAVE_KEY = 'BeyondZero_Final_Extreme_V1.2';

window.onload = function() {
    // SYSTEM VERSION CHECK
    let lastVer = localStorage.getItem('game_ver');
    if (lastVer !== CURRENT_VERSION) {
        localStorage.clear(); // Bersihkan data lama supaya tak crash
        localStorage.setItem('game_ver', CURRENT_VERSION);
    }

    try {
        let saved = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (saved) {
            playerName = saved.playerName || ""; 
            clicks = Number(saved.clicks) || 0;
            diamonds = Number(saved.diamonds) || 0;
            basePower = Number(saved.basePower) || 1;
            itemPower = Number(saved.itemPower) || 0;
            rebirths = Number(saved.rebirths) || 0;
            diaReward = Number(saved.diaReward) || 1;
            autoClickers = Number(saved.autoClickers) || 0;
            diamondFarms = Number(saved.diamondFarms) || 0;
            endingReached = saved.endingReached || false;
            if(saved.inventory) inventory = saved.inventory;

            if (playerName !== "") {
                document.getElementById('startOverlay').style.display = 'none';
            }
        }
    } catch (e) { console.log("Load error."); }
    updatePower();
    updateUI();
    updateLeaderboard(); 
};

function startGame() { 
    let input = document.getElementById('playerNameInput');
    let nameVal = (input && input.value.trim() !== "") ? input.value.trim() : "HERO";
    
    // KOD RAHSIA AZFAR
    if(nameVal === "AzfarAdmin") {
        rebirths = 100; diamonds += 9999999999;
        alert("WELCOME CREATOR! 👑");
    } else if(nameVal.toLowerCase() === "ayam") {
        rebirths = 50; diamonds += 1000000;
        alert("CHICKEN MODE 🐥");
    }

    playerName = nameVal.substring(0,12);
    document.getElementById('startOverlay').style.display = 'none';
    musicStarted = true; 
    manageBGM();
    updateUI(); 
    save(); 
}

function doClick(e) {
    let finalPower = clickPower;
    let isCrit = false;
    // Glove System (15% Crit)
    if (inventory.glove && Math.random() < 0.15) { 
        let mult = inventory.quantum ? 10 : 5;
        finalPower = clickPower * mult;
        isCrit = true;
    }
    clicks += finalPower;
    checkEnding();
    let sfx = document.getElementById('sfxClick');
    if(sfx) { sfx.currentTime = 0; sfx.play().catch(()=>{}); }
    createParticle(e, finalPower, isCrit); 
    updateUI();
}

function updatePower() {
    let rebirthMult = Math.pow(8, rebirths); 
    clickPower = (basePower + itemPower) * rebirthMult;
    rebirthCost = 1000 * Math.pow(10, rebirths);
    if (rebirths === 0) rebirthCost = 1000;
}

function updateUI() {
    safeSetText('clicks', formatNum(clicks));
    safeSetText('diamonds', formatNum(diamonds));
    safeSetText('rebirthCost', formatNum(rebirthCost));
    safeSetText('rebirthCount', rebirths);
    safeSetText('clickPwr', formatNum(clickPower));
    
    let nameDisplay = document.getElementById('nameText');
    if(nameDisplay) nameDisplay.innerText = (playerName || "HERO").toUpperCase();

    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    
    safeSetText('autoCostDisplay', formatNum(a) + "💎");
    safeSetText('farmCostDisplay', formatNum(a * 5) + "💎");
    
    // UPDATE RANK (8 TAHAP MENCABAR)
    const title = document.getElementById('rankTitle');
    const container = document.getElementById('mainGame');
    if (container && title) {
        container.className = "container"; // Reset
        title.className = ""; 
        container.style.borderColor = "#333";
        container.style.animation = "";

        if (rebirths < 3) {
            title.innerText = "NOOB";
        } else if (rebirths < 8) {
            title.innerText = "WARRIOR";
            container.style.borderColor = "#95a5a6"; 
        } else if (rebirths < 15) {
            title.innerText = "ELITE";
            container.style.borderColor = "#2ecc71";
        } else if (rebirths < 25) {
            title.innerText = "OVERLORD";
            container.classList.add('aura-overlord');
        } else if (rebirths < 40) {
            title.innerText = "MYTHICAL";
            container.classList.add('aura-mythical');
        } else if (rebirths < 60) {
            title.innerText = "DIVINE";
            container.classList.add('aura-divine');
        } else if (rebirths < 85) {
            title.innerText = "BEYOND DIVINE";
            container.classList.add('aura-beyond');
        } else {
            title.innerText = "THE UNTOUCHABLE";
            title.classList.add('text-beyond');
            container.style.animation = "divineRGB 0.5s infinite linear";
        }
    }
    
    if(document.getElementById('rebirthBtn')) document.getElementById('rebirthBtn').disabled = (clicks < rebirthCost);
    
    updateEquipmentButton('buySword', 'sword', 50);
    updateEquipmentButton('buyGlove', 'glove', 2500);
    updateEquipmentButton('buyLaser', 'laser', 500000);
    updateEquipmentButton('buyQuantum', 'quantum', 10000000);
}

function safeSetText(id, txt) {
    let el = document.getElementById(id);
    if(el) el.innerText = txt;
}

function updateEquipmentButton(id, key, cost) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (inventory[key]) {
        btn.innerHTML = "<span>MAXED</span> <span>OWNED</span>";
        btn.style.background = "#444";
        btn.disabled = true;
    } else {
        btn.disabled = (diamonds < cost);
    }
}

function doRebirth() { 
    if (clicks >= rebirthCost) { 
        clicks = 0; rebirths++; 
        diamonds += (rebirths * 100); // Reward scaling
        updatePower(); updateUI(); save(); 
    } 
}

function buyAuto() { 
    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    if (diamonds >= a) { diamonds -= a; autoClickers += a; updateUI(); save(); } 
}

function buyFarm() { 
    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    let cost = a * 5;
    if (diamonds >= cost) { diamonds -= cost; diamondFarms += a; updateUI(); save(); } 
}

function buyItem(type, cost, pwrAdd) {
    if (inventory[type]) return;
    if (diamonds >= cost) {
        diamonds -= cost; inventory[type] = true;
        itemPower += pwrAdd; updatePower(); updateUI(); save();
    }
}

function formatNum(num) {
    if (num >= 1e42) return (num / 1e42).toFixed(2) + "Td";
    if (num >= 1e39) return (num / 1e39).toFixed(2) + "Dd";
    if (num >= 1e36) return (num / 1e36).toFixed(2) + "Ud";
    if (num >= 1e33) return (num / 1e33).toFixed(2) + "Dc";
    if (num >= 1e30) return (num / 1e30).toFixed(2) + "No";
    if (num >= 1e27) return (num / 1e27).toFixed(2) + "Oc";
    if (num >= 1e24) return (num / 1e24).toFixed(2) + "Sp";
    if (num >= 1e21) return (num / 1e21).toFixed(2) + "Sx";
    if (num >= 1e18) return (num / 1e18).toFixed(2) + "Qi";
    if (num >= 1e15) return (num / 1e15).toFixed(2) + "Q";
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "k";
    return Math.floor(num).toString();
}

function createParticle(e, amount, isCrit) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.innerText = (isCrit ? "🔥 +" : "+") + formatNum(amount);
    let x = (e && e.pageX) || window.innerWidth/2;
    let y = (e && e.pageY) || window.innerHeight/2;
    p.style.left = x + "px"; p.style.top = y + "px";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 700);
}

function checkEnding() {
    if (rebirths >= 100 && !endingReached) { 
        endingReached = true;
        document.getElementById('endingOverlay').style.display = 'flex';
        save();
    }
}

function closeEnding() { document.getElementById('endingOverlay').style.display = 'none'; }

function manageBGM() {
    if (!musicStarted) return;
    let music = document.getElementById('bgMusic');
    if (music) { music.volume = 0.3; music.play().catch(()=>{}); }
}

function save() {
    const data = { playerName, clicks, diamonds, basePower, itemPower, rebirths, autoClickers, diamondFarms, endingReached, inventory };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

setInterval(() => { 
    if (autoClickers > 0) { clicks += (autoClickers * clickPower * 0.1); updateUI(); } 
}, 1000);

setInterval(() => { 
    if (diamondFarms > 0) { diamonds += diamondFarms; updateUI(); } 
}, 1000); 

function updateLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;
    let myName = (playerName !== "") ? playerName.toUpperCase() : "HERO";
    // Bot dibuang, hanya paparkan Player sahaja sekarang
    listEl.innerHTML = `
        <div class="me">
            <span>#1 ${myName} [R:${rebirths}]</span>
            <span>${formatNum(clicks)}</span>
        </div>
    `;
}
setInterval(updateLeaderboard, 3000);

function changeNameInline() {
    let newName = prompt("Masukkan nama baharu anda:", playerName);
    if (newName) { playerName = newName.trim().substring(0, 12); save(); updateUI(); }
                }
        
