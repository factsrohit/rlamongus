import { useTasks } from "../hooks/useTasks";
import ShowTask from "./showtask";

function TaskList() {
  const { tasks, refreshTasks } = useTasks();

  if (!tasks || tasks.length === 0) {
    return (
      <div className="info-box">
        <h2>Tasks</h2>
        <p>No tasks assigned.</p>
      </div>
    );
  }

  const handleTaskComplete = async (taskId) => {
    await refreshTasks();
  };

  return (
    <div className="info-box task-list">
      <h2>Your Tasks</h2>

      {tasks.map((task) => (
        <ShowTask 
          key={task.id} 
          task={task} 
          onTaskComplete={handleTaskComplete}
        />
      ))}
    </div>
  );
}

export default TaskList;
