const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/resources
// Supports optional category filtering: /api/resources?category=labs
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    const resources = await prisma.resource.findMany({
      where: category ? { category: category.toString() } : {},
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch resources', error: error.message });
  }
});

// POST /api/resources
router.post('/', async (req, res) => {
  try {
    const { name, category, isAvailable = true } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: 'Name and category are required.' });
    }

    const newResource = await prisma.resource.create({
      data: {
        name,
        category,
        isAvailable,
      },
    });

    res.status(201).json(newResource);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create resource', error: error.message });
  }
});

// PUT /api/resources/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, isAvailable } = req.body;

    const updatedResource = await prisma.resource.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
    });

    res.status(200).json(updatedResource);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update resource', error: error.message });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.resource.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Resource deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete resource', error: error.message });
  }
});

module.exports = router;
