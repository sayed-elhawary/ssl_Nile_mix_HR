import React, { useState, useEffect, Component } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CreateShift from './components/CreateShift';
import CreateUser from './components/CreateUser';
import EditUser from './components/EditUser';
import Settings from './components/Settings';
import AttendanceUpload from './components/AttendanceUpload';
import MonthlySalaryReport from './components/MonthlySalaryReport';
import MonthlyBonusReport from './components/MonthlyBonusReport';
import Violations from './components/Violations';
import CreateAdvance from './components/CreateAdvance';
import socket from './socket';

// Error Boundary لالتقاط أخطاء الـ rendering
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">حدث خطأ!</h1>
            <p className="text-gray-600">{this.state.error?.message || 'Something went wrong.'}</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => window.location.reload()}
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// مكون مساعد لتسجيل المسار الحالي
const RouteLogger = () => {
  const location = useLocation();
  useEffect(() => {
    console.log('التنقل إلى المسار:', location.pathname);
    if (location.pathname === '/attendance-upload') {
      console.log('تم الوصول إلى مسار رفع البصمة');
    }
  }, [location]);
  return null;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    // تسجيل حالة المصادقة
    const token = localStorage.getItem('token');
    console.log('التوكن:', token, 'isAuthenticated:', isAuthenticated);

    // التحقق من اتصال Socket.IO
    socket.on('connect', () => {
      console.log('Socket.IO متصل:', socket.id);
      if (isAuthenticated) {
        socket.emit('message', 'Frontend connected!');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('خطأ في اتصال Socket.IO:', error.message);
    });

    socket.on('message', (data) => {
      console.log('رسالة من الـ backend:', data);
    });

    // تنظيف عند إغلاق التطبيق
    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('message');
    };
  }, [isAuthenticated]);

  return (
    <ErrorBoundary>
      <Router>
        <div className="font-noto-sans-arabic">
          <RouteLogger />
          {isAuthenticated && <Navbar setIsAuthenticated={setIsAuthenticated} />}
          <Routes>
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login setIsAuthenticated={setIsAuthenticated} />}
            />
            <Route
              path="/"
              element={isAuthenticated ? <Dashboard socket={socket} /> : <Navigate to="/login" />}
            />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <Dashboard socket={socket} /> : <Navigate to="/login" />}
            />
            <Route
              path="/create-shift"
              element={isAuthenticated ? <CreateShift socket={socket} /> : <Navigate to="/login" />}
            />
            <Route
              path="/create-user"
              element={isAuthenticated ? <CreateUser socket={socket} /> : <Navigate to="/login" />}
            />
            <Route
              path="/edit-user"
              element={isAuthenticated ? <EditUser socket={socket} /> : <Navigate to="/login" />}
            />
            <Route
              path="/settings"
              element={isAuthenticated ? <Settings socket={socket} /> : <Navigate to="/login" />}
            />
            <Route
              path="/attendance-upload"
              element={
                isAuthenticated ? (
                  <>
                    {console.log('دخول إلى /attendance-upload، isAuthenticated:', isAuthenticated)}
                    <AttendanceUpload socket={socket} isAuthenticated={isAuthenticated} />
                  </>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/monthly-salary-report"
              element={isAuthenticated ? <MonthlySalaryReport socket={socket} /> : <Navigate to="/login" />}
            />
            <Route
              path="/monthly-bonus-report"
              element={isAuthenticated ? <MonthlyBonusReport socket={socket} /> : <Navigate to="/login" />}
            />
            <Route
              path="/violations"
              element={isAuthenticated ? <Violations socket={socket} /> : <Navigate to="/login" />}
            />
            <Route
              path="/create-advance"
              element={isAuthenticated ? <CreateAdvance socket={socket} /> : <Navigate to="/login" />}
            />
            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
