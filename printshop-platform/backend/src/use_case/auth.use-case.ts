/**
 * Sign-up, sign-in and password recovery.
 *
 * Security rules that live here and nowhere else:
 *   • Registration always writes role 'customer'. The role is never read from
 *     the request body, so no one can register themselves as the owner (D-7).
 *   • Login answers with one message for both "no such email" and "wrong
 *     password", so the endpoint cannot be used to enumerate customers.
 *   • forgot-password always answers 200 with the same sentence.
 */
import { z } from 'zod';

import { ApiError } from '@/core/errors';
import { issueToken } from '@/core/jwt';
import { hashPassword, randomToken, verifyPassword } from '@/core/password';
import { userResponse, type loginSchema, type registerSchema } from '@/api/dto';
import { UserRepository } from '@/repository/user.repository';

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

export const AuthUseCase = {
  async register(input: RegisterInput) {
    const existing = await UserRepository.findByEmail(input.email);
    if (existing) throw ApiError.conflict('That email is already registered.');

    const user = await UserRepository.insert({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'customer', // never from the request
    });

    if (input.phone) await UserRepository.updateProfile(user.id, { phone: input.phone });

    const token = await issueToken(user.id, user.role);
    return { token, user: userResponse({ ...user, phone: input.phone ?? user.phone }) };
  },

  async login(input: LoginInput) {
    const user = await UserRepository.findByEmail(input.email);

    // Hash a throwaway string when the email is unknown so both branches take a
    // comparable amount of time; a timing difference is an enumeration oracle.
    if (!user) {
      await verifyPassword(input.password, `scrypt$16384$8$1$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(32).toString('base64')}`);
      throw ApiError.unauthorized('Email or password is incorrect.');
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) throw ApiError.unauthorized('Email or password is incorrect.');

    const token = await issueToken(user.id, user.role);
    return { token, user: userResponse(user) };
  },

  /**
   * The reset token is returned only in development, so the owner can test the
   * flow before SMTP exists. In production the response never contains it.
   *
   * TODO (phase 4, e-mail): send the token by e-mail once SMTP credentials are
   * configured. The delivery call belongs here, not in the handler.
   */
  async forgotPassword(email: string, exposeToken: boolean) {
    const user = await UserRepository.findByEmail(email);
    const message = 'If that email is registered, a reset link is on its way.';
    if (!user) return { message };

    const token = randomToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // one hour
    await UserRepository.setResetToken(user.id, token, expiresAt);

    return exposeToken ? { message, reset_token: token } : { message };
  },

  async resetPassword(token: string, password: string) {
    const user = await UserRepository.findByResetToken(token);
    if (!user) throw ApiError.badRequest('That reset link is invalid or has expired.');

    await UserRepository.applyNewPassword(user.id, await hashPassword(password));
    return { message: 'Password updated. You can sign in now.' };
  },
};
