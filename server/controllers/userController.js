const User = require('../models/User');

exports.getUsers = async (_req, res) => {
    try {
        const users = await User.find({}, 'name email role isVerified createdAt')
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateUserRole = async (req, res) => {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (req.user?._id?.toString() === req.params.id && role !== 'admin') {
        return res.status(400).json({ message: 'You cannot remove your own admin access' });
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).select('name email role isVerified createdAt');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
