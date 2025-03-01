const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./db");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createContentHash, advancedDocumentMatching } = require("./utils");

const SECRET_KEY = "your_secure_secret";
const path = require("path");

const app = express();
app.use(express.json());
app.use(fileUpload());
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5001"], credentials: true }));
app.use(express.static("public"));

// ✅ Authentication Middleware
function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        req.user = jwt.verify(token, SECRET_KEY);
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
        if (!user) return res.status(401).json({ message: "User not found" });
        req.user = user;
        next();
    } catch {
        return res.status(403).json({ message: "Invalid token" });
    }
}

function authenticateAdmin(req, res, next) {
    authenticate(req, res, () => {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }
        next();
    });
}

// ✅ User Authentication Routes
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (existingUser) return res.status(400).json({ message: "User already exists!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare("INSERT INTO users (name, email, password, role, credits, last_reset) VALUES (?, ?, ?, 'user', 20, DATE('now'))")
        .run(name, email, hashedPassword);

    res.json({ success: true, message: "Registered successfully!" });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) return res.status(404).json({ message: "User not found!" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid password!" });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: "1h" });

    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, credits: user.credits } });
});

// ✅ Profile Route
app.get("/api/profile", authenticate, (req, res) => {
    const user = db.prepare("SELECT name, email, credits FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
});

// ✅ Document Scanning Route
app.post("/scan", authenticate, (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

    if (user.credits < 1) {
        return res.status(403).json({ message: "No credits left. Request more or wait for daily reset." });
    }

    db.prepare("UPDATE users SET credits = credits - 1 WHERE id = ?").run(user.id);
    const updatedUser = db.prepare("SELECT credits FROM users WHERE id = ?").get(user.id);

    res.json({ success: true, remainingCredits: updatedUser.credits });
});

// ✅ Admin Dashboard Routes
app.get("/admin", authenticateAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.get("/admin/credit-requests", authenticateAdmin, (req, res) => {
    const requests = db.prepare("SELECT * FROM credit_requests WHERE status = 'pending'").all();
    res.json(requests);
});

app.get("/admin/users", authenticateAdmin, (req, res) => {
    const users = db.prepare("SELECT id, name, email, credits FROM users").all();
    res.json(users);
});

app.get("/admin/credit-requests", authenticateAdmin, (req, res) => {
    const requests = db.prepare("SELECT * FROM credit_requests WHERE status = 'pending'").all();
    res.json(requests);
});

app.post("/admin/approve", authenticateAdmin, (req, res) => {
    const { requestId, approve } = req.body;
    const request = db.prepare("SELECT * FROM credit_requests WHERE id = ?").get(requestId);

    if (approve) {
        db.prepare("UPDATE users SET credits = credits + ? WHERE id = ?").run(request.amount, request.user_id);
    }

    db.prepare("UPDATE credit_requests SET status = ? WHERE id = ?").run(approve ? "approved" : "denied", requestId);
    res.json({ success: true });
});

// ✅ Static Page Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/profile", (req, res) => res.sendFile(path.join(__dirname, "public", "profile.html")));
app.get("/scan", (req, res) => res.sendFile(path.join(__dirname, "public", "upload.html")));

// ✅ 404 Handler
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// ✅ Start Server
const PORT = 5001;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
