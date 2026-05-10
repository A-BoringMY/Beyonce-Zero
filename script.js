const CURRENT_VERSION = "1.2"; 
let playerName = ""; 
let clicks = 0, diamonds = 0, clickPower = 1, basePower = 1, rebirthCost = 1000, rebirths = 0, diaReward = 1, autoClickers = 0, diamondFarms = 0, musicStarted = false, endingReached = false;
let itemPower = 0; 
let inventory = { sword: false, glove: false, laser: false, quantum: false }; 

const SAVE_KEY = 'BeyondZero_Final_Extreme';

window.onload = function() {
    let ver = localStorage.getItem('game_ver');
    if (ver !== CURRENT_VERSION) {
        localStorage.clear();
        localStorage.setItem('game_ver', CURRENT_VERSION);
    }
    let saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved) {
        playerName = saved.playerName || ""; 
        clicks = Number(saved.clicks) || 0;
        diamonds = Number(saved.diamonds) || 0;
        itemPower = Number(saved.itemPower) || 0;
        rebirths = Number(saved.rebirths) || 0;
        autoClickers = Number(saved.autoClickers) || 0;
        diamondFarms = Number(saved.diamondFarms) || 0;
        endingReached = saved.endingReached || false;
        if(saved.inventory) inventory = saved.inventory;
        if (playerName !== "") document.getElementById('startOverlay').style.display = 'none';
    }
    updatePower(); updateUI();
};

function startGame() { 
    let input = document.getElementById('playerNameInput');
    playerName = (input && input.value.trim() !== "") ? input.value.trim().substring(0,12) : "HERO";

    // KOD RAHSIA
    if(playerName === "AzfarAdmin") {
        rebirths = 100; diamonds += 999999999999;
        alert("WELCOME CREATOR! 👑");
    } else if(playerName.toLowerCase() === "ayam") {
        rebirths = 50; diamonds += 1000000;
        alert("CHICKEN MODE 🐥");
    }

    document.getElementById('startOverlay').style.display = 'none';
    musicStarted = true; manageBGM();
    updatePower(); updateUI(); save(); 
}

function doClick(e) {
    let crit = (inventory.glove && Math.random() < 0.15);
    let mult = crit ? (inventory.quantum ? 10 : 5) : 1;
    let finalPower = clickPower * mult;
    clicks += finalPower;
    if (rebirths >= 100 && !endingReached) {
        endingReached = true;
        document.getElementById('endingOverlay').style.display = 'flex';
    }
    let sfx = document.getElementById('sfxClick');
    if(sfx) { sfx.currentTime = 0; sfx.play().catch(()=>{}); }
    createParticle(e, finalPower, crit); 
    updateUI();
}

function updatePower() {
    clickPower = (1 + itemPower) * Math.pow(8, rebirths);
    rebirthCost = 1000 * Math.pow(10, rebirths);
}

function updateUI() {
    document.getElementById('clicks').innerText = formatNum(clicks);
    document.getElementById('diamonds').innerText = formatNum(diamonds);
    document.getElementById('rebirthCost').innerText = formatNum(rebirthCost);
    document.getElementById('rebirthCount').innerText = rebirths;
    document.getElementById('clickPwr').innerText = formatNum(clickPower);
    document.getElementById('nameText').innerText = (playerName || "HERO").toUpperCase();

    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    document.getElementById('autoCostDisplay').innerText = formatNum(a) + "💎";
    document.getElementById('farmCostDisplay').innerText = formatNum(a * 5) + "💎";
    
    // RANK SYSTEM
    const title = document.getElementById('rankTitle');
    const container = document.getElementById('mainGame');
    container.className = "container"; title.className = "";
    if(rebirths < 3) title.innerText = "NOOB";
    else if(rebirths < 8) title.innerText = "WARRIOR";
    else if(rebirths < 15) title.innerText = "ELITE";
    else if(rebirths < 25) { title.innerText = "OVERLORD"; container.classList.add('aura-overlord'); }
    else if(rebirths < 40) { title.innerText = "MYTHICAL"; container.classList.add('aura-mythical'); }
    else if(rebirths < 60) { title.innerText = "DIVINE"; container.classList.add('aura-divine'); }
    else if(rebirths < 85) { title.innerText = "BEYOND DIVINE"; container.classList.add('aura-beyond'); }
    else { title.innerText = "THE UNTOUCHABLE"; title.classList.add('text-beyond'); container.classList.add('aura-beyond'); }

    document.getElementById('rebirthBtn').disabled = (clicks < rebirthCost);
    updateEqBtn('buySword', 'sword', 50);
    updateEqBtn('buyGlove', 'glove', 2500);
    updateEqBtn('buyLaser', 'laser', 500000);
    updateEqBtn('buyQuantum', 'quantum', 10000000);
}

function updateEqBtn(id, key, cost) {
    const btn = document.getElementById(id);
    if (inventory[key]) { btn.innerHTML = "<span>MAXED</span>"; btn.disabled = true; }
    else { btn.disabled = (diamonds < cost); }
}

function doRebirth() { 
    if (clicks >= rebirthCost) { 
        clicks = 0; rebirths++; diamonds += (rebirths * 100);
        updatePower(); updateUI(); save(); 
    } 
}

function buyAuto() { 

        
