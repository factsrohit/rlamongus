import React from "react";

export default function TaskProgress({ total, completed }) {
  const remaining = total - completed;

  return (
    <div className="card">
      <h2>Task Progress</h2>

      {total === null || total === undefined ? (
        <p>Loading...</p>
      ) : (
        <>
          <p><strong>Total Tasks:</strong> {total}</p>
          <p><strong>Completed:</strong> {completed}</p>
          <p><strong>Remaining:</strong> {remaining}</p>

          <div style={{
            marginTop: "10px",
            width: "100%",
            height: "10px",
            background: "#333",
            borderRadius: "5px",
            overflow: "hidden"
          }}>
            <div
              style={{
                height: "100%",
                width: `${(completed / total) * 100}%`,
                background: "#4affd9",
                transition: "width 0.3s ease"
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
