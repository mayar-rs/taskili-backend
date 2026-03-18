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
app.use('/uploads', express.static('uploads')); 

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

// User Model
const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['freelancer', 'employer'], default: 'freelancer' },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Work/Project Model
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

// Bidding Model
const BidSchema = new mongoose.Schema({
    workId: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bidAmount: { type: Number, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});
const Bid = mongoose.model('Bid', BidSchema);

// --- 5. Security & Validation Middlewares ---

// Authentication Guard
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

// Input Validation for Posts
const validateWorkInput = (req, res, next) => {
    const { title, price, category, location } = req.body;
    if (!title || title.length < 5) return res.status(400).json({ error: "Title is too short" });
    if (!price || price <= 0) return res.status(400).json({ error: "Valid price is required" });
    if (!category || !location) return res.status(400).json({ error: "Category and Location are required" });
    next();
};

// --- 6. API Routes ---

/** * AUTHENTICATION 
 */
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({ fullName, email, password: hashedPassword, role });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) { 
        res.status(500).json({ error: "Registration failed: Email exists" }); 
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) 
            return res.status(400).json({ error: "Invalid credentials" });
            
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, user: { id: user._id, fullName: user.fullName, role: user.role } });
    } catch (err) { 
        res.status(500).json({ error: "Login failed" }); 
    }
});

/** * WORKS & FILTERING (Matches Figma Search/Filter Sidebar)
 */
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
        res.json(works); 
    } catch (error) {
        res.status(500).json({ error: "Search failed" });
    }
});

app.post('/api/works', verifyToken, upload.single('image'), validateWorkInput, async (req, res) => {
    try {
        if (req.user.role !== 'employer') return res.status(403).json({ error: "Only employers can post" });

        const newWork = new Work({
            ...req.body,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
            owner: req.user.id 
        });
        await newWork.save();
        res.status(201).json(newWork);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/** * USER PROFILE 
 */
app.get('/api/users/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) { res.status(500).json({ error: "Profile fetch failed" }); }
});

app.put('/api/users/profile', verifyToken, async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, { new: true }).select('-password');
        res.json(updatedUser);
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

/** * BIDDING SYSTEM 
 */
app.post('/api/bids', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'freelancer') return res.status(403).json({ error: "Only freelancers apply" });
        const newBid = new Bid({ ...req.body, freelancerId: req.user.id });
        await newBid.save();
        res.status(201).json({ message: "Bid sent!" });
    } catch (err) { res.status(500).json({ error: "Bidding failed" }); }
});

// For Freelancers to see where they applied
app.get('/api/bids/my-applications', verifyToken, async (req, res) => {
    try {
        const bids = await Bid.find({ freelancerId: req.user.id }).populate('workId').sort({ createdAt: -1 });
        res.json(bids);
    } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

// For Employers to see who applied to their works
app.get('/api/bids/incoming', verifyToken, async (req, res) => {
    try {
        const myWorks = await Work.find({ owner: req.user.id });
        const bids = await Bid.find({ workId: { $in: myWorks.map(w => w._id) } })
            .populate('workId freelancerId', 'title fullName email');
        res.json(bids);
    } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

app.patch('/api/bids/:bidId/status', verifyToken, async (req, res) => {
    try {
        const updatedBid = await Bid.findByIdAndUpdate(req.params.bidId, { status: req.body.status }, { new: true });
        res.json(updatedBid);
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

/** * ANALYTICS & STATS 
 */
app.get('/api/stats', async (req, res) => {
    try {
        const freelancers = await User.countDocuments({ role: 'freelancer' });
        const works = await Work.countDocuments();
        res.json({ freelancers, works });
    } catch (err) { res.status(500).json({ error: "Stats failed" }); }
});

// Global Error Handler
app.use((err, req, res, next) => {
    res.status(500).json({ error: "Internal Server Error", details: err.message });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));