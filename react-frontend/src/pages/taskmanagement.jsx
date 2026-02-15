
import { useState, useEffect } from 'react';
import TaskEditor from '../components/taskeditor';
import '../styles/taskmanagement.css';
import { NavLink } from 'react-router-dom';

export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    hint: '',
  });
  const [addingTask, setAddingTask] = useState(false);
  const [addError, setAddError] = useState(null);

  // Fetch all tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      setTasks(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    setAddError(null);

    if (!formData.question.trim() || !formData.answer.trim()) {
      setAddError('Question and answer are required.');
      return;
    }

    try {
      setAddingTask(true);
      const response = await fetch('/add-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to add task');
      }

      // Reset form and refresh tasks
      setFormData({
        question: '',
        answer: '',
        hint: '',
      });
      setShowAddForm(false);
      await fetchTasks();
      setAddingTask(false);
    } catch (err) {
      console.error('Error adding task:', err);
      setAddError(err.message);
      setAddingTask(false);
    }
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.task.id ? updatedTask.task : task))
    );
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  return (
    <div className="task-management-container">
      <div className="task-management-header">
        <h1>Task Management</h1>
        <button className='dashboard-btn'>
            <NavLink to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
            Back to Dashboard
            </NavLink>
        </button>
        <button
          className="btn btn-add-task"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add New Task'}
        </button>
      </div>

      {/* Add New Task Form */}
      {showAddForm && (
        <div className="add-task-form-container">
          <h2>Add New Task to Task Pool</h2>
          {addError && (
            <div className="add-error">
              <p>{addError}</p>
              <button className="error-close" onClick={() => setAddError(null)}>
                ×
              </button>
            </div>
          )}
          <form onSubmit={handleAddTask} className="add-task-form">
            <div className="form-group">
              <label htmlFor="question">Question:</label>
              <textarea
                id="question"
                name="question"
                value={formData.question}
                onChange={handleFormChange}
                placeholder="Enter task question"
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="answer">Answer:</label>
              <textarea
                id="answer"
                name="answer"
                value={formData.answer}
                onChange={handleFormChange}
                placeholder="Enter task answer"
                rows="2"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="hint">Hint (optional):</label>
              <textarea
                id="hint"
                name="hint"
                value={formData.hint}
                onChange={handleFormChange}
                placeholder="Enter task hint"
                rows="2"
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-submit"
                disabled={addingTask}
              >
                {addingTask ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-container">
          <p>{error}</p>
          <button onClick={fetchTasks}>Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-container">
          <p>Loading tasks...</p>
        </div>
      )}

      {/* Tasks List */}
      {!loading && !error && (
        <div className="tasks-container">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks available. Add a new task to get started!</p>
            </div>
          ) : (
            <div className="tasks-grid">
              <p className="task-count">Total Tasks: {tasks.length}</p>
              {tasks.map((task) => (
                <TaskEditor
                  key={task.id}
                  task={task}
                  onTaskUpdated={handleTaskUpdated}
                  onTaskDeleted={handleTaskDeleted}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}