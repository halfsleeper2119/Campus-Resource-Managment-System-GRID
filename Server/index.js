require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const resourceRoutes = require('./routes/resourceRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 bytes before starting the server.');
}

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());

app.get('/api/status', (req, res) => {
  res.json({ message: 'Campus Resource API is running' });
});

app.use('/api/auth', authRoutes);

app.use('/api/resources', resourceRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
