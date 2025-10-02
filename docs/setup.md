# RLAMONGUS Setup Guide

This guide will walk you through installing, configuring, and running RLAMONGUS, a location-based multiplayer game inspired by Among Us.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Database Initialization](#database-initialization)
6. [Running the Server](#running-the-server)
7. [Troubleshooting](#troubleshooting)
8. [Customization](#customization)
9. [ONLINE Third Party HOSTS](#thirdparty)
10. [FAQ](#faq)

---

## 1. Prerequisites

- **Node.js** (v16 or newer): [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)
- **Linux** (recommended, but works on Mac/Windows)
- **A modern web browser** (Chrome, Firefox, Edge, etc.)

No manual installation of SQLite is required; the app uses a local file.

---

## 2. Project Structure

```
rlamongus/
├── server.js           # Main server file
├── db.sqlite           # SQLite database (auto-created)
├── package.json        # Node.js dependencies
├── public/             # Static files (HTML, CSS, JS)
├── views/              # EJS templates (error page)
├── docs/               # Documentation
└── ...
```

---

## 3. Installation

### Clone the Repository

```sh
gh repo clone factsrohit/rlamongus
cd rlamongus
```

### Install Dependencies

```sh
npm install
```

---

## 4. Configuration

- **Port:** Default is `3000`. Change in `server.js` if needed.
- **Session Secret:** Change `'your-secret-key'` in `server.js` for production.
- **Admin Credentials:** Default username/password is `admin`/`admin`. Change in `server.js` for security.

---

## 5. Database Initialization

- On first run, the server creates `db.sqlite` and all required tables.
- A default admin user is inserted if not present.
- Tasks, settings, and other tables are auto-initialized.

**No manual steps required.**

---

## 6. Running the Server

Start the server:

```sh
node server.js
```

- If port 3000 is busy, the server will attempt to free it automatically.
- The server logs database and startup status.

Access the game at [http://localhost:3000](http://localhost:3000).

---


## 7. Troubleshooting
- **Database errors:** Just restart via ```node server.js``` restarting 2-3 times should auto fix any errors(yes, its intended). 
- **Port Busy:** The server kills the process on port 3000 automatically.
- **Database Errors:** Delete `db.sqlite` and restart the server.
- **Session Issues:** Clear browser cookies or restart the server.
- **Static Files Not Loading:** Ensure `public/` folder exists and contains HTML/JS.

---

## 8. Customization

- **Change Port:** Edit `const port = 3000;` in `server.js`.
- **Change Admin Credentials:** Edit `adminUsername` and `adminPassword` in `server.js`.
- **Add More Tasks:** Use the admin dashboard or POST to `/add-task`.
- **Change Kill Range/Cooldown:** Edit `KILL_RANGE` and `COOLDOWN_TIME` in `server.js`.

---


## 9. thirdparty
- **How to Host a game?** simply follow the same steps same as local hosting, run the server and your host site should automatically forward the port.
- **Recommended Site:** [`replit.com`](https://replit.com) , [`github codespaces`](https://github.com/codespaces). 
---

## 10. FAQ

**Q: How do I reset the game?**  
A: Use the "Start Game" button in the admin dashboard.

**Q: How do I add new tasks?**  
A: Use the admin dashboard or POST to `/add-task`.

**Q: How do I change the admin password?**  
A: Edit `server.js` and restart the server.

**Q: Can I run this on a remote server?**  
A: Yes, but ensure port 3000 is open and update session secret for security.

---

## License

See [`LICENSE`](../LICENSE) for GPLv3 terms.

---

**For further help, open an issue or contact the maintainer.**
