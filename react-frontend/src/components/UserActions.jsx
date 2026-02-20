import { useState } from 'react'

export default function UserActions({
    user,
    showRename = true,
    showDelete = true,
    onRename = () => {},
    onDelete = () => {},
  }) {
    const [editing, setEditing] = useState(false)
    const [name, setName] = useState(user?.username || '')

    function startRename() {
      setName(user?.username || '')
      setEditing(true)
    }

    function saveRename() {
      if (!name || name.trim() === '') return
      onRename(user?.id, name.trim())
      setEditing(false)
    }

    function cancelRename() {
      setName(user?.username || '')
      setEditing(false)
    }

    function handleDelete() {
      const confirmMsg = `Delete user "${user?.username}"? This cannot be undone.`
      if (window.confirm(confirmMsg)) {
        onDelete(user?.id)
      }
    }

    return (
      <div className="user-actions">
        {!editing && <span className="user-actions__name">{user?.username}</span>}

        {showRename && !editing && (
          <button type="button" onClick={startRename} aria-label={`Rename ${user?.username}`}>
            Rename
          </button>
        )}

        {editing && (
          <span className="user-actions__editing">
            <input
              className="user-actions__input"
              aria-label="new name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveRename()}
            />
            <button type="button" onClick={saveRename}>Save</button>
            <button type="button" onClick={cancelRename}>Cancel</button>
          </span>
        )}

        {showDelete && (
          <button type="button" onClick={handleDelete} aria-label={`Delete ${user?.username}`}>
            Delete
          </button>
        )}
      </div>
    )
}
