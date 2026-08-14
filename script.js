let playerId = "";
let playerName = ""; 
let clicks = 0, diamonds = 0, clickPower = 1, basePower = 1, rebirthCost = 0, rebirths = 0, diaReward = 1, autoClickers = 0, diamondFarms = 0, musicStarted = false, endingReached = false;
let itemPower = 0; 
let inventory = { sword: false, wand: false, glove: false, laser: false, quantum: false, void: false };
// ==========================================
// SYSTEM VARIABLES & FIREBASE VERSION LISTENER
// ==========================================
let GAME_VERSION = "v1.0.0"; // Versi lalai (default)
let isAdminMode = false;      // Status mod admin

// Ambil Versi terkini secara realtime dari Firebase
db.ref('gameConfig/version').on('value', (snapshot) => {
    let serverVersion = snapshot.val();
    if (serverVersion) {
        GAME_VERSION = serverVersion;
        if (typeof updateUI === 'function') {
            updateUI();
        }
    }
});

const bgmList = [
    "wet-hand.mp3",
    "minecraft.mp3",
    "subwoofer-lullaby.mp3",
    "sweden.mp3"
];
let lastPlayedIndex = -1;

function getOrCreatePlayerId() {
    let id = localStorage.getItem('bz_player_id');
    if (!id) {
        id = 'P_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('bz_player_id', id);
    }
    return id;
}

window.onload = function() {
    playerId = getOrCreatePlayerId();
    const currentSeason = getCurrentSeasonID();
    
    try {
        let savedSeason = localStorage.getItem('activeSeason');
        
        if (savedSeason !== currentSeason) {
            let oldData = JSON.parse(localStorage.getItem('dolaFinalSaveV5'));
            if (savedSeason) {
                alert(`🏆 SEASON BAHARU SELESAI!\nSeason lama (${savedSeason}) telah tamat.\nSelamat bertanding dalam ${currentSeason}!`);
            }
            
            let oldName = oldData ? oldData.playerName : "";
            localStorage.clear();
            localStorage.setItem('activeSeason', currentSeason);
            
            if (oldName !== "") {
                playerName = oldName;
            }
        } else {
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
                if (saved.inventory) inventory = saved.inventory;
            }
        }
        
        if (playerName !== "") {
            const nameSection = document.getElementById('nameInputSection');
            if (nameSection) nameSection.style.display = 'none';
        }
    } catch (e) {
        console.log("Load error.", e);
    }

    updatePower();
    updateUI();
    updateLeaderboard(); 
};

function startGame() { 
    let input = document.getElementById('playerNameInput');
    
    if (document.getElementById('nameInputSection').style.display === 'none') {
        let sfx = document.getElementById('sfxClick');
        if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }
    } else {
        if (!input || input.value.trim() === "") {
            alert("SILA MASUKKAN NAMA ANDA TERLEBIH DAHULU!");
            return;
        }
        playerName = input.value.trim().substring(0, 12);
    }

    const overlay = document.getElementById('startOverlay');
    if (overlay) overlay.style.display = 'none';
    
    musicStarted = true; 
    playRandomBGM();
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
    if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }
    
    createParticle(e, finalPower, isCrit); 
    updateUI();
}

function updatePower() {
    let rebirthMult = Math.pow(2.8, rebirths); 
    let effectiveItemPower = itemPower * (rebirths + 1);
    clickPower = (basePower + effectiveItemPower) * rebirthMult;
    rebirthCost = (rebirths === 0) ? 100 : clickPower * 100;
}

function updateUI() {
    safeSetText('clicks', formatNum(clicks));
    safeSetText('diamonds', formatNum(diamonds));
    safeSetText('rebirthCost', formatNum(rebirthCost));
    safeSetText('rebirthCount', rebirths);
    safeSetText('autoSpeed', formatNum(autoClickers));
    safeSetText('clickPwr', formatNum(clickPower));
    safeSetText('seasonBadge', 'SEASON: ' + getCurrentSeasonID() + ' | VER: ' + GAME_VERSION);

    let nameDisplay = document.getElementById('nameText');
    if (nameDisplay) nameDisplay.innerText = (playerName || "HERO").toUpperCase();

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
        title.style.color = ""; title.style.textShadow = ""; title.style.animation = "";
        if (btn) btn.classList.remove('aura-divine');

        if (rebirths < 5) title.innerText = "NOOB";
        else if (rebirths < 10) { title.innerText = "BEGINNER"; container.style.borderColor = "#2ecc71"; }
        else if (rebirths < 20) { title.innerText = "SKILLED"; container.style.borderColor = "#3498db"; }
        else if (rebirths < 30) { title.innerText = "EXPERT"; container.style.borderColor = "#f1c40f"; }
        else if (rebirths < 40) { title.innerText = "OVERLORD"; container.classList.add('aura-overlord'); }
        else if (rebirths < 50) { title.innerText = "MYTHICAL"; container.classList.add('aura-mythical'); }
        else if (rebirths < 60) { title.innerText = "IMMORTAL"; title.style.color = "#e74c3c"; }
        else if (rebirths < 70) { title.innerText = "DIVINE"; title.classList.add('text-divine-gold'); container.classList.add('aura-divine'); }
        else if (rebirths < 85) { title.innerText = "ETERNAL"; title.style.color = "#ff4757"; title.style.textShadow = "0 0 20px #ff4757"; }
        else {
            title.innerText = "THE CREATOR";
            title.style.animation = "rainbow 1s infinite linear";
            title.style.fontWeight = "900";
            title.style.fontSize = "2.2rem";
        }
    }
    
    if (document.getElementById('rebirthBtn')) document.getElementById('rebirthBtn').disabled = (clicks < rebirthCost);
    if (document.getElementById('buyAuto')) document.getElementById('buyAuto').disabled = (diamonds < a);
    if (document.getElementById('buyFarm')) document.getElementById('buyFarm').disabled = (diamonds < (a * 5));

    updateEquipmentButton('buySword', 'sword', 50);
    updateEquipmentButton('buyWand', 'wand', 500);
    updateEquipmentButton('buyGlove', 'glove', 2500);
    updateEquipmentButton('buyLaser', 'laser', 50000);
    updateEquipmentButton('buyQuantum', 'quantum', 500000);
    updateEquipmentButton('buyVoid', 'void', 5000000);
}

function safeSetText(id, txt) {
    let el = document.getElementById(id);
    if (el) el.innerText = txt;
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
        let sfx = document.getElementById('sfxRebirth');
        if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }

        clicks = 0; 
        diamonds = 0; 
        rebirths++; 
        diamonds += diaReward; 
        diaReward *= 5; 
        
        updatePower(); 
        checkEnding(); 
        updateUI(); 
        save(); 
    } 
}

function buyAuto() { 
    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    if (diamonds >= a) { 
        diamonds -= a; 
        autoClickers += (a * (rebirths + 1)); 
        updateUI(); 
        save(); 
    } 
    let sfx = document.getElementById('sfxBuy');
    if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }
}

function buyFarm() { 
    let radio = document.querySelector('input[name="buyAmt"]:checked');
    let a = radio ? Number(radio.value) : 1;
    let cost = a * 5;
    if (diamonds >= cost) { 
        diamonds -= cost; 
        diamondFarms += (a * (rebirths + 1)); 
        updateUI(); 
        save(); 
    } 
    let sfx = document.getElementById('sfxBuy');
    if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }
}

function buyItem(type, cost, pwrAdd) {
    if (inventory[type]) return;
    if (diamonds >= cost) {
        let sfx = document.getElementById('sfxBuy');
        if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }
        diamonds -= cost; 
        inventory[type] = true;
        itemPower += pwrAdd;
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
    let x = (e && e.clientX) || window.innerWidth / 2;
    let y = (e && e.clientY) || window.innerHeight / 2;
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

function closeEnding() { 
    document.getElementById('endingOverlay').style.display = 'none'; 
}

function save() {
    const data = { 
        playerName, clicks, diamonds, basePower, itemPower, rebirthCost, rebirths, 
        diaReward, autoClickers, diamondFarms, endingReached, inventory 
    };
    localStorage.setItem('dolaFinalSaveV5', JSON.stringify(data));
    saveToGlobalLeaderboard();
}

function resetGame() {
    if (confirm("Padam semua progress akaun INI? (Akaun lain tidak akan terjejas)")) {
        const currentSeason = getCurrentSeasonID();
        if (playerId) {
            db.ref(`leaderboards/${currentSeason}/` + playerId).remove();
        }
        localStorage.clear();
        location.reload();
    }
}

function saveToGlobalLeaderboard() {
    if (!playerId) playerId = getOrCreatePlayerId();
    let myName = (playerName !== "") ? playerName.toUpperCase() : "HERO";
    const currentSeason = getCurrentSeasonID();
    
    db.ref(`leaderboards/${currentSeason}/` + playerId).set({
        playerId: playerId,
        name: myName,
        clicks: clicks,
        rebirths: rebirths,
        updatedAt: Date.now()
    }).catch(err => console.log("Gagal hantar skor:", err));
}

function updateLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    const currentSeason = getCurrentSeasonID();
    db.ref(`leaderboards/${currentSeason}`).orderByChild('clicks').limitToLast(10).on('value', (snapshot) => {
        let players = [];
        snapshot.forEach((childSnapshot) => {
            players.push(childSnapshot.val());
        });
        players.reverse();

        listEl.innerHTML = "";
        if (players.length === 0) {
            listEl.innerHTML = `<div style="text-align:center; opacity:0.5;">Belum ada pemain minggu ini.</div>`;
            return;
        }

        players.forEach((player, index) => {
            let isMe = (player.playerId && player.playerId === playerId);
            listEl.innerHTML += `
                <div class="${isMe ? 'me' : ''}">
                    <span>#${index + 1} ${player.name} <small style="opacity:0.6; font-size:0.65rem;">[R:${player.rebirths || 0}]</small></span>
                    <span>${formatNum(player.clicks || 0)}</span>
                </div>
            `;
        });
    });
}

function changeNameInline() {
    let promptMsg = `Masukkan nama baharu atau KOD ADMIN:\n${isAdminMode ? "[ADMIN MODE: ON] - (Taip HELP untuk senarai arahan)" : ""}`;
    let newName = prompt(promptMsg, playerName);
    
    if (newName !== null && newName.trim() !== "") {
        let code = newName.trim();

        // 1. KOD ADMIN: Aktifkan Admin
        if (code === "AzfarAdmin") {
            isAdminMode = true;
            alert("🛡️ ADMIN MODE AKTIF!\n\nTaip 'HELP' dalam kotak nama untuk lihat semua senarai perintah admin.");
            return;
        } 
        
        // 2. PERINTAH ADMIN: Menu Bantuan / Help Admin
        else if (isAdminMode && (code.toUpperCase() === "HELP" || code === "?")) {
            alert(
                "=== 🛡️ ADMIN COMMAND MENU 🛡️ ===\n\n" +
                "1. CLEAN[hari]\n" +
                "   • Contoh: CLEAN7 atau CLEAN30\n" +
                "   • Buang akaun tak aktif dari Firebase.\n\n" +
                "2. SETVER [versi]\n" +
                "   • Contoh: SETVER v1.0.6\n" +
                "   • Tukar versi game untuk SEMUA player.\n\n" +
                "3. EXITADMIN\n" +
                "   • Matikan Mod Admin keselamatan.\n\n" +
                "==============================="
            );
            return;
        }

        // 3. PERINTAH ADMIN: Buang Inactive User
        else if (isAdminMode && code.toUpperCase().startsWith("CLEAN")) {
            let days = parseInt(code.toUpperCase().replace("CLEAN", "")) || 7;
            adminCleanInactive(days);
            return;
        }

        // 4. PERINTAH ADMIN: Tukar Version Game
        else if (isAdminMode && code.toUpperCase().startsWith("SETVER")) {
            let newVer = code.replace(/SETVER/i, "").trim();
            if (newVer !== "") {
                GAME_VERSION = newVer;
                // Simpan ke Firebase supaya semua akaun pemain lain automatik dikemaskini
                db.ref('gameConfig/version').set(newVer);
                alert("✅ Version berjaya ditukar kepada: " + newVer);
                updateUI();
            } else {
                alert("⚠️ Sila masukkan nombor versi! Contoh: SETVER v1.0.6");
            }
            return;
        }

        // 5. PERINTAH ADMIN: Tutup Admin
        else if (code.toUpperCase() === "EXITADMIN") {
            isAdminMode = false;
            alert("🔒 ADMIN MODE DITUTUP.");
            return;
        }

        // 6. CHEAT CODE BIASA
        else if (code === "ayam") {
            alert("KOK KO KOK! Anda mendapat 50 Rebirths percuma!");
            rebirths += 50;
            updatePower();
        }

        // Tukar nama biasa
        playerName = code.substring(0, 12);
        save();
        updateUI();
        if (typeof updateLeaderboard === 'function') updateLeaderboard();
    }
}


function getCurrentSeasonID() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber}`;
}

function openFullLeaderboard() {
    const modal = document.getElementById('fullLeaderboardModal');
    if (modal) modal.style.display = 'flex';
    loadFullLeaderboard();
}

function closeFullLeaderboard() {
    const modal = document.getElementById('fullLeaderboardModal');
    if (modal) modal.style.display = 'none';
}

function loadFullLeaderboard() {
    const listEl = document.getElementById('fullLeaderboardList');
    if (!listEl) return;

    const currentSeason = getCurrentSeasonID();
    db.ref(`leaderboards/${currentSeason}`).orderByChild('clicks').limitToLast(100).once('value', (snapshot) => {
        let players = [];
        snapshot.forEach((childSnapshot) => {
            players.push(childSnapshot.val());
        });
        players.reverse();

        listEl.innerHTML = "";
        if (players.length === 0) {
            listEl.innerHTML = `<div style="text-align:center; opacity:0.5; padding: 20px;">Tiada rekod lagi minggu ini.</div>`;
            return;
        }

        players.forEach((player, index) => {
            let isMe = (player.playerId && player.playerId === playerId);
            listEl.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: ${isMe ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255, 255, 255, 0.05)'}; border: ${isMe ? '1px solid #3498db' : 'none'}; border-radius: 6px; font-size: 0.85rem;">
                    <span style="width: 15%; font-weight: bold; color: ${index < 3 ? '#f1c40f' : '#fff'};">#${index + 1}</span>
                    <span style="width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: ${isMe ? 'bold' : 'normal'}; color: ${isMe ? '#00d2d3' : '#fff'};">
                        ${player.name}
                    </span>
                    <span style="width: 15%; opacity: 0.8; color: #e74c3c;">R:${player.rebirths || 0}</span>
                    <span style="width: 25%; text-align: right; font-weight: bold; color: #2ecc71;">${formatNum(player.clicks || 0)}</span>
                </div>
            `;
        });
    });
}

function playRandomBGM() {
    let music = document.getElementById('bgMusic');
    if (!music || !musicStarted) return;

    let randomIndex;
    if (bgmList.length > 1) {
        do {
            randomIndex = Math.floor(Math.random() * bgmList.length);
        } while (randomIndex === lastPlayedIndex);
    } else {
        randomIndex = 0;
    }

    lastPlayedIndex = randomIndex;
    music.src = bgmList[randomIndex];
    music.volume = 0.3;
    music.play().catch(e => console.log("Audio play error:", e));
}

document.addEventListener("DOMContentLoaded", () => {
    let music = document.getElementById('bgMusic');
    if (music) {
        music.addEventListener('ended', playRandomBGM);
    }
});

setInterval(() => { 
    if (autoClickers > 0) { 
        clicks += (autoClickers / 10); 
        checkEnding(); 
        updateUI(); 
    } 
}, 100);

setInterval(() => { 
    if (diamondFarms > 0) { 
        let rebirthBonus = 1 + Math.log10(rebirths + 1); 
        let totalGained = Math.floor((diamondFarms * 0.5) * rebirthBonus); 
        if (totalGained < 1) totalGained = 1;

        diamonds += totalGained; 
        updateUI(); 
    } 
}, 4000);

setInterval(() => {
    if (musicStarted || clicks > 0) {
        save(); 
    }
}, 2000);

function adminCleanInactive(days) {
    if (!isAdminMode) return;
    
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const season = getCurrentSeasonID();
    const ref = db.ref(`leaderboards/${season}`);

    ref.orderByChild('updatedAt').endAt(cutoff).once('value', (snapshot) => {
        let count = 0;
        snapshot.forEach((child) => {
            child.ref.remove();
            count++;
        });
        alert(`🧹 SELESAI! ${count} akaun tidak aktif ( > ${days} hari) telah dibuang dari Firebase.`);
        if (typeof updateLeaderboard === 'function') updateLeaderboard();
    });
}
