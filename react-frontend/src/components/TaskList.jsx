import { useState } from "react";

function TaskList({ tasks, onSubmitAnswer }) {
  const [answers, setAnswers] = useState({});

  // If no tasks assigned
  if (!tasks || tasks.length === 0) {
    return (
      <div className="card">
        <h2>Tasks</h2>
        <p>No tasks assigned.</p>
      </div>
    );
  }

  const handleChange = (taskId, value) => {
    setAnswers(prev => ({ ...prev, [taskId]: value }));
  };

  const handleSubmit = (taskId) => {
    const ans = answers[taskId];
    if (!ans || ans.trim() === "") return;

    onSubmitAnswer(taskId, ans.trim());

    // Optional: clear input after submit
    // setAnswers(prev => ({ ...prev, [taskId]: "" }));
  };

  return (
    <div className="card">
      <h2>Your Tasks</h2>

      {tasks.map((task) => (
        <div key={task.id} className="task-item">
          <p className="task-question">{task.question}</p>

          <input
            type="text"
            className="task-input"
            placeholder="Your answer…"
            value={answers[task.id] || ""}
            onChange={(e) => handleChange(task.id, e.target.value)}
          />

          <button
            className="task-submit-btn"
            onClick={() => handleSubmit(task.id)}
          >
            Submit
          </button>

          {task.hint && (
            <p className="task-hint">
              Hint: {task.hint}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default TaskList;
