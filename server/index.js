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


const app = express();
app.use(cors());
app.use(express.json());

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



mongoose.connect(process.env.MONGODB_URI)
.then(async () => {console.log('MongoDB connected')
    await ensureSeedAdmin();
})
.catch((err) => {console.error('MongoDB connection error:', err)
});


const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
