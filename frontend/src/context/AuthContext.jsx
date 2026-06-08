import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const API_BASE = "https://focusshield.onrender.com/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth State from Local Storage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          
          // Configure Axios Authorization Header globally
          axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
          
          // Validate token and fetch fresh user profile
          const res = await axios.get(`${API_BASE}/auth/profile`);
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
        } catch (error) {
          console.warn("[AuthContext] Stored token invalid or expired. Logging out.");
          clearAuth();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // Sign In Handler
  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      
      if (res.data.success) {
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        
        // Configure Axios Header
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        
        // Persist to Local Storage
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Invalid credentials or network failure"
      };
    }
  };

  // Sign Up Handler
  const signup = async (username, email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/signup`, { username, email, password });
      
      if (res.data.success) {
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed. Try again."
      };
    }
  };

  // Logout Handler
  const logout = () => {
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
