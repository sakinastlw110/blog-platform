const express = require("express");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.static("public"));
app.get("/test", (req, res) => {
    res.send("TEST WORKS");
});
app.use(express.json());
app.use(cors());

const SECRET = "blogsecret";

function readData(file) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, "[]");
    }
    return JSON.parse(fs.readFileSync(file));
}

function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Register
app.post("/register", async (req, res) => {
    const users = readData("users.json");

    const { username, password } = req.body;

    if (users.find(u => u.username === username))
        return res.status(400).json({ message: "User exists" });

    const hashed = await bcrypt.hash(password, 10);

    users.push({
        id: Date.now(),
        username,
        password: hashed
    });

    writeData("users.json", users);

    res.json({ message: "Registered successfully" });
});

// Login
app.post("/login", async (req, res) => {
    const users = readData("users.json");

    const { username, password } = req.body;

    const user = users.find(u => u.username === username);

    if (!user)
        return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);

    if (!valid)
        return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
        { id: user.id, username: user.username },
        SECRET
    );

    res.json({ token });
});

function auth(req, res, next) {
    const header = req.headers.authorization;

    if (!header)
        return res.sendStatus(401);

    const token = header.split(" ")[1];

    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.sendStatus(403);
    }
}

// Create Post
app.post("/posts", auth, (req, res) => {
    const posts = readData("posts.json");

    const post = {
        id: Date.now(),
        title: req.body.title,
        content: req.body.content,
        author: req.user.username
    };

    posts.push(post);

    writeData("posts.json", posts);

    res.json(post);
});

// Get Posts
app.get("/posts", (req, res) => {
    res.json(readData("posts.json"));
});

// Update Post
app.put("/posts/:id", auth, (req, res) => {
    let posts = readData("posts.json");

    posts = posts.map(post =>
        post.id == req.params.id
            ? {
                  ...post,
                  title: req.body.title,
                  content: req.body.content
              }
            : post
    );

    writeData("posts.json", posts);

    res.json({ message: "Updated" });
});

// Delete Post
app.delete("/posts/:id", auth, (req, res) => {
    const posts = readData("posts.json");

    const updated = posts.filter(
        post => post.id != req.params.id
    );

    writeData("posts.json", updated);

    res.json({ message: "Deleted" });
});

// Add Comment
app.post("/comments", auth, (req, res) => {
    const comments = readData("comments.json");

    const comment = {
        id: Date.now(),
        postId: req.body.postId,
        text: req.body.text,
        user: req.user.username
    };

    comments.push(comment);

    writeData("comments.json", comments);

    res.json(comment);
});

// Get Comments
app.get("/comments/:postId", (req, res) => {
    const comments = readData("comments.json");

    res.json(
        comments.filter(
            c => c.postId == req.params.postId
        )
    );
});

app.listen(3000, () =>
    console.log("Server running on port 3000")
);