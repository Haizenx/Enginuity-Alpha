import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, CalendarDays, Activity, ShieldCheck } from "lucide-react";

const MAX_MB = 5; // Match backend limit

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      console.warn('Please upload a valid image (JPEG, PNG, or WEBP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_MB * 1024 * 1024) {
      console.warn(`Image must be less than ${MAX_MB}MB`);
      return;
    }

    // Preview immediately
    const reader = new FileReader();
    reader.onload = () => setSelectedImg(reader.result);
    reader.readAsDataURL(file);

    // Upload using store method with correct field name
    try {
      await updateProfile({ file });
      // Preview will be replaced by actual Cloudinary URL from authUser update
    } catch (err) {
      console.error("Avatar upload failed", err);
      // Reset preview on error
      setSelectedImg(null);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-slate-50 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div 
         className="absolute inset-0 opacity-[0.03] pointer-events-none" 
         style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      ></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        <div className="mb-6 px-2">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Account Profile</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Manage your personal information and system preferences.</p>
        </div>

        <div className="shadow-2xl shadow-slate-200/50 rounded-[2rem] bg-white border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Professional Header Banner */}
          <div className="h-48 bg-slate-900 relative overflow-hidden">
             {/* Architectural Grid overlay */}
             <div 
                className="absolute inset-0 opacity-20" 
                style={{ 
                   backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)", 
                   backgroundSize: "24px 24px" 
                }}
             ></div>
             {/* Soft glow */}
             <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none mix-blend-screen"></div>
          </div>

          <div className="px-6 sm:px-10 pb-10">
            {/* Profile Pic & Title Section */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-20 mb-12 relative z-10">
              <div className="relative group">
                <div className="p-2 bg-white rounded-2xl shadow-lg border border-slate-100">
                   <img
                     src={selectedImg || authUser?.profilePic || "/avatar.png"}
                     alt="Profile"
                     className="w-36 h-36 rounded-xl object-cover"
                   />
                </div>
                
                <label
                  htmlFor="avatar-upload"
                  className={`absolute -bottom-3 -right-3 bg-slate-900 text-white hover:bg-indigo-600 hover:scale-105 shadow-xl shadow-slate-900/20
                    p-3 rounded-xl cursor-pointer transition-all duration-300 group-hover:-translate-y-1
                    ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
                  title="Upload new photo"
                >
                  <Camera className="w-5 h-5" strokeWidth={2.5} />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              </div>

              <div className="text-center sm:text-left pb-2">
                 <h2 className="text-3xl font-black text-slate-800 tracking-tight">{authUser?.fullName || authUser?.name || "User"}</h2>
                 <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                       <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                       {authUser?.role || authUser?.userType || "Member"}
                    </span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Personal Info Module */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                       <User className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Personal Information</h3>
                 </div>

                 <div className="space-y-5">
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                     <div className="px-4 py-3.5 bg-slate-50/50 rounded-xl border border-slate-200/60 text-sm font-semibold text-slate-800">
                       {authUser?.fullName || authUser?.name || "Not provided"}
                     </div>
                   </div>

                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                     <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50/50 rounded-xl border border-slate-200/60 text-sm font-semibold text-slate-800">
                       <Mail className="w-4 h-4 text-slate-400" />
                       {authUser?.email || "Not provided"}
                     </div>
                   </div>
                   
                   {authUser?.contactNumber && (
                     <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Number</label>
                       <div className="px-4 py-3.5 bg-slate-50/50 rounded-xl border border-slate-200/60 text-sm font-semibold text-slate-800">
                         {authUser.contactNumber}
                       </div>
                     </div>
                   )}
                 </div>
              </div>

              {/* Account Status Module */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                       <Activity className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Account Status</h3>
                 </div>

                 <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-200/60 hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">Member Since</span>
                     </div>
                     <span className="text-sm font-black text-slate-800 bg-white shadow-sm border border-slate-100 px-3 py-1 rounded-lg">
                        {authUser?.createdAt ? authUser.createdAt.split("T")[0] : "-"}
                     </span>
                   </div>

                   <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-200/60 hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">System Status</span>
                     </div>
                     <span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Active
                     </span>
                   </div>
                 </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
