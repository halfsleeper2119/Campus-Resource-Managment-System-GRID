const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken, getJwtSecret, requireRole } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();
const STUDENT_ROLL_NUMBER_PATTERN = /^\d{2}[A-Z]-\d{4}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 6;
const BCRYPT_ROUNDS = 12;

const toPublicUser = (user) => ({
  id: user.id,
  name: user.name,
  role: user.role,
  email: user.email,
  rollNumber: user.rollNumber,
});

router.post('/login', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { accountType, password } = body;
  const rollNumber = typeof body.rollNumber === 'string'
    ? body.rollNumber.trim().toUpperCase()
    : '';
  const email = typeof body.email === 'string'
    ? body.email.trim().toLowerCase()
    : '';

  if (
    !['student', 'faculty'].includes(accountType)
    || typeof password !== 'string'
    || !password
    || Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({ message: 'Enter valid sign-in details.' });
  }

  if (
    (accountType === 'student' && !STUDENT_ROLL_NUMBER_PATTERN.test(rollNumber))
    || (accountType === 'faculty' && !EMAIL_PATTERN.test(email))
  ) {
    return res.status(400).json({
      message: accountType === 'student'
        ? 'Enter your roll number in the format XXY-XXXX (two digits, one letter, a dash, and four digits).'
        : 'Enter a valid email address.',
    });
  }

  try {
    const user = accountType === 'student'
      ? await prisma.user.findUnique({ where: { rollNumber } })
      : await prisma.user.findUnique({ where: { email } });
    const isCorrectAccountType = accountType === 'student'
      ? user?.role === 'STUDENT'
      : user?.role === 'FACULTY' || user?.role === 'ADMIN';

    if (
      !user
      || !user.isActive
      || !isCorrectAccountType
      || !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({ message: 'The sign-in details were not recognized.' });
    }

    const token = jwt.sign(
      { role: user.role },
      getJwtSecret(),
      { algorithm: 'HS256', expiresIn: '1h', subject: user.id },
    );

    return res.status(200).json({ token, user: toPublicUser(user) });
  } catch (error) {
    console.error('Login request failed:', error);
    return res.status(500).json({ message: 'Sign-in is temporarily unavailable.' });
  }
});

router.post(
  '/me/password',
  authenticateToken,
  requireRole('STUDENT', 'FACULTY'),
  async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { currentPassword, newPassword } = body;

    if (
      typeof currentPassword !== 'string'
      || !currentPassword
      || Buffer.byteLength(currentPassword, 'utf8') > 72
      || typeof newPassword !== 'string'
      || newPassword.length < PASSWORD_MIN_LENGTH
      || Buffer.byteLength(newPassword, 'utf8') > 72
    ) {
      return res.status(400).json({
        message: 'Enter your current password and a new password between 6 and 72 UTF-8 bytes.',
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, passwordHash: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'This account is no longer active.' });
      }

      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return res.status(401).json({ message: 'Current password is incorrect.' });
      }

      if (await bcrypt.compare(newPassword, user.passwordHash)) {
        return res.status(400).json({ message: 'New password must be different from your current password.' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
      });

      return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
      console.error('Password change failed:', error);
      return res.status(500).json({ message: 'Unable to change the password.' });
    }
  },
);

router.get('/users', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const role = typeof req.query.role === 'string' ? req.query.role : '';

  if (search.length > 120 || (role && !['STUDENT', 'FACULTY'].includes(role))) {
    return res.status(400).json({ message: 'Use a search of at most 120 characters and a valid account type.' });
  }

  const where = {
    role: role ? { in: [role] } : { in: ['STUDENT', 'FACULTY'] },
    ...(search
      ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { rollNumber: { contains: search, mode: 'insensitive' } },
        ],
      }
      : {}),
  };

  try {
    const users = await prisma.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      take: 100,
    });
    return res.status(200).json({ users: users.map(toPublicUser), limit: 100 });
  } catch (error) {
    console.error('User search failed:', error);
    return res.status(500).json({ message: 'Unable to search accounts.' });
  }
});

router.post('/users', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { name, role, password } = body;
  const rollNumber = typeof body.rollNumber === 'string'
    ? body.rollNumber.trim().toUpperCase()
    : '';
  const email = typeof body.email === 'string'
    ? body.email.trim().toLowerCase()
    : '';

  if (
    typeof name !== 'string'
    || !name.trim()
    || name.trim().length > 120
    || !['STUDENT', 'FACULTY'].includes(role)
    || typeof password !== 'string'
    || password.length < PASSWORD_MIN_LENGTH
    || Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      message: 'Provide a name, student or faculty role, and a password between 6 and 72 UTF-8 bytes.',
    });
  }

  if (
    (role === 'STUDENT' && (!STUDENT_ROLL_NUMBER_PATTERN.test(rollNumber) || email))
    || (role === 'FACULTY' && (!EMAIL_PATTERN.test(email) || rollNumber))
  ) {
    return res.status(400).json({
      message: role === 'STUDENT'
        ? 'Student accounts require a roll number in the format XXY-XXXX (two digits, one letter, a dash, and four digits).'
        : 'Faculty accounts require a valid email address.',
    });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        role,
        email: role === 'FACULTY' ? email : null,
        rollNumber: role === 'STUDENT' ? rollNumber : null,
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      },
    });

    return res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'An account already exists for that identifier.' });
    }

    console.error('Account creation failed:', error);
    return res.status(500).json({ message: 'Unable to create the account.' });
  }
});

router.patch('/users/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { name, password } = body;

  if (
    typeof name !== 'string'
    || !name.trim()
    || name.trim().length > 120
    || (password !== undefined && password !== '' && (
      typeof password !== 'string'
      || password.length < PASSWORD_MIN_LENGTH
      || Buffer.byteLength(password, 'utf8') > 72
    ))
  ) {
    return res.status(400).json({
      message: 'Provide a name and, if changing the password, use 6 to 72 UTF-8 bytes.',
    });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        role: { in: ['STUDENT', 'FACULTY'] },
      },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'Student or faculty account not found.' });
    }

    if (
      typeof password === 'string'
      && password
      && await bcrypt.compare(password, existingUser.passwordHash)
    ) {
      return res.status(400).json({ message: 'New password must be different from the current password.' });
    }

    const rollNumber = typeof body.rollNumber === 'string'
      ? body.rollNumber.trim().toUpperCase()
      : '';
    const email = typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : '';
    const isStudent = existingUser.role === 'STUDENT';

    if (
      (isStudent && (!STUDENT_ROLL_NUMBER_PATTERN.test(rollNumber) || email))
      || (!isStudent && (!EMAIL_PATTERN.test(email) || rollNumber))
    ) {
      return res.status(400).json({
        message: isStudent
          ? 'Student accounts require a roll number in the format XXY-XXXX.'
          : 'Faculty accounts require a valid email address.',
      });
    }

    const data = {
      name: name.trim(),
      ...(isStudent ? { rollNumber } : { email }),
      ...(typeof password === 'string' && password
        ? { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) }
        : {}),
    };
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data,
    });

    return res.status(200).json({ user: toPublicUser(updatedUser) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'An account already exists for that identifier.' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Student or faculty account not found.' });
    }

    console.error('Account update failed:', error);
    return res.status(500).json({ message: 'Unable to update the account.' });
  }
});

router.delete('/users/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        role: { in: ['STUDENT', 'FACULTY'] },
      },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'Student or faculty account not found.' });
    }

    await prisma.user.delete({ where: { id: user.id } });
    return res.status(200).json({ message: 'Account deleted.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Student or faculty account not found.' });
    }

    console.error('Account deletion failed:', error);
    return res.status(500).json({ message: 'Unable to delete the account.' });
  }
});

module.exports = router;
