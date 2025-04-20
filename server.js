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

// Set up database
const db = new sqlite3.Database('db.sqlite', (err) => {
    if (err) console.error(err.message);
    console.log("Connected to SQLite database.");
});

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
db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emergency_meeting INTEGER DEFAULT 0
);
INSERT INTO settings (emergency_meeting) VALUES (0);
`);
db.run(`
    CREATE TABLE IF NOT EXISTS player_tasks (
        username TEXT NOT NULL,
        task_id INTEGER NOT NULL,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
    )
`);

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
        db.all(`SELECT username, latitude, longitude FROM locations WHERE username != ?`, [username], (err, rows) => {
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
                        res.json({ success: true, message: `${victim.username} is now an imposter!` });
                    });
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
                        for (let i = 0; i < 3; i++) {
                            const randomTask = allTasks[Math.floor(Math.random() * allTasks.length)];
                            insertStmt.run(player.username, randomTask.id);
                        }
                    });

                    insertStmt.finalize();

                    res.send("Game started: All players reset and new tasks assigned.");
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
app.post('/endmeet', isemAdmin, (req, res) => {
    db.run(`UPDATE settings SET emergency_meeting = 0`, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error ending meeting" });
        }
        res.json({ success: true, message: "Emergency meeting ended!" });
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



app.post('/request-hint', async (req, res) => {
    const { username, taskId } = req.body;

    try {
        // Get the task from the task pool (replace with your actual task fetching logic)
        const task = await db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

        if (!task) {
            return res.status(404).send("Task not found.");
        }

        // Return the hint for the task
        res.send({ hint: task.hint });
    } catch (error) {
        console.error("Error fetching hint:", error);
        res.status(500).send("Failed to fetch hint.");
    }
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
