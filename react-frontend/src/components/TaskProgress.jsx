
import { useTaskProgress } from "../hooks/useTaskProgress";
export default function TaskProgress() {
  const  {totalTasks, completedTasks, remainingTasks, error }= useTaskProgress();



  return (
    <div className="info-box task-progress">
      {error && <p>Unable to fetch game status.</p>}
      
      {!error &&  (<>
          <h2>Task Progress</h2>
          <p><strong>Total Tasks:</strong> {totalTasks}</p>
          <p><strong>Completed Tasks:</strong> {completedTasks}</p>
          <p><strong>Remaining:</strong> {remainingTasks}%</p>
        </>)
      }
    </div>
  );
}
