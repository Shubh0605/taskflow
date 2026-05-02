import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { format, isPast } from 'date-fns'
import { CheckSquare, AlertTriangle, Filter } from 'lucide-react'

const STATUSES = ['', 'todo', 'in_progress', 'review', 'done']
const PRIORITIES = ['', 'low', 'medium', 'high', 'critical']
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const PRIORITY_COLORS = { low: 'var(--green)', medium: 'var(--blue)', high: 'var(--yellow)', critical: 'var(--red)' }

export default function MyTasksPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', priority: '', overdue: false })

  const load = () => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.overdue) params.overdue = 'true'
    api.get('/tasks', { params }).then(r => setTasks(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filters])

  const quickStatus = async (task, status) => {
    try {
      const { data } = await api.put(`/tasks/${task.id}`, { ...task, status })
      setTasks(t => t.map(x => x.id === data.id ? data : x))
    } catch { }
  }

  const grouped = {
    overdue: tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'done'),
    active: tasks.filter(t => !(['done'].includes(t.status)) && !(t.dueDate && isPast(new Date(t.dueDate)))),
    done: tasks.filter(t => t.status === 'done'),
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Tasks</h1>
        <div className="flex gap-2 items-center">
          <Filter size={14} style={{ color: 'var(--text2)' }} />
          <select className="form-select" style={{ padding: '6px 10px', fontSize: 13, width: 'auto' }}
            value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select className="form-select" style={{ padding: '6px 10px', fontSize: 13, width: 'auto' }}
            value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
            <option value="">All Priority</option>
            {PRIORITIES.filter(Boolean).map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm" style={{ cursor: 'pointer', color: 'var(--text2)' }}>
            <input type="checkbox" checked={filters.overdue} onChange={e => setFilters(f => ({ ...f, overdue: e.target.checked }))} />
            Overdue only
          </label>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <p className="text-muted">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <CheckSquare size={48} style={{ margin: '0 auto 16px' }} />
            <h3>No tasks found</h3>
            <p>Tasks assigned to you will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {grouped.overdue.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 mb-3" style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
                  <AlertTriangle size={14} /> Overdue ({grouped.overdue.length})
                </h3>
                <TaskList tasks={grouped.overdue} onStatusChange={quickStatus} onNavigate={navigate} />
              </section>
            )}

            {grouped.active.length > 0 && (
              <section>
                <h3 className="mb-3" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>
                  Active ({grouped.active.length})
                </h3>
                <TaskList tasks={grouped.active} onStatusChange={quickStatus} onNavigate={navigate} />
              </section>
            )}

            {grouped.done.length > 0 && (
              <section>
                <h3 className="mb-3" style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                  Completed ({grouped.done.length})
                </h3>
                <TaskList tasks={grouped.done} onStatusChange={quickStatus} onNavigate={navigate} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskList({ tasks, onStatusChange, onNavigate }) {
  const PRIORITY_COLORS = { low: 'var(--green)', medium: 'var(--blue)', high: 'var(--yellow)', critical: 'var(--red)' }
  const COLUMNS = [
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'Done' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {tasks.map(task => (
        <div key={task.id} className="card flex items-center gap-3" style={{ padding: '12px 16px', cursor: 'pointer' }}
          onClick={() => onNavigate(`/projects/${task.projectId}`)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2">
              <span style={{ fontWeight: 600, fontSize: 14 }} className="truncate">{task.title}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[task.priority], flexShrink: 0 }}>
                {task.priority?.toUpperCase()}
              </span>
            </div>
            {task.Project && (
              <div className="flex items-center gap-2 mt-1">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.Project.color, flexShrink: 0 }} />
                <span className="text-xs text-muted">{task.Project.name}</span>
              </div>
            )}
          </div>

          {task.dueDate && (
            <span className={`text-xs ${isPast(new Date(task.dueDate)) && task.status !== 'done' ? 'text-red' : 'text-muted'}`} style={{ flexShrink: 0 }}>
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}

          <select className="form-select" style={{ padding: '4px 8px', fontSize: 12, width: 'auto', flexShrink: 0 }}
            value={task.status}
            onChange={e => { e.stopPropagation(); onStatusChange(task, e.target.value) }}
            onClick={e => e.stopPropagation()}>
            {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}
