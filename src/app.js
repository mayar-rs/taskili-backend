const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');

// Initialize app
const app = express();

// Security and utility middlewares
app.use(cors());
app.use(helmet());
// helmet blocks cross-origin resources. we need to allow image uploads rendering
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static Folders
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));

// 404 & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
