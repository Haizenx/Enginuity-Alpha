const fs = require('fs');
const file = 'frontend/chat-front-end/src/components/SideBarMain.jsx';
let content = fs.readFileSync(file, 'utf8');

// Import ConfirmationModal
if (!content.includes('ConfirmationModal')) {
  content = content.replace(
    'import { NavLink',
    'import ConfirmationModal from "./ConfirmationModal";\nimport { NavLink'
  );
}

// Add state
content = content.replace(
  'const [isOpen, setIsOpen] = useState(false);',
  'const [isOpen, setIsOpen] = useState(false);\n  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);'
);

// Modify handleLogout
content = content.replace(
  'const handleLogout = async () => {',
  'const triggerLogout = () => setShowLogoutConfirm(true);\n\n  const handleLogout = async () => {'
);

// Replace action to point to triggerLogout
content = content.replace(
  '{ key: "logout", icon: <LogOut size={20} />, label: "Logout", action: handleLogout },',
  '{ key: "logout", icon: <LogOut size={20} />, label: "Logout", action: triggerLogout },'
);

// Append the modal JSX at the bottom inside the return
const modalJSX = `
      {showLogoutConfirm && (
        <ConfirmationModal
          title="Confirm Logout"
          message="Are you sure you want to log out of your account?"
          onConfirm={() => {
            setShowLogoutConfirm(false);
            handleLogout();
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </aside>`;

content = content.replace('</aside>', modalJSX);

fs.writeFileSync(file, content);
console.log('Sidebar logout fixed');
