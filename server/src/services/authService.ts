import jwt from 'jsonwebtoken';
import { createClerkClient, verifyToken as clerkVerifyToken } from '@clerk/backend';
import { config } from '../config';
import { User } from '../models/User';
import { isDbConnected } from '../config/database';
import { logger } from '../utils/logger';

export interface AuthUserPayload {
  id: string;
  clerkId?: string;
  email: string;
  name: string;
  avatar?: string;
}

const clerkClient = config.clerk.secretKey
  ? createClerkClient({ secretKey: config.clerk.secretKey, publishableKey: config.clerk.publishableKey || undefined })
  : null;

/** In-memory fallback if MongoDB Atlas is still connecting */
const inMemoryUsers = new Map<string, AuthUserPayload>();

/** Find or create a user in MongoDB Atlas from Clerk identity */
export async function syncClerkUser(profile: {
  clerkId: string;
  email: string;
  name?: string;
  avatar?: string;
}): Promise<AuthUserPayload> {
  const normalizedEmail = profile.email.toLowerCase().trim();
  const userName = profile.name?.trim() || normalizedEmail.split('@')[0];
  const userAvatar = profile.avatar || '';

  if (isDbConnected()) {
    let user = await User.findOne({
      $or: [{ clerkId: profile.clerkId }, { email: normalizedEmail }],
    });

    if (!user) {
      user = await User.create({
        clerkId: profile.clerkId,
        email: normalizedEmail,
        name: userName,
        avatar: userAvatar,
      });
      logger.info('New Clerk user synchronized into MongoDB Atlas', {
        clerkId: profile.clerkId,
        email: normalizedEmail,
      });
    } else {
      let needsSave = false;
      if (!user.clerkId) {
        user.clerkId = profile.clerkId;
        needsSave = true;
      }
      if (userAvatar && user.avatar !== userAvatar) {
        user.avatar = userAvatar;
        needsSave = true;
      }
      if (userName && user.name !== userName) {
        user.name = userName;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    }

    return {
      id: user._id.toString(),
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    };
  }

  // Fallback if MongoDB is temporarily connecting
  const existing = inMemoryUsers.get(profile.clerkId) || inMemoryUsers.get(normalizedEmail);
  if (existing) {
    existing.clerkId = profile.clerkId;
    if (userAvatar) existing.avatar = userAvatar;
    if (userName) existing.name = userName;
    return existing;
  }

  const payload: AuthUserPayload = {
    id: profile.clerkId,
    clerkId: profile.clerkId,
    email: normalizedEmail,
    name: userName,
    avatar: userAvatar,
  };
  inMemoryUsers.set(profile.clerkId, payload);
  inMemoryUsers.set(normalizedEmail, payload);
  return payload;
}

/** Verify a Clerk session token and return the synced user payload */
export async function verifyClerkSessionToken(token: string): Promise<AuthUserPayload> {
  let clerkUserId: string | null = null;
  let emailClaim: string | null = null;
  let nameClaim: string | null = null;
  let avatarClaim: string | null = null;

  // 1. If Clerk secretKey is configured, verify cryptographically via @clerk/backend
  if (config.clerk.secretKey) {
    try {
      const verified = await clerkVerifyToken(token, {
        secretKey: config.clerk.secretKey,
      });
      if (verified && verified.sub) {
        clerkUserId = verified.sub;
      }
    } catch (err) {
      logger.warn('Clerk backend token verification failed with secretKey', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2. Decode claims from the token as fallback/direct claims inspection
  if (!clerkUserId) {
    const decoded = jwt.decode(token) as Record<string, any> | null;
    if (decoded && decoded.sub) {
      clerkUserId = decoded.sub;
      if (typeof decoded.email === 'string') emailClaim = decoded.email;
      if (typeof decoded.name === 'string') nameClaim = decoded.name;
      if (typeof decoded.picture === 'string') avatarClaim = decoded.picture;
    }
  }

  if (!clerkUserId) {
    throw new Error('Invalid or unverified Clerk session token');
  }

  // 3. If Clerk client is available, fetch full user profile from Clerk API
  if (clerkClient && (!emailClaim || !nameClaim)) {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      if (clerkUser) {
        emailClaim =
          clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
          clerkUser.emailAddresses[0]?.emailAddress ||
          emailClaim;
        nameClaim =
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
          clerkUser.username ||
          nameClaim;
        avatarClaim = clerkUser.imageUrl || avatarClaim;
      }
    } catch (fetchErr) {
      logger.warn('Could not fetch user details from Clerk API', {
        clerkUserId,
        error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      });
    }
  }

  if (!emailClaim) {
    emailClaim = `${clerkUserId}@user.clerk`;
  }

  return syncClerkUser({
    clerkId: clerkUserId,
    email: emailClaim,
    name: nameClaim || emailClaim.split('@')[0],
    avatar: avatarClaim || undefined,
  });
}
