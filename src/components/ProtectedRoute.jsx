import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminTokenValid } from '../utils/adminAuth';

const ProtectedRoute = ({ children }) => {
  const tokenIsValid = isAdminTokenValid();

  if (!tokenIsValid) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
