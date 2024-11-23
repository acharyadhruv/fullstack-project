const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, email, password } = req.body;

  // Check if username, password and email are provided
  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ message: 'Username and password are required' });
  }

  try {
    // Check if the user already exists in the database
    let user = await User.findOne({ username });

    if (!user) {
      // create a new user if user doesn't exist
      user = new User({ username, password, email });
      await user.save();
    }

    // Generate a JWT token
    const token = jwt.sign(
      { _id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err });
  }
});

module.exports = router;
