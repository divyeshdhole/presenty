import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword && !adminPasswordHash) {
    return res
      .status(500)
      .json({ message: 'Admin password is not configured on the server' });
  }

  let isValid = false;

  if (adminPasswordHash) {
    isValid = await bcrypt.compare(password, adminPasswordHash);
  } else {
    isValid = password === adminPassword;
  }

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid password' });
  }

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '12h',
  });

  return res.json({
    message: 'Login successful',
    token,
  });
};

export const me = (req, res) => {
  return res.json({ role: 'admin' });
};

export const logout = (_req, res) => {
  return res.json({ message: 'Logged out' });
};
