const express = require('express');

let prisma = null;

try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (error) {
  prisma = null;
}

const router = express.Router();
const memoryResources = [
  { id: '1', name: 'Main Lab', category: 'labs', isAvailable: true },
  { id: '2', name: 'Conference Room A', category: 'meeting rooms', isAvailable: true },
  { id: '3', name: 'Projector Kit', category: 'hardware', isAvailable: true },
  { id: '4', name: 'Football Set', category: 'sports equipment', isAvailable: true },
];

const getResources = async (category) => {
  if (!prisma) {
    if (!category || category === 'all') {
      return memoryResources;
    }

    return memoryResources.filter((item) => item.category === category);
  }

  if (!category || category === 'all') {
    return prisma.resource.findMany({ orderBy: { createdAt: 'desc' } });
  }

  return prisma.resource.findMany({
    where: { category: category.toString() },
    orderBy: { createdAt: 'desc' },
  });
};

const createResource = async (data) => {
  if (!prisma) {
    const newResource = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryResources.unshift(newResource);
    return newResource;
  }

  return prisma.resource.create({ data });
};

const updateResource = async (id, data) => {
  if (!prisma) {
    const index = memoryResources.findIndex((resource) => resource.id === id);

    if (index === -1) {
      throw new Error('Resource not found');
    }

    memoryResources[index] = {
      ...memoryResources[index],
      ...data,
      updatedAt: new Date(),
    };

    return memoryResources[index];
  }

  return prisma.resource.update({
    where: { id },
    data,
  });
};

const deleteResource = async (id) => {
  if (!prisma) {
    const index = memoryResources.findIndex((resource) => resource.id === id);

    if (index === -1) {
      throw new Error('Resource not found');
    }

    memoryResources.splice(index, 1);
    return { message: 'Resource deleted successfully.' };
  }

  await prisma.resource.delete({ where: { id } });
  return { message: 'Resource deleted successfully.' };
};

// GET /api/resources
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const resources = await getResources(category || 'all');
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

    const newResource = await createResource({ name, category, isAvailable });
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

    const updatedResource = await updateResource(id, {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(isAvailable !== undefined && { isAvailable }),
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
    const result = await deleteResource(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete resource', error: error.message });
  }
});

module.exports = router;
