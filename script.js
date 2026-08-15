let playerId = localStorage.getItem('myGamePlayerId');
if (!playerId) {
    playerId = 'P_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('myGamePlayerId', playerId);
}

let playerName = ""; 
let clicks = 0, diamonds = 0, clickPower = 1, basePower = 1, rebirthCost = 0, rebirths = 0, diaReward = 1, autoClickers = 0, diamondFarms = 0, musicStarted = false, endingReached = false;
let itemPower = 0; 
let inventory = { sword: false, wand: false, glove: false, laser: false, quantum: false, void: false };

let GAME_VERSION = "v1.0.1";
let isAdminMode = false;

const bgmList = [
    "wet-hand.mp3",
    "minecraft.mp3",
    "subwoofer-lullaby.mp3",
    "sweden.mp3"
];
let lastPlayedIndex = -1;

// === FUNGSI SEASON AUTOMATIK ===
function getCurrentSeasonID() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    
    return `${d.getFullYear()}_W${weekNo}`;
}

window.onload = function() {
    // 1. Muatkan data permainan tempatan
    loadGameData();

    // 2. Hubungi Firebase dan tunggu pengesahan sebelum memadamkan skrin loading (Mencegah Flicker/Stuck)
    let versionCheckFinished = false;

    // Tetapkan tempoh masa maksimum (Timeout) jika Firebase perlahan/offline
    let fallbackTimeout = setTimeout(() => {
        if (!versionCheckFinished) {
            versionCheckFinished = true;
            hideLoadingScreen();
        }
    }, 2000); // Maksimum 2 saat

    if (typeof db !== 'undefined') {
        db.ref('gameConfig/version').once('value').then((snapshot) => {
            let serverVersion = snapshot.val();
            if (serverVersion) {
                GAME_VERSION = serverVersion;
            }
            updateUI();
        }).catch((err) => {
            console.log("Firebase load version error:", err);
        }).finally(() => {
            if (!versionCheckFinished) {
                versionCheckFinished = true;
                clearTimeout(fallbackTimeout);
                hideLoadingScreen();
            }
        });

        // Dengar kemaskini versi semasa bermain
        db.ref('gameConfig/version').on('value', (snapshot) => {
            let serverVersion = snapshot.val();
            if (serverVersion && serverVersion !== GAME_VERSION) {
                GAME_VERSION = serverVersion;
                updateUI();
            }
        });
    } else {
        // Jika Firebase tiada
        clearTimeout(fallbackTimeout);
        hideLoadingScreen();
    }
};

function hideLoadingScreen() {
    const loader = document.getElementById('gameLoadingOverlay');
    if (loader) {
        loader.style.transition = "opacity 0.3s ease";
        loader.style.opacity = "0";
        setTimeout(() => {
            loader.style.display = 'none';
        }, 300);
    }
}

function loadGameData() {
    const currentSeason = getCurrentSeasonID();
    let savedSeason = localStorage.getItem('activeSeason');
    let saved = JSON.parse(localStorage.getItem('dolaFinalSaveV5'));

    if (savedSeason && savedSeason !== currentSeason) {
        let oldName = saved ? saved.playerName : "";
        localStorage.clear();
        localStorage.setItem('myGamePlayerId', playerId);
        localStorage.setItem('activeSeason', currentSeason);
        
        clicks = 0; diamonds = 0; basePower = 1; itemPower = 0; rebirths = 0;
        diaReward = 1; autoClickers = 0; diamondFarms = 0; endingReached = false;
        inventory = { sword: false, wand: false, glove: false, laser: false, quantum: false, void: false };
        
        if (oldName !== "") playerName = oldName;
        alert(`🏆 SEASON BAHARU!\n\nSeason lama (${savedSeason.replace('_', ' - ')}) telah tamat.\nSelamat bertanding dalam ${currentSeason.replace('_', ' - ')}!`);
    } else {
        if (!savedSeason) localStorage.setItem('activeSeason', currentSeason);
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

    // Semak status ruang nama
    const nameSection = document.getElementById('nameInputSection');
    if (nameSection) {
        if (playerName && playerName.trim() !== "") {
            nameSection.style.display = 'none';
        } else {
            nameSection.style.display = 'block';
        }
    }

    updatePower();
    updateUI();
    if (typeof updateLeaderboard === 'function') updateLeaderboard();
}

// Letak di bahagian bawah loadGameData()
if (saved && saved.lastTime) {
    let now = Date.now();
    let secondsOffline = Math.floor((now - saved.lastTime) / 1000);
    
    // Hadkan maksimum offline (contoh: maksimum 12 jam / 43,200 saat)
    if (secondsOffline > 43200) secondsOffline = 43200; 

    if (secondsOffline > 10) { // Hanya bagi jika tinggalkan game lebih 10 saat
        // Kira hasil automatik semasa offline
        let offlineClicks = Math.floor((autoClickers * secondsOffline) / 10);
        let offlineDiamonds = Math.floor((diamondFarms * 0.2) * (secondsOffline / 4));

        clicks += offlineClicks;
        diamonds += offlineDiamonds;

        // Beritahu pemain bila mereka buka game balik
        setTimeout(() => {
            alert(`🌙 SELAMAT KEMBALI!\n\nSemasa anda tiada (${Math.floor(secondsOffline/60)} minit):\n+ ${formatNum(offlineClicks)} Clicks\n+ ${formatNum(offlineDiamonds)} Diamonds`);
            updateUI();
        }, 500);
    }
}


function startGame() { 
    let input = document.getElementById('playerNameInput');
    const nameSection = document.getElementById('nameInputSection');
    
    if (nameSection && nameSection.style.display !== 'none') {
        if (!input || input.value.trim() === "") {
            alert("SILA MASUKKAN NAMA ANDA TERLEBIH DAHULU!");
            return;
        }
        playerName = input.value.trim().substring(0, 12);
    } else {
        let sfx = document.getElementById('sfxClick');
        if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }
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
    
    let displaySeason = getCurrentSeasonID().replace('_', ' - ');
    safeSetText('seasonBadge', 'SEASON: ' + displaySeason + ' | VER: ' + GAME_VERSION);

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
        diaReward, autoClickers, diamondFarms, endingReached, inventory,
        lastTime: Date.now() // <--- Simpan masa terkini semasa save
    };
    localStorage.setItem('dolaFinalSaveV5', JSON.stringify(data));
    saveToGlobalLeaderboard();
}


function resetGame() {
    if (confirm("Padam semua progress akaun INI? (Akaun lain tidak akan terjejas)")) {
        const currentSeason = getCurrentSeasonID();
        if (playerId && typeof db !== 'undefined') {
            db.ref(`leaderboards/${currentSeason}/` + playerId).remove();
        }
        localStorage.clear();
        location.reload();
    }
}

function saveToGlobalLeaderboard() {
    if (typeof db === 'undefined') return;
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
    if (!listEl || typeof db === 'undefined') return;

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
    if (!listEl || typeof db === 'undefined') return;

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

function changeNameInline() {
    let promptMsg = `Masukkan nama baharu atau KOD ADMIN:\n${isAdminMode ? "[ADMIN MODE: ON] - (Taip HELP untuk senarai arahan)" : ""}`;
    let newName = prompt(promptMsg, playerName);
    
    if (newName !== null && newName.trim() !== "") {
        let code = newName.trim();

        if (code === "AzfarAdmin") {
            isAdminMode = true;
            alert("🛡️ ADMIN MODE AKTIF!\n\nTaip 'HELP' dalam kotak nama untuk lihat semua senarai perintah admin.");
            return;
        } 
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
        else if (isAdminMode && code.toUpperCase().startsWith("CLEAN")) {
            let days = parseInt(code.toUpperCase().replace("CLEAN", "")) || 7;
            adminCleanInactive(days);
            return;
        }
        else if (isAdminMode && code.toUpperCase().startsWith("SETVER")) {
            let newVer = code.replace(/SETVER/i, "").trim();
            if (newVer !== "" && typeof db !== 'undefined') {
                GAME_VERSION = newVer;
                db.ref('gameConfig/version').set(newVer);
                alert("✅ Version berjaya ditukar kepada: " + newVer);
                updateUI();
                if (typeof updateLeaderboard === 'function') updateLeaderboard();
            } else {
                alert("⚠️ Sila masukkan nombor versi! Contoh: SETVER v1.0.6");
            }
            return;
        }
        else if (code.toUpperCase() === "EXITADMIN") {
            isAdminMode = false;
            alert("🔒 ADMIN MODE DITUTUP.");
            return;
        }
        else if (code === "ayam") {
            alert("KOK KO KOK! Anda mendapat 50 Rebirths percuma!");
            rebirths += 50;
            updatePower();
        }

        playerName = code.substring(0, 12);
        save();
        updateUI();
        if (typeof updateLeaderboard === 'function') updateLeaderboard();
    }
}

function adminCleanInactive(days) {
    if (!isAdminMode || typeof db === 'undefined') return;
    
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

function playRandomBGM() {
    let music = document.getElementById('bgMusic');
    if (!music || !musicStarted) return;

    let randomIndex;
    // Cari lagu baharu yang BUKAN lagu sama yang baru habis diputar
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

    // Pastikan lagu dimainkan
    music.play().catch(e => console.log("Audio play error:", e));
}

// Apabila lagu habis, automatik panggil playRandomBGM() untuk lagu SETERUSNYA
document.addEventListener("DOMContentLoaded", () => {
    let music = document.getElementById('bgMusic');
    if (music) {
        // Buang fungsi bertindih jika ada
        music.onended = null; 
        
        // Pasang pengesan lagu habis yang pasti tukar lagu
        music.addEventListener('ended', () => {
            playRandomBGM();
        });
    }
})
