import bcrypt from "bcryptjs";
import SuperAdmin from "../models/superAdmin.model.js";

const createSuperAdmin = async () => {
  try {
    let sa = await SuperAdmin.findOne({ email: "superadmin@enginuity.com" });
    if (sa) {
      console.log("🔄 Resetting existing Super Admin password to verify single-hash...");
      sa.password = "mahirapnapassword";
      sa.isActive = true;
      sa.loginAttempts = 0;
      sa.lockedUntil = null;
      await sa.save();
      console.log("✅ Superadmin password updated/corrected");
      return;
    }

    await SuperAdmin.create({
      email: "superadmin@enginuity.com",
      fullName: "Super Admin",
      password: "mahirapnapassword",
      permissions: ["all"],
      isActive: true
    });

    console.log("✅ Superadmin account created in separate collection");
  } catch (error) {
    console.error("❌ Error creating superadmin:", error);
  }
};

export default createSuperAdmin;
