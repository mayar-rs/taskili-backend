const dotenv = require('dotenv');
const app = require('./app');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
});
