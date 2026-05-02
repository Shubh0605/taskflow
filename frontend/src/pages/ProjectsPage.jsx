import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import { Plus, Folder, Trash2, X, Users } from 'lucide-react'

const PROJECT_COLORS = ['#7c6fff','#3b82f6','#22c55e','#f97316','#ef4444','#eab308','#ec4899','#06b6d4']

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: PROJECT_COLORS[0] })
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const create = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.post('/projects', form)
      setProjects(p => [data, ...p])
      setShowModal(false)
      setForm({ name: '', description: '', color: PROJECT_COLORS[0] })
      toast.success('Project created!')
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  const deleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this project and all its tasks?')) return
    try {
      await api.delete(`/projects/${id}`)
      setProjects(p => p.filter(x => x.id !== id))
      toast.success('Project deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Project
        </button>
      </div>

      <div className="page-body">
        {loading ? (
          <p className="text-muted">Loading projects…</p>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <Folder size={48} style={{ margin: '0 auto 16px' }} />
            <h3>No projects yet</h3>
            <p>Create your first project to start managing tasks.</p>
            <button className="btn btn-primary mt-3" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Create Project
            </button>
          </div>
        ) : (
          <div className="grid-3">
            {projects.map(p => (
              <div key={p.id} className="card" style={{ cursor: 'pointer', position: 'relative' }}
                onClick={() => navigate(`/projects/${p.id}`)}>
                <div style={{ height: 4, background: p.color, borderRadius: '4px 4px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                <div className="flex items-center gap-3 mb-2 mt-1">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: p.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Folder size={18} style={{ color: p.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: 15 }}>{p.name}</div>
                    <span className={`badge-status role-${p.myRole}`} style={{ fontSize: 11, padding: '1px 8px' }}>{p.myRole}</span>
                  </div>
                  {p.myRole === 'admin' && (
                    <button className="btn btn-icon btn-danger btn-sm" onClick={(e) => deleteProject(p.id, e)} title="Delete project">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {p.description && (
                  <p className="text-sm text-muted mb-3 truncate">{p.description}</p>
                )}

                <div className="flex items-center gap-3 mt-2" style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Users size={11} />
                    {p.members?.length || 0} members
                  </div>
                  <span className={`badge-status status-${p.status}`} style={{ marginLeft: 'auto', fontSize: 11 }}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">New Project</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={create}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input className="form-input" name="name" value={form.name} onChange={handle} placeholder="e.g. Marketing Website" required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" name="description" value={form.description} onChange={handle} placeholder="What is this project about?" />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {PROJECT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : '2px solid transparent', cursor: 'pointer', outline: 'none' }} />
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
