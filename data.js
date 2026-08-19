// === DATA.JS ===

let playerId = localStorage.getItem('myGamePlayerId');
if (!playerId) {
    playerId = 'P_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('myGamePlayerId', playerId);
}

let playerName = ""; 
let clicks = 0, diamonds = 0, clickPower = 1, basePower = 1, rebirthCost = 100, rebirths = 0, diaReward = 1, autoClickers = 0, diamondFarms = 0, musicStarted = false, endingReached = false;
let itemPower = 0; 
let inventory = { sword: false, wand: false, glove: false, laser: false, quantum: false, void: false };

let GAME_VERSION = "v1.0.1";
let isAdminMode = false;
let seasonPoints = 0;
let achievementsData = {};
let totalSeasonPoints = 0;

const MASTER_ACHIEVEMENTS = [
    { id: 'first_click', title: 'Permulaan Baru', desc: 'Lakukan 1 klik pertama', reqType: 'clicks', reqVal: 1, reward: 10 },
    { id: 'reach_1k', title: 'Penclik Tegar', desc: 'Kumpul 1,000 Clicks', reqType: 'clicks', reqVal: 1000, reward: 50 },
    { id: 'first_rebirth', title: 'Lahir Semula', desc: 'Lakukan 1 kali Rebirth', reqType: 'rebirths', reqVal: 1, reward: 100 },
    { id: 'reach_10_rebirth', title: 'Pahlawan Rebirth', desc: 'Lakukan 10 kali Rebirth', reqType: 'rebirths', reqVal: 10, reward: 250 },
    { id: 'diamond_collector', title: 'Kaya Diamond', desc: 'Kumpul 500 Diamonds', reqType: 'diamonds', reqVal: 500, reward: 150 }
];

const bgmList = ["wet-hand.mp3", "minecraft.mp3", "subwoofer-lullaby.mp3", "sweden.mp3"];
let lastPlayedIndex = -1;

function getCurrentSeasonID() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}_W${weekNo}`;
}

function calculateSeasonPoints(rank) {
    if (rank >= 1 && rank <= 10) return 11 - rank; 
    return 0;
}

function updatePower() {
    // 🔴 KOD LAMA: Math.pow(2.8, rebirths) -> Terlalu laju
    // ✅ KOD BAHARU: Turunkan multiplier dari 2.8 ke 1.5
    let rebirthMult = Math.pow(1.5, rebirths); 
    
    let effectiveItemPower = itemPower * (rebirths + 1);
    clickPower = (basePower + effectiveItemPower) * rebirthMult;
    
    // 🔴 KOD LAMA: Math.pow(1.8, rebirths)
    // ✅ KOD BAHARU: Naikkan kos scaling dari 1.8 ke 2.2
    rebirthCost = Math.floor(100 * Math.pow(2.2, rebirths));
}

function formatNum(num) {
    if (isNaN(num) || !isFinite(num) || num >= 1e45) return "MAX";
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

function save() {
    const data = { 
        playerName, clicks, diamonds, basePower, itemPower, rebirthCost, rebirths, 
        diaReward, autoClickers, diamondFarms, endingReached, inventory, 
        achievementsData: achievementsData || {},
        totalSeasonPoints: totalSeasonPoints,
        lastTime: Date.now() 
    };
    localStorage.setItem('dolaFinalSaveV5', JSON.stringify(data));
    if (typeof saveToGlobalLeaderboard === 'function') saveToGlobalLeaderboard();
}

function loadGameData() {
    const currentSeason = getCurrentSeasonID();
    let savedSeason = localStorage.getItem('activeSeason');
    let saved = JSON.parse(localStorage.getItem('dolaFinalSaveV5'));

    if (saved) {
        totalSeasonPoints = Number(saved.totalSeasonPoints) || 0;
    }

    // Mengendalikan Pertukaran Musim
    if (savedSeason && savedSeason !== currentSeason) {
        let earnedSP = Number(localStorage.getItem('pendingSeasonSP')) || 0;
        totalSeasonPoints += earnedSP;
        
        let oldName = saved ? saved.playerName : "";
        
        // Simpan perkara penting sebelum pembersihan
        localStorage.clear();
        localStorage.setItem('myGamePlayerId', playerId);
        localStorage.setItem('activeSeason', currentSeason);
        
        clicks = 0; diamonds = 0; basePower = 1; itemPower = 0; rebirths = 0;
        diaReward = 1; autoClickers = 0; diamondFarms = 0; endingReached = false;
        inventory = { sword: false, wand: false, glove: false, laser: false, quantum: false, void: false };
        achievementsData = {};
        
        if (oldName !== "") playerName = oldName;
        save();
        
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
            achievementsData = saved.achievementsData || {};

            if (saved.lastTime) {
                let secondsOffline = Math.floor((Date.now() - saved.lastTime) / 1000);
                if (secondsOffline > 43200) secondsOffline = 43200; // Cap 12 jam

                if (secondsOffline > 10) {
                    let offlineClicks = Math.floor((autoClickers * secondsOffline) / 10);
                    let offlineDiamonds = Math.floor((diamondFarms * 0.2) * (secondsOffline / 4));

                    clicks += offlineClicks;
                    diamonds += offlineDiamonds;

                    setTimeout(() => {
                        alert(`🌙 SELAMAT KEMBALI!\n\nSemasa anda tiada (${Math.floor(secondsOffline/60)} minit):\n+ ${formatNum(offlineClicks)} Clicks\n+ ${formatNum(offlineDiamonds)} Diamonds`);
                        if (typeof updateUI === 'function') updateUI();
                    }, 500);
                }
            }
        }
    }

    const nameSection = document.getElementById('nameInputSection');
    if (nameSection) {
        nameSection.style.display = (playerName && playerName.trim() !== "") ? 'none' : 'block';
    }

    updatePower();
    if (typeof updateUI === 'function') updateUI();
    if (typeof updateLeaderboard === 'function') updateLeaderboard();
}

function resetGame() {
    
    const currentSeason = getCurrentSeasonID();

    // 2. Padam akaun dari Firebase dulu supaya tak ada duplicate di Leaderboard
    if (playerId && typeof db !== 'undefined') {
        db.ref(`leaderboards/${currentSeason}/` + playerId).remove();
    }

    // 3. Curi simpan ID & NAMA semasa dari terpadam terus
    let currentId = playerId;

    // 4. Clear LocalStorage
    localStorage.clear();

    // 5. Masukkan semula ID lama supaya Firebase TAK CIPTA AKAUN DUPLICATE BAHARU!
    localStorage.setItem('myGamePlayerId', currentId);
    
    // 6. Set playerName jadi kosong dan SIMPAN supaya Name Bar muncul semula kat Menu!
    localStorage.setItem('myGamePlayerName', '');

    // 7. Reload page untuk muatkan semula Menu dengan Name Bar yang kosong
    alert("✅ Akaun berjaya dipadam!");
    location.reload();
}


function addGameLog(message, type = 'info') {
    const logBox = document.getElementById('logContent');
    if (!logBox) return;

    let color = '#ccc'; // Default color
    if (type === 'click') color = '#3498db';      // Biru
    if (type === 'ach') color = '#f1c40f';        // Emas
    if (type === 'rebirth') color = '#e74c3c';    // Merah
    if (type === 'buy') color = '#2ecc71';        // Hijau

    let time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    let entry = document.createElement('div');
    entry.style.color = color;
    entry.style.marginBottom = '2px';
    entry.innerHTML = `<span style="opacity:0.5;">[${time}]</span> ${message}`;

    logBox.appendChild(entry);

    // Hadkan log maksimum 30 baris sahaja supaya tak lag
    if (logBox.children.length > 1000) {
        logBox.removeChild(logBox.firstChild);
    }
  }
      
