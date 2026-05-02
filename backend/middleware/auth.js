const jwt = require('jsonwebtoken');
const { User, ProjectMember } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_in_prod');
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const projectRole = (requiredRole) => async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    const membership = await ProjectMember.findOne({
      where: { projectId, userId: req.user.id }
    });

    if (!membership) return res.status(403).json({ error: 'Not a project member' });

    if (requiredRole === 'admin' && membership.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.membership = membership;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { auth, projectRole };
