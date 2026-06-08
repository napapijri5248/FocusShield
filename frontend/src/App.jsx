import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FocusProvider } from "./context/FocusContext";

// Components
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import FocusSession from "./pages/FocusSession";
import Analytics from "./pages/Analytics";

// Protected Route Guard Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-obsidian-950 text-slate-500 font-sans font-bold text-sm">
        Verifying secure profile connection...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Main App Layout Wrapper
const AppLayout = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      {user ? (
        <div className="flex-1 flex flex-col md:flex-row">
          <Sidebar />
          <main className="flex-1 flex bg-obsidian-950/40">
            <Routes>
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/focus" element={<ProtectedRoute><FocusSession /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      ) : (
        <main className="flex-grow flex bg-obsidian-950/40">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      )}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FocusProvider>
          <AppLayout />
        </FocusProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
