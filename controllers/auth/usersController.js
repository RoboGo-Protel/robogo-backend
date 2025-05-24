const { firestore } = require("../database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.JWT_SECRET || "robogo_gogogo";

async function registerUser({ email, password, name }) {
  if (!email || !password || !name) {
    throw new Error("Email, password, and name are required.");
  }

  const existingUserSnapshot = await firestore
    .collection("users")
    .where("email", "==", email)
    .get();

  if (!existingUserSnapshot.empty) {
    throw new Error("User with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const userData = {
    name,
    email,
    password: hashedPassword,
    createdAt: new Date(),
  };

  const ref = await firestore.collection("users").add(userData);
  return { id: ref.id, email, name };
}

async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const userSnapshot = await firestore
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (userSnapshot.empty) {
    throw new Error("Invalid email or password.");
  }

  const userDoc = userSnapshot.docs[0];
  const userData = userDoc.data();

  const isPasswordValid = await bcrypt.compare(password, userData.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
  }

  const token = jwt.sign(
    {
      userId: userDoc.id,
      email: userData.email,
      name: userData.name,
    },
    SECRET_KEY,
    { expiresIn: "30d" }
  );

  return {
    token,
    user: {
      id: userDoc.id,
      email: userData.email,
      name: userData.name,
    },
  };
}

async function getUserData(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const userDoc = await firestore.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    throw new Error("User not found.");
  }

  const userData = userDoc.data();

  return {
    id: userDoc.id,
    email: userData.email,
    name: userData.name,
    createdAt: userData.createdAt?.toDate?.()?.toISOString() || null,
  };
}

module.exports = {
  registerUser,
  loginUser,
  getUserData,
};
