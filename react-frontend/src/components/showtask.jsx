import React, { useState } from "react";
import { useTasks } from "../hooks/useTasks";

function ShowTask({ task, onTaskComplete }) {
  const { refreshTasks, submitTask, requestHint } = useTasks();
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (value) => {
    setAnswer(value);
  };

  const handleSubmit = async () => {
    const ans = answer.trim();
    if (!ans) return alert("Answer cannot be empty.");

    try {
      setSubmitting(true);
      const data = await submitTask(task.id, ans);
      alert(data.message || (data.success ? "Submitted" : "Submission failed"));
      
      if (data.success) {
        setAnswer("");
        await refreshTasks();
        if (onTaskComplete) {
          onTaskComplete(task.id);
        }
      }
    } catch (err) {
      console.error("Failed to submit task:", err);
      alert("Failed to submit task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestHint = async () => {
    try {
      const data = await requestHint(task.id);
      if (data.success) alert(`Hint: ${data.hint}`);
      else alert(data.message || "No hint available.");
    } catch (err) {
      console.error("Error requesting hint:", err);
      alert("Error requesting hint.");
    }
  };

  return (
    <div className="task-item">
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
            value={answer}
            onChange={(e) => handleChange(e.target.value)}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="task-submit-btn neon"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>

            <button className="task-submit-btn" onClick={handleRequestHint}>
              Request Hint
            </button>
          </div>
        </>
      )}

      {task.hint && <p className="task-hint">Hint: {task.hint}</p>}
    </div>
  );
}

export default ShowTask;
