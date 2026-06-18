import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { getRedis } from '../config/redis.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { generateOtp } from '../utils/otp.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/email.service.js';
import { AppError } from '../utils/errors.js';
import { mergeGuestCart } from '../services/cart.service.js';
import { verifyGoogleIdToken } from '../services/google-auth.service.js';

const OTP_TTL = 300;
const REFRESH_TTL = 7 * 24 * 60 * 60;

async function storeRefreshToken(userId, token) {
  const redis = getRedis();
  await redis.set(`session:${userId}`, token, 'EX', REFRESH_TTL);
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TTL * 1000,
  });
}

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    authProvider: user.authProvider,
  };
}

async function issueAuthSession(req, res, user) {
  const accessToken = signAccessToken({ userId: user._id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id });
  await storeRefreshToken(user._id.toString(), refreshToken);

  if (req.headers['x-session-id']) {
    await mergeGuestCart(req.headers['x-session-id'], user._id);
  }

  setRefreshCookie(res, refreshToken);

  return {
    accessToken,
    user: formatUser(user),
  };
}

export async function register(req, res) {
  const { name, email, password, phone } = req.validated;
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, phone, isVerified: false });

  const otp = generateOtp();
  const redis = getRedis();
  await redis.set(`otp:${email}`, otp, 'EX', OTP_TTL);
  await sendOtpEmail(email, otp);

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your email with the OTP sent.',
    data: { userId: user._id, email: user.email },
  });
}

export async function verifyOtp(req, res) {
  const { email, otp } = req.validated;
  const redis = getRedis();
  const stored = await redis.get(`otp:${email}`);
  if (!stored || stored !== otp) throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');

  const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  await redis.del(`otp:${email}`);

  const session = await issueAuthSession(req, res, user);

  res.json({
    success: true,
    data: session,
  });
}

export async function login(req, res) {
  const { email, password } = req.validated;
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  if (!user.passwordHash) {
    throw new AppError('This account uses Google Sign-In. Please continue with Google.', 401, 'GOOGLE_ACCOUNT');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  if (!user.isVerified) throw new AppError('Please verify your email first', 403, 'NOT_VERIFIED');

  const session = await issueAuthSession(req, res, user);

  res.json({
    success: true,
    data: session,
  });
}

export async function googleAuth(req, res) {
  const { credential } = req.validated;
  const profile = await verifyGoogleIdToken(credential);

  let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email }] });

  if (user) {
    if (user.googleId && user.googleId !== profile.googleId) {
      throw new AppError('Google account mismatch', 409, 'GOOGLE_MISMATCH');
    }
    if (!user.googleId) {
      user.googleId = profile.googleId;
      user.authProvider = user.passwordHash ? user.authProvider : 'google';
    }
    if (profile.avatar) user.avatar = profile.avatar;
    if (!user.isVerified) user.isVerified = true;
    await user.save();
  } else {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      googleId: profile.googleId,
      avatar: profile.avatar,
      authProvider: 'google',
      isVerified: true,
    });
  }

  const session = await issueAuthSession(req, res, user);

  res.json({
    success: true,
    data: session,
  });
}

export async function refresh(req, res) {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (!token) throw new AppError('Refresh token required', 401, 'UNAUTHORIZED');

  const decoded = verifyRefreshToken(token);
  const redis = getRedis();
  const stored = await redis.get(`session:${decoded.userId}`);
  if (stored !== token) throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');

  const user = await User.findById(decoded.userId);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const accessToken = signAccessToken({ userId: user._id, role: user.role });
  const newRefresh = signRefreshToken({ userId: user._id });
  await storeRefreshToken(user._id.toString(), newRefresh);
  setRefreshCookie(res, newRefresh);

  res.json({ success: true, data: { accessToken } });
}

export async function logout(req, res) {
  let userId = req.user?._id?.toString();

  if (!userId) {
    const token = req.cookies.refreshToken || req.body?.refreshToken;
    if (token) {
      try {
        const decoded = verifyRefreshToken(token);
        userId = decoded.userId;
      } catch {
        // Ignore invalid refresh token on logout
      }
    }
  }

  if (userId) {
    await getRedis().del(`session:${userId}`);
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ success: true, message: 'Logged out' });
}

export async function forgotPassword(req, res) {
  const { email } = req.validated;
  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ success: true, message: 'If the email exists, a reset code has been sent' });
  }

  const otp = generateOtp();
  await getRedis().set(`otp:${email}`, otp, 'EX', OTP_TTL);
  await sendPasswordResetEmail(email, otp);

  res.json({ success: true, message: 'If the email exists, a reset code has been sent' });
}

export async function resetPassword(req, res) {
  const { email, otp, password } = req.validated;
  const redis = getRedis();
  const stored = await redis.get(`otp:${email}`);
  if (!stored || stored !== otp) throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');

  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate({ email }, { passwordHash });
  await redis.del(`otp:${email}`);

  res.json({ success: true, message: 'Password reset successful' });
}

export async function getProfile(req, res) {
  res.json({ success: true, data: req.user });
}

export async function updateProfile(req, res) {
  const updates = req.validated;
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');
  res.json({ success: true, data: user });
}

export async function addAddress(req, res) {
  const address = req.validated;
  const user = await User.findById(req.user._id);
  if (address.isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false; });
  }
  user.addresses.push(address);
  await user.save();
  res.status(201).json({ success: true, data: user.addresses });
}

export async function updateAddress(req, res) {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addressId);
  if (!addr) throw new AppError('Address not found', 404, 'NOT_FOUND');
  Object.assign(addr, req.validated);
  await user.save();
  res.json({ success: true, data: user.addresses });
}

export async function deleteAddress(req, res) {
  const user = await User.findById(req.user._id);
  user.addresses.pull(req.params.addressId);
  await user.save();
  res.json({ success: true, data: user.addresses });
}
