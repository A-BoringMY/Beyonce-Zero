// === GAME.JS ===
let isMusicOn = true;
let isSFXOn = true;
let initialOfflineLogged = false;
let isCurrentlyOffline = false;

// 1. UTAMA (WINDOW LOAD & HIDE LOADER)
window.onload = function() {
    loadGameData();
    updateAchievementsUI();
    
    // Pastikan UI status internet & Leaderboard diselaraskan terus
    checkNetworkStatus();

    if (navigator.onLine && typeof db !== 'undefined') {
        db.ref('gameConfig/version').once('value').then((snapshot) => {
            let serverVersion = snapshot.val();
            if (serverVersion) {
                GAME_VERSION = serverVersion;
                updateUI();
            }
        }).catch((err) => console.log("Firebase sync error:", err));
    }
};

// Pengesan Internet Real-Time (Otomatis bila terputus / tersambung)
window.addEventListener('online', () => {
    checkNetworkStatus();
    if (typeof addGameLog === 'function') {
        addGameLog('🌐 Sambungan internet kembali! Leaderboard dikemas kini.', 'sys');
    }
    // PAKSA REFRESH LEADERBOARD AUTOMATIK BILA INTERNET ADA BALIK
    if (typeof updateLeaderboard === 'function') {
        updateLeaderboard(); 
    }
});

window.addEventListener('offline', () => {
    checkNetworkStatus();
    if (typeof addGameLog === 'function') {
        addGameLog('📡 Anda dalam Offline Mode. Progress disimpan dalam phone.', 'sys');
    }
    // KEMASKINI PAPARAN LEADERBOARD SERTA-MERTA BILA INTERNET PUTUS
    if (typeof updateLeaderboard === 'function') {
        updateLeaderboard();
    }
});

function checkNetworkStatus() {
    const isOnline = navigator.onLine;
    let seasonBadge = document.getElementById('seasonBadge');
    
    if (seasonBadge) {
        let displaySeason = getCurrentSeasonID().replace('_', ' - ');
        if (isOnline) {
            isCurrentlyOffline = false;
            seasonBadge.innerText = `SEASON: ${displaySeason} | VER: ${GAME_VERSION}`;
            seasonBadge.style.color = "#f1c40f"; 
            updateUI(); 
        } else {
            seasonBadge.className = ""; 
            seasonBadge.style.color = "#7f8c8d"; // Kelabu
            
            // Cetak log sekali sahaja jika masa buka app memang offline
            if (!isCurrentlyOffline) {
                isCurrentlyOffline = true;
                if (typeof addGameLog === 'function') {
                    addGameLog('📡 Anda dalam Offline Mode. Progress disimpan dalam phone.', 'sys');
                }
            }
        }
    }

    if (typeof updateLeaderboardOfflineUI === 'function') {
        updateLeaderboardOfflineUI(!isOnline);
    }
}

    // Terapkan Sensor Leaderboard
    if (typeof updateLeaderboardOfflineUI === 'function') {
        updateLeaderboardOfflineUI(!isOnline);
    }
}

function updateLeaderboardOfflineUI(isOffline) {
    // CARI CONTIANER LEADERBOARD (Ubah ID di bawah jika HTML anda guna ID lain)
    const lbContainer = document.getElementById('leaderboardContent') || 
                        document.getElementById('leaderboardList') || 
                        document.getElementById('leaderboard');

    if (!lbContainer) return;

    if (isOffline) {
        // PADAM SENARAI LAMA & TUKAR KEPADA MESEJ OFFLINE
        lbContainer.innerHTML = `
            <div style="padding: 25px 15px; text-align: center; color: #e74c3c; font-weight: bold; background: rgba(0,0,0,0.4); border: 1px solid rgba(231, 76, 60, 0.3); border-radius: 10px; margin: 10px 0;">
                <div style="font-size: 1.2rem; margin-bottom: 5px;">📡 OFFLINE MODE</div>
                <span style="font-size: 0.8rem; color: #ccc; font-weight: normal; line-height: 1.4; display: block;">
                    Tiada sambungan internet.<br>Carta Leaderboard Global disensor sementara sehingga internet disambung semula.
                </span>
            </div>
        `;
    }
}

function hideLoadingScreen() {
    const loader = document.getElementById('gameLoadingOverlay');
    if (loader) {
        loader.style.transition = "opacity 0.3s ease";
        loader.style.opacity = "0";
        setTimeout(() => { loader.style.display = 'none'; }, 300);
    }
}

// 2. KAWALAN PENGGUNA & INTERAKSI
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
        playSFX('sfxClick');
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
    
    playSFX('sfxClick');
    createParticle(e, finalPower, isCrit); 
    updateUI();
}

function doRebirth() { 
    if (clicks >= rebirthCost) { 
        playSFX('sfxRebirth');

        clicks = 0; 
        diamonds = 0; 
        autoClickers = 0;
        rebirths++; 
        
        // JAGA-JAGA: Jika diaReward rosak/Infinity, paksa reset jadi 5
        if (!isFinite(diaReward) || diaReward <= 0) {
            diaReward = 5;
        }

        diamonds += diaReward; 
        
        // ❌ BUANG: diaReward *= 5; (Sebab ni buat nombor meletup jadi Infinity)
        // ✅ TUKAR: Tambah 5 Diamonds sahaja setiap kali Rebirth
        diaReward += 5; 
        
        addGameLog(`🔥 REBIRTH #${rebirths}! Power bertambah! Click Power kini: ${formatNum(clickPower)}`, 'rebirth');
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
        
        // ❌ KOD LAMA (OP): autoClickers += (a * (rebirths + 1));
        // ✅ KOD BAHARU: Beli 1 dapat 1, tak ada multiplier gila-gila
        autoClickers += a; 
        
        addGameLog(`⚡ Beli +${a} Speed AutoClicker!`, 'buy');
        updateUI(); 
        save(); 
    } 
    playSFX('sfxBuy');
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
    playSFX('sfxBuy');
}

function buyItem(type, cost, pwrAdd) {
    if (inventory[type]) return;
    if (diamonds >= cost) {
        playSFX('sfxBuy');
        diamonds -= cost; 
        inventory[type] = true;
        itemPower += pwrAdd;
        updatePower(); 
        updateUI(); 
        save();
    }
}

// 3. KEMASKINI UI PERMAINAN
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

function updateUI() {
    updateAchievementsUI();
    safeSetText('clicks', formatNum(clicks));
    safeSetText('diamonds', formatNum(diamonds));
    safeSetText('rebirthCost', formatNum(rebirthCost));
    safeSetText('rebirthCount', rebirths);
    safeSetText('autoSpeed', formatNum(autoClickers));
    safeSetText('clickPwr', formatNum(clickPower));
    safeSetText('seasonPointDisplay', totalSeasonPoints);
    
    
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

// 1. Reset class dan padam style inline sepenuhnya
container.className = "game-container"; 
if (btn) btn.className = "click-btn";    

title.className = "";
title.removeAttribute("style");
title.style.fontSize = "1.5rem";
title.style.fontWeight = "bold";
title.style.letterSpacing = "2px";
// 2. Logik penukaran rank
if (rebirths < 5) {
    title.innerText = "NOOB";
    title.style.color = "#a0a0a0";
} 
else if (rebirths < 10) { 
    title.innerText = "BEGINNER"; 
    title.style.color = "#2ecc71";
    container.style.borderColor = "#2ecc71"; 
} 
else if (rebirths < 20) { 
    title.innerText = "SKILLED"; 
    title.style.color = "#3498db";
    container.style.borderColor = "#3498db"; 
} 
else if (rebirths < 30) { 
    title.innerText = "EXPERT"; 
    title.style.color = "#f1c40f";
    container.style.borderColor = "#f1c40f"; 
} 
else if (rebirths < 40) { 
    title.innerText = "OVERLORD"; 
    title.style.color = "#e67e22";
    container.classList.add('aura-overlord'); 
} 
else if (rebirths < 50) { 
    title.innerText = "MYTHICAL"; 
    title.className = "text-mythical"; 
    container.className = "game-container aura-mythical"; 
} 
else if (rebirths < 60) { 
    title.innerText = "IMMORTAL"; 
    title.className = "text-pulse-immortal"; // Tajuk sahaja membesar
    container.className = "game-container aura-immortal"; // Page tidak membesar
} 
else if (rebirths < 70) { 
    title.innerText = "DIVINE"; 
    title.className = "text-pulse-gold"; // GoldenGlow kembali
    container.className = "game-container aura-divine"; 
}
else if (rebirths < 80) { 
    title.innerText = "ETERNAL"; 
    title.classList.add('text-pulse-cyan');   
    container.classList.add('aura-eternal'); 
    if (btn) btn.classList.add('aura-eternal');
} 
else {
    title.innerText = "THE CREATOR";
    title.classList.add('text-pulse-rainbow'); 
    container.classList.add('aura-creator');
    if (btn) btn.classList.add('aura-creator');
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

function updateAchievementsUI() {
    const container = document.getElementById('achievementsContainer');

    if (typeof MASTER_ACHIEVEMENTS === 'undefined' || !Array.isArray(MASTER_ACHIEVEMENTS)) {
        return;
    }

    let htmlContent = "";

    MASTER_ACHIEVEMENTS.forEach((ach) => {
        let isReached = false;
        if (ach.reqType === 'clicks' && clicks >= ach.reqVal) isReached = true;
        if (ach.reqType === 'rebirths' && rebirths >= ach.reqVal) isReached = true;
        if (ach.reqType === 'diamonds' && diamonds >= ach.reqVal) isReached = true;

        let isAlreadyClaimed = (achievementsData && achievementsData[ach.id] === true);

        // 🔔 JIKA BARU CAPAI SYARAT DAN BELUM CLAIM:
        if (isReached && !isAlreadyClaimed) {
            if (!achievementsData) achievementsData = {};
            achievementsData[ach.id] = true; // Tandakan dah claim
            diamonds += (ach.reward || 0);    // Bagi ganjaran
            save();
            addGameLog(`🏆 Achievement: "${ach.title}" unlocked! (+${ach.reward}💎)`, 'ach');

            // 🏆 NOTIFIKASI POP-UP KEPADA PLAYER
            setTimeout(() => {
                alert(`🏆 ACHIEVEMENT UNLOCKED!\n\n"${ach.title}"\n${ach.desc}\n\n🎁 Ganjaran: +${ach.reward} Diamonds!`);
            }, 100);
        }

        let isCompleted = isAlreadyClaimed || isReached;

        if (container) {
            htmlContent += `
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); margin: 6px 0; padding: 10px 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; text-align: left;">
                    <div>
                        <div style="font-weight: bold; font-size: 0.85rem; color: #f1c40f;">${ach.title}</div>
                        <div style="font-size: 0.75rem; opacity: 0.8; color: #ccc;">${ach.desc} (+${ach.reward}💎)</div>
                    </div>
                    <div style="font-size: 0.8rem; font-weight: bold; color: ${isCompleted ? '#2ecc71' : '#e74c3c'};">
                        ${isCompleted ? '✅ SELESAI' : '🔒 BELUM'}
                    </div>
                </div>
            `;
        }
    });

    if (container) container.innerHTML = htmlContent;
}


// 4. AUDIO, EFEK & VISUAL
function playSFX(id) {
    let sfx = document.getElementById(id);
    if (sfx) {
        sfx.currentTime = 0;
        sfx.play().catch(() => {});
    }
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
    if (rebirths >= 60 && !endingReached) { 
        endingReached = true;
        document.getElementById('endingOverlay').style.display = 'flex';
        save();
    }
}

function closeEnding() { 
    document.getElementById('endingOverlay').style.display = 'none'; 
}

// 5. TIMERS AUTOMATIK
document.addEventListener("DOMContentLoaded", () => {
    let music = document.getElementById('bgMusic');
    if (music) {
        music.onended = function() {
            playRandomBGM();
        };
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

// Function untuk Buka / Tutup Settings Page
function openSettings() {
    let settings = document.getElementById('settingsPage');
    if (settings) settings.style.display = 'flex';
}

function closeSettings() {
    let settings = document.getElementById('settingsPage');
    if (settings) settings.style.display = 'none';
}

// Function Confirm Triple Reset
function confirmTripleReset() {
    if (confirm("⚠️ AMARAN 1/3:\nAdakah anda pasti nak padam semua progress game ini?")) {
        if (confirm("⚠️ AMARAN 2/3:\nSemua Clicks, Rebirths dan Diamonds akan HILANG KEKAL! Sanggup?")) {
            let answer = prompt("⚠️ AMARAN 3/3:\nTaip 'PADAM' di bawah untuk sahkan memadam akaun ini:");
            if (answer && answer.toUpperCase() === "PADAM") {
                resetGame(); // Jalankan reset asal
            } else {
                alert("❌ Pembatalan berjaya. Akaun anda selamat.");
            }
        }
    }
}

function toggleMusic() {
    isMusicOn = !isMusicOn;
    let music = document.getElementById('bgMusic');
    let btn = document.getElementById('musicBtn');
    
    if (music) {
        if (isMusicOn) {
            music.play().catch(() => {});
        } else {
            music.pause();
        }
    }
    
    if (btn) {
        btn.innerText = isMusicOn ? "🎵 Music: ON" : "🔇 Music: OFF";
        btn.style.background = isMusicOn ? "#27ae60" : "#7f8c8d";
    }
}

// 2. KAWALAN KESAN BUNYI (SFX)
function toggleSFX() {
    isSFXOn = !isSFXOn;
    let btn = document.getElementById('sfxBtn');
    if (btn) {
        btn.innerText = isSFXOn ? "🔊 SFX: ON" : "🔇 SFX: OFF";
        btn.style.background = isSFXOn ? "#27ae60" : "#7f8c8d";
    }
}

// 3. KEMASKINI FUNGSI PLAY SFX
// (Pastikan fungsi playSFX sedia ada korang guna logic ini supaya dia semak isSFXOn dulu)
function playSFX(id) {
    if (!isSFXOn) return; // Jika OFF, jangan bunyikan
    
    let sfx = document.getElementById(id);
    if (sfx) {
        sfx.currentTime = 0;
        sfx.play().catch(() => {});
    }
}

function copyGameLog() {
    const logBox = document.getElementById('logContent');
    if (!logBox || logBox.children.length === 0) {
        alert("⚠️ Tiada log untuk di-copy lagi!");
        return;
    }

    // Ambil semua teks dari setiap baris log (susun ikut urutan masa dari atas ke bawah)
    let logLines = Array.from(logBox.children).reverse();
    let textToCopy = logLines.map(div => div.innerText).join('\n');

    // Gunakan Clipboard API untuk Copy
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert("✅ Log berjaya di-copy ke clipboard!");
        }).catch(err => {
            fallbackCopyText(textToCopy);
        });
    } else {
        fallbackCopyText(textToCopy);
    }
}

// Backup function jika phone/browser lama tak support clipboard API
function fallbackCopyText(text) {
    let textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        alert("✅ Log berjaya di-copy!");
    } catch (err) {
        alert("❌ Gagal copy log.");
    }
    document.body.removeChild(textArea);
}
