const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken, getJwtSecret, requireRole } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();
const STUDENT_ROLL_NUMBER_PATTERN = /^\d{2}[A-Z]-\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 12;
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
        ? 'Enter your roll number in the format 22L-1234.'
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
      message: 'Provide a name, student or faculty role, and a password between 12 and 72 UTF-8 bytes.',
    });
  }

  if (
    (role === 'STUDENT' && (!STUDENT_ROLL_NUMBER_PATTERN.test(rollNumber) || email))
    || (role === 'FACULTY' && (!EMAIL_PATTERN.test(email) || rollNumber))
  ) {
    return res.status(400).json({
      message: role === 'STUDENT'
        ? 'Student accounts require a roll number in the format 22L-1234.'
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

module.exports = router;
