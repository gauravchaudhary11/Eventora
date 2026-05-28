const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const mongoose=require('mongoose');
const authRoutes=require('./routes/auth');
const eventRoutes=require('./routes/events');
const bookingRoutes=require('./routes/bookings');
const userRoutes=require('./routes/users');
const { ensureSeedAdmin } = require('./utils/seedAdmin');

const rawMongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';
const mongoUri = rawMongoUri.trim().replace(/^["']|["']$/g, '');
const isValidMongoUri = /^mongodb(\+srv)?:\/\//i.test(mongoUri);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Eventora API',
        message: 'Backend is running. Use /api/health for health check and /api/* for endpoints.'
    });
});

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Eventora API',
        uptime: Math.round(process.uptime())
    });
});

// routes
app.use('/api/auth', authRoutes);
app.use('/api/events',eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);



if (!mongoUri) {
    console.error('MongoDB connection error: MONGODB_URI is missing.');
} else if (!isValidMongoUri) {
    console.error('MongoDB connection error: MONGODB_URI must start with mongodb:// or mongodb+srv://');
} else {
    mongoose.connect(mongoUri)
    .then(async () => {
        console.log('MongoDB connected');
        await ensureSeedAdmin();
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });
}


const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
