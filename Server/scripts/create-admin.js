require('dotenv').config();

const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const PASSWORD_MIN_LENGTH = 12;

async function createInitialAdmin() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (
    !name
    || !email
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !password
    || password.length < PASSWORD_MIN_LENGTH
    || Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new Error(
      'Set a valid ADMIN_NAME and ADMIN_EMAIL, plus an ADMIN_PASSWORD between 12 and 72 UTF-8 bytes.',
    );
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (existingAdmin) {
    throw new Error('An administrator account already exists; refusing to create another bootstrap admin.');
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(password, 12),
    },
    select: { email: true, id: true },
  });

  console.log(`Initial administrator created: ${user.email} (${user.id})`);
}

createInitialAdmin()
  .catch((error) => {
    console.error(`Could not create initial administrator: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
