
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

const app = express();

const config = require('./config/config.json');
const port = config.port || 3000;
const adminUsername = config.adminUsername || 'admin';
const adminPassword = config.adminPassword || 'admin';
const COOLDOWN_TIME = config.cooldownTime || 30; // seconds
const KILL_RANGE = config.killRange || 7; // meters
let winnerAwarded = false;

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
                last_kill_time INTEGER DEFAULT 0,
                score INTEGER DEFAULT 0
            );
        `);

        // Ensure default admin user
        try {
            const hash = await bcrypt.hash(adminPassword, 10);
            // Delete any existing admin
            await db.runAsync(`DELETE FROM users WHERE username = ?`, [adminUsername]);
            // Insert fresh admin
            await db.runAsync(
                `INSERT INTO users (username, password, role) VALUES (?, ?, 'IMPOSTER')`,
                [adminUsername, hash]
            );

            console.log("Default admin user reset/updated successfully.");
        } catch (err) {
            console.error("Error ensuring default admin user:", err);
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
                tasks_per_player INTEGER DEFAULT 4,
                task_target INTEGER DEFAULT 1
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
    secret: config.sessionSecret ||'your-secret-key',
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
    if (req.session.username === adminUsername) {
        next();
    } else {
        res.status(403).json({ success: false, message: "Unauthorized" });
    }
}



// Root route
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));



// Register route
app.post('/register', async (req, res) => {
    try {
        let { username, password } = req.body;
        username = String(username || '').trim();
        password = String(password || '');

        // Basic validation
        if (!username || !password) {
            return res.render('error', { message: "Username and password are required." });
        }
        if (username.length < 3 || username.length > 32) {
            return res.render('error', { message: "Username must be between 3 and 32 characters." });
        }
        if (password.length < 6) {
            return res.render('error', { message: "Password must be at least 6 characters." });
        }
        // Prevent registering as admin
        if (username === adminUsername) {
            return res.render('error', { message: "This username is reserved." });
        }

        // Check if user already exists
        const existing = await db.getAsync(`SELECT id FROM users WHERE username = ?`, [username]);
        if (existing) {
            return res.render('error', { message: "User already exists. Please choose another username." });
        }

        // Hash password
        const hash = await bcrypt.hash(password, 10);

        // Insert into DB
        await db.runAsync(
            `INSERT INTO users (username, password, role) VALUES (?, ?, 'DEAD')`,
            [username, hash]
        );

        // Retrieve new user's id
        const newUser = await db.getAsync(`SELECT id FROM users WHERE username = ?`, [username]);

        // Set session and redirect
        req.session.username = username;
        if (newUser && newUser.id) req.session.userId = newUser.id;

        res.redirect('*');
    } catch (err) {
        console.error("Error registering user:", err);
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
            res.redirect('*');
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
    if (req.session.username !== adminUsername) return res.status(403).send("Access Denied");

    try {
        await db.runAsync(`DELETE FROM users WHERE username != ?`, [adminUsername]);
        await db.runAsync(`DELETE FROM locations WHERE username != ?`, [adminUsername]);
        res.json({ success: true, message: "All users (except admin) have been deleted" });
    } catch (err) {
        console.error("Error clearing users:", err);
        res.status(500).json({
        success: false,
        message: "Error clearing users"
        });
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
        res.json({success: true, message: "Location updated"});
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({success: false, message: "Error updating location"});
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
//kill route
/*
app.post('/kill', isAuthenticated, (req, res) => {
    const username = req.session.username;
    const now = Math.floor(Date.now() / 1000);

    // Block if emergency meeting active
    db.get(`SELECT emergency_meeting FROM settings`, (err, row) => {
        if (row && row.emergency_meeting) {
            return res.status(403).json({ success: false, message: "Emergency meeting active, actions restricted!" });
        }
    });

    // Verify killer
    db.get(`SELECT role, last_kill_time FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) {
            console.error("Error fetching user:", err);
            return res.status(500).json({ success: false, message: "Error fetching user" });
        }

        if (user.role !== 'IMPOSTER') {
            return res.status(403).json({ success: false, message: "Only imposters can kill" });
        }

        if (user.last_kill_time && now - user.last_kill_time < COOLDOWN_TIME) {
            return res.status(403).json({ success: false, message: "Kill on cooldown" });
        }

        // Get imposter's location
        db.get(`SELECT latitude, longitude FROM locations WHERE username = ?`, [username], (err, imposter) => {
            if (err || !imposter) {
                console.error("Error fetching imposter location:", err);
                return res.status(500).json({ success: false, message: "Error fetching location" });
            }

            // Find nearest crewmate in range
            db.get(`
                SELECT users.username, latitude, longitude,
                (6371 * acos(
                    cos(radians(?)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(?)) +
                    sin(radians(?)) * sin(radians(latitude))
                )) AS distance
                FROM locations 
                JOIN users ON locations.username = users.username
                WHERE users.role = "CREWMATE"
                AND (6371 * acos(
                    cos(radians(?)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(?)) +
                    sin(radians(?)) * sin(radians(latitude))
                )) <= ?
                ORDER BY distance ASC LIMIT 1
            `, [
                imposter.latitude, imposter.longitude, imposter.latitude,
                imposter.latitude, imposter.longitude, imposter.latitude,
                KILL_RANGE
            ], (err, victim) => {
                if (err) {
                    console.error("Error finding closest crewmate:", err);
                    return res.status(500).json({ success: false, message: "Error finding victim" });
                }

                if (!victim) {
                    return res.status(404).json({ success: false, message: "No crewmates in range" });
                }

                // Mark victim as DEAD
                db.run(`UPDATE users SET role = 'DEAD' WHERE username = ?`, [victim.username], (err) => {
                    if (err) {
                        console.error("Error updating victim role:", err);
                        return res.status(500).json({ success: false, message: "Error updating victim" });
                    }

                    // Fetch victim's unfinished tasks
                    db.all(`SELECT task_id FROM player_tasks WHERE username = ? AND completed = 0`, [victim.username], (err, tasks) => {
                        if (err) {
                            console.error("Error fetching victim tasks:", err);
                        } else if (tasks.length > 0) {
                            // Get alive crewmates with current task counts
                            db.all(`
                                SELECT u.username, COUNT(pt.task_id) AS task_count
                                FROM users u
                                LEFT JOIN player_tasks pt ON u.username = pt.username AND pt.completed = 0
                                WHERE u.role = 'CREWMATE'
                                GROUP BY u.username
                                ORDER BY task_count ASC
                            `, (err, aliveCrewmates) => {
                                if (!err && aliveCrewmates.length > 0) {
                                    let i = 0;
                                    const insertStmt = db.prepare(`INSERT INTO player_tasks (username, task_id, completed) VALUES (?, ?, 0)`);

                                    // Assign tasks in round-robin (balanced)
                                    tasks.forEach(task => {
                                        const player = aliveCrewmates[i % aliveCrewmates.length];
                                        insertStmt.run(player.username, task.task_id);
                                        i++;
                                    });

                                    insertStmt.finalize();

                                    // Remove uncompleted tasks from the dead player
                                    db.run(`DELETE FROM player_tasks WHERE username = ? AND completed = 0`, [victim.username]);
                                }
                            });
                        }
                    });

                    // Update killer's cooldown
                    db.run(`UPDATE users SET last_kill_time = ? WHERE username = ?`, [now, username], (err) => {
                        if (err) {
                            console.error("Error updating cooldown:", err);
                            return res.status(500).json({ success: false, message: "Error updating cooldown" });
                        }

                        console.log(`${username} killed ${victim.username}. Tasks reallocated fairly.`);
                        res.json({ success: true, message: `${victim.username} is now DEAD. Their tasks were fairly reassigned.` });
                    });
                });
            });
        });
    });
});*/
app.post('/kill', isAuthenticated, async (req, res) => {
    const username = req.session.username;
    const now = Math.floor(Date.now() / 1000);

    try {
        // 1. Check if emergency meeting is active
        const settings = await db.getAsync(`SELECT emergency_meeting FROM settings`);
        if (settings && settings.emergency_meeting) {
            return res.status(403).json({
                success: false,
                message: "Emergency meeting active, actions restricted!"
            });
        }

        // 2. Verify killer
        const user = await db.getAsync(
            `SELECT role, last_kill_time FROM users WHERE username = ?`,
            [username]
        );
        if (!user) {
            return res.status(500).json({ success: false, message: "Error fetching user" });
        }

        if (user.role !== "IMPOSTER") {
            return res.status(403).json({ success: false, message: "Only imposters can kill" });
        }

        if (user.last_kill_time && now - user.last_kill_time < COOLDOWN_TIME) {
            return res.status(403).json({ success: false, message: "Kill on cooldown" });
        }

        // 3. Get imposter location
        const imposter = await db.getAsync(
            `SELECT latitude, longitude FROM locations WHERE username = ?`,
            [username]
        );
        if (!imposter) {
            return res.status(500).json({ success: false, message: "Error fetching location" });
        }

        // 4. Find nearest crewmate in range
        const victim = await db.getAsync(
            `
            SELECT users.username, latitude, longitude,
            (6371 * acos(
                cos(radians(?)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(latitude))
            )) AS distance
            FROM locations 
            JOIN users ON locations.username = users.username
            WHERE users.role = "CREWMATE"
            AND (6371 * acos(
                cos(radians(?)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(latitude))
            )) <= ?
            ORDER BY distance ASC LIMIT 1
            `,
            [
                imposter.latitude, imposter.longitude, imposter.latitude,
                imposter.latitude, imposter.longitude, imposter.latitude,
                KILL_RANGE
            ]
        );

        if (!victim) {
            return res.status(404).json({ success: false, message: "No crewmates in range" });
        }

        // 5. Mark victim as DEAD
        await db.runAsync(`UPDATE users SET role = 'DEAD' WHERE username = ?`, [victim.username]);
        increaseScore(username, 2); // Increase killer's score by 2;
        // 6. Get victim’s unfinished tasks
        const tasks = await db.allAsync(
            `SELECT task_id FROM player_tasks WHERE username = ? AND completed = 0`,
            [victim.username]
        );

        if (tasks.length > 0) {
            const aliveCrewmates = await db.allAsync(`
                SELECT u.username, COUNT(pt.task_id) AS task_count
                FROM users u
                LEFT JOIN player_tasks pt ON u.username = pt.username AND pt.completed = 0
                WHERE u.role = 'CREWMATE'
                GROUP BY u.username
                ORDER BY task_count ASC
            `);

            if (aliveCrewmates.length > 0) {
                let i = 0;
                for (const task of tasks) {
                    const player = aliveCrewmates[i % aliveCrewmates.length];
                    await db.runAsync(
                        `INSERT INTO player_tasks (username, task_id, completed) VALUES (?, ?, 0)`,
                        [player.username, task.task_id]
                    );
                    i++;
                }

                // Remove victim’s unfinished tasks
                await db.runAsync(
                    `DELETE FROM player_tasks WHERE username = ? AND completed = 0`,
                    [victim.username]
                );
            }
        }

        // 7. Update killer cooldown
        await db.runAsync(
            `UPDATE users SET last_kill_time = ? WHERE username = ?`,
            [now, username]
        );

        console.log(`${username} killed ${victim.username}. Tasks reallocated fairly.`);
        res.json({
            success: true,
            message: `${victim.username} is now DEAD. Their tasks were fairly reassigned.`
        });

    } catch (err) {
        console.error("Kill route error:", err);
        res.status(500).json({
            success: false,
            message: "Server error during kill action"
        });
    }
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
        let alloted = 0;
        if (survivors.length > 0) {
            let survivorIndex = 0;
            for (const taskId of deadTasks) {
                if (Math.random() < (1 / scalingFactor)) {
                    alloted++;
                    const assignedTo = survivors[survivorIndex % survivors.length].username;
                    await db.runAsync(
                        `INSERT INTO player_tasks (username, task_id, completed) VALUES (?, ?, 0)`,
                        [assignedTo, taskId]
                    );
                    survivorIndex++;
                }
            }
        }

        await db.runAsync(
            `DELETE FROM player_tasks
WHERE task_id IN (
    SELECT task_id
    FROM player_tasks
    WHERE username = ? AND completed = 0
    LIMIT ?
)
AND username = ?`, [target, deadTasks.length - alloted, target]
        );
        increaseScore(killer, 2); // Increase killer's score by 2;
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
    res.json({ isAdmin: req.session.username === adminUsername });
});
// Start Game
app.post('/start-game', async (req, res) => {
    try {
        const numTasks = parseInt(req.body.numTasks) || 4; // default 4

        // Step 1: Reset roles
        await db.runP(`UPDATE users SET role = 'CREWMATE' WHERE username != ?`, [adminUsername]);

        // Step 2: Clear old tasks
        await db.runP(`DELETE FROM player_tasks`);

        // Step 3: Get all players (excluding admin)
        const players = await db.allP(`SELECT username FROM users WHERE username != ?`, [adminUsername]);

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

        // Reset winner award flag for the new game
        // Compute and save the task target based on players and tasks per player
        try {
            const taskTarget = Math.ceil(players.length * numTasks * 0.8);
            // Save to settings table
            await db.runP(
                `UPDATE settings SET task_target = ? WHERE id = (SELECT id FROM settings ORDER BY id DESC LIMIT 1)`,
                [taskTarget]
            );
            console.log(`Task target set to ${taskTarget} (players: ${players.length}, tasksPerPlayer: ${numTasks})`);
        } catch (e) {
            console.error('Error computing/saving task target:', e);
        }

        winnerAwarded = false;

        
        res.json({
        success: true,
        message: "Game started: All players reset, new tasks assigned, settings updated."
        });

    } catch (err) {
        console.error("Error in /start-game:", err);
        res.status(500).json({
        success: false,
        message: "Failed to start game."
        });
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
        res.json({ success: true, message: "Task added successfully." });

    } catch (err) {
        console.error("Error adding task:", err);
        res.status(500).json({
        success: false,
        message: "Failed to add task."
        });
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
            increaseScore(username, 1); // Increase score by 1 for completing a task
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
        // Determine winner without returning early
        let winner = null;
        if (crewmates <= imposters) {
            winner = 'IMPOSTERS';
        } else {
            const taskThreshold = Math.ceil(totalTasks * 0.8);
            if (completedTasks >= taskThreshold) winner = 'CREWMATES';
        }

        // If there is a winner, award points once and respond
        if (winner) {
            if (!winnerAwarded) {
                try {
                    const roleToAward = (winner === 'IMPOSTERS') ? 'IMPOSTER' : 'CREWMATE';
                    const awardAmount = 5; // adjust as needed
                    await increaseScoresByRole(roleToAward, awardAmount);
                    console.log(`Awarded ${awardAmount} points to all ${roleToAward}s for winning (${winner}).`);
                } catch (err) {
                    console.error("Error awarding win scores:", err);
                }
                winnerAwarded = true;
            }
            return res.json({ winner });
        }

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
        const totalTasksRow = await db.getP(`SELECT COUNT(*) as total FROM player_tasks`);
        const completedTasksRow = await db.getP(`SELECT COUNT(*) as completed FROM player_tasks WHERE completed = 1`);
        const settings = await db.getP('SELECT task_target FROM settings ORDER BY id DESC LIMIT 1');
        
        // Use settings task_target if available, otherwise default to 1
        const taskTarget = (settings && settings.task_target > 0) ? settings.task_target : 1;
        
        const percentageCompleted = totalTasksRow.total > 0
            ? (completedTasksRow.completed / taskTarget) * 100
            : 0;

        res.json({
            totalTasks: totalTasksRow.total,
            completedTasks: completedTasksRow.completed,
            taskTarget: taskTarget,
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





app.post('/clear-scores',isAuthenticated, isemAdmin, async (req, res) => {
    try {
        await db.runP(`UPDATE users SET score = 0`);
        res.json({ success: true, message: "All player scores have been reset to 0." });
    } catch (err) {
        console.error("Error clearing scores:", err);
        res.status(500).json({ success: false, message: "Failed to clear scores." });
    }
});

// Get my score (simple fetch for the current logged-in user)
app.get('/my-score', isAuthenticated, async (req, res) => {
    try {
        const username = req.session.username;
        const row = await db.getP(`SELECT score FROM users WHERE username = ?`, [username]);
        if (!row) return res.status(404).json({ success: false, message: "User not found." });
        res.json({ success: true, username, score: row.score ?? 0 });
    } catch (err) {
        console.error("Error fetching my score:", err);
        res.status(500).json({ success: false, message: "Error fetching score." });
    }
});

// Increase player's score by a specified amount
async function increaseScore(username, amount) {
    if (!username || typeof username !== 'string') {
        throw new Error('Invalid username');
    }
    const inc = Number(amount);
    if (!Number.isFinite(inc)) {
        throw new Error('Invalid amount');
    }

    // Use a single UPDATE then SELECT to return the new score
    await db.runP(`UPDATE users SET score = COALESCE(score,0) + ? WHERE username = ?`, [inc, username]);
    const row = await db.getP(`SELECT score FROM users WHERE username = ?`, [username]);
    return row ? row.score : null;
}
// Increase scores for all users with a given role by a specified amount.
// Returns an array of { username, score } for affected users.
async function increaseScoresByRole(role, amount) {
    if (!role || typeof role !== 'string') {
        throw new Error('Invalid role');
    }
    const inc = Number(amount);
    if (!Number.isFinite(inc)) {
        throw new Error('Invalid amount');
    }

    // Update all matching users, then return their new scores.
    await db.runP(
        `UPDATE users SET score = COALESCE(score, 0) + ? WHERE role = ?`,
        [inc, role]
    );

    const rows = await db.allP(
        `SELECT username, score FROM users WHERE role = ? ORDER BY username ASC`,
        [role]
    );

    return rows; // e.g. [{ username: 'alice', score: 42 }, ...]
}


// Simple leaderboard with username, score and dense ranking (authenticated)
app.get('/leaderboard-rankings', isAuthenticated, async (req, res) => {
    try {
        const rows = await db.allP(
            `SELECT username, COALESCE(score, 0) AS score
             FROM users
             WHERE username != ?
             ORDER BY score DESC, username ASC`,
            [adminUsername]
        );

        const leaderboard = [];
        let lastScore = null;
        let rank = 0;

        for (const r of rows) {
            if (lastScore === null || r.score !== lastScore) {
                rank += 1;
                lastScore = r.score;
            }
            leaderboard.push({ username: r.username, score: r.score, rank });
        }

        res.json({ success: true, leaderboard });
    } catch (err) {
        console.error("Error fetching leaderboard rankings:", err);
        res.status(500).json({ success: false, message: "Failed to fetch leaderboard rankings." });
    }
});



// Serve React build folder
app.use(express.static(path.join(__dirname, "react-frontend/dist")));

// Fallback for SPA routing
app.get("*",isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "react-frontend/dist", "index.html"));
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
