const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserData,
} = require("../../controllers/auth/usersController");
const authenticateToken = require("../../middleware/authMiddleware");

router.post("/register", async (req, res) => {
  try {
    const result = await registerUser(req.body);
    if (!result) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Failed to register user",
      });
    }
    return res.status(201).json({
      status: "success",
      code: 201,
      message: "User registered successfully",
      data: { id: result },
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: err.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const result = await loginUser(req.body);
    if (!result) {
      return res.status(401).json({
        status: "error",
        code: 401,
        message: "Invalid credentials",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Login successful",
      data: result,
    });
  } catch (err) {
    res.status(401).json({
      status: "error",
      code: 401,
      message: err.message,
    });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("robogo_token", { path: "/" });
  res.clearCookie("next-auth.session-token", { path: "/" });
  res.clearCookie("next-auth.csrf-token", { path: "/" });
  res.clearCookie("next-auth.callback-url", { path: "/" });

  return res.status(200).json({
    status: "success",
    code: 200,
    message: "Logout successful",
    redirect: "/login",
  });
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await getUserData(req.user.userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "User not found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "User data fetched successfully",
      data: user,
    });
  } catch (err) {
    res.status(401).json({
      status: "error",
      code: 401,
      message: err.message,
    });
  }
});

module.exports = router;
