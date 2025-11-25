import bcrypt from 'bcryptjs';

export const isAdminPasswordConfigured = () =>
  Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD);

export const verifyAdminPassword = async (input = '') => {
  const password = input?.trim();
  if (!password) return false;

  if (process.env.ADMIN_PASSWORD_HASH) {
    return bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  }

  if (process.env.ADMIN_PASSWORD) {
    return password === process.env.ADMIN_PASSWORD;
  }

  return false;
};
