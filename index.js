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

// User Schema (Updated with Roles as per Figma "Join us as" screen)
const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['freelancer', 'employer'], default: 'freelancer' },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Work Schema (Updated to match Figma filtering fields)
const workSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true }, // e.g., 'Graphic Design', 'Medical Assistance'
    price: { type: Number, required: true },
    location: { type: String, required: true }, // e.g., 'Alger', 'Medea'
    imageUrl: { type: String }, 
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});
const Work = mongoose.model('Work', workSchema);

// Bid Schema (New: To allow Freelancers to "Apply Now")
const BidSchema = new mongoose.Schema({
    workId: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bidAmount: { type: Number, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});
const Bid = mongoose.model('Bid', BidSchema);

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
        const { fullName, email, password, role } = req.body;
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({ 
            fullName, 
            email, 
            password: hashedPassword,
            role: role || 'freelancer' // Default to freelancer if role not provided
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
            
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ 
            token, 
            user: { id: user._id, fullName: user.fullName, role: user.role } 
        });
    } catch (err) { 
        res.status(500).json({ error: "Login process failed" }); 
    }
});

/** * WORKS/PROJECTS ROUTES (Updated with Advanced Filtering)
 */

// @route   GET /api/works
// @desc    Get all works with filters (Matches Figma Sidebar & Search Bar)
app.get('/api/works', async (req, res) => {
    try {
        const { category, city, minPrice, maxPrice, search } = req.query;
        let filter = {};

        if (category) filter.category = category;
        if (city) filter.location = { $regex: city, $options: 'i' };
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const works = await Work.find(filter).populate('owner', 'fullName email').sort({ createdAt: -1 });
        res.status(200).json(works); 
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch works" });
    }
});

app.post('/api/works', verifyToken, upload.single('image'), async (req, res) => {
    try {
        // Only Employers should post projects according to Figma logic
        if (req.user.role !== 'employer') {
            return res.status(403).json({ error: "Only employers can post projects" });
        }

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

/** * BIDDING SYSTEM ROUTES (New: For Figma "Apply Now" button)
 */

// @route   POST /api/bids
// @desc    Freelancer applies for a project
app.post('/api/bids', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'freelancer') {
            return res.status(403).json({ error: "Only freelancers can apply for work" });
        }

        const { workId, bidAmount, message } = req.body;
        const newBid = new Bid({
            workId,
            freelancerId: req.user.id,
            bidAmount,
            message
        });

        await newBid.save();
        res.status(201).json({ message: "Application sent successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to send bid" });
    }
});

/** * STATS ROUTE (Updated for Figma "500+ Freelancers" display)
 */
app.get('/api/stats', async (req, res) => {
    try {
        const freelancerCount = await User.countDocuments({ role: 'freelancer' });
        const totalWorks = await Work.countDocuments();
        res.json({ 
            freelancers: freelancerCount, 
            worksPosted: totalWorks 
        });
    } catch (err) { 
        res.status(500).json({ error: "Failed to fetch stats" }); 
    }
});

// --- 7. Start Server ---
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));