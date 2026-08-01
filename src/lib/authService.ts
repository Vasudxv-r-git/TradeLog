import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getUserByEmail, getUserProfile, createOrUpdateUserProfile, updateUserPasswordHash } from './database';
import { UserProfile } from '@/types';

// Minimum salt rounds required for bcrypt
export const BCRYPT_SALT_ROUNDS = 12;

export type HashType = 'bcrypt' | 'md5' | 'sha1' | 'plain';

/**
 * Hashes a plain text password using bcrypt with at least 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string.');
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Constant-time comparison of two strings to mitigate timing attack vulnerabilities.
 * Hashes both strings with SHA-256 before timingSafeEqual to ensure fixed-length comparison.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Identifies the hashing algorithm / format of a stored hash string.
 */
export function detectHashType(storedHash: string): HashType {
  if (!storedHash) return 'plain';
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return 'bcrypt';
  }
  const isHex = /^[0-9a-fA-F]+$/.test(storedHash);
  if (storedHash.length === 32 && isHex) {
    return 'md5';
  }
  if (storedHash.length === 40 && isHex) {
    return 'sha1';
  }
  return 'plain';
}

/**
 * Checks if a bcrypt hash uses a salt round cost factor less than target min cost (12).
 */
export function isBcryptCostWeak(bcryptHash: string, minCost = BCRYPT_SALT_ROUNDS): boolean {
  const roundsMatch = bcryptHash.match(/^\$2[aby]\$(\d\d)\$/);
  if (!roundsMatch) return true;
  const cost = parseInt(roundsMatch[1], 10);
  return cost < minCost;
}

export interface VerificationResult {
  valid: boolean;
  isWeak: boolean;
  hashType: HashType;
}

/**
 * Verifies a plain text password against a stored hash or legacy credential representation.
 * Always performs constant-time comparisons for string equalities.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<VerificationResult> {
  if (!password || !storedHash) {
    return { valid: false, isWeak: false, hashType: 'plain' };
  }

  const hashType = detectHashType(storedHash);

  switch (hashType) {
    case 'bcrypt': {
      // bcrypt.compare executes constant-time hash comparison internally
      const valid = await bcrypt.compare(password, storedHash);
      const isWeak = valid ? isBcryptCostWeak(storedHash, BCRYPT_SALT_ROUNDS) : false;
      return { valid, isWeak, hashType };
    }

    case 'md5': {
      const computedMd5 = crypto.createHash('md5').update(password).digest('hex');
      const valid = timingSafeEqualStrings(computedMd5, storedHash);
      return { valid, isWeak: valid, hashType };
    }

    case 'sha1': {
      const computedSha1 = crypto.createHash('sha1').update(password).digest('hex');
      const valid = timingSafeEqualStrings(computedSha1, storedHash);
      return { valid, isWeak: valid, hashType };
    }

    case 'plain':
    default: {
      const valid = timingSafeEqualStrings(password, storedHash);
      return { valid, isWeak: valid, hashType: 'plain' };
    }
  }
}

/**
 * Registers a new user account with a password hashed using bcrypt (salt rounds >= 12).
 */
export async function signupUser(
  email: string,
  password: string,
  displayName?: string
): Promise<UserProfile> {
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists.');
  }

  const hashedPassword = await hashPassword(password);
  const uid = crypto.randomUUID();

  const profile: UserProfile = {
    uid,
    displayName: displayName || email.split('@')[0],
    email,
    photoURL: '',
    passwordHash: hashedPassword,
    theme: 'dark',
    customPairs: [],
    customColumns: [],
  };

  await createOrUpdateUserProfile(uid, profile);
  return profile;
}

/**
 * Changes a user's password. Verifies old password, hashes new password with bcrypt (cost >= 12), and persists to DB.
 */
export async function changePassword(
  uid: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile(uid);
  if (!profile || !profile.passwordHash) {
    return { success: false, error: 'User profile or password record not found.' };
  }

  const verification = await verifyPassword(oldPassword, profile.passwordHash);
  if (!verification.valid) {
    return { success: false, error: 'Current password verification failed.' };
  }

  const newHash = await hashPassword(newPassword);
  const updated = await updateUserPasswordHash(uid, newHash);
  if (!updated) {
    return { success: false, error: 'Failed to save updated password hash to database.' };
  }

  return { success: true };
}

/**
 * Authenticates a user on login. If the user's password is stored as plain-text, MD5, SHA-1,
 * or low-cost bcrypt, it transparently re-hashes the password with bcrypt (salt rounds 12)
 * and updates the database record.
 */
export async function loginUserWithMigration(
  email: string,
  password: string
): Promise<{ user: UserProfile | null; migrated: boolean; error?: string }> {
  const profile = await getUserByEmail(email);
  if (!profile || !profile.passwordHash) {
    return { user: null, migrated: false, error: 'Invalid email or password.' };
  }

  const verification = await verifyPassword(password, profile.passwordHash);
  if (!verification.valid) {
    return { user: null, migrated: false, error: 'Invalid email or password.' };
  }

  let migrated = false;

  // Re-hash weak password (plain, MD5, SHA-1, or low-cost bcrypt) on successful login
  if (verification.isWeak) {
    const upgradedBcryptHash = await hashPassword(password);
    const success = await updateUserPasswordHash(profile.uid, upgradedBcryptHash);
    if (success) {
      profile.passwordHash = upgradedBcryptHash;
      migrated = true;
    }
  }

  return { user: profile, migrated };
}
