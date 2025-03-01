const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;

const KILL_RANGE = 0.010; // ~7 meters
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

// Authentication Middleware
function isAuthenticated(req, res, next) {
    if (req.session.username) return next();
    res.redirect('/');
}

// Routes
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.send("Error hashing password.");
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hash], (err) => {
            if (err) return res.send("User already exists.");
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

        // Correct bcrypt comparison
        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error("Bcrypt error:", err);
                return res.send("Error checking password.");
            }

            if (result) {
                req.session.username = username;
                res.redirect('/dashboard');
            } else {
                res.send("Invalid password.");
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

/*
app.post('/update-location', (req, res) => {
    const { latitude, longitude } = req.body;
    const username = req.session.username;

    console.log("📌 Incoming Data:", { username, latitude, longitude });

    if (!username) {
        console.error("❌ Not logged in - session username missing");
        return res.status(401).send("Not logged in");
    }

    db.run(
        `INSERT INTO locations (username, latitude, longitude) VALUES (?, ?, ?)
         ON CONFLICT(username) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude`,
        [username, latitude, longitude],
        (err) => {
            if (err) {
                console.error("❌ Database error:", err.message);
                return res.status(500).send("Error updating location");
            }
            console.log("✅ Location updated successfully!");
            res.send("Location updated");
        }
    );
});*/


app.post('/clear-users', (req, res) => {
    const username = req.session.username;
    
    if (!username || username !== 'admin') {
        return res.status(403).send("Access Denied");
    }

    db.run(`DELETE FROM users WHERE username != 'admin'`, (err) => {
        if (err) {
            console.error("Error clearing users:", err);
            return res.status(500).send("Error clearing users");
        }
        
    });
    db.run(`DELETE FROM LOCATIONS WHERE username != 'admin'`, (err) => {
        if (err) {
            console.error("Error clearing users:", err);
            return res.status(500).send("Error clearing users");
        }
        res.send("All users (except admin) have been deleted");
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
/*
app.get('/nearby-players', (req, res) => {
    const username = req.session.username;
    if (!username) return res.status(401).send("Not logged in");

    db.get(`SELECT latitude, longitude FROM locations WHERE username = ?`, [username], (err, player) => {
        if (err || !player) {
            console.error("Error fetching player location:", err);
            return res.json({ count: 0, players: [] });
        }

        const { latitude, longitude } = player;
        const range = 0.0001 * 7; // Rough bounding box for 7 meters

        db.all(`
            SELECT username, latitude, longitude
            FROM locations
            WHERE username != ?
            AND latitude BETWEEN ? AND ?
            AND longitude BETWEEN ? AND ?
        `, [username, latitude - range, latitude + range, longitude - range, longitude + range], (err, rows) => {
            if (err) {
                console.error("Error fetching nearby players:", err);
                return res.json({ count: 0, players: [] });
            }
            console.log("Players found in bounding box:", rows);


            // Final filtering in JavaScript using Haversine formula
            const nearbyPlayers = rows.filter(other => {
                return getDistance(latitude, longitude, other.latitude, other.longitude) <= 7; // 7 meters
            });
            console.log("Final nearby players:", nearbyPlayers);
            res.json({ 
                count: nearbyPlayers.length, 
                players: nearbyPlayers.map(player => player.username) 
            });
        });
    });
});*/
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

    db.get(`SELECT role, last_kill_time FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(500).send("Error fetching user");
        if (user.role !== "TERIMPOS") return res.status(403).send("Only imposters can kill");
        if (now - user.last_kill_time < COOLDOWN_TIME) return res.status(403).send("Kill on cooldown");

        db.get(`SELECT latitude, longitude FROM locations WHERE username = ?`, [username], (err, imposter) => {
            if (err || !imposter) return res.status(500).send("Error fetching location");

            db.get(`
                SELECT username, 
                (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians(?)) + 
                sin(radians(?)) * sin(radians(latitude)))) AS distance
                FROM locations 
                JOIN users ON locations.username = users.username
                WHERE users.role = "CREWMATE"
                ORDER BY distance ASC LIMIT 1
            `, [imposter.latitude, imposter.longitude, imposter.latitude], (err, victim) => {
                if (err || !victim || victim.distance > KILL_RANGE) {
                    return res.status(404).send("No crewmate in range");
                }

                db.run(`UPDATE users SET role = "IMPOSTER" WHERE username = ?`, [victim.username], (err) => {
                    if (err) return res.status(500).send("Error updating victim");
                    
                    db.run(`UPDATE users SET last_kill_time = ? WHERE username = ?`, [now, username], (err) => {
                        if (err) return res.status(500).send("Error updating cooldown");
                        res.json({ success: true, message: `${victim.username} is now an imposter!` });
                    });
                });
            });
        });
    });
});

// Get Dashboard Stats
app.get('/statboard', isAuthenticated, (req, res) => {
    db.all(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`, (err, rows) => {
        if (err) return res.status(500).send("Error fetching data");

        let total = 0, imposters = 0;
        rows.forEach(row => {
            total += row.count;
            if (row.role === "IMPOSTER") imposters = row.count;
        });

        res.json({ totalPlayers: total, imposters });
    });
});

app.get('/game-status', async (req, res) => {
    try {
        
        const crewmates = await db.get(`SELECT COUNT(*) as count FROM users WHERE role = "CREWMATE"`);
        const imposters = await db.get(`SELECT COUNT(*) as count FROM users WHERE role = "IMPOSTER"`);

        res.json({ 
            crewmates: crewmates?.count || 0, 
            imposters: imposters?.count || 0 
        });
    } catch (error) {
        console.error("Error fetching game status:", error);
        res.status(500).json({ error: "Error retrieving game status" });
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
