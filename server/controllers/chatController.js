const mongoose = require('mongoose');
const Chat = require('../models/Chat');

const accessChat = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    let chat = await Chat.findOne({
      isGroupChat: false,
      users: mongoose.trusted({ $all: [req.user._id, userId], $size: 2 }),
    })
      .populate('users', '-password')
      .populate('latestMessage');

    if (!chat) {
      chat = await Chat.create({
        isGroupChat: false,
        users: [req.user._id, userId],
      });
      chat = await chat.populate('users', '-password');
    }

    res.json(chat);
  } catch (error) {
    next(error);
  }
};

const fetchChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ users: req.user._id })
      .populate('users', '-password')
      .populate('latestMessage')
      .populate('groupAdmin', '-password')
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    next(error);
  }
};

const createGroupChat = async (req, res, next) => {
  try {
    const { name, userIds } = req.body;

    if (!name || !Array.isArray(userIds) || userIds.length < 2) {
      return res.status(400).json({
        message: 'A group needs a name and at least 2 other members',
      });
    }

    const chat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      users: [...userIds, req.user._id],
      groupAdmin: req.user._id,
    });

    const fullChat = await Chat.findById(chat._id)
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.status(201).json(fullChat);
  } catch (error) {
    next(error);
  }
};

const renameGroup = async (req, res, next) => {
  try {
    const { chatId, name } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group admin can rename the group' });
    }

    chat.chatName = name;
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.json(updatedChat);
  } catch (error) {
    next(error);
  }
};

const addToGroup = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group admin can add members' });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $addToSet: { users: userId } },
      { returnDocument: 'after' }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.json(updatedChat);
  } catch (error) {
    next(error);
  }
};

const removeFromGroup = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group admin can remove members' });
    }
    if (chat.groupAdmin.toString() === userId) {
      return res.status(400).json({ message: 'The group admin cannot be removed' });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { returnDocument: 'after' }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.json(updatedChat);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
};
