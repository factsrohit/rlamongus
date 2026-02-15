import { useState } from 'react';
import { useEditTasks } from '../hooks/edittasks';
import '../styles/taskeditor.css';

const TaskEditor = ({ task, onTaskUpdated, onTaskDeleted }) => {
  const { updateTask, deleteTask, loading, error, clearError } = useEditTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    question: task?.question || '',
    answer: task?.answer || '',
    hint: task?.hint || '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      clearError();
      const updatedTask = await updateTask(task.id, formData);
      setIsEditing(false);
      if (updatedTask?.message) {
        alert(updatedTask.message);
      }
      if (onTaskUpdated) {
        onTaskUpdated(updatedTask);
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        clearError();
        const response = await deleteTask(task.id);
        if (onTaskDeleted) {
          onTaskDeleted(task.id);
        }
        if (response?.message) {
          alert(response.message);
        }
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      question: task?.question || '',
      answer: task?.answer || '',
      hint: task?.hint || '',
    });
    setIsEditing(false);
    clearError();
  };

  return (
    <div className="task-editor-card">
      {error && (
        <div className="task-editor-error">
          <p>{error}</p>
          <button className="error-close" onClick={clearError}>×</button>
        </div>
      )}

      {!isEditing ? (
        <div className="task-view-mode">
          <div className="task-content">
            <div className="task-field">
              <label>Question:</label>
              <p className="task-text">{task?.question || 'No question'}</p>
            </div>

            <div className="task-field">
              <label>Answer:</label>
              <p className="task-text">{task?.answer || 'No answer'}</p>
            </div>

            <div className="task-field">
              <label>Hint:</label>
              <p className="task-text">{task?.hint || 'No hint'}</p>
            </div>
          </div>

          <div className="task-actions">
            <button
              className="btn btn-edit"
              onClick={() => setIsEditing(true)}
              disabled={loading}
            >
              Edit
            </button>
            <button
              className="btn btn-delete"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      ) : (
        <div className="task-edit-mode">
          <div className="task-field">
            <label htmlFor="question">Question:</label>
            <textarea
              id="question"
              name="question"
              value={formData.question}
              onChange={handleInputChange}
              placeholder="Enter task question"
              rows="3"
            />
          </div>

          <div className="task-field">
            <label htmlFor="answer">Answer:</label>
            <textarea
              id="answer"
              name="answer"
              value={formData.answer}
              onChange={handleInputChange}
              placeholder="Enter task answer"
              rows="2"
            />
          </div>

          <div className="task-field">
            <label htmlFor="hint">Hint:</label>
            <textarea
              id="hint"
              name="hint"
              value={formData.hint}
              onChange={handleInputChange}
              placeholder="Enter task hint"
              rows="2"
            />
          </div>

          <div className="task-actions">
            <button
              className="btn btn-save"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              className="btn btn-cancel"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskEditor;
