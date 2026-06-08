import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const { login, isLoggingIn, authUser } = useAuthStore();

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
         {/* Light overlay for contrast */}
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

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10 bg-white">
         
         {/* Mobile Logo & Background */}
         <div className="md:hidden absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.pexels.com/photos/2036686/pexels-photo-2036686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')" }}>
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
         </div>
         
         <div className="md:hidden absolute top-8 left-8 flex items-center gap-3 z-20">
            <img src="/logo.svg" alt="Enginuity Logo" className="w-14 h-14 drop-shadow-md" />
         </div>

         <div className="w-full max-w-md bg-white/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none p-8 md:p-0 rounded-[2rem] md:rounded-none shadow-2xl md:shadow-none border border-white/50 md:border-none relative z-20">
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
         </div>
      </div>

    </div>
  );
};

export default LoginPage;
