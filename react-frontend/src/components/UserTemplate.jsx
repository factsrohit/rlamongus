
import UserActions from './UserActions'

export default function UserTemplate({ user, showActions = true, onRename, onDelete }) {
  if (!user) return null

  return (
    <div className="user-template">
      <div className="user-template__info">
        <div className="user-template__name">{user.username} <small className="user-template__role">({user.role})</small></div>
        <div className="user-template__score">Score: {user.score ?? 0}</div>
      </div>

      {showActions && (
        <div className="user-template__actions">
          <UserActions user={user} onRename={onRename} onDelete={onDelete} />
        </div>
      )}
    </div>
  )
}
