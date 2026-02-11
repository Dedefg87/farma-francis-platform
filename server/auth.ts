import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./_core/env";

/**
 * Verify JWT token
 * @param token - JWT token to verify
 * @returns Decoded user or null if invalid
 */
export function verifyToken(token: string): Promise<any> {
  return new Promise(resolve => {
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        resolve(null);
      } else {
        resolve(decoded);
      }
    });
  });
}
