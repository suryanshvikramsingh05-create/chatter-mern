const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
} = require('../controllers/chatController');

const router = express.Router();

router.use(protect);

router.post('/', accessChat);
router.get('/', fetchChats);
router.post('/group', createGroupChat);
router.put('/group/rename', renameGroup);
router.put('/group/add', addToGroup);
router.put('/group/remove', removeFromGroup);

module.exports = router;
