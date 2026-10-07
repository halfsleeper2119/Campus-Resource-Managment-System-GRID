const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 bytes.');
  }

  return secret;
};

const authenticateToken = async (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer ([^\s]+)$/i);

  if (!match) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  let payload;
  try {
    payload = jwt.verify(match[1], getJwtSecret(), {
      algorithms: ['HS256'],
    });

    if (
      typeof payload === 'string'
      || typeof payload.sub !== 'string'
      || !['STUDENT', 'FACULTY', 'ADMIN'].includes(payload.role)
    ) {
      return res.status(401).json({ message: 'Invalid authentication token.' });
    }

  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid or expired authentication token.' });
    }

    return next(error);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive || user.role !== payload.role) {
      return res.status(401).json({ message: 'This account is no longer active. Please sign in again.' });
    }

    req.user = { id: user.id, role: user.role };
    return next();
  } catch (error) {
    console.error('Authentication lookup failed:', error);
    return res.status(503).json({ message: 'Authentication is temporarily unavailable.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  }

  return next();
};

module.exports = { authenticateToken, getJwtSecret, requireRole };
