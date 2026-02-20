import { useEffect, useState, useCallback } from 'react'
import UserTemplate from '../components/UserTemplate'
import '../styles/usermanagement.css'
import { NavLink } from 'react-router-dom'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/all-users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleRename(id, newName) {
    try {
      const res = await fetch('/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, username: newName })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Rename failed')
      await fetchUsers()
    } catch (err) {
      alert('Rename error: ' + err.message)
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch('/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Delete failed')
      await fetchUsers()
    } catch (err) {
      alert('Delete error: ' + err.message)
    }
  }

  return (
    <div className="user-management">
        <button className='dashboard-btn'>
            <NavLink to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
            Back to Dashboard
            </NavLink>
        </button>
      <h2>User Management</h2>
      {loading && <div>Loading users...</div>}
      {error && <div className="user-management__error">{error}</div>}
      {!loading && users.length === 0 && <div>No users found.</div>}
      <div className="user-list">
        {users.map(u => (
          <UserTemplate
            key={u.id}
            user={u}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
