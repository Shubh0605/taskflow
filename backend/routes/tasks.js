const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Task, User, Project, ProjectMember } = require('../models');
const { auth, projectRole } = require('../middleware/auth');

// GET /api/tasks/dashboard — my dashboard summary
router.get('/dashboard', auth, async (req, res) => {
  try {
    const now = new Date();

    // Get all projects the user belongs to
    const memberships = await ProjectMember.findAll({ where: { userId: req.user.id } });
    const projectIds = memberships.map(m => m.projectId);

    const [myTasks, overdue, byStatus, recentProjects, tasksPerUser, totalAllTasks] = await Promise.all([
      // My active tasks
      Task.count({ where: { assigneeId: req.user.id, status: { [Op.ne]: 'done' } } }),
      // My overdue tasks
      Task.count({ where: { assigneeId: req.user.id, dueDate: { [Op.lt]: now }, status: { [Op.ne]: 'done' } } }),
      // My tasks by status
      Task.findAll({
        where: { assigneeId: req.user.id },
        attributes: ['status', [Task.sequelize.fn('COUNT', Task.sequelize.col('status')), 'count']],
        group: ['status']
      }),
      // Recent projects with task counts
      ProjectMember.findAll({
        where: { userId: req.user.id },
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [{ model: Project, include: [{ model: Task }] }]
      }),
      // Tasks per user (across all projects I'm in)
      projectIds.length > 0 ? Task.findAll({
        where: { projectId: { [Op.in]: projectIds }, assigneeId: { [Op.ne]: null } },
        attributes: ['assigneeId', [Task.sequelize.fn('COUNT', Task.sequelize.col('Task.id')), 'count']],
        group: ['assigneeId', 'assignee.id'],
        include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] }]
      }) : [],
      // Total tasks across all my projects
      projectIds.length > 0 ? Task.count({ where: { projectId: { [Op.in]: projectIds } } }) : 0,
    ]);

    res.json({
      myTasks,
      overdue,
      totalAllTasks,
      byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.dataValues.count) }), {}),
      recentProjects: recentProjects.map(m => m.Project),
      tasksPerUser: tasksPerUser.map(r => ({
        user: r.assignee,
        count: parseInt(r.dataValues.count)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks — my assigned tasks (all projects)
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, overdue } = req.query;
    const where = { assigneeId: req.user.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (overdue === 'true') where.dueDate = { [Op.lt]: new Date() };

    const tasks = await Task.findAll({
      where,
      include: [
        { model: Project, attributes: ['id', 'name', 'color'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] }
      ],
      order: [['dueDate', 'ASC NULLS LAST'], ['createdAt', 'DESC']]
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/project/:projectId
router.get('/project/:projectId', auth, projectRole('member'), async (req, res) => {
  try {
    const { status, assigneeId } = req.query;
    const where = { projectId: req.params.projectId };
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'avatar'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — create task
router.post('/', auth, [
  body('title').trim().isLength({ min: 2 }),
  body('projectId').isUUID(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('dueDate').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { projectId } = req.body;

    // Check membership
    const membership = await ProjectMember.findOne({ where: { projectId, userId: req.user.id } });
    if (!membership) return res.status(403).json({ error: 'Not a project member' });

    const task = await Task.create({ ...req.body, creatorId: req.user.id });
    const full = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'avatar'] }
      ]
    });
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Check project membership
    const membership = await ProjectMember.findOne({ where: { projectId: task.projectId, userId: req.user.id } });
    if (!membership) return res.status(403).json({ error: 'Not a project member' });

    // Members can only update tasks assigned to them; admins can update any task
    if (membership.role === 'member' && task.assigneeId !== req.user.id) {
      return res.status(403).json({ error: 'Members can only update their own assigned tasks' });
    }

    await task.update(req.body);
    const full = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'avatar'] }
      ]
    });
    res.json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await ProjectMember.findOne({ where: { projectId: task.projectId, userId: req.user.id } });
    if (!membership) return res.status(403).json({ error: 'Not a project member' });

    // Only creator or admin can delete
    if (task.creatorId !== req.user.id && membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only creator or admin can delete tasks' });
    }

    await task.destroy();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
