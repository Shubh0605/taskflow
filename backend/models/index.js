const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'sqlite::memory:', {
  dialect: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
  storage: process.env.DATABASE_URL ? undefined : './dev.sqlite',
  logging: false,
  dialectOptions: process.env.DATABASE_URL ? {
    ssl: { require: true, rejectUnauthorized: false }
  } : {}
});

// ── Models ──────────────────────────────────────────────

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  avatar: { type: DataTypes.STRING, defaultValue: null }
});

const Project = sequelize.define('Project', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  color: { type: DataTypes.STRING, defaultValue: '#6366f1' },
  status: { type: DataTypes.ENUM('active', 'archived'), defaultValue: 'active' }
});

const ProjectMember = sequelize.define('ProjectMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  role: { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member' }
});

const Task = sequelize.define('Task', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('todo', 'in_progress', 'review', 'done'), defaultValue: 'todo' },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  dueDate: { type: DataTypes.DATE },
  tags: { type: DataTypes.JSON, defaultValue: [] }
});

// ── Associations ─────────────────────────────────────────

User.belongsToMany(Project, { through: ProjectMember, foreignKey: 'userId' });
Project.belongsToMany(User, { through: ProjectMember, foreignKey: 'projectId', as: 'members' });
Project.hasMany(ProjectMember, { foreignKey: 'projectId' });
ProjectMember.belongsTo(User, { foreignKey: 'userId' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId' });

Project.hasMany(Task, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Task.belongsTo(Project, { foreignKey: 'projectId' });

User.hasMany(Task, { foreignKey: 'assigneeId', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });

User.hasMany(Task, { foreignKey: 'creatorId', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

module.exports = { sequelize, User, Project, ProjectMember, Task };
