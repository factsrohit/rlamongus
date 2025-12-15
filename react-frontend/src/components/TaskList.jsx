import React, { useState } from "react";
import { useTasks } from "../hooks/useTasks";

function TaskList() {
  const { tasks, refreshTasks } = useTasks();
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState({});

  if (!tasks || tasks.length === 0) {
    return (
      <div className="info-box">
        <h2>Tasks</h2>
        <p>No tasks assigned.</p>
      </div>
    );
  }

  const handleChange = (taskId, value) => {
    setAnswers((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleSubmit = async (taskId) => {
    const ans = (answers[taskId] || "").trim();
    if (!ans) return alert("Answer cannot be empty.");

    try {
      setSubmitting((s) => ({ ...s, [taskId]: true }));
      const res = await fetch("/submit-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, answer: ans }),
      });
      const data = await res.json();
      alert(data.message || (data.success ? "Submitted" : "Submission failed"));
      await refreshTasks();
      setAnswers((s) => ({ ...s, [taskId]: "" }));
    } catch (err) {
      console.error("Failed to submit task:", err);
      alert("Failed to submit task.");
    } finally {
      setSubmitting((s) => ({ ...s, [taskId]: false }));
    }
  };

  const requestHint = async (taskId) => {
    try {
      const res = await fetch("/request-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (data.success) alert(`Hint: ${data.hint}`);
      else alert(data.message || "No hint available.");
    } catch (err) {
      console.error("Error requesting hint:", err);
      alert("Error requesting hint.");
    }
  };

  return (
    <div className="info-box task-list">
      <h2>Your Tasks</h2>

      {tasks.map((task) => (
        <div key={task.id} className="task-item">
          <p className="task-question">{task.question}</p>

          {task.completed ? (
            <p>
              <em>✅ Completed</em>
            </p>
          ) : (
            <>
              <input
                type="text"
                className="task-input"
                placeholder="Your answer…"
                value={answers[task.id] || ""}
                onChange={(e) => handleChange(task.id, e.target.value)}
              />

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  className="task-submit-btn neon"
                  onClick={() => handleSubmit(task.id)}
                  disabled={submitting[task.id]}
                >
                  {submitting[task.id] ? "Submitting..." : "Submit"}
                </button>

                <button className="task-submit-btn" onClick={() => requestHint(task.id)}>
                  Request Hint
                </button>
              </div>
            </>
          )}

          {task.hint && <p className="task-hint">Hint: {task.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export default TaskList;
