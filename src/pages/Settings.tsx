import { Navigate } from 'react-router-dom';

// Settings have been merged into the Profile page.
export function Settings() {
  return <Navigate to="/profile" replace />;
}
