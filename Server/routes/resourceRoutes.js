const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();
router.use(authenticateToken);

const ROOM_CATEGORIES = ['labs', 'meeting rooms'];
const CATEGORIES = [...ROOM_CATEGORIES, 'hardware', 'sports equipment'];
const memoryResources = [
  { id: '1', name: 'Main Lab', category: 'labs', isAvailable: true, timeSlots: ['09:00-10:00', '10:00-11:00'], quantity: null },
  { id: '2', name: 'Conference Room A', category: 'meeting rooms', isAvailable: true, timeSlots: ['13:00-14:00', '14:00-15:00'], quantity: null },
  { id: '3', name: 'Projector Kit', category: 'hardware', isAvailable: true, timeSlots: [], quantity: 12 },
  { id: '4', name: 'Football Set', category: 'sports equipment', isAvailable: true, timeSlots: [], quantity: 6 },
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

const getResourceById = async (id) => {
  if (!prisma) {
    return memoryResources.find((resource) => resource.id === id) || null;
  }

  return prisma.resource.findUnique({ where: { id } });
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

const validateResource = (resource) => {
  if (typeof resource.name !== 'string' || !resource.name.trim()) {
    return 'A resource name is required.';
  }

  if (!CATEGORIES.includes(resource.category)) {
    return 'Choose a valid resource category.';
  }

  if (resource.isAvailable !== undefined && typeof resource.isAvailable !== 'boolean') {
    return 'Availability must be true or false.';
  }

  if (ROOM_CATEGORIES.includes(resource.category)) {
    if (!Array.isArray(resource.timeSlots) || resource.timeSlots.length === 0) {
      return 'Add at least one booking time slot.';
    }

    const slots = [];
    for (const timeSlot of resource.timeSlots) {
      const match = typeof timeSlot === 'string'
        ? timeSlot.match(/^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/)
        : null;

      if (!match) {
        return 'Time slots must use valid start and end times.';
      }

      const start = `${match[1]}:${match[2]}`;
      const end = `${match[3]}:${match[4]}`;
      if (end <= start) {
        return 'A time slot must end after it starts.';
      }

      slots.push({ start, end });
    }

    slots.sort((left, right) => left.start.localeCompare(right.start));
    for (let index = 1; index < slots.length; index += 1) {
      if (slots[index].start < slots[index - 1].end) {
        return 'Time slots cannot overlap.';
      }
    }
  } else if (!Number.isInteger(Number(resource.quantity)) || Number(resource.quantity) < 1) {
    return 'Quantity must be a positive whole number.';
  }

  return null;
};

const toResourceData = (resource) => {
  const isRoom = ROOM_CATEGORIES.includes(resource.category);

  return {
    name: resource.name.trim(),
    category: resource.category,
    isAvailable: resource.isAvailable ?? true,
    timeSlots: isRoom ? resource.timeSlots : [],
    quantity: isRoom ? null : Number(resource.quantity),
  };
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

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const resources = await getResources(category || 'all');
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch resources', error: error.message });
  }
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const resource = {
      ...req.body,
      name: typeof req.body.name === 'string' ? req.body.name.trim() : req.body.name,
    };
    const validationError = validateResource(resource);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const newResource = await createResource(toResourceData(resource));
    res.status(201).json(newResource);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create resource', error: error.message });
  }
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const existingResource = await getResourceById(id);
    if (!existingResource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const resource = {
      ...existingResource,
      ...req.body,
      name: req.body.name === undefined ? existingResource.name : req.body.name.trim(),
    };
    const validationError = validateResource(resource);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const updatedResource = await updateResource(id, toResourceData(resource));

    res.status(200).json(updatedResource);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update resource', error: error.message });
  }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteResource(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete resource', error: error.message });
  }
});

module.exports = router;
