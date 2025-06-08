const { firestore } = require("../database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const SECRET_KEY = process.env.JWT_SECRET || 'robogo_gogogo';


console.log('Email configuration check:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '[CONFIGURED]' : '[MISSING]');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function registerUser({ email, password, name }) {
  if (!email || !password || !name) {
    throw new Error('Email, password, and name are required.');
  }

  const existingUserSnapshot = await firestore
    .collection('users')
    .where('email', '==', email)
    .get();

  if (!existingUserSnapshot.empty) {
    throw new Error('User with this email already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const userData = {
    name,
    email,
    password: hashedPassword,
    createdAt: new Date(),
  };

  const ref = await firestore.collection('users').add(userData);
  return { id: ref.id, email, name };
}

async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const userSnapshot = await firestore
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (userSnapshot.empty) {
    throw new Error('Invalid email or password.');
  }

  const userDoc = userSnapshot.docs[0];
  const userData = userDoc.data();

  const isPasswordValid = await bcrypt.compare(password, userData.password);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password.');
  }

  const token = jwt.sign(
    {
      userId: userDoc.id,
      email: userData.email,
      name: userData.name,
    },
    SECRET_KEY,
    { expiresIn: '30d' },
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
    throw new Error('User ID is required.');
  }

  const userDoc = await firestore.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    throw new Error('User not found.');
  }

  const userData = userDoc.data();

  return {
    id: userDoc.id,
    email: userData.email,
    name: userData.name,
    createdAt: userData.createdAt?.toDate?.()?.toISOString() || null,
  };
}

async function requestPasswordReset({ email }) {
  if (!email) {
    throw new Error('Email is required.');
  }

  const userSnapshot = await firestore
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (userSnapshot.empty) {
    console.log(
      `Password reset attempted for non-existent email: ${email} at ${new Date().toISOString()}`,
    );

    return {
      message:
        'If an account with that email exists, we have sent a password reset link.',
      email: email,
    };
  }

  const userDoc = userSnapshot.docs[0];
  const userData = userDoc.data();

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000);

  await firestore.collection('users').doc(userDoc.id).update({
    resetToken: resetToken,
    resetTokenExpiry: resetTokenExpiry,
  });

  const resetUrl = `${
    process.env.FRONTEND_URL || 'http://localhost:3000'
  }/reset-password?token=${resetToken}`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">RoboGo</h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Robot Gorong-Gorong Control System</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #666; line-height: 1.6;">Hello ${userData.name},</p>
        <p style="color: #666; line-height: 1.6;">We received a request to reset your password for your RoboGo account. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        
        <p style="color: #666; line-height: 1.6;">If you can't click the button, copy and paste this link into your browser:</p>
        <p style="color: #60a5fa; word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">${resetUrl}</p>
        
        <p style="color: #666; line-height: 1.6;">This link will expire in 1 hour for security reasons.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #888; font-size: 14px;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
        <p style="color: #888; font-size: 14px;">For security questions, contact our support team.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"RoboGo" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your RoboGo Password',
      html: emailContent,
    });
    return {
      message:
        'If an account with that email exists, we have sent a password reset link.',
      email: email,
    };
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
    throw new Error('Failed to send reset email. Please try again later.');
  }
}

async function resetPassword({ token, newPassword }) {
  if (!token || !newPassword) {
    throw new Error('Reset token and new password are required.');
  }

  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const userSnapshot = await firestore
    .collection('users')
    .where('resetToken', '==', token)
    .limit(1)
    .get();

  if (userSnapshot.empty) {
    throw new Error('Invalid or expired reset token.');
  }

  const userDoc = userSnapshot.docs[0];
  const userData = userDoc.data();

  if (
    !userData.resetTokenExpiry ||
    userData.resetTokenExpiry.toDate() < new Date()
  ) {
    throw new Error(
      'Reset token has expired. Please request a new password reset.',
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await firestore.collection('users').doc(userDoc.id).update({
    password: hashedPassword,
    resetToken: null,
    resetTokenExpiry: null,
  });

  return {
    message: 'Password reset successfully.',
    userId: userDoc.id,
  };
}

async function googleAuth({ email, name, googleId, picture }) {
  if (!email || !name || !googleId) {
    throw new Error('Email, name, and Google ID are required.');
  }

  try {
    const existingUserSnapshot = await firestore
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    let userDoc;
    let userData;

    if (!existingUserSnapshot.empty) {
      userDoc = existingUserSnapshot.docs[0];
      userData = userDoc.data();

      if (!userData.googleId) {
        await firestore
          .collection('users')
          .doc(userDoc.id)
          .update({
            googleId: googleId,
            picture: picture || userData.picture || null,
            updatedAt: new Date(),
          });

        userData = {
          ...userData,
          googleId,
          picture: picture || userData.picture,
        };
      }
    } else {
      const newUserData = {
        email,
        name,
        googleId,
        picture: picture || null,
        password: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      };

      userDoc = await firestore.collection('users').add(newUserData);
      userData = newUserData;
    }

    const token = jwt.sign(
      {
        userId: userDoc.id,
        email: userData.email,
        name: userData.name,
      },
      SECRET_KEY,
      { expiresIn: '30d' },
    );

    return {
      token,
      user: {
        id: userDoc.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        googleId: userData.googleId,
      },
    };
  } catch (error) {
    console.error('Google auth error:', error);
    throw new Error('Google authentication failed.');
  }
}

module.exports = {
  registerUser,
  loginUser,
  getUserData,
  requestPasswordReset,
  resetPassword,
  googleAuth,
};
