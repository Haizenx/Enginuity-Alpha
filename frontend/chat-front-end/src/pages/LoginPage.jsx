import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const { login, isLoggingIn, authUser } = useAuthStore();

  // Forgot Password States
  const [view, setView] = useState("LOGIN"); // "LOGIN", "FORGOT_EMAIL", "FORGOT_OTP"
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    const role = authUser.role;
    if (role === "superadmin") navigate("/dashboard");
    else navigate("/dashboard");
  }, [authUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, platform: "web" };
      const user = await login(payload);
      const role = user?.role;
      if (role === "superadmin") navigate("/dashboard");
      else navigate("/dashboard");
    } catch (error) {
      const msg = error?.message || "Login failed";
      if (msg.toLowerCase().includes("client") && msg.toLowerCase().includes("mobile")) {
        toast.error("Client accounts can only sign in on mobile.");
      } else {
        toast.error(msg);
      }
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      return toast.error("Please enter your email.");
    }
    setIsSendingCode(true);
    try {
      await axiosInstance.post("/auth/forgot-password-mobile", { email: resetEmail });
      toast.success("A verification OTP has been sent to your email.");
      setView("FORGOT_OTP");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send code.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim() || !newPassword.trim()) {
      return toast.error("Please enter both the OTP and a new password.");
    }
    setIsResetting(true);
    try {
      await axiosInstance.post("/auth/reset-password-mobile", { 
        email: resetEmail, 
        otp, 
        newPassword 
      });
      toast.success("Your password has been successfully reset! You can now log in.");
      setView("LOGIN");
      setOtp("");
      setNewPassword("");
      setFormData(prev => ({ ...prev, password: "" }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password.");
    } finally {
      setIsResetting(false);
    }
  };

  const inputClassName = "bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors focus:bg-white";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white relative overflow-hidden">
      
      {/* Left Side: Brand Identity with Architecture Background */}
      <div 
         className="hidden md:flex flex-col justify-between items-center text-center w-[45%] p-12 relative z-10 bg-cover bg-center"
         style={{
            backgroundImage: "url('https://images.pexels.com/photos/2036686/pexels-photo-2036686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
         }}
      >
         <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]"></div>
         <div className="flex items-center gap-4 relative z-10">
            <img src="/logo.svg" alt="Enginuity Logo" className="w-20 h-20 drop-shadow-lg" />
         </div>
         <div className="relative z-10 max-w-md">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6 drop-shadow-sm">
               Build the future with precision.
            </h1>
            <p className="text-lg font-medium text-slate-700 mb-8 drop-shadow-sm">
               Seamlessly manage your construction projects, collaborate in real-time, and drive efficiency across every phase of development.
            </p>
         </div>
         <div className="relative z-10 text-sm font-bold text-slate-500">
            © {new Date().getFullYear()} Enginuity. All rights reserved.
         </div>
      </div>

      {/* Right Side: Login / Forgot Password Forms */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10 bg-white">
         <div className="md:hidden absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.pexels.com/photos/2036686/pexels-photo-2036686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')" }}>
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
         </div>
         
         <div className="md:hidden absolute top-8 left-8 flex items-center gap-3 z-20">
            <img src="/logo.svg" alt="Enginuity Logo" className="w-14 h-14 drop-shadow-md" />
         </div>

         <div className="w-full max-w-md bg-white/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none p-8 md:p-0 rounded-[2rem] md:rounded-none shadow-2xl md:shadow-none border border-white/50 md:border-none relative z-20">
            
            {view === "LOGIN" && (
              <>
                <div className="mb-10 text-center md:text-left">
                   <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Welcome Back</h2>
                   <p className="text-sm font-medium text-slate-500">Please enter your credentials to continue.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email / Username</label>
                      <input
                         type="text"
                         className={inputClassName}
                         placeholder="you@example.com"
                         value={formData.email}
                         onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                         required
                         autoComplete="username"
                      />
                   </div>
                   <div>
                      <div className="flex justify-between items-center mb-2 ml-1 mr-1">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                      </div>
                      <div className="relative">
                         <input
                            type={showPassword ? "text" : "password"}
                            className={`${inputClassName} pr-12`}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            autoComplete="current-password"
                         />
                         <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                         >
                            {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                         </button>
                      </div>
                      <div className="flex justify-end mt-2">
                        <button 
                          type="button" 
                          onClick={() => setView("FORGOT_EMAIL")} 
                          className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                        >
                          Forgot Password?
                        </button>
                      </div>
                   </div>

                   <button
                      type="submit"
                      className="w-full py-4 rounded-xl font-bold tracking-wide text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-600/30 flex justify-center items-center gap-3 mt-4 group"
                      disabled={isLoggingIn}
                   >
                      {isLoggingIn ? (
                         <>
                            <Loader2 className="h-5 w-5 animate-spin" /> Authenticating...
                         </>
                      ) : (
                         <>
                            Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                         </>
                      )}
                   </button>
                </form>
              </>
            )}

            {view === "FORGOT_EMAIL" && (
              <>
                <div className="mb-10 text-center md:text-left">
                   <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Reset Password</h2>
                   <p className="text-sm font-medium text-slate-500">Enter your email to receive a 6-digit OTP code.</p>
                </div>
                <form onSubmit={handleSendCode} className="space-y-5">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                      <input
                         type="email"
                         className={inputClassName}
                         placeholder="you@example.com"
                         value={resetEmail}
                         onChange={(e) => setResetEmail(e.target.value)}
                         required
                      />
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3 mt-4">
                     <button
                        type="button"
                        onClick={() => setView("LOGIN")}
                        className="flex-1 py-4 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all text-center"
                     >
                        Cancel
                     </button>
                     <button
                        type="submit"
                        className="flex-1 py-4 rounded-xl font-bold tracking-wide text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-600/30 flex justify-center items-center gap-2"
                        disabled={isSendingCode}
                     >
                        {isSendingCode ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : "Send Code"}
                     </button>
                   </div>
                </form>
              </>
            )}

            {view === "FORGOT_OTP" && (
              <>
                <div className="mb-10 text-center md:text-left">
                   <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Enter OTP</h2>
                   <p className="text-sm font-medium text-slate-500">Enter the 6-digit code sent to your email and set a new password.</p>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-5">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Verification Code</label>
                      <input
                         type="text"
                         className={`${inputClassName} text-center tracking-[0.5em] font-mono text-lg`}
                         placeholder="••••••"
                         maxLength={6}
                         value={otp}
                         onChange={(e) => setOtp(e.target.value)}
                         required
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">New Password</label>
                      <div className="relative">
                         <input
                            type={showPassword ? "text" : "password"}
                            className={`${inputClassName} pr-12`}
                            placeholder="New password (min 8 chars)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                         />
                         <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                         >
                            {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                         </button>
                      </div>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3 mt-4">
                     <button
                        type="button"
                        onClick={() => {
                          setView("LOGIN");
                          setOtp("");
                          setNewPassword("");
                        }}
                        className="flex-1 py-4 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all text-center"
                     >
                        Cancel
                     </button>
                     <button
                        type="submit"
                        className="flex-1 py-4 rounded-xl font-bold tracking-wide text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-600/30 flex justify-center items-center gap-2"
                        disabled={isResetting}
                     >
                        {isResetting ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : "Reset Password"}
                     </button>
                   </div>
                </form>
              </>
            )}

         </div>
      </div>
    </div>
  );
};

export default LoginPage;
