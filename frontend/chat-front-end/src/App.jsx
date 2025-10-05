import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Components & Pages
import Navbar from "./components/Navbar";
import SideBarMain from "./components/SideBarMain.jsx";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboard.jsx";
import SuperAdminManageAccPage from "./pages/SuperAdminManageAccPage.jsx";
import SignUpPage from "./pages/SignUpPage";
import ChatPage from "./pages/ChatPage.jsx";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ProjectPage from "./pages/ProjectPage";
import DashboardPage from "./pages/Dashboard.jsx";
import PayrollPage from "./pages/PayrollPage.jsx";
import FileHandlingPage from "./pages/FileHandlingPage.jsx";
import ProjectDetailsPage from "./pages/ProjectDetails.jsx";
import BlueprintPage from "./pages/BlueprintPage.jsx";
import QuotationPage from "./pages/QuotationPage.jsx";

import { useAuthStore } from "./store/useAuthStore";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useThemeStore } from "./store/useThemeStore";

// Simple role guard component
const RequireRole = ({ roles, children }) => {
  const { authUser } = useAuthStore();
  const role = authUser?.role || authUser?.userType;
  if (!authUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();
  const location = useLocation();

  console.log({ onlineUsers });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  console.log("Current authUser state:", authUser);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-base-200">
        <Loader className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  const noLayoutRoutes = ["/login", "/signup"];
  const showLayout = authUser && !noLayoutRoutes.includes(location.pathname);

  return (
    <div data-theme={theme} className="h-full flex flex-col bg-base-200">
      {showLayout ? (
        <>
          <Navbar />
          <div className="flex flex-1 overflow-hidden pt-16">
            <SideBarMain />
            <main className="flex-1 overflow-y-auto bg-base-200">
              <Routes>
                {/* Authenticated routes */}
                <Route
                  path="/dashboard"
                  element={authUser?.role === "superadmin" ? <SuperAdminDashboardPage /> : <DashboardPage />}
                />
                <Route path="/chats" element={<ChatPage />} />
                <Route path="/projects" element={<ProjectPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/file-handling" element={<FileHandlingPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/blueprint" element={<BlueprintPage />} />
                <Route path="/quotation" element={<QuotationPage />} />

                {/* Super Admin only */}
                <Route
                  path="/superadmin/accounts"
                  element={
                    <RequireRole roles={["superadmin"]}>
                      <SuperAdminManageAccPage />
                    </RequireRole>
                  }
                />

                {/* Fallback for unknown authenticated paths */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </>
      ) : (
        <Routes>
          <Route
            path="/signup"
            element={!authUser ? <SignUpPage /> : <Navigate to="/dashboard" replace />}
          />
          <Route
            path="/login"
            element={!authUser ? <LoginPage /> : <Navigate to="/dashboard" replace />}
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
      <Toaster />
    </div>
  );
};

export default App;
