const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'MY_SECRET_KEY_2026';

// --- 1. Middlewares ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded images publicly

// --- 2. Database Connection ---
mongoose.connect('mongodb://localhost:27017/taskili_db')
    .then(() => console.log('Connected to MongoDB Successfully!'))
    .catch(err => console.error('Database connection error:', err));

// --- 3. Image Upload Setup (Multer) ---
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- 4. Database Models ---

// User Schema
const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Work Schema 
const workSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    imageUrl: { type: String }, 
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});
const Work = mongoose.model('Work', workSchema);

// --- 5. Security Middleware ---
const verifyToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: "Access Denied! No token provided." });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; 
        next();
    } catch (err) {
        res.status(400).json({ error: "Invalid Token!" });
    }
};

// --- 6. API Routes ---

/** * AUTHENTICATION ROUTES
 */
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
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) { 
        res.status(500).json({ error: "Registration failed: Email might already exist" }); 
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) 
            return res.status(400).json({ error: "Invalid email or password" });
            
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, user: { id: user._id, fullName: user.fullName } });
    } catch (err) { 
        res.status(500).json({ error: "Login process failed" }); 
    }
});

/** * WORKS/PROJECTS ROUTES
 */

// @route   POST /api/works
// @desc    Create a new work post with an image
app.post('/api/works', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { title, description, category, price, location } = req.body;
        const newWork = new Work({
            title, description, category, price, location,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
            owner: req.user.id 
        });
        const savedWork = await newWork.save();
        res.status(201).json(savedWork);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// @route   GET /api/works
// @desc    Get all works with owner details
app.get('/api/works', async (req, res) => {
    try {
        const works = await Work.find().populate('owner', 'fullName email');
        res.status(200).json(works); 
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch works" });
    }
});

// @route   PUT /api/works/:id
// @desc    Update a specific work (Only by owner)
app.put('/api/works/:id', verifyToken, async (req, res) => {
    try {
        const work = await Work.findById(req.params.id);
        
        if (!work) return res.status(404).json({ error: "Work not found" });

        // Check ownership
        if (work.owner.toString() !== req.user.id) 
            return res.status(403).json({ error: "Unauthorized: You can only update your own work" });

        const updatedWork = await Work.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedWork);
    } catch (err) { 
        res.status(500).json({ error: "Update operation failed" }); 
    }
});

// @route   DELETE /api/works/:id
// @desc    Delete a specific work (Only by owner)
app.delete('/api/works/:id', verifyToken, async (req, res) => {
    try {
        const work = await Work.findById(req.params.id);
        
        if (!work) return res.status(404).json({ error: "Work not found" });

        // Authorization check: Owner only
        if (work.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized: You cannot delete this work" });
        }

        await Work.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Work deleted successfully" });
    } catch (err) { 
        res.status(500).json({ error: "Delete operation failed" }); 
    }
});

/** * DASHBOARD ROUTES
 */
app.get('/api/stats', verifyToken, async (req, res) => {
    try {
        const myCount = await Work.countDocuments({ owner: req.user.id });
        const totalCount = await Work.countDocuments();
        res.json({ myProjects: myCount, totalMarket: totalCount });
    } catch (err) { 
        res.status(500).json({ error: "Failed to fetch stats" }); 
    }
});

// --- 7. Start Server ---
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));