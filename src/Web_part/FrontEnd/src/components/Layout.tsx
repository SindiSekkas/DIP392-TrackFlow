// src/Web_part/FrontEnd/src/components/Layout.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Calendar,
  BarChart2,
  Settings,
  BookOpen,
  Search,
  Bell,
  UserPlus,
  Layers,
  Box,
  Building,
  CreditCard
} from 'lucide-react';
//import LogoImage from '/FlowCat.webp';
import LogoImage from '/Logo/logo-transparent_notext_blue.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SupportPanel from './SupportPanel';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  expanded?: boolean;
  id: string;
  hoveredItem: string | null;
  setHoveredItem: (id: string | null) => void;
}

interface AccountItemProps {
  expanded: boolean;
  profileMenuOpen: boolean;
  onClick: () => void;
  userDisplayName: string;
  userEmail: string;
}

// CSS variables for consistent theming
const menuStyles = {
  "--menu-bg": "white",
  "--menu-text": "#333",
  "--menu-secondary-text": "#718096",
  "--menu-hover-bg": "#f3f4f6",
  "--menu-border": "#e2e8f0",
  "--menu-header-bg": "#f8fafc",
  "--menu-shadow": "0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
  "--icon-color": "#4B5563",         
  "--icon-color-active": "#1E40AF",  
  "--icon-color-hover": "#1F2937",
  
  // Header specific variables
  "--header-bg": "#white",         
  "--header-border": "#e2e8f0",     
  "--header-text": "#1e3a8a",       
  "--header-button-hover": "#bfdbfe" 
} as React.CSSProperties;

// Menu button component for profile dropdown
const MenuButton = ({ children, onClick, ref }: { children: React.ReactNode; onClick?: () => void; ref?: React.RefObject<HTMLButtonElement> }) => (
  <button 
    ref={ref}
    className="w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center"
    style={{ 
      color: 'var(--menu-text)', 
      backgroundColor: 'var(--menu-bg)',
      borderRadius: '0',
      border: 'none',
      padding: '0.5rem 1rem',
      fontWeight: '400',
      outline: 'none'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.backgroundColor = 'var(--menu-hover-bg)';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.backgroundColor = 'var(--menu-bg)';
    }}
    onClick={onClick}
  >
    {children}
  </button>
);

// Common nav item component with synchronized text animation
const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  to,
  expanded = false,
  id,
  hoveredItem,
  setHoveredItem
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const isHovered = hoveredItem === id;

  // Determine highlight color based on state
  let highlightColor = 'text-gray-700 hover:bg-gray-200';
  if (isActive) {
    highlightColor = 'bg-blue-100 text-blue-800';
  } else if (isHovered) {
    highlightColor = 'bg-gray-200 text-gray-900';
  }

  return (
    <Link to={to} className="mx-2 my-1 flex justify-start">
      <div
        onMouseEnter={() => setHoveredItem(id)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`
          transition-colors duration-150 cursor-pointer select-none
          ${expanded ? 'w-full' : 'w-12'} 
          h-10 rounded-md flex items-center justify-start
          ${highlightColor}
        `}
      >
        {/* Icon with fixed position and CSS variable colors */}
        <div className="w-12 h-10 flex items-center justify-center flex-shrink-0"
             style={{ color: isActive ? 'var(--icon-color-active)' : isHovered ? 'var(--icon-color-hover)' : 'var(--icon-color)' }}>
          {icon}
        </div>
        
        {/* Label text with synchronized animation */}
        <div 
          className="whitespace-nowrap overflow-hidden"
          style={{ 
            width: expanded ? '12rem' : '0',
            opacity: expanded ? '1' : '0',
            // Different transition parameters for opening and closing
            transition: expanded 
              ? 'width 300ms ease, opacity 150ms ease 100ms' // When opening: expand first, then show text
              : 'opacity 150ms ease, width 300ms ease 150ms' // When closing: hide text first, then collapse
          }}
        >
          <span className="text-ellipsis">{label}</span>
        </div>
      </div>
    </Link>
  );
};

// Special account item component with synchronized text animation
const AccountItem: React.FC<AccountItemProps> = ({
  expanded,
  profileMenuOpen,
  onClick,
  userDisplayName,
  userEmail
}) => {
  // Generate initials from user name
  const initials = userDisplayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <div
      onClick={onClick}
      className="mx-2 my-1 flex justify-start"
    >
      <div
        className={`
          cursor-pointer select-none
          ${expanded ? 'w-full' : 'w-12'} 
          h-10 flex items-center
          ${profileMenuOpen ? 'bg-gray-100' : ''}
        `}
      >
        {/* Fixed width container for avatar */}
        <div className="w-12 h-10 flex items-center justify-center flex-shrink-0">
          <div
            className="
              border-2 border-gray-300 rounded-full w-10 h-10 
              flex items-center justify-center 
              text-gray-700 font-bold
            "
          >
            {initials}
          </div>
        </div>
        
        {/* Account details with synchronized animation */}
        <div 
          className={`
            overflow-hidden transition-all duration-300
            ${expanded ? 'w-48 opacity-100' : 'w-0 opacity-0'}
          `}
        >
          <div className="ml-1">
            <p className="text-sm font-medium text-gray-700 whitespace-nowrap">{userDisplayName}</p>
            <p className="text-xs text-gray-500 whitespace-nowrap">{userEmail}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Layout component that includes header and sidebar
interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Using auth context to get user information
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Using state from sessionStorage to preserve across page transitions
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = sessionStorage.getItem('sidebarExpanded');
    return saved === 'true';
  });
  
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [supportPanelOpen, setSupportPanelOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const supportButtonRef = useRef<HTMLButtonElement>(null);
  const supportPanelRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarTriggerRef = useRef<HTMLDivElement>(null);
  
  // Extract user display name and email from user object
  const userDisplayName = user?.user_metadata?.full_name || 'User';
  const userEmail = user?.email || '';
  
  // Save sidebar state to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('sidebarExpanded', sidebarExpanded.toString());
  }, [sidebarExpanded]);
  
  // Handle sidebar expansion on hover
  const handleSidebarMouseEnter = () => {
    setSidebarExpanded(true);
  };

  // Handle sidebar collapse when mouse leaves, but only if support panel is closed
  const handleSidebarMouseLeave = () => {
    if (!supportPanelOpen) {
      setSidebarExpanded(false);
    }
  };

  // Close profile menu and support panel if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Close profile menu if clicked outside of both profile menu AND support panel
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node) &&
        // Don't close profile menu if clicking in support panel
        !(supportPanelRef.current && supportPanelRef.current.contains(event.target as Node))
      ) {
        setProfileMenuOpen(false);
      }
      
      // Close support panel if clicked outside and not on the Support button
      if (
        supportPanelOpen &&
        supportPanelRef.current &&
        !supportPanelRef.current.contains(event.target as Node) &&
        supportButtonRef.current &&
        !supportButtonRef.current.contains(event.target as Node)
      ) {
        setSupportPanelOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [supportPanelOpen]);

  // Toggle profile menu
  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // Toggle support panel
  const handleSupportClick = () => {
    // First ensure sidebar is expanded
    setSidebarExpanded(true);
    // Then toggle the support panel
    setSupportPanelOpen(!supportPanelOpen);
    // Remove this line to keep the profile menu open when clicking Support
    // setProfileMenuOpen(false);
  };

  return (
    // Apply CSS variables to the root element
    <div 
      className="flex flex-col h-screen w-full bg-white border border-gray-200 rounded-lg overflow-hidden"
      style={menuStyles}
    >
      {/* Header - now full width and contains logo */}
      <header className="border-b w-full" style={{ 
        backgroundColor: 'var(--header-bg)',
        borderColor: 'var(--header-border)'
      }}>
        <div className="flex items-center justify-between p-2.5">
          {/* Left side: logo and title */}
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
              <img
                src={LogoImage}
                alt="TrackFlow Logo"
                className="max-h-full max-w-full object-contain"
                style={{
                  transform: 'translateX(3px)' // Move logo slightly to the right
                }}
              />
            </div>
            {/* TrackFlow title with gradient */}
            <div className="relative" style={{ userSelect: 'none' }}>
              <h1 className="font-bold" style={{ 
                fontSize: '1.6rem', 
                fontFamily: 'system-ui, sans-serif',
                background: 'linear-gradient(90deg, #1E40AF 0%, #3B82F6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                transform: 'translateY(0px) translateX(3px)',
              }}>
                TrackFlow
              </h1>
            </div>             
          </div>

          {/* Right side: search and notifications */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 placeholder-gray-500"
                style={{ color: '#333' }}
              />
              <Search
                size={16}
                className="absolute left-3 top-2.5 text-gray-500"
              />
            </div>
            <button 
              className="p-2 rounded-full shadow-sm focus:outline-none focus:ring-0"
              style={{ 
                backgroundColor: 'var(--header-bg)', 
                color: 'var(--header-text)',
                outline: 'none'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--header-button-hover)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--header-bg)'}
            >
              <Bell size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content area with sidebar */}
      <div className="flex-1 relative overflow-hidden">
        {/* Additional trigger area for sidebar that extends to the absolute edge */}
        <div 
          ref={sidebarTriggerRef}
          className="absolute left-0 top-0 bottom-0 w-3 z-20" 
          style={{ left: '-3px' }} 
          onMouseEnter={handleSidebarMouseEnter}
        />

        {/* Sidebar - positioned absolutely to overlap content when expanded */}
        <div
          ref={sidebarRef}
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
          className={`
            absolute top-0 left-0 bottom-0
            ${sidebarExpanded ? 'w-64' : 'w-18'}
            bg-white border-r border-gray-200
            transition-all duration-300
            flex flex-col h-full
            overflow-visible
            z-10
          `}
        >
          {/* Navigation with dividers */}
          <div className="mt-4 flex-1 overflow-y-auto overflow-x-hidden">
            {/* Items without category - moved from Category 1 */}
            <div className="mb-6">
              <div>
                <NavItem
                  icon={<Home size={24} />}
                  label="Dashboard"
                  to="/dashboard"
                  expanded={sidebarExpanded}
                  id="home"
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
                <NavItem
                  icon={<Layers size={24} />}
                  label="Projects"
                  to="/dashboard/projects"
                  expanded={sidebarExpanded}
                  id="projects"
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
                <NavItem
                  icon={<Box size={24} />}
                  label="Assemblies"
                  to="/dashboard/assemblies"
                  expanded={sidebarExpanded}
                  id="assemblies"
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
                <NavItem
                  icon={<Building size={24} />}
                  label="Clients"
                  to="/dashboard/clients"
                  expanded={sidebarExpanded}
                  id="clients"
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
              </div>
            </div>

            {/* Divider */}
            <div className={`
              my-4 mx-2
              ${sidebarExpanded ? 'mx-4' : 'mx-2'}
            `}>
              <div className="border-t border-gray-200"></div>
            </div>

            {/* Second section items */}
            <div className="mb-6">
              <div>
                <NavItem
                  icon={<Calendar size={24} />}
                  label="Calendar"
                  to="/dashboard/calendar"
                  expanded={sidebarExpanded}
                  id="calendar"
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
                <NavItem
                  icon={<CreditCard size={24} />}
                  label="Card Management"
                  to="/dashboard/nfc-cards"
                  expanded={sidebarExpanded}
                  id="nfc-cards"
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
              </div>
            </div>

            {/* Divider */}
            <div className={`
              my-4 mx-2
              ${sidebarExpanded ? 'mx-4' : 'mx-2'}
            `}>
              <div className="border-t border-gray-200"></div>
            </div>

            {/* Third section items */}
            <div className="mb-6">
              <div>
                <NavItem
                  icon={<BarChart2 size={24} />}
                  label="Reports"
                  to="/dashboard/reports"
                  expanded={sidebarExpanded}
                  id="chart"
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
                <NavItem
                  icon={<Settings size={24} />}
                  label="Settings"
                  to="/dashboard/settings"
                  expanded={sidebarExpanded}
                  id="settings"
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
                <NavItem
                  icon={<UserPlus size={24} />}
                  label="User Management"
                  to="/dashboard/users"
                  expanded={sidebarExpanded}
                  id="user-management"
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
                <NavItem
                  icon={<BookOpen size={24} />}
                  label="Guides"
                  to="/dashboard/help"
                  expanded={sidebarExpanded}
                  id="help"
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
              </div>
            </div>
          </div>

          {/* Account at the bottom */}
          <div
            className="border-t border-gray-200 relative select-none mt-auto py-4"
            ref={profileMenuRef}
          >
            <AccountItem
              expanded={sidebarExpanded}
              profileMenuOpen={profileMenuOpen}
              onClick={toggleProfileMenu}
              userDisplayName={userDisplayName}
              userEmail={userEmail}
            />
            
            {/* Profile dropdown menu */}
            <div
              className={`
                absolute bottom-full left-0 mb-2 w-60 rounded z-50
                overflow-hidden transition-all duration-300 origin-bottom-left select-none
                ${profileMenuOpen
                  ? 'opacity-100 transform translate-y-0 scale-100'
                  : 'opacity-0 transform -translate-y-2 scale-95 pointer-events-none'
                }
              `}
              style={{ 
                backgroundColor: 'var(--menu-bg)', 
                color: 'var(--menu-text)',
                boxShadow: 'var(--menu-shadow)', 
                border: `1px solid var(--menu-border)`,
                ...menuStyles
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--menu-border)', backgroundColor: 'var(--menu-header-bg)' }}>
                <p className="font-medium text-sm" style={{ color: 'var(--menu-text)' }}>{userDisplayName}</p>
                <p className="text-xs" style={{ color: 'var(--menu-secondary-text)' }}>{userEmail}</p>
              </div>
              <div>
                <MenuButton onClick={() => console.log('Account preferences')}>
                  Account preferences
                </MenuButton>
                <button 
                  ref={supportButtonRef}
                  className="w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center"
                  style={{ 
                    color: 'var(--menu-text)', 
                    backgroundColor: 'var(--menu-bg)',
                    borderRadius: '0',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    fontWeight: '400',
                    outline: 'none'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--menu-hover-bg)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--menu-bg)';
                  }}
                  onClick={handleSupportClick}
                >
                  Support
                </button>
              </div>
              <div className="border-t" style={{ borderColor: 'var(--menu-border)' }}>
                <MenuButton onClick={handleLogout}>
                  Log out
                </MenuButton>
              </div>
            </div>
          </div>
        </div>

        {/* Main content container for children - always takes full width */}
        <div className="flex-1 flex flex-col overflow-hidden pl-18">
          <main className="flex-1 overflow-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>

        {/* Support Panel - positioned next to the account section */}
        {supportPanelOpen && (
          <div 
            ref={supportPanelRef} 
            className="absolute z-50"
            style={{
              bottom: '105px',  // Position below the account section
              left: '240px',    // Position to the right of the sidebar
            }}
          >
            <SupportPanel onClose={() => setSupportPanelOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;