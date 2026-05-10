let playerName = ""; 
let clicks = 0, diamonds = 0, clickPower = 1, basePower = 1, rebirthCost = 500, rebirths = 0, diaReward = 1, autoClickers = 0, diamondFarms = 0, musicStarted = false, endingReached = false;
let itemPower = 0; 
let inventory = { sword: false, wand: false, glove: false, pickaxe: false, drill: false }; 

// 1. TUKAR NAMA SAVE (Penting: Gunakan V7 supaya data lama 48Dc tu hilang)
const SAVE_KEY = 'BeyondZero_Official_V7';

window.onload = function() {
    try {
        let saved = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (saved && saved.playerName) {
            playerName = saved.playerName;
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

            // Kalau dah ada save yang sah, sorok skrin mula
            document.getElementById('startOverlay').style.display = 'none';
        } else {
            // Jika tiada save, pastikan semua nilai bermula dari 0
            resetToZero();
            document.getElementById('startOverlay').style.display = 'flex';
        }
    } catch (e) {
        document.getElementById('startOverlay').style.display = 'flex';
    }
    updatePower();
    updateUI();
    updateLeaderboard(); 
};

// Fungsi untuk pastikan nilai betul-betul kosong bagi pemain baru
function resetToZero() {
    clicks = 0; diamonds = 0; rebirths = 0; basePower = 1; itemPower = 0;
    autoClickers = 0; diamondFarms = 0;
}

function startGame() { 
    let input = document.getElementById('playerNameInput');
    let nameValue = input ? input.value.trim() : "";
    
    // 2. WAJIBKAN NAMA (Supaya tak pening siapa yang main)
    if (nameValue === "") {
        alert("Sila masukkan nama anda untuk bermula!");
        return;
    }

    playerName = nameValue.substring(0, 12);
    document.getElementById('startOverlay').style.display = 'none';
    
    musicStarted = true; 
    manageBGM();
    updateUI();
    save(); 
}

function doClick(e) {
    let finalPower = clickPower;
    let isCrit = false;
    if (inventory.glove && Math.random() < 0.10) { 
        finalPower = clickPower * 5;
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
    let rebirthMult = Math.pow(5, rebirths); 
    clickPower = (basePower + itemPower) * rebirthMult;
    if (rebirths === 0) { rebirthCost = 500; } 
    else { rebirthCost = clickPower * 250; }
}

function updateUI() {
    safeSetText('clicks', formatNum(clicks));
    safeSetText('diamonds', formatNum(diamonds));
    safeSetText('rebirthCost', formatNum(rebirthCost));
    safeSetText('rebirthCount', rebirths);
    safeSetText('autoSpeed', formatNum(autoClickers));
    safeSetText('clickPwr', formatNum(clickPower));
    
    let nameDisplay = document.getElementById('nameText');
    if(nameDisplay) nameDisplay.innerText = (playerName || "HERO").toUpperCase();

    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    
    safeSetText('autoCostDisplay', formatNum(a) + "💎");
    safeSetText('farmCostDisplay', formatNum(a * 5) + "💎");
    
    const title = document.getElementById('rankTitle');
    const container = document.getElementById('mainGame');
    if (container && title) {
        container.classList.remove('aura-overlord', 'aura-mythical', 'aura-divine');
        if(rebirths < 10) title.innerText = "NOOB";
        else if(rebirths < 30) { title.innerText = "OVERLORD"; container.classList.add('aura-overlord'); }
        else if(rebirths < 60) { title.innerText = "MYTHICAL GOD"; container.classList.add('aura-mythical'); }
        else { title.innerText = "DIVINE ENTITY"; container.classList.add('aura-divine'); }
    }
    
    if(document.getElementById('rebirthBtn')) document.getElementById('rebirthBtn').disabled = (clicks < rebirthCost);
    updateEquipmentButton('buySword', 'sword', 50);
    updateEquipmentButton('buyWand', 'wand', 500);
    updateEquipmentButton('buyGlove', 'glove', 2500);
    updateEquipmentButton('buyPickaxe', 'pickaxe', 10000);
    updateEquipmentButton('buyDrill', 'drill', 100000);
}

function safeSetText(id, txt) {
    let el = document.getElementById(id);
    if(el) el.innerText = txt;
}

function updateEquipmentButton(id, key, cost) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (inventory[key]) {
        btn.innerHTML = "<span>SOLD OUT</span> <span>OWNED</span>";
        btn.style.background = "#444";
        btn.disabled = true;
    } else {
        btn.disabled = (diamonds < cost);
    }
}

function doRebirth() { 
    if (clicks >= rebirthCost) { 
        clicks = 0; rebirths++; 
        diamonds += diaReward;
        diaReward *= 3; 
        updatePower(); updateUI(); save(); 
    } 
}

function buyAuto() { 
    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    if (diamonds >= a) { 
        diamonds -= a; 
        autoClickers += (a * (rebirths + 1)); 
        updateUI(); save(); 
    } 
}

function buyFarm() { 
    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    let cost = a * 5;
    if (diamonds >= cost) { 
        diamonds -= cost; 
        diamondFarms += (a * (rebirths + 1)); 
        updateUI(); save(); 
    } 
}

function buyItem(type, cost, pwrAdd) {
    if (inventory[type]) return;
    if (diamonds >= cost) {
        diamonds -= cost; 
        inventory[type] = true;
        itemPower += pwrAdd; 
        updatePower(); updateUI(); save();
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
    p.innerText = (isCrit ? "CRIT! +" : "+") + formatNum(amount);
    if (isCrit) {
        p.style.color = "#f1c40f"; p.style.fontSize = "1.5rem";
        p.style.fontWeight = "900";
    }
    let x = (e && e.clientX) || window.innerWidth/2;
    let y = (e && e.clientY) || window.innerHeight/2;
    p.style.left = x + "px"; p.style.top = y + "px";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 700);
}

function checkEnding() {
    if (clicks >= 1e42 && !endingReached) { 
        endingReached = true;
        document.getElementById('endingOverlay').style.display = 'flex';
        save();
    }
}

function closeEnding() { document.getElementById('endingOverlay').style.display = 'none'; }

function manageBGM() {
    if (!musicStarted) return;
    let music = document.getElementById('bgMusic');
    if (music) { music.volume = 0.4; music.play().catch(()=>{}); }
}

function save() {
    const data = { 
        playerName, clicks, diamonds, basePower, itemPower, rebirths, 
        diaReward, autoClickers, diamondFarms, endingReached, inventory 
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function resetGame() {
    if(confirm("Padam semua progress?")) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
}

setInterval(() => { 
    if (autoClickers > 0) { 
        clicks += (autoClickers / 10); 
        checkEnding(); 
        updateUI(); 
    } 
}, 100);

setInterval(() => { 
    if (diamondFarms > 0) { 
        diamonds += diamondFarms; 
        updateUI(); 
    } 
}, 10000); 

setInterval(save, 5000);

function updateLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;
    let myName = (playerName !== "") ? playerName.toUpperCase() : "HERO";
    // Bot dikosongkan untuk permulaan yang adil
    let allPlayers = [{ name: myName, baseScore: clicks, r: rebirths }];
    allPlayers.sort((a, b) => b.baseScore - a.baseScore);
    listEl.innerHTML = "";
    allPlayers.forEach((player, index) => {
        let isMe = player.name === myName;
        listEl.innerHTML += `
            <div class="${isMe ? 'me' : ''}">
                <span>#${index + 1} ${player.name} <small>[R:${player.r}]</small></span>
                <span>${formatNum(player.baseScore)}</span>
            </div>
        `;
    });
}
setInterval(updateLeaderboard, 3000);

function changeNameInline() {
    let newName = prompt("Masukkan nama baharu anda:", playerName);
    if (newName !== null && newName.trim() !== "") {
        playerName = newName.trim().substring(0, 12);
        save();
        updateUI();
        updateLeaderboard();
    }
                }
    
