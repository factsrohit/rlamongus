import { NavLink } from "react-router-dom";

export default function NavButton({ to, children, className = "", ...props }) {
  const mergedClassName = ["fake-neon-button", className].filter(Boolean).join(" ");
  return (
    <NavLink to={to} className={mergedClassName} {...props}>
      {children}
    </NavLink>
  );
}
