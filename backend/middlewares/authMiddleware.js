const jwt = require("jsonwebtoken");

const authMiddleware = {
  // Generate JWT token
  generateToken: (user) => {
    return jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret_key_here",
      { expiresIn: "24h" }
    );
  },

  // Verify JWT token
  verifyToken: (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_jwt_secret_key_here"
      );
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired" });
      }
      return res.status(401).json({ error: "Invalid token" });
    }
  },

  // Optional authentication (for public routes)
  optionalAuth: (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your_jwt_secret_key_here"
        );
        req.user = decoded;
      } catch (error) {
        // Token is invalid but we continue without authentication
        console.log("Optional auth failed:", error.message);
      }
    }

    next();
  },

  // Check if user is admin
  isAdmin: (req, res, next) => {
    // This is a simple implementation. In a real app, you'd check user role in database
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }
    next();
  },

  // Validate user input for registration
  validateRegister: (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Password validation
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    next();
  },

  // Validate user input for login
  validateLogin: (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    next();
  },

  // Rate limiting middleware (simplified)
  rateLimit: (limit = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();

    return (req, res, next) => {
      const ip = req.ip;
      const now = Date.now();

      if (!requests.has(ip)) {
        requests.set(ip, []);
      }

      const userRequests = requests.get(ip);

      // Remove requests outside the time window
      while (userRequests.length > 0 && userRequests[0] < now - windowMs) {
        userRequests.shift();
      }

      if (userRequests.length >= limit) {
        return res.status(429).json({
          error: "Too many requests. Please try again later.",
        });
      }

      userRequests.push(now);
      next();
    };
  },
};

module.exports = authMiddleware;
