const User = require('../models/User');

exports.ensureSeedAdmin = async () => {
    const email = process.env.ADMIN_SEED_EMAIL;
    const password = process.env.ADMIN_SEED_PASSWORD;
    const name = process.env.ADMIN_SEED_NAME || 'Eventora Admin';

    if (!email || !password) {
        return;
    }

    if (password === 'Admin@123456' || password.length < 12) {
        console.warn('Seed admin skipped: choose a stronger ADMIN_SEED_PASSWORD.');
        return;
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
        await User.create({
            name,
            email,
            password,
            role: 'admin',
            isVerified: true,
        });
        console.log(`Seed admin created for ${email}`);
        return;
    }

    let changed = false;

    if (existingUser.role !== 'admin') {
        existingUser.role = 'admin';
        changed = true;
    }

    if (!existingUser.isVerified) {
        existingUser.isVerified = true;
        changed = true;
    }

    if (changed) {
        await existingUser.save();
        console.log(`Seed admin updated for ${email}`);
    }
};
