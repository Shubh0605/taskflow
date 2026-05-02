import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { format, isPast } from 'date-fns'
import { CheckCircle2, Clock, AlertTriangle, FolderKanban, ArrowRight } from 'lucide-react'

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const PRIORITY_COLORS = { low: 'var(--green)', medium: 'var(--blue)', high: 'var(--yellow)', critical: 'var(--red)' }

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [myTasks, setMyTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/tasks/dashboard'),
      api.get('/tasks')
    ]).then(([dash, tasks]) => {
      setData(dash.data)
      setMyTasks(tasks.data.slice(0, 8))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: 40, color: 'var(--text2)' }}>Loading dashboard…</div>
  )

  const totalActive = (data?.byStatus?.todo || 0) + (data?.byStatus?.in_progress || 0) + (data?.byStatus?.review || 0)
  const totalDone = data?.byStatus?.done || 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-muted text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid mb-4">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent2)' }}>{totalActive}</div>
            <div className="stat-label flex items-center gap-2 mt-1">
              <Clock size={13} /> My Active Tasks
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--red)' }}>{data?.overdue || 0}</div>
            <div className="stat-label flex items-center gap-2 mt-1">
              <AlertTriangle size={13} /> Overdue
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--green)' }}>{totalDone}</div>
            <div className="stat-label flex items-center gap-2 mt-1">
              <CheckCircle2 size={13} /> Completed
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--blue)' }}>{data?.totalAllTasks || 0}</div>
            <div className="stat-label flex items-center gap-2 mt-1">
              <FolderKanban size={13} /> Total Tasks (All Projects)
            </div>
          </div>
        </div>

        <div className="grid-2">
          {/* My Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>My Tasks</h2>
              <button onClick={() => navigate('/my-tasks')} className="btn btn-secondary btn-sm">
                View All <ArrowRight size={12} />
              </button>
            </div>

            {myTasks.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '30px 20px' }}>
                  <CheckCircle2 size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p className="text-muted text-sm">No tasks assigned to you yet.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myTasks.map(task => (
                  <div key={task.id} className="task-card" onClick={() => navigate(`/projects/${task.projectId}`)}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }} className="truncate">{task.title}</span>
                      <span className={`badge-status status-${task.status}`} style={{ marginLeft: 8, flexShrink: 0 }}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="color-dot" style={{ background: task.Project?.color || '#6366f1' }} />
                      <span className="text-xs text-muted truncate">{task.Project?.name}</span>
                      {task.dueDate && (
                        <span className={`text-xs ml-auto ${isPast(new Date(task.dueDate)) && task.status !== 'done' ? 'text-red' : 'text-muted'}`}>
                          {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 600, color: PRIORITY_COLORS[task.priority] }}>
                        {task.priority?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Projects */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>Recent Projects</h2>
              <button onClick={() => navigate('/projects')} className="btn btn-secondary btn-sm">
                View All <ArrowRight size={12} />
              </button>
            </div>

            {!data?.recentProjects?.length ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '30px 20px' }}>
                  <FolderKanban size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p className="text-muted text-sm">No projects yet.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.recentProjects.map(project => {
                  const done = project.Tasks?.filter(t => t.status === 'done').length || 0
                  const total = project.Tasks?.length || 0
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <div key={project.id} className="card" style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/projects/${project.id}`)}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="color-dot" style={{ background: project.color, width: 12, height: 12 }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{project.name}</span>
                        <span className="text-xs text-muted ml-auto">{total} tasks</span>
                      </div>
                      <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                        <div style={{ background: project.color, width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.4s' }} />
                      </div>
                      <div className="text-xs text-muted mt-1">{pct}% complete</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown + Tasks Per User */}
        {totalActive + totalDone > 0 && (
          <div className="grid-2 mt-4">
            {/* Status Overview */}
            <div className="card">
              <h3 className="font-display mb-3" style={{ fontSize: 15, fontWeight: 700 }}>Task Status Overview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                  const count = data?.byStatus?.[key] || 0
                  const total = Object.values(data?.byStatus || {}).reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  const colors = { todo: 'var(--text2)', in_progress: 'var(--blue)', review: 'var(--yellow)', done: 'var(--green)' }
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: colors[key] }}>{count}</span>
                      </div>
                      <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{ background: colors[key], width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tasks Per User */}
            <div className="card">
              <h3 className="font-display mb-3" style={{ fontSize: 15, fontWeight: 700 }}>Tasks Per Team Member</h3>
              {!data?.tasksPerUser?.length ? (
                <p className="text-sm text-muted">No assigned tasks across your projects yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.tasksPerUser
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 6)
                    .map(({ user, count }) => {
                      const maxCount = Math.max(...data.tasksPerUser.map(x => x.count))
                      const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
                      return (
                        <div key={user?.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="user-avatar" style={{ width: 22, height: 22, fontSize: 10, flexShrink: 0 }}>
                                {user?.name?.[0] || '?'}
                              </div>
                              <span style={{ fontSize: 12, color: 'var(--text)' }}>{user?.name || 'Unknown'}</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent2)' }}>{count}</span>
                          </div>
                          <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                            <div style={{ background: 'var(--accent)', width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
