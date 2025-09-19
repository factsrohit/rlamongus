
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

const app = express();
const port = 3000;
const KILL_RANGE = 7; // Kill range in meters
const adminUsername = 'admin';
const adminPassword = 'admin';

// Set up database
const db = new sqlite3.Database('db.sqlite', (err) => {
    if (err) console.error(err.message);
    console.log("Connected to SQLite database.");
});

// --- Convert to Promise-based API ---
db.runAsync = promisify(db.run).bind(db);
db.getAsync = promisify(db.get).bind(db);
db.allAsync = promisify(db.all).bind(db);
db.execAsync = promisify(db.exec).bind(db);
db.runP = promisify(db.run).bind(db);
db.getP = promisify(db.get).bind(db);
db.allP = promisify(db.all).bind(db);
db.execP = promisify(db.exec).bind(db);
db.prepareP = promisify(db.prepare).bind(db);

// --- Initialize tables & defaults ---
async function initDB() {
    try {
        // Create users table
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'CREWMATE',
                last_kill_time INTEGER DEFAULT 0
            );
        `);

        // Ensure default admin user
        const row = await db.getAsync(`SELECT 1 FROM users WHERE username = ?`, [adminUsername]);
        if (!row) {
            const hash = await bcrypt.hash(adminPassword, 10);
            await db.runAsync(
                `INSERT INTO users (username, password, role) VALUES (?, ?, 'IMPOSTER')`,
                [adminUsername, hash]
            );
            console.log("Default admin user inserted.");
        }

        // Create locations table
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS locations (
                username TEXT PRIMARY KEY,
                latitude REAL,
                longitude REAL
            );
        `);

        // Create tasks table
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                hint TEXT
            );
        `);

        // Insert default task if none exist
        const taskRow = await db.getAsync(`SELECT 1 FROM tasks LIMIT 1`);
        if (!taskRow) {
            await db.runAsync(
                `INSERT INTO tasks (question, answer, hint) VALUES (?, ?, ?)`,
                ['What is an apple?', 'fruit', 'the answer is a type of food that grows on trees']
            );
            console.log("Default task inserted.");
        }
    } catch (err) {
        console.error("DB Init Error:", err);
    }
}

// Call init
initDB();

async function initExtraTables() {
    try {
        // Create votes table
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS votes (
                voter INTEGER PRIMARY KEY,
                vote_for INTEGER
            );
        `);

        // Create settings table
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emergency_meeting INTEGER DEFAULT 0,
                tasks_per_player INTEGER DEFAULT 4
            );
        `);

        // Insert default settings row if not exists
        await db.runAsync(`INSERT OR IGNORE INTO settings (id) VALUES (1);`);

        // Create player_tasks table
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS player_tasks (
                username TEXT NOT NULL,
                task_id INTEGER NOT NULL,
                completed INTEGER DEFAULT 0,
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            );
        `);

        console.log("Extra tables initialized.");
    } catch (err) {
        console.error("Error initializing extra tables:", err);
    }
}

async function initExtraDB() {
    try {
        await initExtraTables();
    } catch (err) {
        console.error("DB Init Error:", err);
    }
}
initExtraDB();



// JavaScript Haversine Function
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
}

// Clear all locations (Promise-based)
async function clearLocationData() {
    try {
        await db.runAsync("DELETE FROM locations");
        console.log("✅ Cleared all previous location data.");
    } catch (err) {
        console.error("❌ Error clearing location data:", err.message);
    }
}

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

app.use(express.static('public')); // Serve static files (HTML, JS)

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Store templates in 'views'

// Authentication Middleware
function isAuthenticated(req, res, next) {
    if (req.session.username) return next();
    res.redirect('/');
}

function isemAdmin(req, res, next) {
    if (req.session.username === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: "Unauthorized" });
    }
}



// Root route
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// Register route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Hash password (bcrypt has promise support)
        const hash = await bcrypt.hash(password, 10);

        // Insert into DB
        await db.runAsync(
            "INSERT INTO users (username, password, role) VALUES (?, ?, 'CREWMATE')",
            [username, hash]
        );

        // Set session and redirect
        req.session.username = username;
        res.redirect('/dashboard.html');

    } catch (err) {
        console.error("Error registering user:", err);

        // Handle unique constraint violation (username already exists)
        if (err.message.includes("UNIQUE") || err.message.includes("constraint")) {
            return res.render('error', { message: "User already exists. Please choose another username." });
        }

        res.render('error', { message: "Error registering user. Please try again." });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Fetch user from DB
        const user = await db.getAsync("SELECT * FROM users WHERE username = ?", [username]);

        if (!user) {
            return res.render('error', { message: "User not found. Please register first." });
        }

        // Compare password
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            req.session.username = username;
            req.session.userId = user.id;
            res.redirect('/dashboard.html');
        } else {
            res.render('error', { message: "Invalid password. Please try again." });
        }

    } catch (err) {
        console.error("Login error:", err);
        res.render('error', { message: "Error logging in. Please try again later." });
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// Dashboard route
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

// Clear all users except admin
app.post('/clear-users', async (req, res) => {
    if (req.session.username !== 'admin') return res.status(403).send("Access Denied");

    try {
        await db.runAsync(`DELETE FROM users WHERE username != 'admin'`);
        await db.runAsync(`DELETE FROM locations WHERE username != 'admin'`);
        res.send("All users (except admin) have been deleted");
    } catch (err) {
        console.error("Error clearing users:", err);
        res.status(500).send("Error clearing users");
    }
});

// Update player location
app.post('/update-location', async (req, res) => {
    const { latitude, longitude } = req.body;
    const username = req.session.username;

    if (!username) return res.status(401).send("Not logged in");

    try {
        await db.runAsync(
            `INSERT INTO locations (username, latitude, longitude)
             VALUES (?, ?, ?)
             ON CONFLICT(username) DO UPDATE
             SET latitude = excluded.latitude, longitude = excluded.longitude`,
            [username, latitude, longitude]
        );
        res.send("Location updated");
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Error updating location");
    }
});

// Get player location
app.get('/get-location', async (req, res) => {
    const username = req.session.username;

    if (!username) return res.status(401).send("Not logged in");

    try {
        const row = await db.getAsync(
            "SELECT latitude, longitude FROM locations WHERE username = ?",
            [username]
        );

        if (!row) return res.send({ latitude: null, longitude: null });

        res.send(row); // JSON response with { latitude, longitude }
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Error fetching location");
    }
});
// Nearby players
app.get('/nearby-players', isAuthenticated, async (req, res) => {
    const username = req.session.username;
    if (!username) return res.status(401).send("Not logged in");

    try {
        // Get current player location
        const player = await db.getAsync(
            `SELECT latitude, longitude FROM locations WHERE username = ?`,
            [username]
        );
        if (!player) return res.json({ count: 0, players: [] });

        const { latitude, longitude } = player;

        // Get all other alive players
        const rows = await db.allAsync(`
            SELECT locations.username, latitude, longitude
            FROM locations
            JOIN users ON users.username = locations.username
            WHERE locations.username != ? AND users.role != 'DEAD'
        `, [username]);

        // Filter within 7m
        const nearbyPlayers = rows.filter(other =>
            getDistance(latitude, longitude, other.latitude, other.longitude) <= 7
        );

        res.json({
            count: nearbyPlayers.length,
            players: nearbyPlayers.map(p => p.username)
        });
    } catch (err) {
        console.error("Error fetching nearby players:", err);
        res.json({ count: 0, players: [] });
    }
});

// All imposters
app.get('/all-imposters', isAuthenticated, async (req, res) => {
    const username = req.session.username;
    if (!username) return res.status(401).send("Not logged in");

    try {
        const rows = await db.allAsync(`SELECT username FROM users WHERE role = 'IMPOSTER'`);
        res.json({
            count: rows.length,
            imposters: rows.map(r => r.username)
        });
    } catch (err) {
        console.error("Error fetching imposters:", err);
        res.json({ count: 0, imposters: [] });
    }
});
//kill logic
app.post('/kill', isAuthenticated, (req, res) => {
    const killer = req.session.username;

    // Check killer role
    db.get(`SELECT role FROM users WHERE username = ?`, [killer], (err, user) => {
        if (err || !user) return res.status(500).json({ success: false, message: "Error fetching killer" });
        if (user.role !== 'IMPOSTER') return res.status(403).json({ success: false, message: "Only imposters can kill" });

        // Find nearest crewmate (you can replace this with your location logic)
        db.get(`SELECT username FROM users WHERE role = 'CREWMATE' ORDER BY RANDOM() LIMIT 1`, (err, victim) => {
            if (err || !victim) return res.status(404).json({ success: false, message: "No crewmates available" });

            const target = victim.username;

            // Mark victim as DEAD
            db.run(`UPDATE users SET role = 'DEAD' WHERE username = ?`, [target], (err) => {
                if (err) return res.status(500).json({ success: false, message: "Error killing target" });

                console.log(`${killer} killed ${target}`);

                // Reassign victim's tasks
                db.all(`SELECT task_id FROM player_tasks WHERE username = ? AND completed = 0`, [target], (err, tasks) => {
                    if (err) return res.json({ success: true, message: `${target} has been killed (but error redistributing tasks)` });

                    const deadTasks = tasks.map(t => t.task_id);

                    // Get total players for scaling
                    db.get(`SELECT COUNT(*) as total FROM users`, (err, row) => {
                        if (err) return res.json({ success: true, message: `${target} killed but scaling failed` });

                        const totalPlayers = row.total;
                        const scalingFactor = Math.max(2, Math.floor(totalPlayers / 10));

                        // Redistribute some tasks
                        db.all(`SELECT username FROM users WHERE role = 'CREWMATE'`, (err, survivors) => {
                            if (err || survivors.length === 0) return;

                            let survivorIndex = 0;
                            deadTasks.forEach(taskId => {
                                // Only reassign 1 out of scalingFactor tasks
                                if (Math.random() < (1 / scalingFactor)) {
                                    const assignedTo = survivors[survivorIndex % survivors.length].username;
                                    db.run(`INSERT INTO player_tasks (username, task_id, completed) VALUES (?, ?, 0)`, [assignedTo, taskId]);
                                    survivorIndex++;
                                }
                            });
                        });
                    });

                    return res.json({ success: true, message: `${target} has been killed.` });
                });
            });
        });
    });
});


// Remote Kill route
app.post('/kill-remote', isAuthenticated, async (req, res) => {
    const killer = req.session.username;
    const target = req.body.target?.trim();

    if (!target)
        return res.status(400).json({ success: false, message: "Target username required" });

    try {
        // --- Check killer is imposter ---
        const user = await db.getAsync(`SELECT role FROM users WHERE username = ?`, [killer]);
        if (!user || user.role !== 'IMPOSTER')
            return res.status(403).json({ success: false, message: "Only imposters can remote kill" });

        // --- Validate target ---
        const victim = await db.getAsync(`SELECT role FROM users WHERE username = ?`, [target]);
        if (!victim) return res.status(404).json({ success: false, message: "Target not found" });
        if (victim.role !== 'CREWMATE') return res.status(400).json({ success: false, message: "Target must be a crewmate" });

        // --- Kill the target ---
        await db.runAsync(`UPDATE users SET role = 'DEAD' WHERE username = ?`, [target]);
        console.log(`${killer} remotely killed ${target}`);

        // --- Reassign victim's incomplete tasks ---
        const tasks = await db.allAsync(`SELECT task_id FROM player_tasks WHERE username = ? AND completed = 0`, [target]);
        const deadTasks = tasks.map(t => t.task_id);

        const { total } = await db.getAsync(`SELECT COUNT(*) as total FROM users`);
        const scalingFactor = Math.max(2, Math.floor(total / 10));

        const survivors = await db.allAsync(`SELECT username FROM users WHERE role = 'CREWMATE'`);
        if (survivors.length > 0) {
            let survivorIndex = 0;
            for (const taskId of deadTasks) {
                if (Math.random() < (1 / scalingFactor)) {
                    const assignedTo = survivors[survivorIndex % survivors.length].username;
                    await db.runAsync(
                        `INSERT INTO player_tasks (username, task_id, completed) VALUES (?, ?, 0)`,
                        [assignedTo, taskId]
                    );
                    survivorIndex++;
                }
            }
        }
        await db.runAsync(`DELETE FROM player_tasks WHERE username = ? and completed = 0`, [target]);

        res.json({ success: true, message: `${target} has been remotely killed.` });
    } catch (err) {
        console.error("Remote kill error:", err);
        res.status(500).json({ success: false, message: "Remote kill failed" });
    }
});



// Get Dashboard Stats
app.get('/statboard', isAuthenticated, async (req, res) => {
    try {
        const rows = await db.allP(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`);

        let total = 0, imposters = 0;
        if (Array.isArray(rows)) {
            rows.forEach(row => {
                total += row.count;
                if (row.role === 'IMPOSTER') imposters = row.count;
            });
        }

        const user = await db.getP(`SELECT role FROM users WHERE username = ?`, [req.session.username]);

        res.json({
            totalPlayers: total,
            imposters,
            currentUserRole: user ? user.role : "UNKNOWN"
        });
    } catch (err) {
        console.error("Error fetching statboard:", err);
        res.status(500).json({ error: "Error fetching data" });
    }
});


// Game Status
app.get('/game-status', async (req, res) => {
    try {
        const crewmatesRow = await db.getP(`SELECT COUNT(*) as count FROM users WHERE role = 'CREWMATE'`);
        const impostersRow = await db.getP(`SELECT COUNT(*) as count FROM users WHERE role = 'IMPOSTER'`);

        res.json({
            crewmates: crewmatesRow ? crewmatesRow.count : 0,
            imposters: impostersRow ? impostersRow.count : 0
        });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: "Error retrieving game status" });
    }
});


// Check if Admin
app.get('/check-admin', (req, res) => {
    res.json({ isAdmin: req.session.username === 'admin' });
});
// Start Game
app.post('/start-game', async (req, res) => {
    try {
        const numTasks = parseInt(req.body.numTasks) || 4; // default 4

        // Step 1: Reset roles
        await db.runP(`UPDATE users SET role = 'CREWMATE' WHERE username != 'admin'`);

        // Step 2: Clear old tasks
        await db.runP(`DELETE FROM player_tasks`);

        // Step 3: Get all players (excluding admin)
        const players = await db.allP(`SELECT username FROM users WHERE username != 'admin'`);

        // Step 4: Get all available tasks
        const allTasks = await db.allP(`SELECT id FROM tasks`);
        if (!allTasks.length) {
            return res.status(400).send("No tasks available in the pool.");
        }

        // Step 4.1: Assign random tasks to each player
        const insertStmt = db.prepare(`INSERT INTO player_tasks (username, task_id, completed) VALUES (?, ?, 0)`);
        for (const player of players) {
            for (let i = 0; i < numTasks; i++) {
                const randomTask = allTasks[Math.floor(Math.random() * allTasks.length)];
                insertStmt.run(player.username, randomTask.id);
            }
        }

        await new Promise((resolve, reject) => {
            insertStmt.finalize(err => (err ? reject(err) : resolve()));
        });

        // Step 5: Update or insert settings
        const row = await db.getP(`SELECT id FROM settings ORDER BY id DESC LIMIT 1`);
        if (row) {
            await db.runP(`UPDATE settings SET tasks_per_player = ? WHERE id = ?`, [numTasks, row.id]);
        } else {
            await db.runP(`INSERT INTO settings (tasks_per_player) VALUES (?)`, [numTasks]);
        }

        res.send("Game started: All players reset, new tasks assigned, settings updated.");
    } catch (err) {
        console.error("Error in /start-game:", err);
        res.status(500).send("Failed to start game.");
    }
});


// Get Role
app.get('/getRole', isAuthenticated, async (req, res) => {
    try {
        const username = req.session.username;
        const user = await db.getP(`SELECT role FROM users WHERE username = ?`, [username]);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        res.json({ success: true, role: user.role });
    } catch (err) {
        console.error("Error fetching role:", err);
        res.json({ success: false, message: "Error fetching role" });
    }
});
// Start Emergency Meeting (Admin Only)
app.post('/startmeet', isemAdmin, async (req, res) => {
    try {
        await db.runP(`UPDATE settings SET emergency_meeting = 1`);
        res.json({ success: true, message: "Emergency meeting started!" });
    } catch (err) {
        console.error("Error starting meeting:", err);
        res.status(500).json({ success: false, message: "Error starting meeting" });
    }
});

// End Emergency Meeting (Admin Only)
app.post('/endmeet', isemAdmin, async (req, res) => {
    try {
        // Get alive players
        const players = await db.allP(`SELECT id FROM users WHERE role != 'DEAD'`);
        const aliveIds = players.map(p => p.id);

        // Get votes
        const votes = await db.allP(`SELECT voter, vote_for FROM votes`);

        const tally = {};
        const votedPlayers = new Set();

        for (let { voter, vote_for } of votes) {
            votedPlayers.add(voter);
            const vote = vote_for ?? 'SKIP';
            tally[vote] = (tally[vote] || 0) + 1;
        }

        // Add implicit SKIPs
        const missingVotes = aliveIds.filter(id => !votedPlayers.has(id));
        for (let missing of missingVotes) {
            tally['SKIP'] = (tally['SKIP'] || 0) + 1;
        }

        // Find top-voted (excluding SKIP)
        let maxVotes = 0;
        let ejectedPlayerId = null;
        for (let [targetId, count] of Object.entries(tally)) {
            if (targetId !== 'SKIP' && count > maxVotes) {
                maxVotes = count;
                ejectedPlayerId = parseInt(targetId);
            }
        }

        const skipCount = tally['SKIP'] || 0;

        // If SKIP wins or no one was voted
        if (!ejectedPlayerId || skipCount >= maxVotes) {
            await db.runP(`DELETE FROM votes`);
            await db.runP(`UPDATE settings SET emergency_meeting = 0`);
            return res.json({
                success: true,
                message: "No one was ejected. (Skipped)",
                ejected: null,
                role: null
            });
        }

        // Someone is ejected
        const user = await db.getP(`SELECT username, role FROM users WHERE id = ?`, [ejectedPlayerId]);
        if (!user) {
            return res.status(500).json({ success: false, message: "Ejected player not found" });
        }

        await db.runP(`UPDATE users SET role = 'DEAD' WHERE id = ?`, [ejectedPlayerId]);
        await db.runP(`DELETE FROM votes`);
        await db.runP(`UPDATE settings SET emergency_meeting = 0`);

        res.json({
            success: true,
            message: `${user.username} was ejected. They were a ${user.role}.`,
            ejected: user.username,
            role: user.role
        });

    } catch (err) {
        console.error("Error ending meeting:", err);
        res.status(500).json({ success: false, message: "Error ending meeting" });
    }
});

// Check if meeting is active
app.get('/statusmeet', async (req, res) => {
    try {
        const row = await db.getP(`SELECT emergency_meeting FROM settings`);
        res.json({ emergency_meeting: row?.emergency_meeting ?? 0 });
    } catch (err) {
        console.error("Error fetching meeting status:", err);
        res.status(500).json({ success: false, message: "Error fetching meeting status" });
    }
});

// Request Hint
app.post('/request-hint', isAuthenticated, async (req, res) => {
    try {
        const { taskId } = req.body;
        if (!taskId) return res.status(400).json({ success: false, message: "Task ID is required." });

        const task = await db.getP(`SELECT hint FROM tasks WHERE id = ?`, [taskId]);
        if (!task || !task.hint) return res.status(404).json({ success: false, message: "Hint not available for this task." });

        res.json({ success: true, hint: task.hint });
    } catch (err) {
        console.error("Error fetching hint:", err);
        res.status(500).json({ success: false, message: "Error fetching hint." });
    }
});

// Add Task (Admin Only)
app.post('/add-task', isemAdmin, async (req, res) => {
    try {
        const { question, answer, hint } = req.body;
        await db.runP(`INSERT INTO tasks (question, answer, hint) VALUES (?, ?, ?)`, [question, answer, hint]);
        res.send("Task added successfully.");
    } catch (err) {
        console.error("Error adding task:", err);
        res.status(500).send("Failed to add task.");
    }
});

// Get All Tasks
app.get('/tasks', async (req, res) => {
    try {
        const tasks = await db.allP("SELECT * FROM tasks");
        res.json(tasks);
    } catch (err) {
        console.error("Error fetching tasks:", err);
        res.status(500).send("Failed to fetch tasks.");
    }
});

// Assign Tasks to Player
app.post('/assign-tasks', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).send("Username is required.");

        const tasks = await assignTasksToPlayer(username); // Make sure this function returns a Promise
        res.json({ message: "Tasks assigned.", tasks });
    } catch (err) {
        console.error("Error assigning tasks:", err);
        res.status(500).send("Failed to assign tasks.");
    }
});

// Get My Tasks
app.get('/my-tasks', isAuthenticated, async (req, res) => {
    try {
        const username = req.session.username;
        const rows = await db.allP(`
            SELECT tasks.id, tasks.question, player_tasks.completed
            FROM player_tasks
            JOIN tasks ON player_tasks.task_id = tasks.id
            WHERE player_tasks.username = ?
        `, [username]);

        res.json({ success: true, tasks: rows });
    } catch (err) {
        console.error("Error fetching user tasks:", err);
        res.status(500).json({ success: false, message: "Error fetching tasks" });
    }
});

// Submit Task
app.post('/submit-task', isAuthenticated, async (req, res) => {
    try {
        const username = req.session.username;
        const { taskId, answer } = req.body;

        if (!taskId || !answer) return res.status(400).json({ success: false, message: "Task ID and answer are required." });

        const task = await db.getP(`SELECT answer FROM tasks WHERE id = ?`, [taskId]);
        if (!task) return res.status(404).json({ success: false, message: "Task not found." });

        if (task.answer.toLowerCase() === answer.toLowerCase()) {
            await db.runP(`UPDATE player_tasks SET completed = 1 WHERE username = ? AND task_id = ?`, [username, taskId]);
            return res.json({ success: true, message: "Task completed successfully!" });
        } else {
            return res.json({ success: false, message: "Incorrect answer. Try again!" });
        }
    } catch (err) {
        console.error("Error submitting task:", err);
        res.status(500).json({ success: false, message: "Error submitting task" });
    }
});

// Check Win
app.get('/check-win', async (req, res) => {
    try {
        const crewmatesRow = await db.getP(`SELECT COUNT(*) as count FROM users WHERE role = 'CREWMATE'`);
        const impostersRow = await db.getP(`SELECT COUNT(*) as count FROM users WHERE role = 'IMPOSTER'`);
        const tasksRow = await db.getP(`SELECT COUNT(*) as total FROM player_tasks`);
        const completedRow = await db.getP(`SELECT COUNT(*) as completed FROM player_tasks WHERE completed = 1`);

        const crewmates = crewmatesRow.count;
        const imposters = impostersRow.count;
        const totalTasks = tasksRow.total;
        const completedTasks = completedRow.completed;

        if (crewmates <= imposters) return res.json({ winner: 'IMPOSTERS' });

        const taskThreshold = Math.ceil(totalTasks * 0.8);
        if (completedTasks >= taskThreshold) return res.json({ winner: 'CREWMATES' });

        res.json({ winner: null });
    } catch (err) {
        console.error("Error checking win conditions:", err);
        res.status(500).json({ error: "Error checking win conditions" });
    }
});

// Check Dead
app.get('/check-dead', isAuthenticated, async (req, res) => {
    try {
        const username = req.session.username;
        const user = await db.getP(`SELECT role FROM users WHERE username = ?`, [username]);

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ isDead: user.role === 'DEAD' });
    } catch (err) {
        console.error("Error checking player status:", err);
        res.status(500).json({ success: false, message: "Error checking player status" });
    }
});

// Convert Crewmates to Imposters (Admin)
app.post('/convert-crewmates', isemAdmin, async (req, res) => {
    try {
        const count = parseInt(req.body.count);
        if (!count || count <= 0) return res.status(400).json({ success: false, message: "Invalid number of imposters specified." });

        const crewmates = await db.allP(`SELECT username FROM users WHERE role = 'CREWMATE'`);
        if (!crewmates.length) return res.status(400).json({ success: false, message: "No crewmates available to convert." });

        const shuffled = crewmates.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(count, crewmates.length));

        await Promise.all(selected.map(c => db.runP(`UPDATE users SET role = 'IMPOSTER' WHERE username = ?`, [c.username])));

        res.json({ success: true, message: `${selected.length} crewmates converted to imposters.` });
    } catch (err) {
        console.error("Error converting crewmates:", err);
        res.status(500).json({ success: false, message: "Error converting crewmates." });
    }
});

// Task Progress
app.get('/task-progress', isAuthenticated, async (req, res) => {
    try {
        const settings = await db.getP(`SELECT tasks_per_player FROM settings ORDER BY id DESC LIMIT 1`);
        const baseTasksPerPlayer = settings?.tasks_per_player ?? 10;

        const alivePlayersRow = await db.getP(`SELECT COUNT(*) as count FROM users WHERE role = 'CREWMATE'`);
        const totalPlayersRow = await db.getP(`SELECT COUNT(*) as count FROM users`);

        const alivePlayers = alivePlayersRow.count;
        const totalPlayers = totalPlayersRow.count || 1;

        const totalTasksRow = await db.getP(`SELECT COUNT(*) as total FROM player_tasks`);
        const completedTasksRow = await db.getP(`SELECT COUNT(*) as completed FROM player_tasks WHERE completed = 1`);

        let taskTarget = baseTasksPerPlayer * alivePlayers;
        const difficultyModifier = 1 + ((1 - (alivePlayers / totalPlayers)) * 0.5);
        taskTarget *= difficultyModifier;

        taskTarget = Math.min(taskTarget, totalTasksRow.total * 0.9);

        const percentageCompleted = taskTarget > 0 ? (completedTasksRow.completed / taskTarget) * 100 : 0;

        res.json({
            totalTasks: totalTasksRow.total,
            completedTasks: completedTasksRow.completed,
            taskTarget: Math.round(taskTarget),
            percentageCompleted: percentageCompleted.toFixed(2)
        });
    } catch (err) {
        console.error("Error fetching task progress:", err);
        res.status(500).json({ error: "Error fetching task progress" });
    }
});



// Get alive players
app.get('/players', async (req, res) => {
    try {
        const rows = await db.allP(`SELECT id, username FROM users WHERE role != 'DEAD' ORDER BY username ASC`);
        res.json({ players: rows });
    } catch (err) {
        console.error("Failed to fetch players:", err);
        res.status(500).json({ error: "Failed to fetch players" });
    }
});

// Submit vote
app.post('/vote', isAuthenticated, async (req, res) => {
    try {
        const voterId = parseInt(req.session.userId);
        const voteForId = req.body.vote_for ? parseInt(req.body.vote_for) : null;

        if (!voterId) return res.status(403).json({ error: "Not authenticated" });

        // Remove any previous vote
        await db.runP(`DELETE FROM votes WHERE voter = ?`, [voterId]);

        // Insert new vote
        await db.runP(`INSERT INTO votes (voter, vote_for) VALUES (?, ?)`, [voterId, voteForId]);

        res.json({ message: "Vote submitted successfully" });
    } catch (err) {
        console.error("Failed to submit vote:", err);
        res.status(500).json({ error: "Failed to record vote" });
    }
});


// Start server
const kill = require('kill-port');

// Function to kill the port and start the server
async function startServer() {
    try {
        await kill(port); // Kill the port if it's occupied
        console.log(`Port ${port} is now free.`);
        await clearLocationData();
        // Start the server after killing the port
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Error freeing port:', err);
        clearLocationData();
        // Start the server even if the port can't be freed (in case kill fails)
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    }
}

// Start the server by calling the function
startServer();
