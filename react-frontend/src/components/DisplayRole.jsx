
export default function DisplayRole({role}) {
  

  const getRoleColor = () => {
    if (!role) return "#ccc";
    return role.toUpperCase() === "IMPOSTER" ? "#ff4a4a" : "#4affd9";
  };

  return (
    <div  style={{ borderColor: getRoleColor() }}>
      {role ?(
        <p style={{ fontSize: "1.2rem", fontWeight: "bold", color: getRoleColor() }}>
          Role: {role === "IMPOSTER" ? "🟥 IMPOSTER" : "🟦 CREWMATE"}
        </p>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
