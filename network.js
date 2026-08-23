// === NETWORK.JS ===

let leaderboardListenerRef = null;

// 1. HANTAR SKOR KE FIREBASE (BERPERISAI OFFLINE)
function saveToGlobalLeaderboard() {
    // SENSOR: Batalkan hantaran jika offline atau Firebase tidak wujud
    if (!navigator.onLine || typeof db === 'undefined' || !playerId) return;
    
    let myName = (playerName !== "") ? playerName.toUpperCase() : "HERO";
    const currentSeason = getCurrentSeasonID();
    
    db.ref(`leaderboards/${currentSeason}/` + playerId).update({
        playerId: playerId,
        name: myName,
        clicks: clicks,
        rebirths: rebirths,
        seasonPoints: seasonPoints,           // SP minggu ni
        totalSeasonPoints: totalSeasonPoints, // TSP keseluruhan
        updatedAt: Date.now()
    }).catch(err => console.error("Gagal hantar skor:", err));
}

function updateLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    // SENSOR: Jika offline, padamkan paparan dan tunjuk mesej Offline Mode
    if (!navigator.onLine) {
        if (leaderboardListenerRef) {
            leaderboardListenerRef.off();
            leaderboardListenerRef = null;
        }
        listEl.innerHTML = `
            <div style="padding: 15px; text-align: center; color: #e74c3c; font-weight: bold; background: rgba(0,0,0,0.4); border: 1px solid rgba(231, 76, 60, 0.3); border-radius: 8px; margin: 10px 0;">
                📡 OFFLINE MODE
                <div style="font-size: 0.75rem; color: #ccc; font-weight: normal; margin-top: 4px;">
                    Sambungkan internet untuk melihat Carta Leaderboard.
                </div>
            </div>
        `;
        return;
    }

    if (typeof db === 'undefined') return;

    const currentSeason = getCurrentSeasonID();
    const queryRef = db.ref(`leaderboards/${currentSeason}`).orderByChild('clicks').limitToLast(10);

    if (leaderboardListenerRef) {
        leaderboardListenerRef.off();
    }

    leaderboardListenerRef = queryRef;
    leaderboardListenerRef.on('value', (snapshot) => {
        // Jika masa terima data tiba-tiba terputus internet
        if (!navigator.onLine) {
            updateLeaderboard();
            return;
        }

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
            
            let estSP = calculateSeasonPoints(index + 1); 
            let tsp = player.totalSeasonPoints || 0;

            if (isMe) {
                seasonPoints = estSP;
            }

            const rowEl = document.createElement('div');
            if (isMe) rowEl.className = 'me';

            const leftSpan = document.createElement('span');
            const metaSmall = document.createElement('small');
            metaSmall.style.opacity = '0.7';
            metaSmall.style.fontSize = '0.65rem';

            const safeName = (player && player.name != null) ? String(player.name) : '';
            const safeRebirths = Number(player && player.rebirths) || 0;
            const safeClicks = Number(player && player.clicks) || 0;
            const safeTsp = Number(tsp) || 0;

            leftSpan.textContent = `#${index + 1} ${crown}${safeName} `;
            metaSmall.textContent = `[R:${safeRebirths} | SP:⭐${estSP} | TSP:🌟${safeTsp}]`;
            leftSpan.appendChild(metaSmall);

            const rightSpan = document.createElement('span');
            rightSpan.textContent = formatNum(safeClicks);

            rowEl.appendChild(leftSpan);
            rowEl.appendChild(rightSpan);
            listEl.appendChild(rowEl);
        });
    }, (error) => {
        // Jika Firebase gagal sambung disebabkan masalah network sementara
        console.log("Leaderboard sync waiting for internet...", error);
    });
}

// 3. PERLINDUNGAN XSS
function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
}

// 4. KAWALAN MODAL FULL LEADERBOARD
function openFullLeaderboard() {
    const modal = document.getElementById('fullLeaderboardModal');
    if (modal) modal.style.display = 'flex';
    loadFullLeaderboard();
}

function closeFullLeaderboard() {
    const modal = document.getElementById('fullLeaderboardModal');
    if (modal) modal.style.display = 'none';
}

// 5. MUAT TURUN FULL LEADERBOARD (BERPERISAI OFFLINE)
function loadFullLeaderboard() {
    const listEl = document.getElementById('fullLeaderboardList');
    if (!listEl) return;

    // SENSOR SEGERA UNTUK POPUP FULL LEADERBOARD
    if (!navigator.onLine) {
        listEl.innerHTML = `
            <div style="text-align: center; color: #e74c3c; font-weight: bold; padding: 30px 10px;">
                📡 TIADA SAMBUNGAN INTERNET<br>
                <span style="font-size: 0.8rem; color: #aaa; font-weight: normal;">
                    Sila sambung ke internet untuk memuat turun senarai penuh Leaderboard.
                </span>
            </div>
        `;
        return;
    }

    if (typeof db === 'undefined') return;

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
            let estSP = calculateSeasonPoints(index + 1);
            let tsp = player.totalSeasonPoints || 0;

            listEl.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: ${isMe ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255, 255, 255, 0.05)'}; border: ${isMe ? '1px solid #3498db' : 'none'}; border-radius: 6px; font-size: 0.85rem;">
                    <span style="width: 10%; font-weight: bold; color: ${index < 3 ? '#f1c40f' : '#fff'};">#${index + 1}</span>
                    <span style="width: 38%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: ${isMe ? 'bold' : 'normal'}; color: ${isMe ? '#00d2d3' : '#fff'};">
                        ${crown}${escapeHTML(player.name)}
                    </span>
                    <span style="width: 27%; opacity: 0.85; font-size: 0.65rem; color: #ff793f;">R:${player.rebirths || 0} SP:⭐${estSP} TSP:🌟${tsp}</span>
                    <span style="width: 25%; text-align: right; font-weight: bold; color: #2ecc71;">${formatNum(player.clicks || 0)}</span>
                </div>
            `;
        });
    });
}

// 6. FUNGSI TUKAR NAMA / ADMIN COMMANDS
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

        // === COMMAND TEST ===
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

        else if (isAdminMode && upperCode.startsWith("TESTOFFLINE")) {
            let minutes = Number(code.replace(/TESTOFFLINE/i, "").trim()) || 60;
            let secondsOffline = minutes * 60;
            let offClicks = Math.floor((autoClickers * secondsOffline) / 10);
            let offDia = Math.floor((diamondFarms * 0.2) * (secondsOffline / 4));
            
            alert(`🌙 [TEST OFFLINE: ${minutes} Minit]\n\nHasil simulasi:\n+ ${formatNum(offClicks)} Clicks\n+ ${formatNum(offDia)} Diamonds`);
            return;
        }

        else if (isAdminMode && upperCode === "TESTACHIEVE") {
            if (typeof MASTER_ACHIEVEMENTS !== 'undefined') {
                MASTER_ACHIEVEMENTS.forEach(a => achievementsData[a.id] = true);
                updateUI();
                alert("🏆 [TEST] Semua pencapaian dibuka sementara!");
            }
            return;
        }

        // === COMMAND SET / RESET DATA ===
        else if (isAdminMode && (upperCode.startsWith("C ") || upperCode === "C")) {
            let val = Number(code.substring(1).trim()) || 0;
            clicks = val;
            alert(`✅ Clicks diubah kepada: ${formatNum(clicks)}`);
            save(); updateUI(); return;
        }

        else if (isAdminMode && (upperCode.startsWith("D ") || upperCode === "D")) {
            let val = Number(code.substring(1).trim()) || 0;
            diamonds = val;
            alert(`✅ Diamonds diubah kepada: ${formatNum(diamonds)}`);
            save(); updateUI(); return;
        }

        else if (isAdminMode && (upperCode.startsWith("R ") || upperCode === "R")) {
            let val = Number(code.substring(1).trim());
            if (!isNaN(val)) {
                rebirths = val;
                if (val === 0) {
                    basePower = 1;
                    itemPower = 0;
                }
                updatePower();
                alert(`✅ Rebirths: ${val} | Base Power: ${basePower} | Click Power: ${formatNum(clickPower)}`);
                save(); updateUI(); return;
            }
        }

        else if (isAdminMode && (upperCode.startsWith("BP ") || upperCode === "BP")) {
            let val = Number(code.substring(2).trim());
            if (!isNaN(val)) {
                basePower = val;
                updatePower();
                alert(`✅ Base Power diubah ke: ${basePower} | Click Power: ${formatNum(clickPower)}`);
                save(); updateUI(); return;
            }
        }

        else if (isAdminMode && upperCode.startsWith("AC")) {
            let val = Number(code.substring(2).trim()) || 0;
            autoClickers = val;
            alert(`✅ AutoClickers diubah kepada: ${formatNum(autoClickers)}`);
            save(); updateUI(); return;
        }

        else if (isAdminMode && upperCode.startsWith("DF")) {
            let val = Number(code.substring(2).trim()) || 0;
            diamondFarms = val;
            alert(`✅ Diamond Farms diubah kepada: ${formatNum(diamondFarms)}`);
            save(); updateUI(); return;
        }

        // === COMMAND PENGURUSAN SERVER ===
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
            if (newVer !== "" && typeof db !== 'undefined' && navigator.onLine) {
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

// 7. FUNGSI PENTADBIRAN (ADMIN CLEANUP & EDIT)
function adminCleanInactive(days) {
    if (!isAdminMode || typeof db === 'undefined' || !navigator.onLine) return;
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
    if (typeof db === 'undefined' || !navigator.onLine) return;
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
