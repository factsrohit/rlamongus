const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require(`path`);

const app = express();
const port = 3000;

const KILL_RANGE = 0.010; // ~10 meters
const COOLDOWN_TIME = 30; // 30 seconds

const adminUsername = 'admin';
const adminPassword = 'admin';

// Set up database
const db = new sqlite3.Database('db.sqlite', (err) => {
    if (err) console.error(err.message);
    console.log("Connected to SQLite database.");
});

/*
// Create users table if not exists
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT "CREWMATE",
    last_kill_time INTEGER DEFAULT 0
)`);
db.run(`CREATE TABLE IF NOT EXISTS locations (
    username TEXT PRIMARY KEY,
    latitude REAL,
    longitude REAL
)`);

db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    hint TEXT
);
`);

db.run(`CREATE TABLE IF NOT EXISTS votes (
    voter INTEGER PRIMARY KEY,
    vote_for INTEGER 
);
`);

db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emergency_meeting INTEGER DEFAULT 0,
     tasks_per_player INTEGER DEFAULT 4
);
INSERT INTO settings (id) VALUES (1) on conflict do nothing;
`);
db.run(`
    CREATE TABLE IF NOT EXISTS player_tasks (
        username TEXT NOT NULL,
        task_id INTEGER NOT NULL,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
    )
`);
*/
// Create users table
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'CREWMATE',
    last_kill_time INTEGER DEFAULT 0
);`);

db.get(`SELECT 1 FROM users WHERE username = ?`, [adminUsername], (err, row) => {
    if (err) return console.error("Error checking admin user:", err);

    if (!row) {
        bcrypt.hash(adminPassword, 10, (err, hash) => {
            if (err) return console.error("Error hashing password:", err);

            db.run(
                `INSERT INTO users (username, password, role) VALUES (?, ?, 'IMPOSTER')`,
                [adminUsername, hash],
                (err) => {
                    if (err) console.error("Error inserting admin user:", err);
                    else console.log("Default admin user inserted.");
                }
            );
        });
    }
});


// Create locations table
db.run(`CREATE TABLE IF NOT EXISTS locations (
    username TEXT PRIMARY KEY,
    latitude REAL,
    longitude REAL
);`);

// Create tasks table
db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    hint TEXT
);`);

db.get(`SELECT 1 FROM tasks LIMIT 1`, (err, row) => {
    if (!row) {
        db.run(`INSERT INTO tasks (question, answer, hint) VALUES ('What is an apple?', 'fruit', 'the answer is a type of food that grows on trees')`);
    }
});


// Create votes table
db.run(`CREATE TABLE IF NOT EXISTS votes (
    voter INTEGER PRIMARY KEY,
    vote_for INTEGER
);`);

// Create settings table
db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emergency_meeting INTEGER DEFAULT 0,
    tasks_per_player INTEGER DEFAULT 4
);`);

// Insert default settings row if not exists
db.run(`INSERT OR IGNORE INTO settings (id) VALUES (1);`);

// Create player_tasks table
db.run(`CREATE TABLE IF NOT EXISTS player_tasks (
    username TEXT NOT NULL,
    task_id INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);`);



function clearLocationData() {
    db.run("DELETE FROM locations", (err) => {
        if (err) {
            console.error("❌ Error clearing location data:", err.message);
        } else {
            console.log("✅ Cleared all previous location data.");
        }
    });
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
app.set('views', path.join(__dirname, 'views')); // Store templates in the 'views' folder


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

// Routes
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
/*app.post('/register', (req, res) => {
    const { username, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error("Error hashing password:", err);
            return res.send("Error hashing password.");
        }

        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, 'CREWMATE')", [username, hash], (err) => {
            if (err) {
                console.error("Error registering user:", err);
                return res.send("User already exists.");
            }

            req.session.username = username;
            res.redirect('/dashboard');
        });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            console.error("Database error:", err);
            return res.send("Error logging in.");
        }
        
        if (!user) return res.send("User not found.");

        //console.log(`Stored hash for ${username}:`, user.password);
        //console.log(`Entered password:`, password);

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error("Bcrypt error:", err);
                return res.send("Error checking password.");
            }

            //console.log("Password match result:", result);

            if (result) {
                req.session.username = username;
                res.redirect('/dashboard');
            } else {
                res.send("Invalid password.");
            }
        });
    });
});

*/

// Register route
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error("Error hashing password:", err);
            return res.render('error', { message: "Error hashing password. Please try again." });
        }

        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, 'CREWMATE')", [username, hash], (err) => {
            if (err) {
                console.error("Error registering user:", err);
                return res.render('error', { message: "User already exists. Please choose another username." });
            }

            req.session.username = username;
            res.redirect('/dashboard.html');
        });
    });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            console.error("Database error:", err);
            return res.render('error', { message: "Database error. Please try again later." });
        }
        
        if (!user) return res.render('error', { message: "User not found. Please register first." });

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error("Bcrypt error:", err);
                return res.render('error', { message: "Error checking password. Please try again." });
            }

            if (result) {
                req.session.username = username;
                req.session.userId = user.id;
                res.redirect('/dashboard.html');
            } else {
                res.render('error', { message: "Invalid password. Please try again." });
            }
        });
    });
});


app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

app.post('/clear-users', (req, res) => {
    if (req.session.username !== 'admin') return res.status(403).send("Access Denied");

    db.serialize(() => {
        db.run(`DELETE FROM users WHERE username != 'admin'`);
        db.run(`DELETE FROM locations WHERE username != 'admin'`, (err) => {
            if (err) return res.status(500).send("Error clearing users");
            res.send("All users (except admin) have been deleted");
        });
    });
});



app.post('/update-location', (req, res) => {
    const { latitude, longitude } = req.body;
    const username = req.session.username;

    if (!username) return res.status(401).send("Not logged in");
    //console.log(`Received location update from ${username}: ${latitude}, ${longitude}`);
    db.run(
        `INSERT INTO locations (username, latitude, longitude) VALUES (?, ?, ?)
         ON CONFLICT(username) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude`,
        [username, latitude, longitude],
        (err) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).send("Error updating location");
            }
            res.send("Location updated");
        }
    );
});

app.get('/get-location', (req, res) => {
    const username = req.session.username;

    if (!username) return res.status(401).send("Not logged in");

    db.get("SELECT latitude, longitude FROM locations WHERE username = ?", [username], (err, row) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Error fetching location");
        }
        if (!row) return res.send({ latitude: null, longitude: null });
        
        res.send(row); // Send location data as JSON
    });
    /*db.get("SELECT latitude, longitude FROM locations WHERE username = ?", [username], (err, row)=>{
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Error fetching location");
        }
        console.log(row)
    })*/
});

app.get('/nearby-players', (req, res) => {
    const username = req.session.username;
    if (!username) return res.status(401).send("Not logged in");

    // Get the current player's location
    db.get(`SELECT latitude, longitude FROM locations WHERE username = ?`, [username], (err, player) => {
        if (err || !player) {
            console.error("Error fetching player location:", err);
            return res.json({ count: 0, players: [] });
        }

        const { latitude, longitude } = player;

        // Fetch all other players' locations
        db.all(`SELECT locations.username, latitude, longitude 
    FROM locations 
    JOIN users ON users.username = locations.username 
    WHERE locations.username != ? AND users.role != 'DEAD'`, [username], (err, rows) => {
            if (err) {
                console.error("Error fetching nearby players:", err);
                return res.json({ count: 0, players: [] });
            }

            //console.log("Players found in bounding box:", rows);

            // Filter players within 7 meters using JavaScript
            const nearbyPlayers = rows.filter(other => 
                getDistance(latitude, longitude, other.latitude, other.longitude) <= 7
            );

            //console.log("Final nearby players:", nearbyPlayers);

            res.json({ 
                count: nearbyPlayers.length, 
                players: nearbyPlayers.map(p => p.username) 
            });
        });
    });
});

app.get('/all-imposters', (req, res) => {
    const username = req.session.username;
    if (!username) return res.status(401).send("Not logged in");

    db.all(`
        SELECT username 
        FROM users 
        WHERE role = 'IMPOSTER'
    `, (err, rows) => {
        if (err) {
            console.error("Error fetching imposters:", err);
            return res.json({ count: 0, imposters: [] });
        }

        res.json({
            count: rows.length,
            imposters: rows.map(row => row.username)
        });
    });
});


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

// Kill Route

app.post('/kill', isAuthenticated, (req, res) => {
    const username = req.session.username;
    const now = Math.floor(Date.now() / 1000);
    db.get(`SELECT emergency_meeting FROM settings`, (err, row) => {
        if (row.emergency_meeting) {
            return res.status(403).json({ success: false, message: "Emergency meeting active, actions restricted!" });
        }
    });

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

        // Get the imposter's location
        db.get(`SELECT latitude, longitude FROM locations WHERE username = ?`, [username], (err, imposter) => {
            if (err || !imposter) {
                console.error("Error fetching imposter location:", err);
                return res.status(500).json({ success: false, message: "Error fetching location" });
            }

            // Find the nearest crewmate within range (fixed WHERE condition)
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
            `, [imposter.latitude, imposter.longitude, imposter.latitude, 
                imposter.latitude, imposter.longitude, imposter.latitude, KILL_RANGE], 
            (err, victim) => {
                if (err) {
                    console.error("Error finding closest crewmate:", err);
                    return res.status(500).json({ success: false, message: "Error finding victim" });
                }

                if (!victim) {
                    return res.status(404).json({ success: false, message: "No crewmates in range" });
                }

                // Convert the crewmate into an imposter
                const converter = 'DEAD';
                if (user.username=='admin'){converter = 'IMPOSTER' };

                db.run(`UPDATE users SET role = ? WHERE username = ?`, [converter,victim.username], (err) => {
                    if (err) {
                        console.error("Error updating victim role:", err);
                        return res.status(500).json({ success: false, message: "Error updating victim" });
                    }

                    // Update the killer's cooldown time
                    db.run(`UPDATE users SET last_kill_time = ? WHERE username = ?`, [now, username], (err) => {
                        if (err) {
                            console.error("Error updating cooldown:", err);
                            return res.status(500).json({ success: false, message: "Error updating cooldown" });
                        }

                        console.log(`${username} killed ${victim.username}.`);
                        res.json({ success: true, message: `${victim.username} is now GONE FOR GOOD!` });
                    });
                });
            });
        });
    });
});

app.post('/kill-remote', isAuthenticated, (req, res) => {
    const killer = req.session.username;
    const target = req.body.target?.trim();

    if (!target) {
        return res.status(400).json({ success: false, message: "Target username required" });
    }

    // Step 1: Check emergency meeting status
    db.get(`SELECT emergency_meeting FROM settings`, (err, row) => {
        if (err) {
            console.error("Error checking settings:", err);
            return res.status(500).json({ success: false, message: "Error checking emergency status" });
        }

        if (row && row.emergency_meeting) {
            return res.status(403).json({ success: false, message: "Emergency meeting active, actions restricted!" });
        }

        // Step 2: Ensure the killer is an imposter
        db.get(`SELECT role FROM users WHERE username = ?`, [killer], (err, user) => {
            if (err || !user) {
                console.error("Error fetching killer:", err);
                return res.status(500).json({ success: false, message: "Error fetching killer" });
            }

            if (user.role !== 'IMPOSTER') {
                return res.status(403).json({ success: false, message: "Only imposters can remote kill" });
            }

            // Step 3: Validate the target is a crewmate
            db.get(`SELECT role FROM users WHERE username = ?`, [target], (err, victim) => {
                if (err) {
                    console.error("Error finding target:", err);
                    return res.status(500).json({ success: false, message: "Error finding target" });
                }

                if (!victim || victim.role !== 'CREWMATE') {
                    return res.status(404).json({ success: false, message: "Target must be an existing CREWMATE" });
                }

                // Step 4: Kill the crewmate
                db.run(`UPDATE users SET role = 'DEAD' WHERE username = ?`, [target], (err) => {
                    if (err) {
                        console.error("Error updating victim role:", err);
                        return res.status(500).json({ success: false, message: "Error applying remote kill" });
                    }

                    console.log(`${killer} remotely killed ${target}.`);
                    return res.json({ success: true, message: `${target} has been remotely killed.` });
                });
            });
        });
    });
});


// Get Dashboard Stats
app.get('/statboard', isAuthenticated, (req, res) => {
    db.all(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`, [], (err, rows) => {
        if (err) {
            console.error("Error fetching statboard:", err);
            return res.status(500).json({ error: "Error fetching data" });
        }

        let total = 0, imposters = 0;

        if (Array.isArray(rows)) {
            rows.forEach(row => {
                total += row.count;
                if (row.role === 'IMPOSTER') imposters = row.count;
            });
        } else {
            console.error("Unexpected data format for rows:", rows);
            return res.status(500).json({ error: "Invalid data format" });
        }

        // Fetch the current user's role
        db.get(`SELECT role FROM users WHERE username = ?`, [req.session.username], (err, user) => {
            if (err) {
                console.error("Error fetching user role:", err);
                return res.status(500).json({ error: "Error fetching user role" });
            }

            res.json({
                totalPlayers: total,
                imposters,
                currentUserRole: user ? user.role : "UNKNOWN"
            });
        });
    });
});

app.get('/game-status', (req, res) => {
    db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'CREWMATE'`, (err, crewmatesRow) => {
        if (err) {
            console.error("Database Error (Crewmates):", err);
            return res.status(500).json({ error: "Error retrieving game status" });
        }

        db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'IMPOSTER'`, (err, impostersRow) => {
            if (err) {
                console.error("Database Error (Imposters):", err);
                return res.status(500).json({ error: "Error retrieving game status" });
            }

            //console.log("Crewmates Count:", crewmatesRow ? crewmatesRow.count : "undefined");
            //console.log("Imposters Count:", impostersRow ? impostersRow.count : "undefined");

            res.json({ 
                crewmates: crewmatesRow ? crewmatesRow.count : 0, 
                imposters: impostersRow ? impostersRow.count : 0 
            });
        });
    });
});



app.get('/check-admin', (req, res) => {
    if (req.session.username === 'admin') {
        res.json({ isAdmin: true });
    } else {
        res.json({ isAdmin: false });
    }
});


/*
app.post('/start-game', async (req, res) => {
    try {
        // Reset all players to "CREWMATE" except the admin
        await db.run(`UPDATE users SET role = 'CREWMATE' WHERE username != 'admin'`);

        // Send confirmation response
        res.send("All players have been reset to Crewmates (except admin).");

    } catch (error) {
        console.error("Error resetting game:", error);
        res.status(500).send("Failed to reset game.");
    }
});
*/
app.post('/start-game', (req, res) => {
    const numTasks = parseInt(req.body.numTasks) || 4; // default to 4 if missing or invalid
    // Step 1: Reset player roles
    db.run(`UPDATE users SET role = 'CREWMATE' WHERE username != 'admin'`, function(err) {
        if (err) {
            console.error("Error resetting roles:", err);
            return res.status(500).send("Failed to reset roles.");
        }

        // Step 2: Clear all old player tasks
        db.run(`DELETE FROM player_tasks`, function(err) {
            if (err) {
                console.error("Error clearing old player tasks:", err);
                return res.status(500).send("Failed to clear player tasks.");
            }

            // Step 3: Fetch all players (excluding admin)
            db.all(`SELECT username FROM users WHERE username != 'admin'`, (err, players) => {
                if (err) {
                    console.error("Error fetching players:", err);
                    return res.status(500).send("Failed to fetch players.");
                }

                // Step 4: Fetch all available tasks
                db.all(`SELECT id FROM tasks`, (err, allTasks) => {
                    if (err) {
                        console.error("Error fetching tasks:", err);
                        return res.status(500).send("Failed to fetch tasks.");
                    }

                    const insertStmt = db.prepare(`INSERT INTO player_tasks (username, task_id, completed) VALUES (?, ?, 0)`);

                    players.forEach(player => {
                        for (let i = 0; i < numTasks; i++) {
                            const randomTask = allTasks[Math.floor(Math.random() * allTasks.length)];
                            insertStmt.run(player.username, randomTask.id);
                        }
                    });

                    //insertStmt.finalize();

                    //res.send("Game started: All players reset and new tasks assigned.");
                    insertStmt.finalize(err => {
                        if (err) {
                            console.error("Error finalizing insertStmt:", err);
                            return res.status(500).send("Failed to assign tasks.");
                        }

                        // Step 5: Update or insert tasks_per_player in settings table
                        db.get(`SELECT id FROM settings ORDER BY id DESC LIMIT 1`, (err, row) => {
                            if (err) {
                                console.error("Error reading settings:", err);
                                return res.status(500).send("Failed to read settings.");
                            }

                            if (row) {
                                // Update existing settings row
                                db.run(`UPDATE settings SET tasks_per_player = ? WHERE id = ?`, [numTasks, row.id], (err) => {
                                    if (err) {
                                        console.error("Error updating tasks_per_player:", err);
                                        return res.status(500).send("Failed to update settings.");
                                    }
                                    res.send("Game started: All players reset, new tasks assigned, settings updated.");
                                });
                            } else {
                                // Insert new settings row
                                db.run(`INSERT INTO settings (tasks_per_player) VALUES (?)`, [numTasks], (err) => {
                                    if (err) {
                                        console.error("Error inserting settings:", err);
                                        return res.status(500).send("Failed to insert settings.");
                                    }
                                    res.send("Game started: All players reset, new tasks assigned, settings created.");
                                });
                            }
                    })});
                
                });
            });
        });
    });
});

app.get('/getRole', isAuthenticated, (req, res) => {
    const username = req.session.username;

    db.get(`SELECT role FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) {
            return res.json({ success: false, message: "Error fetching role" });
        }
        res.json({ success: true, role: user.role });
    });
});

app.post('/startmeet', isemAdmin, (req, res) => {
    db.run(`UPDATE settings SET emergency_meeting = 1`, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error starting meeting" });
        }
        res.json({ success: true, message: "Emergency meeting started!" });
    });
});

// End Emergency Meeting (Admin Only)
/*
app.post('/endmeet', isemAdmin, async (req, res) => {
       try {
        const [players] = await db.run(`SELECT username FROM users WHERE role != 'DEAD'`);
        const totalPlayers = players.map(p => p.name);
        const totalVotesPossible = totalPlayers.length;

        const [votes] = await db.run(`SELECT voter, vote_for FROM votes`);
        const tally = {};
        const votedPlayers = new Set();

        for (let { voter, vote_for } of votes) {
            votedPlayers.add(voter);
            const vote = vote_for || 'SKIP';
            tally[vote] = (tally[vote] || 0) + 1;
        }

        const missingVotes = totalPlayers.filter(p => !votedPlayers.has(p));
        for (let missing of missingVotes) {
            tally['SKIP'] = (tally['SKIP'] || 0) + 1;
        }

        let maxVotes = 0;
        let ejectedPlayer = null;

        for (let [name, count] of Object.entries(tally)) {
            if (name !== 'SKIP' && count > maxVotes) {
                maxVotes = count;
                ejectedPlayer = name;
            }
        }

        const skipCount = tally['SKIP'] || 0;

        let resultMessage;
        let ejectedRole = null;

        if (!ejectedPlayer || skipCount >= maxVotes) {
            resultMessage = 'No one was ejected. (Skipped)';
        } else {
            const [[{ role }]] = await db.run(`SELECT role FROM users WHERE username = ?`, [ejectedPlayer]);
            ejectedRole = role;
            await db.query(`UPDATE users SET role = 'DEAD' WHERE username = ?`, [ejectedPlayer]);
            resultMessage = `${ejectedPlayer} was ejected. They were a ${role}.`;
        }

        await db.query(`DELETE FROM votes`);

        res.json({
            message: resultMessage,
            ejected: ejectedPlayer,
            role: ejectedRole // IMPOSTER or CREWMATE
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to end meeting' });
    }

    db.run(`UPDATE settings SET emergency_meeting = 0`, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error ending meeting" });
        }
        res.json({ success: true, message: "Emergency meeting ended!" });
    });
});*/
app.post('/endmeet', isemAdmin, (req, res) => {
    // Get alive player IDs
    db.all(`SELECT id FROM users WHERE role != 'DEAD'`, (err, players) => {
        if (err) return res.status(500).json({ success: false, message: "Error fetching players" });

        const aliveIds = players.map(p => p.id);

        // Get all votes
        db.all(`SELECT voter, vote_for FROM votes`, (err, votes) => {
            if (err) return res.status(500).json({ success: false, message: "Error fetching votes" });

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

            // Count most-voted (excluding SKIP)
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
                db.run(`DELETE FROM votes`);
                db.run(`UPDATE settings SET emergency_meeting = 0`);
                return res.json({
                    success: true,
                    message: "No one was ejected. (Skipped)",
                    ejected: null,
                    role: null
                });
            }

            // Else, someone is ejected
            db.get(`SELECT username, role FROM users WHERE id = ?`, [ejectedPlayerId], (err, user) => {
                if (err || !user) return res.status(500).json({ success: false, message: "Error fetching ejected player" });

                db.run(`UPDATE users SET role = 'DEAD' WHERE id = ?`, [ejectedPlayerId], (err2) => {
                    if (err2) return res.status(500).json({ success: false, message: "Error updating user role" });

                    db.run(`DELETE FROM votes`);
                    db.run(`UPDATE settings SET emergency_meeting = 0`);

                    return res.json({
                        success: true,
                        message: `${user.username} was ejected. They were a ${user.role}.`,
                        ejected: user.username,
                        role: user.role
                    });
                });
            });
        });
    });
});


// Check if meeting is active
app.get('/statusmeet', (req, res) => {
    db.get(`SELECT emergency_meeting FROM settings`, (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error fetching meeting status" });
        }
        res.json({ emergency_meeting: row.emergency_meeting });
    });
});


const getRandomTasks = async () => {
    try {
        const allTasks = await db.all("SELECT * FROM tasks");

        // Shuffle using Fisher-Yates
        for (let i = allTasks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allTasks[i], allTasks[j]] = [allTasks[j], allTasks[i]];
        }

        return allTasks.slice(0, 3);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }
};


/*
app.post('/request-hint', async (req, res) => {
    const { username, taskId } = req.body;

    try {
        // Get the task from the task pool (replace with your actual task fetching logic)
        const task = await db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

        if (!task) {
            return res.status(404).send("Task not found.");
        }

        // Return the hint for the task
        res.json({ success: true, hint: task.hint });
        //res.send({ hint: task.hint });
    } catch (error) {
        console.error("Error fetching hint:", error);
        res.status(500).send("Failed to fetch hint.");
    }
});
*/
app.post('/request-hint', isAuthenticated, (req, res) => {
    const { taskId } = req.body;

    if (!taskId) {
        return res.status(400).json({ success: false, message: "Task ID is required." });
    }

    db.get(`SELECT hint FROM tasks WHERE id = ?`, [taskId], (err, task) => {
        if (err) {
            console.error("Error fetching hint:", err);
            return res.status(500).json({ success: false, message: "Error fetching hint." });
        }

        if (!task || !task.hint) {
            return res.status(404).json({ success: false, message: "Hint not available for this task." });
        }

        res.json({ success: true, hint: task.hint });
    });
});

app.post('/add-task', async (req, res) => {
    const { username, question, answer, hint } = req.body;

    // Optional: Only allow admin to add tasks
    if (username !== 'admin') {
        return res.status(403).send("Only the admin can add tasks.");
    }

    try {
        await db.run(
            `INSERT INTO tasks (question, answer, hint) VALUES (?, ?, ?)`,
            [question, answer, hint]
        );
        res.send("Task added successfully.");
    } catch (error) {
        console.error("Error adding task:", error);
        res.status(500).send("Failed to add task.");
    }
});

app.get('/tasks', async (req, res) => {
    const tasks = await db.all("SELECT * FROM tasks");
    console.log("tasks sent");
    res.json(tasks);
});

app.post('/assign-tasks', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send("Username is required.");
    }

    try {
        const tasks = await assignTasksToPlayer(username);
        res.send({ message: "Tasks assigned.", tasks });
    } catch (error) {
        res.status(500).send("Failed to assign tasks.");
    }
});
app.get('/my-tasks', isAuthenticated, (req, res) => {
    const username = req.session.username;

    db.all(`
        SELECT tasks.id, tasks.question, player_tasks.completed 
        FROM player_tasks 
        JOIN tasks ON player_tasks.task_id = tasks.id 
        WHERE player_tasks.username = ?
    `, [username], (err, rows) => {
        if (err) {
            console.error("Error fetching user tasks:", err);
            return res.status(500).json({ success: false, message: "Error fetching tasks" });
        }

        res.json({ success: true, tasks: rows });
    });
});


app.post('/submit-task', isAuthenticated, (req, res) => {
    const username = req.session.username;
    const { taskId, answer } = req.body;

    if (!taskId || !answer) {
        return res.status(400).json({ success: false, message: "Task ID and answer are required." });
    }

    // Fetch the correct answer for the task
    db.get(`SELECT answer FROM tasks WHERE id = ?`, [taskId], (err, task) => {
        if (err) {
            console.error("Error fetching task:", err);
            return res.status(500).json({ success: false, message: "Error fetching task." });
        }

        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found." });
        }

        // Check if the player's answer matches the correct answer
        if (task.answer.toLowerCase() === answer.toLowerCase()) {
            // Mark the task as completed
            db.run(
                `UPDATE player_tasks SET completed = 1 WHERE username = ? AND task_id = ?`,
                [username, taskId],
                (err) => {
                    if (err) {
                        console.error("Error updating task status:", err);
                        return res.status(500).json({ success: false, message: "Error updating task status." });
                    }

                    res.json({ success: true, message: "Task completed successfully!" });
                }
            );
        } else {
            res.json({ success: false, message: "Incorrect answer. Try again!" });
        }
    });
});

/*
app.get('/check-win', async (req, res) => {
    try {
        // Fetch counts of crewmates and imposters
        const crewmatesRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'CREWMATE'`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const impostersRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'IMPOSTER'`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Fetch total tasks and completed tasks
        const totalTasksRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as total FROM player_tasks`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const completedTasksRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as completed FROM player_tasks WHERE completed = 1`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const crewmates = crewmatesRow.count;
        const imposters = impostersRow.count;
        const totalTasks = totalTasksRow.total;
        const completedTasks = completedTasksRow.completed;

        // Check win conditions
        if (crewmates < imposters) {
            return res.json({ winner: 'IMPOSTERS' });
        }

        if (completedTasks >= totalTasks * 0.75) {
            return res.json({ winner: 'CREWMATES' });
        }

        res.json({ winner: null }); // No winner yet
    } catch (error) {
        console.error("Error checking win conditions:", error);
        res.status(500).json({ error: "Error checking win conditions" });
    }
});*/
/*
app.get('/check-win', async (req, res) => {
    try {
        // Fetch counts of crewmates and imposters
        const crewmatesRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'CREWMATE'`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const impostersRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'IMPOSTER'`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Fetch total and completed tasks
        const totalTasksRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as total FROM player_tasks`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const completedTasksRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as completed FROM player_tasks WHERE completed = 1`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Get alive players and total players
        const alivePlayersRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'CREWMATE'`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const totalPlayersRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const crewmates = crewmatesRow.count;
        const imposters = impostersRow.count;
        const totalTasks = totalTasksRow.total;
        const completedTasks = completedTasksRow.completed;
        const alivePlayers = alivePlayersRow.count;
        const totalPlayers = totalPlayersRow.count;

        // WIN: Imposters outnumber crewmates
        if (crewmates < imposters) {
            return res.json({ winner: 'IMPOSTERS' });
        }

        // WIN: Task completion logic with alive % scaling
        const alivePercent = alivePlayers / totalPlayers;
        let taskThreshold = 0.75;

        if (alivePercent <= 0.30) {
            taskThreshold = 0.50;
        }

        if (completedTasks >= totalTasks * taskThreshold) {
            return res.json({ winner: 'CREWMATES' });
        }

        res.json({ winner: null }); // No winner yet
    } catch (error) {
        console.error("Error checking win conditions:", error);
        res.status(500).json({ error: "Error checking win conditions" });
    }
});
*/
app.get('/check-win', async (req, res) => {
    try {
        // Count current CREWMATES and IMPOSTERS
        const crewmatesRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'CREWMATE'`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const impostersRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'IMPOSTER'`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Get total & completed tasks
        const totalTasksRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as total FROM player_tasks`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const completedTasksRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as completed FROM player_tasks WHERE completed = 1`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Get alive and total player counts
        const alivePlayersRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'CREWMATE'`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const totalPlayersRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Extract data
        const crewmates = crewmatesRow.count;
        const imposters = impostersRow.count;
        const totalTasks = totalTasksRow.total;
        const completedTasks = completedTasksRow.completed;
        const alivePlayers = alivePlayersRow.count;
        const totalPlayers = totalPlayersRow.count;

        // --- Imposter win check ---
        if (crewmates < imposters) {
            return res.json({ winner: 'IMPOSTERS' });
        }

        // --- Scalable task win check ---
         // Fetch tasks_per_player setting from settings table
        const settingsRow = await new Promise((resolve, reject) => {
            db.get(`SELECT tasks_per_player FROM settings ORDER BY id DESC LIMIT 1`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Default fallback if not set
        const baseTasksPerPlayer = settingsRow && settingsRow.tasks_per_player ? settingsRow.tasks_per_player : 10;


        const alivePercent = alivePlayers / totalPlayers;

        // Base requirement scales with alive players
        let taskTarget = baseTasksPerPlayer * alivePlayers;

        // Apply difficulty scaling (makes it slightly harder when more are alive)
        const difficultyModifier = 1 + ((1 - alivePercent) * 0.5); // max 1.5x
        taskTarget = taskTarget * difficultyModifier;

        // Apply minimum and maximum caps
        // Ensure at least 70% of total tasks are required 
        const minRequired = totalTasks * 0.7; // 70% minimum cap
        taskTarget = Math.max(minRequired, taskTarget);
        // Cap task requirement to 90% of all tasks
        const hardCap = totalTasks * 0.9;
        taskTarget = Math.min(taskTarget, hardCap);

        // Final task win check
        if (completedTasks >= taskTarget) {
            return res.json({ winner: 'CREWMATES' });
        }

        // No winner yet
        res.json({ winner: null });

    } catch (error) {
        console.error("Error checking win conditions:", error);
        res.status(500).json({ error: "Error checking win conditions" });
    }
});




app.get('/check-dead', isAuthenticated, (req, res) => {
    const username = req.session.username;

    db.get(`SELECT role FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            console.error("Error checking player status:", err);
            return res.status(500).json({ success: false, message: "Error checking player status" });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // If the player's role is "DEAD", return true
        if (user.role === 'DEAD') {
            return res.json({ isDead: true });
        }

        res.json({ isDead: false });
    });
});

app.post('/convert-crewmates', isemAdmin, async (req, res) => {
    const { count } = req.body;

    if (!count || isNaN(count) || count <= 0) {
        return res.status(400).json({ success: false, message: "Invalid number of imposters specified." });
    }

    try {
        // Fetch all crewmates
        const crewmates = await new Promise((resolve, reject) => {
            db.all(`SELECT username FROM users WHERE role = 'CREWMATE'`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (crewmates.length === 0) {
            return res.status(400).json({ success: false, message: "No crewmates available to convert." });
        }

        // Shuffle the crewmates array and select the required number
        const shuffledCrewmates = crewmates.sort(() => 0.5 - Math.random());
        const selectedCrewmates = shuffledCrewmates.slice(0, Math.min(count, crewmates.length));

        // Convert the selected crewmates into imposters
        const updatePromises = selectedCrewmates.map(crewmate => {
            return new Promise((resolve, reject) => {
                db.run(`UPDATE users SET role = 'IMPOSTER' WHERE username = ?`, [crewmate.username], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        await Promise.all(updatePromises);

        res.json({ success: true, message: `${selectedCrewmates.length} crewmates converted to imposters.` });
    } catch (error) {
        console.error("Error converting crewmates:", error);
        res.status(500).json({ success: false, message: "Error converting crewmates." });
    }
});
/*
app.get('/task-progress', isAuthenticated, async (req, res) => {
    try {
        // Fetch total tasks and completed tasks
        const totalTasksRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as total FROM player_tasks`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const completedTasksRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as completed FROM player_tasks WHERE completed = 1`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const totalTasks = totalTasksRow.total || 0;
        const completedTasks = completedTasksRow.completed || 0;

        // Calculate the percentage of tasks completed
        const percentageCompleted = totalTasks > 0 ? ((completedTasks )/ (totalTasks*0.75)) * 100 : 0;

        res.json({
            totalTasks,
            completedTasks,
            percentageCompleted: percentageCompleted.toFixed(2), // Round to 2 decimal places
        });
    } catch (error) {
        console.error("Error fetching task progress:", error);
        res.status(500).json({ error: "Error fetching task progress" });
    }
});*/
app.get('/task-progress', isAuthenticated, async (req, res) => {
    try {
        // Fetch tasks_per_player from settings (latest row)
        const settingsRow = await new Promise((resolve, reject) => {
            db.get(`SELECT tasks_per_player FROM settings ORDER BY id DESC LIMIT 1`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Default fallback if not set
        const baseTasksPerPlayer = settingsRow && settingsRow.tasks_per_player ? settingsRow.tasks_per_player : 10;

        // Fetch alive and total players count
        const alivePlayersRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'CREWMATE'`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const totalPlayersRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const alivePlayers = alivePlayersRow.count || 0;
        const totalPlayers = totalPlayersRow.count || 1; // prevent division by zero

        // Fetch total and completed player tasks
        const totalTasksRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as total FROM player_tasks`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const completedTasksRow = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as completed FROM player_tasks WHERE completed = 1`, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const totalTasks = totalTasksRow.total || 0;
        const completedTasks = completedTasksRow.completed || 0;

        // Calculate task target dynamically, same as /check-win logic
        const alivePercent = alivePlayers / totalPlayers;

        let taskTarget = baseTasksPerPlayer * alivePlayers;
        const difficultyModifier = 1 + ((1 - alivePercent) * 0.5); // max 1.5x
        taskTarget = taskTarget * difficultyModifier;

        // Cap at 90% of total tasks
        const hardCap = totalTasks * 0.9;
        taskTarget = Math.min(taskTarget, hardCap);

        // Calculate percentage relative to the dynamic task target
        const percentageCompleted = taskTarget > 0 ? (completedTasks / taskTarget) * 100 : 0;

        res.json({
            totalTasks,
            completedTasks,
            taskTarget: Math.round(taskTarget),
            percentageCompleted: percentageCompleted.toFixed(2), // rounded to 2 decimals
        });
    } catch (error) {
        console.error("Error fetching task progress:", error);
        res.status(500).json({ error: "Error fetching task progress" });
    }
});



app.get('/players', (req, res) => {
  db.all(`SELECT id, username FROM users WHERE role != 'DEAD' ORDER BY username ASC`, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch players" });
    res.json({ players: rows });
  });
});

app.post('/vote', (req, res) => {
  const voterId = parseInt(req.session.userId); // or however you're storing user ID
  const voteForId = parseInt(req.body.vote_for) ?? null;

  if (!voterId) return res.status(403).json({ error: "Not authenticated" });

  db.run(`DELETE FROM votes WHERE voter = ?`, [voterId], () => {
    db.run(`INSERT INTO votes (voter, vote_for) VALUES (?, ?)`, [voterId, voteForId], (err) => {
      if (err) return res.status(500).json({ error: "Failed to record vote" });
      res.json({ message: "Vote submitted successfully" });
    });
  });
});


// Start server
const kill = require('kill-port');

// Function to kill the port and start the server
async function startServer() {
    try {
        await kill(port); // Kill the port if it's occupied
        console.log(`Port ${port} is now free.`);
        clearLocationData();
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
