import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquareText,
  ListChecks,
  Settings as SettingsIcon,
  Users as UsersIcon,
  Video,
  Folders,
  LogOut,
  File,
  Users2,
  Shield,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

// Persist across remounts within the module
let unreadChatsCount = 0;

const SideBarMain = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(unreadChatsCount);
  const navigate = useNavigate();
  const location = useLocation();

  // Single source of truth for user + socket
  const authUser = useAuthStore((s) => s.authUser);
  const storeSocket = useAuthStore((s) => s.socket);
  const logout = useAuthStore((s) => s.logout);

  const currentUserId = String(authUser?._id || "");
  const isSuperAdmin = authUser?.role === "superadmin" || authUser?.userType === "superadmin";

  // Reset badge when viewing chats
  useEffect(() => {
    if (location.pathname.startsWith("/chats") && unreadCount > 0) {
      unreadChatsCount = 0;
      setUnreadCount(0);
    }
  }, [location.pathname, unreadCount]);

  // Increment badge when receiving a message for this user and not on /chats
  useEffect(() => {
    if (!storeSocket || !currentUserId) return;

    const handler = (payload) => {
      const receiverId = String(
        typeof payload?.receiverId === "object" ? payload.receiverId?._id : payload?.receiverId || ""
      );
      const onChats = location.pathname.startsWith("/chats");
      if ((receiverId === currentUserId || !receiverId) && !onChats) {
        unreadChatsCount += 1;
        setUnreadCount(unreadChatsCount);
      }
    };

    storeSocket.on("message:received", handler);
    return () => storeSocket.off("message:received", handler);
  }, [storeSocket, currentUserId, location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err?.message || err);
    }
  };

  const sidebarMenuItems = useMemo(
    () => [
      { key: "dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/dashboard" },
      { key: "chats", icon: <MessageSquareText size={20} />, label: "Chats", path: "/chats", badge: unreadCount },
      { key: "projects", icon: <ListChecks size={20} />, label: "Projects", path: "/projects" },
      { key: "blueprint", icon: <Folders size={20} />, label: "AI Assistant", path: "/blueprint" },
      { key: "quotation", icon: <File size={20} />, label: "Quotation", path: "/quotation" },

      // Super Admin-only item
      ...(isSuperAdmin
        ? [
            {
              key: "manage-accounts",
              icon: (
                <span className="inline-flex items-center gap-1">
                  <Users2 size={18} />
                  <Shield size={12} className="opacity-70" />
                </span>
              ),
              label: "Manage accounts",
              path: "/superadmin/accounts",
            },
          ]
        : []),
    ],
    [unreadCount, isSuperAdmin]
  );

  const sidebarMenuItemsOthers = [
    { key: "settings", icon: <SettingsIcon size={20} />, label: "Settings", path: "/settings" },
    { key: "profile", icon: <UsersIcon size={20} />, label: "Profile", path: "/profile" },
    { key: "logout", icon: <LogOut size={20} />, label: "Logout", action: handleLogout },
  ];

  const activeClassName = "active";

  const renderIconWithBadge = (item) => {
    if (item.key !== "chats" || !unreadCount) return item.icon;
    return (
      <span className="relative inline-flex">
        {item.icon}
        <span
          className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-[10px] leading-4 text-white text-center ring-2 ring-base-100"
          aria-label="Unread messages"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      </span>
    );
  };

  return (
    <aside
      className={[
        "bg-base-100 shadow-lg flex-shrink-0 transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-20",
        "h-screen",
      ].join(" ")}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className={["flex flex-col h-full py-6", isOpen ? "px-4" : "px-0 items-center", "mt-[20vh]"].join(" ")}>
        <div className="space-y-6 w-full">
          {/* Menu */}
          <div>
            <span
              className={[
                "text-xs font-semibold uppercase text-base-content/60 mb-2",
                isOpen ? "block px-4" : "hidden",
              ].join(" ")}
            >
              Menu
            </span>
            <ul className={["menu", isOpen ? "menu-sm" : "menu-xs items-center"].join(" ")}>
              {sidebarMenuItems.map((item) => (
                <li key={item.key} className="w-full" data-tip={!isOpen ? item.label : null}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      [
                        isActive ? activeClassName : "",
                        "flex items-center",
                        isOpen ? "gap-2 justify-start py-2 px-4" : "justify-center h-12 w-12 p-0",
                      ].join(" ")
                    }
                    onClick={() => {
                      if (item.key === "chats") {
                        unreadChatsCount = 0;
                        setUnreadCount(0);
                      }
                    }}
                  >
                    {renderIconWithBadge(item)}
                    {isOpen && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Others + Logout */}
          <div>
            <span
              className={[
                "text-xs font-semibold uppercase text-base-content/60 mb-2",
                isOpen ? "block px-4" : "hidden",
              ].join(" ")}
            >
              Others
            </span>
            <ul className={["menu", isOpen ? "menu-sm" : "menu-xs items-center"].join(" ")}>
              {sidebarMenuItemsOthers.map((item) => (
                <li key={item.key} className="w-full" data-tip={!isOpen ? item.label : null}>
                  {item.path ? (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        [
                          isActive ? activeClassName : "",
                          "flex items-center",
                          isOpen ? "gap-2 justify-start py-2 px-4" : "justify-center h-12 w-12 p-0",
                        ].join(" ")
                      }
                    >
                      {item.icon}
                      {isOpen && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  ) : (
                    <button
                      onClick={item.action}
                      className={[
                        "flex items-center w-full text-left hover:bg-base-200 transition",
                        isOpen ? "gap-2 justify-start py-2 px-4" : "justify-center h-12 w-12 p-0",
                      ].join(" ")}
                    >
                      {item.icon}
                      {isOpen && <span className="truncate">{item.label}</span>}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SideBarMain;
