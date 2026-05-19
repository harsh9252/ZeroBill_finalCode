import SuperAdminProfileSidebar from '../ProfileSidebar/SuperAdminProfileSidebar';

export default function SuperAdminHeader({ onToggleSidebar, collapsed, onLogout, currentPage = 'Dashboard', pageDescription = '' }) {
  // Page descriptions
  const pageDescriptions = {
    'Dashboard': 'Welcome to Super Admin Panel',
    'Account Approvals': 'Review and approve pending account requests',
    'Active Users': 'Manage and monitor all active users',
    'Transactions': 'View all software purchase transactions',
    'Plans': 'Manage pricing plans and features',
    'Deactivated Users': 'Manage deactivated and inactive user accounts',
    'Settings': 'Configure system settings'
  };

  const description = pageDescriptions[currentPage] || pageDescription;

  return (
    <div className={`fixed top-0 z-[800] bg-white border-b border-yellow-200 shadow-sm px-3 py-2 ${collapsed
      ? 'lg:left-20 left-0 right-0'
      : 'lg:left-60 left-0 right-0'
      }`}>
      {/* MOBILE LAYOUT */}
      <div className="block md:hidden">
        {/* FIRST ROW: TITLE LEFT, PROFILE RIGHT */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{currentPage}</h1>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <SuperAdminProfileSidebar onLogout={onLogout} />
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex md:items-center md:justify-between gap-3">
        {/* LEFT SECTION: TOGGLE BUTTON + TITLE */}
        <div className="flex items-center gap-3">
          {/* SIDEBAR TOGGLE BUTTON */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg hover:shadow-xl flex items-center justify-center flex-shrink-0"
            >
              <span className="absolute w-5 h-0.5 bg-white -translate-y-1.5"></span>
              <span className="absolute w-5 h-0.5 bg-white"></span>
              <span className="absolute w-5 h-0.5 bg-white translate-y-1.5"></span>
            </button>
          )}

          {/* TITLE */}
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">{currentPage}</h1>
            <p className="text-xs md:text-sm text-gray-500">{description}</p>
          </div>
        </div>

        {/* RIGHT SECTION: PROFILE SIDEBAR */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <SuperAdminProfileSidebar onLogout={onLogout} />
        </div>
      </div>
    </div>
  );
}
