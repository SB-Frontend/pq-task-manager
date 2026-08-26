import "server-only";

import bcrypt from "bcryptjs";

/**
 * bcrypt with a cost of 12: slow enough to make offline guessing expensive,
 * fast enough for a login request. bcrypt handles salting internally, so the
 * salt is part of the stored hash.
 */
const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
