// === NETWORK.JS ===

let leaderboardListenerRef = null;

function saveToGlobalLeaderboard() {
    // SENSOR: Jangan cuba hantar data jika offline
    if (!navigator.onLine || typeof db === 'undefined' || !playerId) return;
    
    let myName = (playerName !== "") ? playerName.toUpperCase() : "HERO";
    const currentSeason = getCurrentSeasonID();
    
    db.ref(`leaderboards/${currentSeason}/` + playerId).update({
        playerId: playerId,
        name: myName,
        clicks: clicks,
        rebirths: rebirths,
        seasonPoints: seasonPoints,           
        totalSeasonPoints: totalSeasonPoints, 
        updatedAt: Date.now()
    }).catch(err => console.error("Gagal hantar skor:", err));
}

function updateLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    // SENSOR SEGERA: Jika offline, padamkan paparan dan tunjuk mesej Offline Mode!
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
        // Jika masa tengah 'on' tiba-tiba offline
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

            listEl.innerHTML += `
                <div class="${isMe ? 'me' : ''}">
                    <span>#${index + 1} ${crown}${escapeHTML(player.name)} <small style="opacity:0.7; font-size:0.65rem;">[R:${player.rebirths || 0} | SP:⭐${estSP} | TSP:🌟${tsp}]</small></span>
                    <span>${formatNum(player.clicks || 0)}</span>
                </div>
            `;
        });
    });
}

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
