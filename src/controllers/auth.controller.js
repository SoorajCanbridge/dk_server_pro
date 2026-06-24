import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { getRedis } from '../config/redis.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { generateOtp } from '../utils/otp.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/email.service.js';
import { AppError } from '../utils/errors.js';
import { mergeGuestCart } from '../services/cart.service.js';
import { verifyGoogleIdToken } from '../services/google-auth.service.js';
import {
  OTP_TTL,
  OTP_TTL_MINUTES,
  normalizeEmail,
  otpKey,
  pendingRegisterKey,
  resendCooldownKey,
  RESEND_COOLDOWN_SEC,
} from '../utils/registration.js';

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

async function clearRegistrationSession(email) {
  const redis = getRedis();
  await redis.del(otpKey(email));
  await redis.del(pendingRegisterKey(email));
}

async function sendRegistrationOtp(email, name) {
  const redis = getRedis();
  const normalizedEmail = normalizeEmail(email);
  const otp = generateOtp();

  await redis.set(otpKey(normalizedEmail), otp, 'EX', OTP_TTL);

  try {
    await sendOtpEmail(normalizedEmail, otp, name);
  } catch (err) {
    await redis.del(otpKey(normalizedEmail));
    console.error('Failed to send verification email:', err.message);
    throw new AppError(
      'We could not send the verification email. Please check the email address and try again.',
      503,
      'EMAIL_SEND_FAILED',
    );
  }

  return otp;
}

async function assertOtpValid(email, otp) {
  const redis = getRedis();
  const normalizedEmail = normalizeEmail(email);
  const stored = await redis.get(otpKey(normalizedEmail));

  if (!stored) {
    throw new AppError(
      'Your verification code has expired. Please request a new code.',
      400,
      'OTP_EXPIRED',
    );
  }

  if (stored !== otp) {
    throw new AppError(
      'The verification code is incorrect. Please check the code and try again.',
      400,
      'INVALID_OTP',
    );
  }
}

export async function register(req, res) {
  const { name, email, password, phone } = req.validated;
  const normalizedEmail = normalizeEmail(email);
  const redis = getRedis();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing?.isVerified) {
    throw new AppError(
      'This email is already registered. Please sign in instead.',
      409,
      'EMAIL_EXISTS',
    );
  }

  if (existing && !existing.isVerified) {
    await User.deleteOne({ _id: existing._id });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const pendingPayload = JSON.stringify({
    name,
    email: normalizedEmail,
    passwordHash,
    phone: phone || undefined,
  });

  await redis.set(pendingRegisterKey(normalizedEmail), pendingPayload, 'EX', OTP_TTL);

  try {
    await sendRegistrationOtp(normalizedEmail, name);
  } catch (err) {
    await clearRegistrationSession(normalizedEmail);
    throw err;
  }

  res.status(201).json({
    success: true,
    message: 'Verification code sent. Enter it below to finish creating your account.',
    data: {
      email: normalizedEmail,
      expiresIn: OTP_TTL,
      expiresInMinutes: OTP_TTL_MINUTES,
    },
  });
}

export async function resendVerificationOtp(req, res) {
  const { email } = req.validated;
  const normalizedEmail = normalizeEmail(email);
  const redis = getRedis();
  const pendingRaw = await redis.get(pendingRegisterKey(normalizedEmail));
  const legacyUser = await User.findOne({ email: normalizedEmail, isVerified: false });

  if (!pendingRaw && !legacyUser) {
    throw new AppError(
      'No pending registration found for this email. Please sign up again.',
      404,
      'REGISTRATION_NOT_FOUND',
    );
  }

  const onCooldown = await redis.get(resendCooldownKey(normalizedEmail));
  if (onCooldown) {
    throw new AppError(
      'Please wait a minute before requesting another verification code.',
      429,
      'OTP_RESEND_COOLDOWN',
    );
  }

  const displayName = pendingRaw ? JSON.parse(pendingRaw).name : legacyUser.name;

  if (pendingRaw) {
    await redis.set(pendingRegisterKey(normalizedEmail), pendingRaw, 'EX', OTP_TTL);
  }

  await sendRegistrationOtp(normalizedEmail, displayName);
  await redis.set(resendCooldownKey(normalizedEmail), '1', 'EX', RESEND_COOLDOWN_SEC);

  res.json({
    success: true,
    message: 'A new verification code has been sent to your email.',
    data: {
      email: normalizedEmail,
      expiresIn: OTP_TTL,
      expiresInMinutes: OTP_TTL_MINUTES,
      resendCooldown: RESEND_COOLDOWN_SEC,
    },
  });
}

export async function verifyOtp(req, res) {
  const { email, otp } = req.validated;
  const normalizedEmail = normalizeEmail(email);
  const redis = getRedis();

  await assertOtpValid(normalizedEmail, otp);

  const pendingRaw = await redis.get(pendingRegisterKey(normalizedEmail));
  let user = await User.findOne({ email: normalizedEmail });

  if (pendingRaw) {
    const pending = JSON.parse(pendingRaw);

    if (user?.isVerified) {
      await clearRegistrationSession(normalizedEmail);
      throw new AppError(
        'This email is already registered. Please sign in instead.',
        409,
        'EMAIL_EXISTS',
      );
    }

    if (user && !user.isVerified) {
      user.name = pending.name;
      user.passwordHash = pending.passwordHash;
      user.phone = pending.phone;
      user.isVerified = true;
      await user.save();
    } else {
      user = await User.create({
        name: pending.name,
        email: pending.email,
        passwordHash: pending.passwordHash,
        phone: pending.phone,
        isVerified: true,
      });
    }
  } else if (user && !user.isVerified) {
    user.isVerified = true;
    await user.save();
  } else {
    throw new AppError(
      'Your sign-up session has expired. Please register again.',
      400,
      'REGISTRATION_EXPIRED',
    );
  }

  await clearRegistrationSession(normalizedEmail);

  const session = await issueAuthSession(req, res, user);

  res.json({
    success: true,
    message: 'Email verified successfully.',
    data: session,
  });
}

export async function login(req, res) {
  const { email, password } = req.validated;
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const redis = getRedis();
    const pendingRaw = await redis.get(pendingRegisterKey(normalizedEmail));
    if (pendingRaw) {
      const pending = JSON.parse(pendingRaw);
      const validPending = await bcrypt.compare(password, pending.passwordHash);
      if (validPending) {
        throw new AppError(
          'Your email is not verified yet. Enter the verification code sent to your inbox.',
          403,
          'NOT_VERIFIED',
        );
      }
    }
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.passwordHash) {
    throw new AppError('This account uses Google Sign-In. Please continue with Google.', 401, 'GOOGLE_ACCOUNT');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  if (!user.isVerified) {
    throw new AppError(
      'Your email is not verified yet. Enter the verification code sent to your inbox.',
      403,
      'NOT_VERIFIED',
    );
  }

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
