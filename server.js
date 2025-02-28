const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;

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
    role TEXT DEFAULT "CREWMATE"
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

    db.get(`SELECT latitude, longitude FROM locations WHERE username = ?`, [username], (err, player) => {
        if (err || !player) {
            console.error("Error fetching player location:", err);
            return res.json({ count: 0, players: [] });
        }

        const { latitude, longitude } = player;

        db.all(`
            SELECT username, distance FROM (
                SELECT username, latitude, longitude,
                (6371 * acos(
                    cos(radians(?)) * cos(radians(latitude)) * 
                    cos(radians(longitude) - radians(?)) + 
                    sin(radians(?)) * sin(radians(latitude))
                )) AS distance
                FROM locations
                WHERE username != ?
            ) WHERE distance <= 0.010
        `, [latitude, longitude, latitude, username], (err, rows) => {
            if (err) {
                console.error("Error fetching nearby players:", err.message);
                return res.json({ count: 0, players: [] });
            }

            //console.log("Nearby Players Found:", rows);
            res.json({
                count: rows.length,
                players: rows.map(player => player.username)
            });
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
