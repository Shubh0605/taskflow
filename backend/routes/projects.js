const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Project, ProjectMember, User, Task } = require('../models');
const { auth, projectRole } = require('../middleware/auth');

// GET /api/projects — list my projects
router.get('/', auth, async (req, res) => {
  try {
    const memberships = await ProjectMember.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Project,
        include: [
          { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar'] },
          { model: User, as: 'members', attributes: ['id', 'name', 'email', 'avatar'], through: { attributes: ['role'] } }
        ]
      }]
    });

    const projects = memberships.map(m => ({
      ...m.Project.toJSON(),
      myRole: m.role
    }));

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects — create project
router.post('/', auth, [
  body('name').trim().isLength({ min: 2 }),
  body('color').optional().isHexColor()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, color } = req.body;
    const project = await Project.create({ name, description, color, ownerId: req.user.id });

    // Creator becomes admin
    await ProjectMember.create({ projectId: project.id, userId: req.user.id, role: 'admin' });

    res.status(201).json({ ...project.toJSON(), myRole: 'admin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:projectId
router.get('/:projectId', auth, projectRole('member'), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.projectId, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar'] },
        { model: User, as: 'members', attributes: ['id', 'name', 'email', 'avatar'], through: { attributes: ['role'] } },
        { model: Task, include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] }] }
      ]
    });
    res.json({ ...project.toJSON(), myRole: req.membership.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:projectId
router.put('/:projectId', auth, projectRole('admin'), [
  body('name').optional().trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.projectId);
    await project.update(req.body);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', auth, projectRole('admin'), async (req, res) => {
  try {
    await Project.destroy({ where: { id: req.params.projectId } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:projectId/members — invite member
router.post('/:projectId/members', auth, projectRole('admin'), [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, role = 'member' } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exists = await ProjectMember.findOne({ where: { projectId: req.params.projectId, userId: user.id } });
    if (exists) return res.status(400).json({ error: 'Already a member' });

    await ProjectMember.create({ projectId: req.params.projectId, userId: user.id, role });
    const updated = await Project.findByPk(req.params.projectId, {
      include: [{ model: User, as: 'members', attributes: ['id', 'name', 'email', 'avatar'], through: { attributes: ['role'] } }]
    });
    res.json(updated.members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', auth, projectRole('admin'), async (req, res) => {
  try {
    if (req.params.userId === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });
    await ProjectMember.destroy({ where: { projectId: req.params.projectId, userId: req.params.userId } });
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:projectId/members/:userId/role
router.put('/:projectId/members/:userId/role', auth, projectRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    await ProjectMember.update({ role }, { where: { projectId: req.params.projectId, userId: req.params.userId } });
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
