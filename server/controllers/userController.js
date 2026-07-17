const mongoose = require('mongoose');
const User = require('../models/User');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchUsers = async (req, res, next) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { username: mongoose.trusted({ $regex: escapeRegex(req.query.search), $options: 'i' }) },
            { email: mongoose.trusted({ $regex: escapeRegex(req.query.search), $options: 'i' }) },
          ],
        }
      : {};

    const users = await User.find(keyword)
      .find({ _id: mongoose.trusted({ $ne: req.user._id }) })
      .select('-password');

    res.json(users);
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    req.user.pic = `/uploads/${req.file.filename}`;
    await req.user.save();

    res.json({ pic: req.user.pic });
  } catch (error) {
    next(error);
  }
};

module.exports = { searchUsers, uploadAvatar };
