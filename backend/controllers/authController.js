const jwt = require("jsonwebtoken");
const User = require("../schemas/user");

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function sanitizeUser(user) {
  return user.toJSON();
}

async function register(req, res) {
  try {
    const { username, email, password, fullName, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email va password la bat buoc."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password phai co it nhat 6 ky tu."
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }]
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email hoac username da ton tai."
      });
    }

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      fullName: fullName?.trim() || "",
      phone: phone?.trim() || "",
      role: "customer"
    });

    const token = createToken(user._id.toString());

    return res.status(201).json({
      message: "Dang ky thanh cong.",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Khong the dang ky tai khoan.",
      error: error.message
    });
  }
}

async function login(req, res) {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        message: "Thong tin dang nhap khong du."
      });
    }

    const normalizedValue = emailOrUsername.trim();
    const user = await User.findOne({
      $or: [
        { email: normalizedValue.toLowerCase() },
        { username: normalizedValue }
      ]
    });

    if (!user) {
      return res.status(401).json({
        message: "Tai khoan hoac mat khau khong dung."
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Tai khoan hien khong the dang nhap."
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Tai khoan hoac mat khau khong dung."
      });
    }

    user.loginCount += 1;
    user.lastLoginAt = new Date();
    await user.save();

    const token = createToken(user._id.toString());

    return res.status(200).json({
      message: "Dang nhap thanh cong.",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Khong the dang nhap.",
      error: error.message
    });
  }
}

async function getMe(req, res) {
  return res.status(200).json({
    message: "Lay thong tin nguoi dung thanh cong.",
    user: sanitizeUser(req.user)
  });
}

async function getAdminAccess(req, res) {
  return res.status(200).json({
    message: "Chao mung admin.",
    user: sanitizeUser(req.user)
  });
}

module.exports = {
  login,
  register,
  getMe,
  getAdminAccess
};
