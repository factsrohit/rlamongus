function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition, showError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    console.log(`Latitude: ${lat}, Longitude: ${lon}`);

    // Display location on the webpage
    document.getElementById("location").textContent = `Current Player Loc Lat: ${lat}, Lon: ${lon}`;

    // Fetch last known location from server
    fetch('/get-location')
        .then(response => response.json())
        .then(data => {
            if (data.latitude && data.longitude) {
                document.getElementById("loclastupdate").textContent = `Last Saved Location: \nLat ${data.latitude}, Lon ${data.longitude}`;
            } else {
                document.getElementById("loclastupdate").textContent = "No previous location found.";
            }
        })
        .catch(error => console.error("Error fetching last location:", error));

    // **Check if the location has changed before updating**
    if (localStorage.getItem("lastLat") !== lat.toString() || localStorage.getItem("lastLon") !== lon.toString()) {
        localStorage.setItem("lastLat", lat);
        localStorage.setItem("lastLon", lon);

        // Send updated location to the server
        fetch('/update-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lon })
        })
        .then(response => response.text())
        .then(data => console.log(data))
        .catch(error => console.error("Error updating location:", error));
    }
}

function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred.");
            break;
    }
}

// Update nearby players every 5 seconds
function updateNearbyPlayers() {
    fetch('/nearby-players')
        .then(response => response.json())
        .then(data => {
            document.getElementById("nearbyPlayers").textContent = `Players Nearby(${data.count}): ${data.players.join(", ")}`;
        })
        .catch(error => console.error("Error fetching nearby players:", error));
}

function updateImposters() {
    fetch('/all-imposters')
        .then(response => response.json())
        .then(data => {
            document.getElementById("impostersList").textContent =
                `Imposters (${data.count}): ${data.imposters.join(", ")}`;
        })
        .catch(error => console.error("Error fetching imposters:", error));
}

function clearUsers() {
    if (confirm("Are you sure you want to delete all users except the admin?")) {
        fetch('/clear-users', { method: 'POST' })
            .then(response => response.text())
            .then(data => alert(data))
            .catch(error => console.error("Error clearing users:", error));
    }
}
//setInterval(updateNearbyPlayers, 5000);
function checkRole() {
    fetch('/statboard')
    .then(res => res.json())
    .then(data => {
        console.log("Game Status:", data); // Debugging log

        // Ensure the user is an imposter before showing the Kill button
        if (data.currentUserRole === "IMPOSTER") {
            document.getElementById("imposterstuff").style.display = "block";
        } else {
            document.getElementById("imposterstuff").style.display = "none";
        }
        
    });
}

function kill() {
    fetch('/kill', { method: "POST" })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        startCooldown();
    })
    .catch(err => console.error(err));
}

function startCooldown() {
    let timeLeft = 30;
    const cooldown = document.getElementById("cooldown");
    const btn = document.getElementById("killBtn");

    btn.disabled = true;
    const interval = setInterval(() => {
        cooldown.textContent = `Kill available in: ${timeLeft}s`;
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(interval);
            cooldown.textContent = "";
            btn.disabled = false;
        }
    }, 1000);
}

function killRemote() {
    const target = prompt("Enter the exact username of the crewmate to kill:");

    if (!target) {
        alert("Kill cancelled. No target provided.");
        return;
    }

    fetch('/kill-remote', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ target })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            startRemoteKillCooldown(); // cooldown for remote kills
        }
    })
    .catch(err => {
        console.error("Kill failed:", err);
        alert("Remote kill failed.");
    });
}

function startRemoteKillCooldown() {
    let timeLeft = 300; // 5 minutes in seconds
    const cooldown = document.getElementById("remoteCooldown");
    const btn = document.getElementById("remoteKillBtn");

    btn.disabled = true;
    const interval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        cooldown.textContent = `Remote kill available in: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(interval);
            cooldown.textContent = "";
            btn.disabled = false;
        }
    }, 1000);
}

function backstab() {
    const target = prompt("Enter the exact username of the crewmate to kill:");

    if (!target) {
        alert("Kill cancelled. No target provided.");
        return;
    }

    fetch('/kill-remote', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ target })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            startBackStabKillCooldown(); // cooldown for backstabkills
        }
    })
    .catch(err => {
        console.error("Kill failed:", err);
        alert("Remote kill failed.");
    });
}
function startBackStabKillCooldown() {
    let timeLeft = 180; // 3 minutes in seconds
    const cooldown = document.getElementById("backstabCooldown");
    const btn = document.getElementById("backstabKillBtn");

    btn.disabled = true;
    const interval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        cooldown.textContent = `BackStab available in: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(interval);
            cooldown.textContent = "";
            btn.disabled = false;
        }
    }, 1000);
}


// Fetch game status and show "Start Game" button for admin
function updateGameStatus() {
    fetch('/game-status')
        .then(response => response.json())
        .then(data => {
            document.getElementById("gameStatus").textContent = 
                `Crewmates Left: ${data.crewmates} | Imposters: ${data.imposters}`;
        })
        .catch(error => console.error("Error fetching game status:", error));
}

// Check if user is admin and show the Start Game button
function checkAdmin() {
    fetch('/check-admin')
        .then(response => response.json())
        .then(data => {
            if (data.isAdmin) {
                document.getElementById("admincontrols").style.display = "block";
                
                /*document.getElementById("add-task-form").style.display = "block";
                document.getElementById("startGameBtn").style.display = "block";
                document.getElementById("clearusers").style.display = "block";
                document.getElementById("emergencystart").style.display = "block";
                document.getElementById("emergencyend").style.display = "block";*/
            }
        })
        .catch(error => console.error("Error checking admin status:", error));
}

// Start the game (set a random crewmate as an imposter)
/*function startGame() {
    fetch('/start-game', { method: 'POST' })
        .then(response => response.text())
        .then(data => alert(data))
        .catch(error => console.error("Error starting game:", error));
}*/
function startGame() {
     const numTasks = parseInt(prompt("Enter number of tasks to assign per player:", "4"));
    if (isNaN(numTasks) || numTasks <= 0) {
        alert("Please enter a valid number greater than 0.");
        return;
    }

    fetch('/start-game', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numTasks })
        })
        .then(response => response.text())
        .then(data => {
            alert(data); // Notify the user that the game has restarted
            fetchAndDisplayTasks(); // Refresh the task list immediately
        })
        .catch(error => console.error("Error starting game:", error));
}
function updaterole()
    {
        fetch("/getRole")
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById("playerRole").innerHTML = `🕵️‍♂️ Role: <strong>${data.role}</strong>`;
                } else {
                    document.getElementById("playerRole").innerHTML = `🕵️‍♂️ Role: Unknown`;
                }
            })
            .catch(error => {
                console.error("Error fetching role:", error);
                document.getElementById("playerRole").innerHTML = `🕵️‍♂️ Role: Error loading`;
            });
};

async function checkEmergencyStatus() {
    try {
        loadVotingList();
        const meetingResponse = await fetch('/statusmeet');
        const meetingData = await meetingResponse.json();

        const adminResponse = await fetch('/check-admin');
        const adminData = await adminResponse.json();

        const overlay = document.getElementById('emergencyOverlay');
        const deadOverlay = document.getElementById('deadOverlay');
        const winnerOverlay = document.getElementById('winnerOverlay');
        // Show overlay only if emergency meeting is active AND user is NOT admin
        if (meetingData.emergency_meeting && !adminData.isAdmin && deadOverlay.style.display === "none" && winnerOverlay.style.display === "none") {
            showOverlay('emergencyOverlay');
        } else {
            hideOverlay('emergencyOverlay');
        }
    } catch (error) {
        console.error("Error checking emergency status:", error);
    }
}

async function startMeeting() {
    await fetch('/startmeet', { method: 'POST' });
    alert("Emergency Meeting Started!");
}

async function endMeeting() {
    /*fetch('/endmeet', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            let msg = "";

            if (!data.ejected) {
                msg = "😐 No one was ejected. (Skipped)";
            } else if (data.role === 'IMPOSTER') {
                msg = `✅ ${data.ejected} was an Imposter!`;
            } else if (data.role === 'CREWMATE') {
                msg = `❌ ${data.ejected} was a Crewmate!`;
            }

            alert(msg);

        });*/
        try {
    const res = await fetch('/endmeet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();

    if (data.success) {
      showEjectionPopup(data.message);
    } else {
      alert("Error: " + (data.message || "Unknown error"));
    }
  } catch (err) {
    console.error(err);
    alert("Failed to end emergency meeting.");
  }
}

function showEjectionPopup(message) {
  const popup = document.getElementById('ejectionPopup');
  popup.textContent = message;
  popup.style.display = 'block';
  popup.style.opacity = '1';

  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => {
      popup.style.display = 'none';
    }, 300); // matches CSS transition
  }, 5000); // auto-close after 5s
}


document.getElementById("add-task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const body = {
        username: 'admin', // or get from session/login
        question: form.question.value,
        answer: form.answer.value,
        hint: form.hint.value
    };

    const res = await fetch('/add-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const result = await res.text();
    alert(result);
});
 function fetchAndDisplayTasks() {
    
    fetch('/my-tasks')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const taskList = document.getElementById("taskList");
                taskList.innerHTML = ""; // Clear existing tasks

                data.tasks.forEach(task => {
                    const taskItem = document.createElement("li");
                    taskItem.textContent = `${task.question} - ${task.completed ? "Completed" : "Incomplete"}`;

                    if (!task.completed) {
                        const answerButton = document.createElement("button");
                        answerButton.textContent = "Answer";
                        answerButton.onclick = () => submitTask(task.id);
                        taskItem.appendChild(answerButton);

                        const hintButton = document.createElement("button");
                        hintButton.textContent = "Request Hint";
                        hintButton.onclick = () => requestHint(task.id);
                        taskItem.appendChild(hintButton);
                    }

                    taskList.appendChild(taskItem);
                });
            } else {
                alert("Failed to fetch tasks.");
            }
        })
        .catch(error => console.error("Error fetching tasks:", error));
}
function submitTask(taskId) {
    const answer = prompt("Enter your answer for the task:");

    if (!answer) {
        alert("Answer cannot be empty.");
        return;
    }

    fetch('/submit-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, answer })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                fetchAndDisplayTasks(); // Refresh the task list
            } else {
                alert(data.message);
                fetchAndDisplayTasks()
            }
        })
        .catch(error => console.error("Error submitting task:", error));
}
function requestHint(taskId) {
    fetch('/request-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Hint: ${data.hint}`);
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error("Error requesting hint:", error));
}

async function checkWinner() {
    try {
        const response = await fetch('/check-win');
        const data = await response.json();
        const adminResponse = await fetch('/check-admin');
        const adminData = await adminResponse.json();

        if (data.winner) {
            const overlay = document.getElementById('winnerOverlay');
            const winnerMessage = document.getElementById('winnerMessage');
            winnerMessage.textContent = `🎉 Winner: ${data.winner}`;
            showWinnerOverlay();
            if(adminData.isAdmin){
                const restartButton = document.getElementById('newgamebtn');
                restartButton.style.display = "block";
            }
            // populate leaderboard whenever overlay is shown
            showLeaderboard();
        }else{
            const overlay = document.getElementById('winnerOverlay');
            hideWinnerOverlay();
            const ul = document.getElementById('leaderboardList');
            if (ul) ul.innerHTML = '';
        }
    } catch (error) {
        console.error("Error checking winner:", error);
    }
}

// Add a new interval to check for the winner
const winnerInterval = setInterval(checkWinner, 5000);
async function checkDeadStatus() {
    try {
        const response = await fetch('/check-dead');
        const data = await response.json();

        const deadOverlay = document.getElementById('deadOverlay');
        const winnerOverlay = document.getElementById('winnerOverlay');

        if (data.isDead && winnerOverlay.style.display === "none") {
            showOverlay('deadOverlay');
        } else {
            hideOverlay('deadOverlay');
        }
    } catch (error) {
        console.error("Error checking dead status:", error);
    }
}

// Add a new interval to check if the player is dead
const deadStatusInterval = setInterval(checkDeadStatus, 5000);
function convertCrewmates() {
    const count = prompt("Enter the number of crewmates to convert to imposters:");

    if (!count || isNaN(count) || count <= 0) {
        alert("Please enter a valid number.");
        return;
    }

    fetch('/convert-crewmates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: parseInt(count) })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                updateGameStatus(); // Refresh the game status
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error("Error converting crewmates:", error));
}

function fetchTaskProgress() {
    fetch('/task-progress')
        .then(response => response.json())
        .then(data => {
            const totalTasksElement = document.getElementById('totalTasks');
            const completedTasksElement = document.getElementById('completedTasks');
            const remainingTasksElement = document.getElementById('remainingTasks');

            totalTasksElement.textContent = `Total Tasks: ${data.totalTasks}`;
            completedTasksElement.textContent = `Completed Tasks: ${data.completedTasks}`;
            remainingTasksElement.textContent = `Remaining Tasks: ${(100 - data.percentageCompleted).toFixed(2)}%`;
        })
        .catch(error => console.error("Error fetching task progress:", error));
}


let myPlayerId = null; // set this from session or backend if needed

async function loadVotingList() {
  const res = await fetch('/players');
  const data = await res.json(); // expected: [{ id: 1, username: "Red" }, ...]
  const sortedPlayers = data.players.sort((a, b) => a.username.localeCompare(b.username));

  const list = document.getElementById('playerVoteList');
  list.innerHTML = '';

  for (const player of sortedPlayers) {
    // Hide your own name if you don't want to vote for yourself
    const li = document.createElement('li');
    li.innerHTML = `
      ${player.username}
      <button onclick="castVote(${player.id})">Vote</button>
    `;
    list.appendChild(li);
  }
}


async function castVote(playerId) {
  try {
    const res = await fetch('/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote_for: playerId })
    });

    const result = await res.json();
    alert(result.message || 'Vote submitted!');
  } catch (err) {
    console.error(err);
    alert('Failed to cast vote');
  }
}


clearScores = () => {
    if (confirm("Are you sure you want to clear scores of all players?")) {
        fetch('/clear-scores', { method: 'POST' })
            .then(response => response.text())
            .then(data => alert(data))
            .catch(error => console.error("Error clearing scores:", error));
    }
};

// Fetch and display current user's score
function fetchMyScore() {
    fetch('/my-score')
        .then(res => res.json())
        .then(data => {
            if (data && data.success) {
                const score = (typeof data.score === 'number') ? data.score : Number(data.score || 0);
                const el = document.getElementById('playerScore');
                if (el) el.textContent = `🏆 Current Score: ${score}`;
            } else {
                const el = document.getElementById('playerScore');
                if (el) el.textContent = '🏆 Current Score: N/A';
            }
        })
        .catch(err => {
            console.error('Error fetching my score:', err);
            const el = document.getElementById('playerScore');
            if (el) el.textContent = '🏆 Current Score: Error';
        });
}

// Fetch and render leaderboard into the winner overlay
/*async function showLeaderboard() {
    try {
        const res = await fetch('/leaderboard-rankings');
        const data = await res.json();
        const ul = document.getElementById('leaderboardList');
        if (!ul) return;

        ul.innerHTML = ''; // clear previous

        if (!data || !data.success || !Array.isArray(data.leaderboard)) {
            const li = document.createElement('li');
            li.textContent = 'Failed to load leaderboard.';
            ul.appendChild(li);
            return;
        }

        data.leaderboard.forEach(item => {
            const li = document.createElement('li');
            li.style.padding = '6px 8px';
            li.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
            li.textContent = `#${item.rank} ${item.username} — ${item.score}`;
            ul.appendChild(li);
        });
    } catch (err) {
        console.error('Error loading leaderboard:', err);
        const ul = document.getElementById('leaderboardList');
        if (ul) {
            ul.innerHTML = '<li>Unable to load leaderboard.</li>';
        }
    }
}*/

async function showLeaderboard() {
    try {
        const [resBoard, resMe] = await Promise.all([
            fetch('/leaderboard-rankings'),
            fetch('/my-score')
        ]);
        const boardData = await resBoard.json();
        const meData = await resMe.json();
        const me = meData?.username || null;

        const ul = document.getElementById('leaderboardList');
        if (!ul) return;
        ul.innerHTML = '';

        if (!boardData || !boardData.success || !Array.isArray(boardData.leaderboard)) {
            const li = document.createElement('li');
            li.className = 'lb-item';
            li.textContent = 'Failed to load leaderboard.';
            ul.appendChild(li);
            return;
        }

        const rows = boardData.leaderboard;
        const topScore = rows.length ? Math.max(...rows.map(r => Number(r.score || 0))) : 0;

        const colorFor = (name) => {
            let h = 0;
            for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
            return `hsl(${h}, 70%, 45%)`;
        };

        rows.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'lb-item fade-in';
            if (item.username === me) li.classList.add('me');

            // rank / medal
            const rankBox = document.createElement('div');
            rankBox.className = 'lb-rank';
            const rank = Number(item.rank || (idx + 1));
            rankBox.textContent = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

            // avatar
            const avatar = document.createElement('div');
            avatar.className = 'lb-avatar';
            avatar.textContent = (item.username || '?')[0].toUpperCase();
            avatar.style.background = colorFor(item.username);

            // info (name + score + progress)
            const info = document.createElement('div');
            info.className = 'lb-info';

            const nameRow = document.createElement('div');
            nameRow.className = 'lb-name-row';

            const nameEl = document.createElement('div');
            nameEl.className = 'lb-name';
            nameEl.textContent = item.username;

            const scoreEl = document.createElement('div');
            scoreEl.className = 'lb-score';
            scoreEl.textContent = `${item.score}`;

            nameRow.appendChild(nameEl);
            nameRow.appendChild(scoreEl);

            const barWrap = document.createElement('div');
            barWrap.className = 'lb-bar-wrap';
            const bar = document.createElement('div');
            bar.className = 'lb-bar';
            const pct = topScore > 0 ? Math.round((Number(item.score || 0) / topScore) * 100) : 0;
            bar.style.width = `${pct}%`;
            barWrap.appendChild(bar);

            info.appendChild(nameRow);
            info.appendChild(barWrap);

            li.appendChild(rankBox);
            li.appendChild(avatar);
            li.appendChild(info);

            ul.appendChild(li);

            // staggered animation
            li.style.animationDelay = `${Math.min(idx * 40, 400)}ms`;
        });
    } catch (err) {
        console.error('Error loading leaderboard:', err);
        const ul = document.getElementById('leaderboardList');
        if (ul) ul.innerHTML = '<li class="lb-item">Unable to load leaderboard.</li>';
    }
}


// Overlay helpers: call showOverlay('winnerOverlay') / hideOverlay('winnerOverlay')
function _updateBodyOverlayState() {
    // If any overlay is visible, add class to body to lock background scrolling
    const overlays = document.querySelectorAll('.overlay');
    const anyVisible = Array.from(overlays).some(o => o.style.display === 'block' || o.style.display === 'flex');
    if (anyVisible) document.body.classList.add('overlay-open');
    else document.body.classList.remove('overlay-open');
}

function showOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    // For overlay containers use flex so content centers correctly
    if (el.classList.contains('overlay')) el.style.display = 'block';
    else el.style.display = 'block';
    // ensure body is locked
    _updateBodyOverlayState();
}

function hideOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
    _updateBodyOverlayState();
}

// Example: replace direct overlay toggles with showOverlay/hideOverlay
// Previously: overlay.style.display = "block";  -> now: showOverlay('winnerOverlay');
// Previously: overlay.style.display = "none";   -> now: hideOverlay('winnerOverlay');

// Small convenience wrappers used in the codebase
function showWinnerOverlay(message, showRestartButton) {
    const winMsg = document.getElementById('winnerMessage');
    const restartBtn = document.getElementById('newgamebtn');
    if (winMsg) winMsg.textContent = message || winMsg.textContent;
    if (restartBtn) restartBtn.style.display = showRestartButton ? 'block' : 'none';
    showOverlay('winnerOverlay');
    // populate leaderboard now that overlay is visible
    if (typeof showLeaderboard === 'function') showLeaderboard();
}

function hideWinnerOverlay() {
    hideOverlay('winnerOverlay');
    const ul = document.getElementById('leaderboardList');
    if (ul) ul.innerHTML = '';
}

// If you have other places directly toggling overlays, switch them to these helpers.
// Example integration in checkWinner (replace your overlay.style assignments):
// if (data.winner) showWinnerOverlay(`🎉 Winner: ${data.winner}`, adminData.isAdmin);
// else hideWinnerOverlay();



// Get location on page load
window.onload = () => {
    checkAdmin();
    setInterval(checkEmergencyStatus, 5000);// Check emergency status every 5 seconds
    setInterval(updaterole, 5000);
    setInterval(updateGameStatus, 5000);// Update game status every 5 seconds
    setInterval(updateNearbyPlayers, 5000);// Update nearby players every 5 seconds
    localStorage.clear();  // Clear stored location data on refresh
    getLocation();         // Start fetching location
    checkRole(); // Check user role on page load
    setInterval(checkRole(), 5000);// Check user role every 5 seconds
    fetchAndDisplayTasks()// Fetch tasks on page load
    setInterval(fetchAndDisplayTasks,5000);// Refresh tasks every 5 seconds
    setInterval(checkWinner, 5000);// Check for winner every 5 seconds
    setInterval(checkDeadStatus, 5000);//check if player is dead every 5 seconds
    // Add a new interval to periodically fetch task progress
    setInterval(fetchTaskProgress, 5000);
    setInterval(updateImposters, 5000); // refresh imposters list every 5 seconds

    // Fetch and refresh player's score immediately and then every 5 seconds
    fetchMyScore();
    setInterval(fetchMyScore, 5000);

};
