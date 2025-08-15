import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CreateShift from './components/CreateShift';
import CreateUser from './components/CreateUser';
import EditUser from './components/EditUser';
import Settings from './components/Settings';
import AttendanceUpload from './components/AttendanceUpload';
import MonthlySalaryReport from './components/MonthlySalaryReport';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  return (
    <Router>
      <div className="font-noto-sans-arabic">
        {isAuthenticated && <Navbar setIsAuthenticated={setIsAuthenticated} />}
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login setIsAuthenticated={setIsAuthenticated} />}
          />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/create-shift"
            element={isAuthenticated ? <CreateShift /> : <Navigate to="/login" />}
          />
          <Route
            path="/create-user"
            element={isAuthenticated ? <CreateUser /> : <Navigate to="/login" />}
          />
          <Route
            path="/edit-user"
            element={isAuthenticated ? <EditUser /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings"
            element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
          />
          <Route
            path="/attendance-upload"
            element={isAuthenticated ? <AttendanceUpload isAuthenticated={isAuthenticated} /> : <Navigate to="/login" />}
          />
          <Route
            path="/monthly-salary-report"
            element={isAuthenticated ? <MonthlySalaryReport /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
