import { useState, useEffect } from 'react'
import { X, Calendar, Tag } from 'lucide-react'
import { format } from 'date-fns'

const STATUSES = ['todo', 'in_progress', 'review', 'done']
const PRIORITIES = ['low', 'medium', 'high', 'critical']
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }

export default function TaskModal({ task, projectId, members, onSave, onClose }) {
  const isEdit = !!task
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assigneeId: task?.assigneeId || '',
    dueDate: task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
    tags: task?.tags?.join(', ') || '',
    projectId: task?.projectId || projectId,
  })
  const [saving, setSaving] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        dueDate: form.dueDate || null,
        assigneeId: form.assigneeId || null,
      }
      await onSave(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" name="title" value={form.title} onChange={handle} placeholder="What needs to be done?" required autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" name="description" value={form.description} onChange={handle} placeholder="Add more details…" />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" name="status" value={form.status} onChange={handle}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" name="priority" value={form.priority} onChange={handle}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="form-select" name="assigneeId" value={form.assigneeId} onChange={handle}>
                <option value="">Unassigned</option>
                {members?.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" name="dueDate" value={form.dueDate} onChange={handle} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-input" name="tags" value={form.tags} onChange={handle} placeholder="frontend, bug, urgent" />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
