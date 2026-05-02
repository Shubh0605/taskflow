import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import toast from 'react-hot-toast'
import TaskModal from '../components/TaskModal'
import { format, isPast } from 'date-fns'
import {
  Plus, Settings, UserPlus, Trash2, X, ArrowLeft,
  ChevronDown, CheckCircle2, Clock, AlertTriangle, MoreHorizontal
} from 'lucide-react'

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--text2)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'review', label: 'Review', color: 'var(--yellow)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
]
const PRIORITY_COLORS = { low: 'var(--green)', medium: 'var(--blue)', high: 'var(--yellow)', critical: 'var(--red)' }

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [taskModal, setTaskModal] = useState(null) // null | 'new' | task object
  const [activeTab, setActiveTab] = useState('board')
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })
  const [inviting, setInviting] = useState(false)
  const [taskMenuId, setTaskMenuId] = useState(null)

  const load = async () => {
    try {
      const [proj, taskRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/tasks/project/${projectId}`)
      ])
      setProject(proj.data)
      setTasks(taskRes.data)
    } catch (err) {
      toast.error('Failed to load project')
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const isAdmin = project?.myRole === 'admin'

  const saveTask = async (payload) => {
    try {
      if (taskModal && taskModal !== 'new') {
        const { data } = await api.put(`/tasks/${taskModal.id}`, payload)
        setTasks(t => t.map(x => x.id === data.id ? data : x))
        toast.success('Task updated')
      } else {
        const { data } = await api.post('/tasks', payload)
        setTasks(t => [data, ...t])
        toast.success('Task created')
      }
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || 'Failed to save task')
      throw err
    }
  }

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${id}`)
      setTasks(t => t.filter(x => x.id !== id))
      toast.success('Task deleted')
      setTaskMenuId(null)
    } catch {
      toast.error('Failed to delete task')
    }
  }

  const quickStatus = async (task, status) => {
    try {
      const { data } = await api.put(`/tasks/${task.id}`, { ...task, status })
      setTasks(t => t.map(x => x.id === data.id ? data : x))
    } catch {
      toast.error('Failed to update')
    }
  }

  const inviteMember = async e => {
    e.preventDefault()
    setInviting(true)
    try {
      await api.post(`/projects/${projectId}/members`, inviteForm)
      await load()
      setInviteModal(false)
      setInviteForm({ email: '', role: 'member' })
      toast.success('Member invited!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to invite')
    } finally {
      setInviting(false)
    }
  }

  const removeMember = async (memberId) => {
    if (!confirm('Remove this member?')) return
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`)
      await load()
      toast.success('Member removed')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove')
    }
  }

  const changeRole = async (memberId, role) => {
    try {
      await api.put(`/projects/${projectId}/members/${memberId}/role`, { role })
      await load()
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Loading project…</div>
  if (!project) return null

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key)
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button className="btn btn-icon btn-secondary" onClick={() => navigate('/projects')} title="Back">
            <ArrowLeft size={16} />
          </button>
          <div className="color-dot" style={{ background: project.color, width: 12, height: 12 }} />
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p className="text-muted text-sm mt-1">{project.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={() => setInviteModal(true)}>
              <UserPlus size={13} /> Invite
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}>
            <Plus size={13} /> Add Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 36px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}>
        {['board', 'list', 'members'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab ? 'var(--accent2)' : 'var(--text2)',
              borderBottom: activeTab === tab ? '2px solid var(--accent2)' : '2px solid transparent',
              fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif',
              textTransform: 'capitalize', transition: 'all 0.15s'
            }}>
            {tab}
          </button>
        ))}
      </div>

      <div className="page-body" style={{ overflowX: 'auto' }}>
        {/* BOARD VIEW */}
        {activeTab === 'board' && (
          <div className="kanban-board">
            {COLUMNS.map(col => (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-header">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span className="kanban-col-title">{col.label}</span>
                  </div>
                  <span className="kanban-count">{tasksByStatus[col.key].length}</span>
                </div>

                <div className="kanban-tasks">
                  {tasksByStatus[col.key].map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isMenuOpen={taskMenuId === task.id}
                      onOpenMenu={() => setTaskMenuId(task.id)}
                      onCloseMenu={() => setTaskMenuId(null)}
                      onEdit={() => { setTaskModal(task); setTaskMenuId(null) }}
                      onDelete={() => deleteTask(task.id)}
                      onStatusChange={status => quickStatus(task, status)}
                    />
                  ))}
                </div>

                <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
                  onClick={() => setTaskModal('new')}>
                  <Plus size={12} /> Add
                </button>
              </div>
            ))}
          </div>
        )}

        {/* LIST VIEW */}
        {activeTab === 'list' && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Task', 'Status', 'Priority', 'Assignee', 'Due Date', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>No tasks yet</td></tr>
                ) : tasks.map(task => (
                  <tr key={task.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px', fontSize: 14, fontWeight: 500, maxWidth: 260 }}>
                      <div className="truncate">{task.title}</div>
                      {task.description && <div className="text-xs text-muted truncate">{task.description}</div>}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <select className="form-select" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                        value={task.status} onChange={e => quickStatus(task, e.target.value)}>
                        {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_COLORS[task.priority] }}>
                        {task.priority}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="user-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                            {task.assignee.name[0]}
                          </div>
                          <span className="text-sm">{task.assignee.name}</span>
                        </div>
                      ) : <span className="text-xs text-muted">—</span>}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {task.dueDate ? (
                        <span className={`text-sm ${isPast(new Date(task.dueDate)) && task.status !== 'done' ? 'text-red' : 'text-muted'}`}>
                          {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      ) : <span className="text-xs text-muted">—</span>}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div className="flex gap-1">
                        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setTaskModal(task)}>Edit</button>
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteTask(task.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MEMBERS VIEW */}
        {activeTab === 'members' && (
          <div style={{ maxWidth: 600 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Team Members ({project.members?.length})</h3>
              {isAdmin && (
                <button className="btn btn-primary btn-sm" onClick={() => setInviteModal(true)}>
                  <UserPlus size={13} /> Invite Member
                </button>
              )}
            </div>

            {project.members?.map(member => (
              <div key={member.id} className="card flex items-center gap-3 mb-2" style={{ padding: '14px 16px' }}>
                <div className="user-avatar">
                  {member.avatar ? <img src={member.avatar} alt={member.name} /> : member.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{member.name}</div>
                  <div className="text-xs text-muted">{member.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && member.id !== user.id ? (
                    <select className="form-select" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                      value={member.ProjectMember?.role}
                      onChange={e => changeRole(member.id, e.target.value)}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`badge-status role-${member.ProjectMember?.role}`}>
                      {member.ProjectMember?.role}
                    </span>
                  )}
                  {isAdmin && member.id !== user.id && (
                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => removeMember(member.id)}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Modal */}
      {taskModal && (
        <TaskModal
          task={taskModal === 'new' ? null : taskModal}
          projectId={projectId}
          members={project.members}
          onSave={saveTask}
          onClose={() => setTaskModal(null)}
        />
      )}

      {/* Invite Modal */}
      {inviteModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setInviteModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Invite Member</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setInviteModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={inviteMember}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="form-input" type="email" value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="colleague@example.com" required autoFocus />
                <p className="form-error" style={{ color: 'var(--text2)', marginTop: 4, fontSize: 12 }}>
                  They must already have a TaskFlow account.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={inviteForm.role}
                  onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="member">Member — can view & edit tasks</option>
                  <option value="admin">Admin — full project control</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setInviteModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={inviting}>
                  {inviting ? 'Inviting…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, isMenuOpen, onOpenMenu, onCloseMenu, onEdit, onDelete, onStatusChange }) {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done'
  const PRIORITY_COLORS = { low: 'var(--green)', medium: 'var(--blue)', high: 'var(--yellow)', critical: 'var(--red)' }

  return (
    <div className="task-card" style={{ position: 'relative' }} onClick={onEdit}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>{task.title}</span>
        <button className="btn btn-icon btn-secondary" style={{ padding: '3px', marginLeft: 4, flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); isMenuOpen ? onCloseMenu() : onOpenMenu() }}>
          <MoreHorizontal size={13} />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-muted truncate mb-2">{task.description}</p>
      )}

      {task.tags?.length > 0 && (
        <div className="flex gap-1 mb-2" style={{ flexWrap: 'wrap' }}>
          {task.tags.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-1">
        <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[task.priority] }}>
          {task.priority?.toUpperCase()}
        </span>
        {task.assignee && (
          <div className="user-avatar" style={{ width: 20, height: 20, fontSize: 9, marginLeft: 'auto' }} title={task.assignee.name}>
            {task.assignee.name[0]}
          </div>
        )}
        {task.dueDate && (
          <span className={`text-xs ${isOverdue ? 'text-red' : 'text-muted'}`} style={{ marginLeft: task.assignee ? 0 : 'auto' }}>
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>

      {/* Dropdown menu */}
      {isMenuOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={e => { e.stopPropagation(); onCloseMenu() }} />
          <div style={{ position: 'absolute', right: 0, top: 28, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 6, zIndex: 50, minWidth: 140, boxShadow: 'var(--shadow)' }}
            onClick={e => e.stopPropagation()}>
            <button className="nav-link" style={{ fontSize: 13, padding: '6px 10px' }} onClick={onEdit}>Edit task</button>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <button className="nav-link" style={{ fontSize: 13, padding: '6px 10px', color: 'var(--red)' }} onClick={onDelete}>Delete task</button>
          </div>
        </>
      )}
    </div>
  )
}
