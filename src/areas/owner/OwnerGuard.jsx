// Lets only a signed-in owner reach the panel's pages; anyone else goes to the owner sign-in, then comes back.
// Area: owner

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ownerToken } from './ownerSession';

export default function OwnerGuard() {
  const location = useLocation();
  if (ownerToken()) return <Outlet />;
  const next = encodeURIComponent(location.pathname + location.search);
  return <Navigate replace to={`/owner/sign-in?next=${next}`} />;
}
