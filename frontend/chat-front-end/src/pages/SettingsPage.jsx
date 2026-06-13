import React, { useEffect, useState } from "react";
import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { useAuthStore } from "../store/useAuthStore";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import { Send, Eye, EyeOff, EyeOff as EyeOffIcon, Settings2, ShieldCheck, Palette, X, Lock } from "lucide-react";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's the project going?", isSent: false },
  { id: 2, content: "We're doing great! The foundation is set.", isSent: true },
];

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

const confirmWithToast = (message = "Discard changes?") =>
  new Promise((resolve) => {
    const id = `confirm-${Date.now()}`;
    toast.custom(
      (t) => (
        <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl shadow-xl p-4 w-[300px]">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                <ShieldCheck size={16} />
             </div>
             <p className="text-sm font-bold">{message}</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
            >
              Keep editing
            </button>
            <button
              className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors shadow-sm shadow-rose-500/20"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
            >
              Discard
            </button>
          </div>
        </div>
      ),
      { id, duration: 8000 }
    );
  });

const MiniChatPreview = () => {
  const now = "12:00 PM";
  return (
    <div className="rounded-[2rem] border border-white shadow-xl overflow-hidden bg-white/80 backdrop-blur-xl transition-all duration-300">
      <div className="p-6 bg-slate-50/50">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[0.8rem] bg-indigo-100 flex items-center justify-center text-indigo-600 font-black shadow-sm">
                  JD
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">John Doe</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Online</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-5 min-h-[200px] max-h-[200px] overflow-y-auto bg-slate-50/30">
              {PREVIEW_MESSAGES.map((message) => (
                <div key={message.id} className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`
                      max-w-[80%] rounded-2xl p-3.5 shadow-sm
                      ${message.isSent 
                          ? "bg-indigo-600 text-white rounded-br-sm" 
                          : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"}
                    `}
                  >
                    <p className="text-sm font-medium">{message.content}</p>
                    <p
                      className={`
                        text-[10px] mt-2 font-bold uppercase tracking-wider
                        ${message.isSent ? "text-indigo-200" : "text-slate-400"}
                      `}
                    >
                      {now}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="flex gap-2 bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                <input
                  type="text"
                  className="bg-transparent flex-1 text-sm px-3 font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  placeholder="Type a message..."
                  value="This is a preview"
                  readOnly
                />
                <button className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">
                  <Send size={16} className="-ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore(); 

  const userRole = user?.role || user?.userType || "client";

  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const openPwdModal = () => setIsPwdModalOpen(true);
  const closePwdModal = () => {
    setIsPwdModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setIsUpdating(false);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const requestClosePwdModal = async () => {
    if (currentPassword.length > 0 || newPassword.length > 0 || confirmNewPassword.length > 0) {
      const ok = await confirmWithToast("Discard changes?");
      if (!ok) return;
    }
    closePwdModal();
  };

  useEffect(() => {
    if (!isPwdModalOpen) return;
    const handler = async (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (currentPassword.length > 0 || newPassword.length > 0 || confirmNewPassword.length > 0) {
          const ok = await confirmWithToast("Discard changes?");
          if (ok) closePwdModal();
        } else {
          closePwdModal();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPwdModalOpen, currentPassword, newPassword, confirmNewPassword]);

  const validateNewPassword = (pwd) => STRONG_PASSWORD_REGEX.test(pwd);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (userRole !== "superadmin" && !currentPassword) {
      return toast.error("Please enter current password.");
    }
    if (!newPassword || !confirmNewPassword) {
      return toast.error("Please fill in all password fields.");
    }
    if (newPassword !== confirmNewPassword) {
      return toast.error("New passwords do not match.");
    }
    if (!validateNewPassword(newPassword)) {
      return toast.error(
        "Password must be at least 8 characters and include upper, lower, number, and special."
      );
    }

    setIsUpdating(true);
    try {
      if (userRole === "superadmin") {
        await axiosInstance.put("/auth/superadmin/password", {
          newPassword,
          confirmNewPassword,
        });
      } else {
        await axiosInstance.put("/auth/password", {
          currentPassword,
          newPassword,
          confirmNewPassword,
        });
      }

      toast.success("Password updated successfully.");
      closePwdModal();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to update password.";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const [recoveryEmail, setRecoveryEmail] = useState(user?.recoveryEmail || "");
  const [isUpdatingRecovery, setIsUpdatingRecovery] = useState(false);

  const handleUpdateRecovery = async (e) => {
    e.preventDefault();
    if (!recoveryEmail) return toast.error("Please enter a recovery email.");
    setIsUpdatingRecovery(true);
    try {
      await axiosInstance.put("/auth/update-profile", { recoveryEmail });
      toast.success("Recovery email updated successfully.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update recovery email.");
    } finally {
      setIsUpdatingRecovery(false);
    }
  };

  const inputClassName = "bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors focus:bg-white";

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 relative overflow-hidden bg-slate-50/50">
      {/* Ambient Background Blobs */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-rose-200/30 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-200/30 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 bg-slate-800 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg shadow-slate-800/20">
             <Settings2 size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Settings</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Configure your security and interface preferences.</p>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shadow-inner">
                <ShieldCheck size={20} />
             </div>
             <h2 className="text-xl font-black text-slate-800 tracking-tight">Security & Authentication</h2>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-6 pl-13">
            Update the account password set during onboarding. Ensure you use a strong password.
          </p>
          <div className="pl-13">
             <button 
                className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-800 text-white hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2" 
                onClick={openPwdModal}
             >
                <Lock size={16} /> Change Password
             </button>
          </div>
        </div>

        {/* Recovery Email Section (For PMs/Clients) */}
        {userRole !== "superadmin" && (
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shadow-inner">
                  <Send size={20} />
               </div>
               <h2 className="text-xl font-black text-slate-800 tracking-tight">Account Recovery</h2>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-6 pl-13">
              Set a dedicated recovery email address so you can securely reset your password via OTP if you ever forget it.
            </p>
            <form onSubmit={handleUpdateRecovery} className="pl-13 flex flex-col sm:flex-row gap-3 max-w-lg">
              <input 
                type="email" 
                className={inputClassName} 
                placeholder="Recovery Email" 
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap"
                disabled={isUpdatingRecovery}
              >
                {isUpdatingRecovery ? "Updating..." : "Save Email"}
              </button>
            </form>
          </div>
        )}

        {/* Theme Section */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center shadow-inner">
                <Palette size={20} />
             </div>
             <h2 className="text-xl font-black text-slate-800 tracking-tight">Interface Theme</h2>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-6 pl-13">
            Choose a color theme for your chat interface and elements.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 pl-13">
            {THEMES.map((t) => (
              <button
                key={t}
                className={`group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 border
                  ${theme === t 
                     ? "bg-indigo-50 border-indigo-200 shadow-sm scale-105" 
                     : "bg-slate-50/50 border-transparent hover:bg-slate-100 hover:border-slate-200"}`}
                onClick={() => setTheme(t)}
              >
                <div className="relative h-10 w-full rounded-xl overflow-hidden shadow-inner border border-slate-200/50" data-theme={t}>
                  <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                    <div className="rounded-md bg-primary" />
                    <div className="rounded-md bg-secondary" />
                    <div className="rounded-md bg-accent" />
                    <div className="rounded-md bg-neutral" />
                  </div>
                </div>
                <span className={`text-[11px] font-bold tracking-wide truncate w-full text-center uppercase
                   ${theme === t ? "text-indigo-600" : "text-slate-500"}`}>
                  {t}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview Section */}
        <div>
           <div className="flex items-center gap-3 mb-4 px-2">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Live Chat Preview</h2>
           </div>
           <MiniChatPreview />
        </div>
      </div>

      {/* Controlled Password Modal */}
      {isPwdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={requestClosePwdModal} aria-hidden="true" />

          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 z-10 border border-slate-100 scale-in-center">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
                    <Lock size={20} />
                 </div>
                 <h3 className="font-black text-xl tracking-tight text-slate-800">Update Password</h3>
              </div>
              <button onClick={requestClosePwdModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleUpdatePassword}>
              {/* Current Password */}
              {userRole !== "superadmin" && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      className={`${inputClassName} pr-12`}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required={userRole !== "superadmin"}
                    />
                    <button
                      type="button"
                      aria-label={showCurrent ? "Hide current password" : "Show current password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      onClick={() => setShowCurrent((v) => !v)}
                    >
                      {showCurrent ? <Eye size={18} /> : <EyeOffIcon size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    className={`${inputClassName} pr-12`}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showNew ? "Hide new password" : "Show new password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowNew((v) => !v)}
                  >
                    {showNew ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  Must be at least 8 characters, include uppercase, lowercase, number, and special character.
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className={`${inputClassName} pr-12`}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" onClick={requestClosePwdModal} disabled={isUpdating}>
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-800 text-white hover:bg-slate-700 transition-all shadow-sm" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
