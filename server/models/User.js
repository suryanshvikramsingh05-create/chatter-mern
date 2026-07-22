const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    pic: {
      type: String,
      default: '',
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Guest accounts are throwaway "try it without signing up" sessions; expire
// them a day after creation so they don't pile up. Real accounts are
// untouched since the filter only matches isGuest: true.
userSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24, partialFilterExpression: { isGuest: true } }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
