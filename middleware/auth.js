const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']; // Fetch authorization header
  console.log('Auth Header:', authHeader); // Debugging log

  // Check if authorization header is present and properly formatted
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Forbidden: Missing or malformed token' });
  }

  // Extract the token from the Bearer scheme
  const token = authHeader.split(' ')[1];
  console.log('Token:', token); // Debugging log

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification failed:', err.message); // Debugging log
      return res.status(403).json({ message: 'Forbidden: Invalid or expired token' });
    }

    console.log('Decoded User:', user); // Debugging log

    // Attach the decoded user to the request object
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  });
};

module.exports = authenticateToken;
