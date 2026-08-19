// === NETWORK.JS ===

let leaderboardListenerRef = null;

function saveToGlobalLeaderboard() {
    if (typeof db === 'undefined' || !playerId) return;
    let myName = (playerName !== "") ? playerName.toUpperCase() : "HERO";
    const currentSeason = getCurrentSeasonID();
    
    db.ref(`leaderboards/${currentSeason}/` + playerId).update({
        playerId: playerId,
        name: myName,
        clicks: clicks,
        rebirths: rebirths,
        seasonPoints: seasonPoints,
        updatedAt: Date.now()
    }).catch(err => console.error("Gagal hantar skor:", err));
}

function updateLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl || typeof db === 'undefined') return;

    const currentSeason = getCurrentSeasonID();
    const queryRef = db.ref(`leaderboards/${currentSeason}`).orderByChild('clicks').limitToLast(10);

    // Buka listener sekali sahaja untuk elak Memory Leak
    if (leaderboardListenerRef) {
        leaderboardListenerRef.off();
    }

    leaderboardListenerRef = queryRef;
    leaderboardListenerRef.on('value', (snapshot) => {
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
            let crown = (player.rebirths >= 60) ? '👑 ' : '';
            let sp = player.seasonPoints || 0;
            
            let pointsEarned = calculateSeasonPoints(index + 1);
            if (isMe && pointsEarned !== seasonPoints) {
                seasonPoints = pointsEarned;
            }

            listEl.innerHTML += `
                <div class="${isMe ? 'me' : ''}">
                    <span>#${index + 1} ${crown}${escapeHTML(player.name)} <small style="opacity:0.6; font-size:0.65rem;">[R:${player.rebirths || 0} | SP:⭐${sp}]</small></span>
                    <span>${formatNum(player.clicks || 0)}</span>
                </div>
            `;
        });
    });
}

// Perlindungan ringkas daripada Cross-Site Scripting (XSS)
function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
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
            let crown = (player.rebirths >= 60) ? '👑 ' : '';
            let sp = player.seasonPoints || 0;

            listEl.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: ${isMe ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255, 255, 255, 0.05)'}; border: ${isMe ? '1px solid #3498db' : 'none'}; border-radius: 6px; font-size: 0.85rem;">
                    <span style="width: 12%; font-weight: bold; color: ${index < 3 ? '#f1c40f' : '#fff'};">#${index + 1}</span>
                    <span style="width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: ${isMe ? 'bold' : 'normal'}; color: ${isMe ? '#00d2d3' : '#fff'};">
                        ${crown}${escapeHTML(player.name)}
                    </span>
                    <span style="width: 23%; opacity: 0.85; font-size: 0.7rem; color: #ff793f;">R:${player.rebirths || 0} ⭐${sp}</span>
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
        let upperCode = code.toUpperCase();

        // --- BUKA ADMIN MODE ---
        if (upperCode === "AZFARADMIN") {
            if (playerName.toUpperCase().includes("AZFAR")) {
                isAdminMode = true;
                alert("🛡️ ADMIN MODE AKTIF!\n\nSelamat datang Boss " + playerName + "!");
            } else {
                alert("⚠️ AKSES DITOLAK!\n\nNama akaun anda mesti mengandungi 'Azfar'.");
            }
            return;
        }
        
        // --- MENU HELP RINGKAS ---
        else if (isAdminMode && (upperCode === "HELP" || upperCode === "?")) {
            alert(
                "=== 🛡️ ADMIN COMMANDS 🛡️ ===\n\n" +
                "SET / RESET DATA:\n" +
                "• c [jumlah]  -> Set Clicks (cth: c 0)\n" +
                "• d [jumlah]  -> Set Diamond (cth: d 0)\n" +
                "• r [jumlah]  -> Set Rebirth (cth: r 0)\n" +
                "• ac [jumlah] -> Set AutoClicker (cth: ac 0)\n" +
                "• df [jumlah] -> Set Diamond Farm (cth: df 0)\n\n" +
                "COMMAND TEST (SANTAI):\n" +
                "• TESTTITLE [rebirth] -> Test paparan Title\n" +
                "• TESTOFFLINE [minit] -> Test dapatan offline\n" +
                "• TESTACHIEVE        -> Test unlock semua pencapaian\n\n" +
                "PENGURUSAN:\n" +
                "• EDITPLAYER  -> Edit player lain\n" +
                "• CLEAN[hari] -> Format server\n" +
                "• SETVER [v]  -> Tukar versi game\n" +
                "• EXITADMIN   -> Tutup Admin"
            );
            return;
        }

        // === 1. COMMAND TEST (TANPA KACAU SAVE KEKAL) ===

        // Test Paparan Title mengikut Rebirth
        else if (isAdminMode && upperCode.startsWith("TESTTITLE")) {
            let val = Number(code.replace(/TESTTITLE/i, "").trim());
            if (!isNaN(val)) {
                rebirths = val;
                updatePower();
                updateUI();
                alert(`🎨 [TEST] Memaparkan Title untuk Rebirth: ${val}`);
            }
            return;
        }

        // Test Simulasi Offline Earnings (Berapa Clicks/Diamonds dapat bila afk)
        else if (isAdminMode && upperCode.startsWith("TESTOFFLINE")) {
            let minutes = Number(code.replace(/TESTOFFLINE/i, "").trim()) || 60;
            let secondsOffline = minutes * 60;
            let offClicks = Math.floor((autoClickers * secondsOffline) / 10);
            let offDia = Math.floor((diamondFarms * 0.2) * (secondsOffline / 4));
            
            alert(`🌙 [TEST OFFLINE: ${minutes} Minit]\n\nHasil simulasi:\n+ ${formatNum(offClicks)} Clicks\n+ ${formatNum(offDia)} Diamonds`);
            return;
        }

        // Test Buka Semua Achievements Kejap (Untuk tengok UI)
        else if (isAdminMode && upperCode === "TESTACHIEVE") {
            if (typeof MASTER_ACHIEVEMENTS !== 'undefined') {
                MASTER_ACHIEVEMENTS.forEach(a => achievementsData[a.id] = true);
                updateUI();
                alert("🏆 [TEST] Semua pencapaian dibuka sementara!");
            }
            return;
        }

        // === 2. COMMAND PENDEK (SET / RESET DATA) ===

        // Set / Reset Clicks (Guna: c 0)
        else if (isAdminMode && (upperCode.startsWith("C ") || upperCode === "C")) {
            let val = Number(code.substring(1).trim()) || 0;
            clicks = val;
            alert(`✅ Clicks diubah kepada: ${formatNum(clicks)}`);
            save(); updateUI(); return;
        }

        // Set / Reset Diamonds (Guna: d 0)
        else if (isAdminMode && (upperCode.startsWith("D ") || upperCode === "D")) {
            let val = Number(code.substring(1).trim()) || 0;
            diamonds = val;
            alert(`✅ Diamonds diubah kepada: ${formatNum(diamonds)}`);
            save(); updateUI(); return;
        }

               // Rebirths (Guna: r 0 -> Reset Rebirth KEKAL & Reset Base Power balik ke 1)
        else if (isAdminMode && (upperCode.startsWith("R ") || upperCode === "R")) {
            let val = Number(code.substring(1).trim());
            if (!isNaN(val)) {
                rebirths = val;
                
                // JIKA RESET KE 0, KEMBALIKAN BASE POWER KEPADA 1
                if (val === 0) {
                    basePower = 1;
                    itemPower = 0; // Kosongkan power alatan sekiranya ada
                }

                updatePower(); // Kira semula clickPower
                alert(`✅ Rebirths: ${val} | Base Power: ${basePower} | Click Power: ${formatNum(clickPower)}`);
                save(); updateUI(); return;
            }
        }

        // Base Power Manual (Guna: bp 1 -> Untuk set/turunkan Base Power secara terus)
        else if (isAdminMode && (upperCode.startsWith("BP ") || upperCode === "BP")) {
            let val = Number(code.substring(2).trim());
            if (!isNaN(val)) {
                basePower = val;
                updatePower(); // Kira semula clickPower
                alert(`✅ Base Power diubah ke: ${basePower} | Click Power: ${formatNum(clickPower)}`);
                save(); updateUI(); return;
            }
        }

        // Set / Reset AutoClickers (Guna: ac 0)
        else if (isAdminMode && upperCode.startsWith("AC")) {
            let val = Number(code.substring(2).trim()) || 0;
            autoClickers = val;
            alert(`✅ AutoClickers diubah kepada: ${formatNum(autoClickers)}`);
            save(); updateUI(); return;
        }

        // Set / Reset Diamond Farms (Guna: df 0)
        else if (isAdminMode && upperCode.startsWith("DF")) {
            let val = Number(code.substring(2).trim()) || 0;
            diamondFarms = val;
            alert(`✅ Diamond Farms diubah kepada: ${formatNum(diamondFarms)}`);
            save(); updateUI(); return;
        }

        // === 3. COMMAND PENGURUSAN SERVER ===

        else if (isAdminMode && upperCode === "EDITPLAYER") {
            adminEditOtherPlayer();
            return;
        }
        else if (isAdminMode && upperCode.startsWith("CLEAN")) {
            let days = parseInt(upperCode.replace("CLEAN", "")) || 7;
            adminCleanInactive(days);
            return;
        }
        else if (isAdminMode && upperCode.startsWith("SETVER")) {
            let newVer = code.replace(/SETVER/i, "").trim();
            if (newVer !== "" && typeof db !== 'undefined') {
                GAME_VERSION = newVer;
                db.ref('gameConfig/version').set(newVer);
                updateUI();
            }
            return;
        }
        else if (upperCode === "EXITADMIN") {
            isAdminMode = false;
            alert("🔒 ADMIN MODE DITUTUP.");
            return;
        }

        // Tukar Nama Pemain Biasa
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
    
    db.ref(`leaderboards/${season}`).orderByChild('updatedAt').endAt(cutoff).once('value', (snapshot) => {
        let count = 0;
        snapshot.forEach((child) => {
            child.ref.remove();
            count++;
        });
        alert(`🧹 SELESAI! ${count} akaun dibuang.`);
        if (typeof updateLeaderboard === 'function') updateLeaderboard();
    });
}

function adminEditOtherPlayer() {
    if (typeof db === 'undefined') return;
    let targetId = prompt("Masukkan Player ID target:");
    if (!targetId) return;

    const season = getCurrentSeasonID();
    const playerRef = db.ref(`leaderboards/${season}/${targetId}`);

    playerRef.once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            alert("❌ Player ID tidak dijumpai!");
            return;
        }
        let pData = snapshot.val();
        let choice = prompt(`1. Ubah Clicks\n2. Ubah Rebirths\n3. Tukar Nama\n4. PADAM AKAUN`);

        if (choice === "1") {
            let val = Number(prompt("Clicks baharu:", pData.clicks));
            if (!isNaN(val)) playerRef.update({ clicks: val });
        } else if (choice === "2") {
            let val = Number(prompt("Rebirths baharu:", pData.rebirths));
            if (!isNaN(val)) playerRef.update({ rebirths: val });
        } else if (choice === "3") {
            let newName = prompt("Nama baharu:", pData.name);
            if (newName) playerRef.update({ name: newName.substring(0, 12).toUpperCase() });
        } else if (choice === "4" && confirm(`Padam akaun ${pData.name}?`)) {
            playerRef.remove();
        }
        if (typeof updateLeaderboard === 'function') updateLeaderboard();
    });
                      }
      
