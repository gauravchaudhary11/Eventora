const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/auth');
const { getUsers, updateUserRole } = require('../controllers/userController');

router.get('/', protect, admin, getUsers);
router.patch('/:id/role', protect, admin, updateUserRole);

module.exports = router;
