let playerName = ""; 
let clicks = 0, diamonds = 0, clickPower = 1, basePower = 1, rebirthCost = 0, rebirths = 0, diaReward = 1, autoClickers = 0, diamondFarms = 0, musicStarted = false, endingReached = false;
let itemPower = 0; 
let inventory = { sword: false, wand: false, glove: false, laser: false, quantum: false, void: false };

window.onload = function() {
    try {
        let saved = JSON.parse(localStorage.getItem('dolaFinalSaveV5'));
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
                const nameSection = document.getElementById('nameInputSection');
                if (nameSection) nameSection.style.display = 'none';
            }
        }
    } catch (e) {
        console.log("Load error.");
    }
    updatePower();
    updateUI();
    updateLeaderboard(); 
};

function startGame() { 
    let input = document.getElementById('playerNameInput');
    
    // SEMAK JIKA PEMAIN LAMA (Input Section disorokkan)
    if (document.getElementById('nameInputSection').style.display === 'none') {
        // Pemain lama boleh terus main
    } 
    else {
        // PEMAIN BARU: Wajib isi nama
        if (!input || input.value.trim() === "") {
            alert("SILA MASUKKAN NAMA ANDA TERLEBIH DAHULU!");
            return; // Berhenti di sini, skrin intro takkan tutup
        }
        playerName = input.value.trim().substring(0, 12);
    }

    // Hanya jika nama sudah ada baru skrin ditutup
    const overlay = document.getElementById('startOverlay');
    if (overlay) overlay.style.display = 'none';
    
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
    // Multiplier 2.8 supaya Rebirth 85 capai julat TD
    let rebirthMult = Math.pow(2.8, rebirths); 
    
    // BALANCE: Item Power dikuatkan mengikut tahap Rebirth
    // Ini supaya item yang dibeli masa awal game tetap berguna masa late game
    let effectiveItemPower = itemPower * (rebirths + 1);
    
    // Formula kuasa klik keseluruhan
    clickPower = (basePower + effectiveItemPower) * rebirthMult;
    
    // Kos Rebirth
    if (rebirths === 0) { 
        rebirthCost = 100; 
    } else { 
        rebirthCost = clickPower * 100; 
    }
}

function updateUI() {
    safeSetText('clicks', formatNum(clicks));
    safeSetText('diamonds', formatNum(diamonds));
    safeSetText('rebirthCost', formatNum(rebirthCost));
    safeSetText('rebirthCount', rebirths);
    safeSetText('autoSpeed', formatNum(autoClickers));
    safeSetText('clickPwr', formatNum(clickPower));
    
    // PAPARKAN NAMA PEMAIN
    let nameDisplay = document.getElementById('nameText');
    if(nameDisplay) nameDisplay.innerText = (playerName || "HERO").toUpperCase();

    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    
    safeSetText('autoCostDisplay', formatNum(a) + "💎");
    safeSetText('farmCostDisplay', formatNum(a * 5) + "💎");
    
    const title = document.getElementById('rankTitle');
    const container = document.getElementById('mainGame');
    const btn = document.getElementById('clickBtn');

    if (container && title) {
        container.classList.remove('aura-overlord', 'aura-mythical', 'aura-divine');
        title.classList.remove('text-divine-gold');
        if(btn) btn.classList.remove('aura-divine');

        // --- PASTE DI SINI (Gantikan bahagian Rank lama) ---
container.classList.remove('aura-overlord', 'aura-mythical', 'aura-divine');
title.classList.remove('text-divine-gold');
title.style.color = ""; title.style.textShadow = ""; title.style.animation = "";
if(btn) btn.classList.remove('aura-divine');

if (rebirths < 5) {
    title.innerText = "NOOB";
} else if (rebirths < 10) {
    title.innerText = "BEGINNER";
    container.style.borderColor = "#2ecc71"; 
} else if (rebirths < 20) {
    title.innerText = "SKILLED";
    container.style.borderColor = "#3498db";
} else if (rebirths < 30) {
    title.innerText = "EXPERT";
    container.style.borderColor = "#f1c40f";
} else if (rebirths < 40) {
    title.innerText = "OVERLORD";
    container.classList.add('aura-overlord');
} else if (rebirths < 50) {
    title.innerText = "MYTHICAL";
    container.classList.add('aura-mythical');
} else if (rebirths < 60) {
    title.innerText = "IMMORTAL";
    title.style.color = "#e74c3c";
} else if (rebirths < 70) {
    title.innerText = "DIVINE";
    title.classList.add('text-divine-gold');
    container.classList.add('aura-divine');
} else if (rebirths < 85) {
    title.innerText = "ETERNAL";
    title.style.color = "#ff4757";
    title.style.textShadow = "0 0 20px #ff4757";
} else {
    // RANK TERAKHIR: 85 REBIRTH KE ATAS
    title.innerText = "THE CREATOR";
    title.style.animation = "rainbow 1s infinite linear";
    title.style.fontWeight = "900";
    title.style.fontSize = "2.2rem";
}
// --- END PASTE ---

    }
    
    if(document.getElementById('rebirthBtn')) document.getElementById('rebirthBtn').disabled = (clicks < rebirthCost);
    if(document.getElementById('buyAuto')) document.getElementById('buyAuto').disabled = (diamonds < a);
    if(document.getElementById('buyFarm')) document.getElementById('buyFarm').disabled = (diamonds < (a * 5));

    updateEquipmentButton('buySword', 'sword', 50);
    updateEquipmentButton('buyWand', 'wand', 500);
    updateEquipmentButton('buyGlove', 'glove', 2500);
    updateEquipmentButton('buyLaser', 'laser', 50000);
    updateEquipmentButton('buyQuantum', 'quantum', 500000);
    updateEquipmentButton('buyVoid', 'void', 5000000);
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
        // 1. Reset yang perlu sahaja
        clicks = 0; 
        diamonds = 0; // Diamond jadi 0 balik
        
        // 2. Naikkan tahap Rebirth
        rebirths++; 
        
        // 3. Ganjaran Modal (Seed Money)
        // Kita bagi modal sikit supaya dia tak 'stuck' bila diamond 0
        diamonds += diaReward; 
        
        // 4. Update Power & Reward untuk next rebirth
        diaReward *= 5; 
        updatePower(); 
        
        checkEnding(); 
        updateUI(); 
        save(); 
        
        // Pesan kat pemain
        console.log("Rebirth! Diamond direset, tapi Farm & Auto tetap ada.");
    } 
}

function buyAuto() { 
    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    if (diamonds >= a) { 
        diamonds -= a; autoClickers += (a * (rebirths + 1)); 
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
        itemPower += pwrAdd; // Tambah kuasa asas item
        updatePower(); 
        updateUI(); 
        save();
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
        p.style.fontWeight = "900"; p.style.textShadow = "0 0 10px gold";
    }
    let x = (e && e.clientX) || window.innerWidth/2;
    let y = (e && e.clientY) || window.innerHeight/2;
    p.style.left = x + "px"; p.style.top = y + "px";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 700);
}

function checkEnding() {
    if (rebirths >= 85 && !endingReached) { 
        endingReached = true;
        document.getElementById('endingOverlay').style.display = 'flex';
        save();
    }
}

function closeEnding() { document.getElementById('endingOverlay').style.display = 'none'; }

function manageBGM() {
    if (!musicStarted) return;
    let music = document.getElementById('bgMusic');
    if (music) {
        music.volume = 0.4;
        music.play().catch(e => console.log("Music blocked", e));
    }
}

function save() {
    const data = { 
        playerName, clicks, diamonds, basePower, itemPower, rebirthCost, rebirths, 
        diaReward, autoClickers, diamondFarms, endingReached, inventory 
    };
    localStorage.setItem('dolaFinalSaveV5', JSON.stringify(data));
}

function resetGame() {
    if(confirm("Padam semua progress?")) {
        localStorage.clear();
        location.reload();
    }
}

// AUTO CLICKER
setInterval(() => { 
    if (autoClickers > 0) { 
        clicks += (autoClickers / 10); 
        checkEnding(); 
        updateUI(); 
    } 
}, 100);

// DIAMOND FARM - Versi yang lebih terkawal
setInterval(() => { 
    if (diamondFarms > 0) { 
        // Kita tukar: Daripada 2 kuasa rebirth, kita guna gandaan biasa yang lebih rendah
        // Contoh: Setiap rebirth cuma tambah 50% lagi banyak diamond (1.5x)
        let boost = Math.pow(1.5, rebirths);
        
        // Kita letak "HAD" (Cap) supaya diamond tak melimpah lebih dari Ud (Undecillion)
        // Jadi dia takkan sampai ke tahap yang tak ada simbol nombor
        if (diamonds < 1e42) { 
            diamonds += (diamonds / 2); 
        }
        updateUI(); 
    } 
}, 5000);

setInterval(save, 5000);

let bots = [
    { name: "Aiman_Gamer", baseScore: 500000, r: 2 },
    { name: "Siti_Clicker", baseScore: 5000000, r: 5 },
    { name: "Zack_Divine", baseScore: 1000000000000, r: 15 }, 
    { name: "Dola_Master", baseScore: 1000000000000000, r: 25 }
];

function updateLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;
    let myName = (playerName !== "") ? playerName.toUpperCase() : "HERO";
    let allPlayers = [...bots, { name: myName, baseScore: clicks, r: rebirths }];
    allPlayers.sort((a, b) => b.baseScore - a.baseScore);
    listEl.innerHTML = "";
    allPlayers.forEach((player, index) => {
        let isMe = player.name === myName;
        listEl.innerHTML += `
            <div class="${isMe ? 'me' : ''}">
                <span>#${index + 1} ${player.name} <small style="opacity:0.6; font-size:0.65rem;">[R:${player.r}]</small></span>
                <span>${formatNum(player.baseScore)}</span>
            </div>
        `;
    });
}
setInterval(updateLeaderboard, 3000);

function changeNameInline() {
    let newName = prompt("Masukkan nama baharu atau KOD RAHSIA:", playerName);
    
    if (newName !== null && newName.trim() !== "") {
        let code = newName.trim();

        // 1. SEMAK KOD RAHSIA
        if (code === "AzfarAdmin") {
            alert("WELCOME MASTER AZFAR! +999M Diamonds & 100 Rebirths");
            diamonds += 999999999;
            rebirths += 100;
            updatePower();
        } 
        else if (code === "ayam") {
            alert("KOK KO KOK! Anda mendapat 50 Rebirths percuma!");
            rebirths += 50; // Ganjaran 50 Rebirths
            updatePower(); // Update power sebab rebirth dah bertambah
        }

        // 2. TUKAR NAMA
        playerName = code.substring(0, 12);
        
        save();
        updateUI();
        updateLeaderboard();
    }
}

    
