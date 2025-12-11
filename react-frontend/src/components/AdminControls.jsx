import React, { useState } from "react";
import { useAdminControls } from "../hooks/useAdminControls";

function AdminControls() {
    const { isLoading, startGame, startMeeting, endMeeting, convertCrewmates, clearScores, clearUsers, addTask } = useAdminControls();
    const [taskForm, setTaskForm] = useState({ question: "", answer: "", hint: "" });

    const handleStartGame = async () => {
        const result = await startGame();
        if (result.success) alert("✅ Game restarted!");
        else alert("❌ " + result.error);
    };

    const handleStartMeeting = async () => {
        const result = await startMeeting();
        if (result.success) alert("✅ Emergency meeting started!");
        else alert("❌ " + result.error);
    };

    const handleEndMeeting = async () => {
        const result = await endMeeting();
        if (result.success) alert("✅ Emergency meeting ended!");
        else alert("❌ " + result.error);
    };

    const handleConvertCrewmates = async () => {
        const result = await convertCrewmates();
        if (result.success) alert("✅ All crewmates converted to imposters!");
        else alert("❌ " + result.error);
    };

    const handleClearScores = async () => {
        const result = await clearScores();
        if (result.success) alert("✅ All scores cleared!");
        else alert("❌ " + result.error);
    };

    const handleClearUsers = async () => {
        const result = await clearUsers();
        if (result.success) alert("✅ All users cleared!");
        else alert("❌ " + result.error);
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!taskForm.question || !taskForm.answer) {
            alert("❌ Question and answer are required!");
            return;
        }

        const result = await addTask(taskForm.question, taskForm.answer, taskForm.hint);
        if (result.success) {
            alert("✅ Task added!");
            setTaskForm({ question: "", answer: "", hint: "" });
        } else {
            alert("❌ " + result.error);
        }
    };

    return (
        <div id="admincontrols" className="container">
            <h2>ADMIN CONTROLS</h2>

            <button className="neon" id="startGameBtn" onClick={handleStartGame} disabled={isLoading}>ReStart Game</button>
            <button className="alert" id="emergencystart" onClick={handleStartMeeting} disabled={isLoading}>🚨 Start Emergency Meeting</button>
            <button className="alert" id="emergencyend" onClick={handleEndMeeting} disabled={isLoading}>✅ End Emergency Meeting</button>
            <button className="alert" id="convertCrewmatesBtn" onClick={handleConvertCrewmates} disabled={isLoading}>🔄 Convert Crewmates to Imposters</button>
            <button className="alert" id="scorereset" onClick={handleClearScores} disabled={isLoading}>✅ Clear Scores of All Players</button>
            <button className="alert" id="clearusers" onClick={handleClearUsers} disabled={isLoading}>⚠️ Clear All Users (Except Admin)</button>

            <div className="info-box">
                <form id="add-task-form" className="container" onSubmit={handleAddTask}>
                    <input 
                        type="text" 
                        name="question" 
                        placeholder="Task Question" 
                        value={taskForm.question}
                        onChange={(e) => setTaskForm({...taskForm, question: e.target.value})}
                        required 
                    />
                    <input 
                        type="text" 
                        name="answer" 
                        placeholder="Correct Answer" 
                        value={taskForm.answer}
                        onChange={(e) => setTaskForm({...taskForm, answer: e.target.value})}
                        required 
                    />
                    <input 
                        type="text" 
                        name="hint" 
                        placeholder="Hint" 
                        value={taskForm.hint}
                        onChange={(e) => setTaskForm({...taskForm, hint: e.target.value})}
                    />
                    <button type="submit" disabled={isLoading}>Add Task</button>
                </form>
            </div>
        </div>
    );
}
export default AdminControls;