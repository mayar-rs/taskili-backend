const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'MY_SECRET_KEY_2026';

// --- 1. Middlewares ---
app.use(cors());
app.use(express.json());

// --- 2. Database Connection ---
mongoose.connect('mongodb://localhost:27017/taskili_db')
    .then(() => console.log('Connected to MongoDB Successfully!'))
    .catch(err => console.error('Database connection error:', err));

// --- 3. Database Schemas & Models ---

// User Schema for Authentication
const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Work Schema for Projects 
const workSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String, // e.g., 'Health Care', 'Education', 'House'
    required: true
  },
  price: {
    type: Number, // Displayed as DA in the frontend (e.g., 3000)
    required: true
  },
  location: {
    type: String, // Matches the city/commune in design (e.g., 'Alger, Hydra')
    required: true
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Reference to the user who posted the task
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now // Automatically sets the posting date
  }
});

const Work = mongoose.model('Work', workSchema);

// --- 4. Security Middleware (JWT Verification) ---
const verifyToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: "Access Denied! Token missing." });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; 
        next();
    } catch (err) {
        res.status(400).json({ error: "Invalid Token!" });
    }
};

// --- 5. API Routes ---

// AUTH: Register a new user
app.post('/api/register', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        const newUser = new User({
            fullName: req.body.fullName,
            email: req.body.email,
            password: hashedPassword 
        });
        await newUser.save();
        res.status(201).json({ message: "User registered securely!" });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: "Email already exists" });
        res.status(500).json({ error: "Registration failed" });
    }
});

// AUTH: User Login
app.post('/api/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(400).json({ error: "Invalid Email or Password" });

        const validPass = await bcrypt.compare(req.body.password, user.password);
        if (!validPass) return res.status(400).json({ error: "Invalid Email or Password" });

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '2h' });
        res.status(200).json({ token, user: { id: user._id, fullName: user.fullName } });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

// PROFILE: Get logged-in user details
app.get('/api/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch profile" });
    }
});

// PROJECTS: Get All Projects + Search functionality
app.get('/api/works', async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } }
                ]
            };
        }
        const works = await Work.find(query).populate('createdBy', 'fullName');
        res.json(works);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

// PROJECTS: Get a single project by ID
app.get('/api/works/:id', async (req, res) => {
    try {
        const project = await Work.findById(req.params.id).populate('createdBy', 'fullName');
        if (!project) return res.status(404).json({ error: "Project not found" });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: "Error fetching project details" });
    }
});

// PROJECTS: Create a new task (Protected)
app.post('/api/works', verifyToken, async (req, res) => {
    try {
        const { title, description, category, price, location } = req.body;

        const newWork = new Work({
            title,
            description,
            category,
            price, 
            location, 
            owner: req.user.id // Taken from the verified JWT token
        });

        const savedWork = await newWork.save();
        res.status(201).json(savedWork);
    } catch (err) {
        res.status(500).json({ message: "Error creating task", error: err.message });
    }
});

// PROJECTS: Update a project (Owner only)
app.put('/api/works/:id', verifyToken, async (req, res) => {
    try {
        const project = await Work.findById(req.params.id);
        if (!project) return res.status(404).json({ error: "Project not found" });
        if (project.createdBy.toString() !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

        const { title, description, status, highestBid, category, imageUrl } = req.body;
        const updated = await Work.findByIdAndUpdate(
            req.params.id, 
            { title, description, status, highestBid, category, imageUrl }, 
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
});

// PROJECTS: Delete a project (Owner only)
app.delete('/api/works/:id', verifyToken, async (req, res) => {
    try {
        const project = await Work.findById(req.params.id);
        if (!project) return res.status(404).json({ error: "Project not found" });
        if (project.createdBy.toString() !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

        await Work.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Delete failed" });
    }
});

// DASHBOARD: Get User Statistics
app.get('/api/stats', verifyToken, async (req, res) => {
    try {
        const myProjectsCount = await Work.countDocuments({ createdBy: req.user.id });
        const allProjectsCount = await Work.countDocuments();
        res.json({
            myProjectsCount,
            totalMarketProjects: allProjectsCount
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

// --- 6. Start Server ---
app.listen(PORT, () => {
    console.log(` Server is running at http://localhost:${PORT}`);
    console.log(` API Base URL: http://localhost:${PORT}/api`);
});