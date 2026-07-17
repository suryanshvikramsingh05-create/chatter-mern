const mongoose = require('mongoose');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

const DEFAULT_PAGE_SIZE = 30;

const sendMessage = async (req, res, next) => {
  try {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
      return res.status(400).json({ message: 'content and chatId are required' });
    }

    const chatExists = await Chat.exists({ _id: chatId, users: req.user._id });
    if (!chatExists) {
      return res.status(403).json({ message: 'Not authorized to post in this chat' });
    }

    let message = await Message.create({
      sender: req.user._id,
      content,
      chat: chatId,
      readBy: [req.user._id],
    });

    message = await message.populate('sender', 'username email pic');
    message = await message.populate('chat');

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

const allMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 100);

    const chatExists = await Chat.exists({ _id: chatId, users: req.user._id });
    if (!chatExists) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }

    const totalCount = await Message.countDocuments({ chat: chatId });

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username email pic')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    messages.reverse();

    const readResult = await Message.updateMany(
      {
        chat: chatId,
        sender: mongoose.trusted({ $ne: req.user._id }),
        readBy: mongoose.trusted({ $ne: req.user._id }),
      },
      { $addToSet: { readBy: req.user._id } }
    );

    if (readResult.modifiedCount > 0) {
      const io = req.app.get('io');
      io?.to(chatId).emit('messages read', { chatId, readerId: req.user._id.toString() });
    }

    res.json({
      messages,
      page,
      hasMore: page * limit < totalCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendMessage, allMessages };
