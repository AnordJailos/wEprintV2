/** The signed-in customer's own profile. */
import { ApiError } from '@/core/errors';
import { userResponse } from '@/api/dto';
import { UserRepository } from '@/repository/user.repository';

export const UserUseCase = {
  async me(userId: number) {
    const user = await UserRepository.findById(userId);
    if (!user) throw ApiError.notFound('Account not found.');
    return userResponse(user);
  },

  /**
   * Only name and phone are editable. Email is an identity and role is a
   * permission — neither is accepted here, which is why the schema does not
   * contain them.
   */
  async update(userId: number, input: { name?: string; phone?: string }) {
    const updated = await UserRepository.updateProfile(userId, input);
    if (!updated) throw ApiError.notFound('Account not found.');
    return userResponse(updated);
  },
};
