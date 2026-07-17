const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { searchUsers, uploadAvatar } = require('../controllers/userController');

const router = express.Router();

router.get('/', protect, searchUsers);
router.post('/avatar', protect, upload.single('pic'), uploadAvatar);

module.exports = router;
