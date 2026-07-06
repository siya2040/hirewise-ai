import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Sparkles, 
  User, 
  LogOut, 
  Menu, 
  X, 
  PlusSquare, 
  Users,
  Settings,
  Bell,
  MessageSquare
} from 'lucide-react';

export const DashboardLayout = ({ children }) => {
  const { userRole, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load user notifications:', err);
    }
  };

  const fetchUnreadChats = async () => {
    try {
      const data = await apiFetch('/chat/sessions');
      const count = data.reduce((acc, session) => acc + (session.unreadCount || 0), 0);
      setUnreadChats(count);
    } catch (err) {
      console.error('Failed to load chat unread count:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadChats();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadChats();
    }, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Define navigation menus dynamically based on user role
  const studentNavItems = [
    { label: 'Portal Home', path: '/portal/dashboard', icon: LayoutDashboard },
    { label: 'AI Resume Insights', path: '/portal/resume-insights', icon: Sparkles },
    { label: 'Track Applications', path: '/portal/applications', icon: Briefcase },
    { label: 'Practice Interviews', path: '/portal/mock-interview', icon: FileText },
    { label: 'Messages', path: '/portal/chat', icon: MessageSquare },
    { label: 'My Profile', path: '/portal/profile', icon: User },
    { label: 'Settings', path: '/portal/settings', icon: Settings }
  ];

  const recruiterNavItems = [
    { label: 'Recruiter Home', path: '/recruiter/dashboard', icon: LayoutDashboard },
    { label: 'Post new Job', path: '/recruiter/jobs/new', icon: PlusSquare },
    { label: 'Manage Candidates', path: '/recruiter/applicants', icon: Users },
    { label: 'Chat Inbox', path: '/recruiter/chat', icon: MessageSquare },
    { label: 'Company Profile', path: '/recruiter/profile', icon: User },
    { label: 'Settings', path: '/portal/settings', icon: Settings }
  ];

  const navItems = userRole === 'recruiter' ? recruiterNavItems : studentNavItems;

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col md:flex-row relative">
      {/* 1. MOBILE HEADER PANEL */}
      <div className="md:hidden w-full bg-dark-card border-b border-dark-border px-4 py-3 flex items-center justify-between z-30">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-purple flex items-center justify-center">
            <span className="font-display font-extrabold text-white text-md">H</span>
          </div>
          <span className="font-display font-bold text-lg text-white">HireWise</span>
        </Link>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-dark-border relative"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-dark-border"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* 2. PERSISTENT SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-dark-card border-r border-dark-border text-gray-200">
        {/* Sidebar Header Brand */}
        <div className="p-6 border-b border-dark-border flex items-center space-x-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-purple flex items-center justify-center shadow-md shadow-brand-500/10">
            <span className="font-display font-extrabold text-white text-lg">H</span>
          </div>
          <span className="font-display font-bold text-xl text-white tracking-tight">
            HireWise <span className="text-brand-400 font-extrabold">AI</span>
          </span>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isChat = item.label === 'Messages' || item.label === 'Chat Inbox';
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                  isActive 
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/15' 
                    : 'text-gray-400 hover:bg-dark-border hover:text-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={18} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-100 transition-colors'} />
                  <span>{item.label}</span>
                </div>
                {isChat && unreadChats > 0 && (
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0 animate-pulse">
                    {unreadChats}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info & Logout */}
        <div className="p-4 border-t border-dark-border space-y-4">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-full bg-brand-950 border border-brand-500/30 flex items-center justify-center font-display font-bold text-brand-400 text-sm">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'User'}</p>
              <span className="inline-block text-[10px] px-2 py-0.5 mt-0.5 rounded-full font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {userRole === 'recruiter' ? '🏢 Recruiter' : '🎓 Student'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-dark-border hover:bg-red-950/20 hover:text-red-400 text-gray-400 py-2.5 rounded-xl border border-transparent hover:border-red-950/30 transition-all duration-200 text-sm font-semibold"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 3. MOBILE MENU SLIDE OVERLAY */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-20 flex bg-black/60 backdrop-blur-sm">
          <div className="w-64 bg-dark-card border-r border-dark-border flex flex-col h-full animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-dark-border flex items-center justify-between">
              <span className="font-display font-bold text-lg text-white">Navigation</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const isChat = item.label === 'Messages' || item.label === 'Chat Inbox';
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium ${
                      isActive 
                        ? 'bg-brand-600 text-white' 
                        : 'text-gray-400 hover:bg-dark-border hover:text-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </div>
                    {isChat && unreadChats > 0 && (
                      <span className="w-5 h-5 rounded-full bg-brand-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                        {unreadChats}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-dark-border space-y-3">
              <p className="text-xs text-gray-400 font-semibold">{profile?.full_name || 'Logged In'}</p>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 bg-dark-border hover:bg-red-950/20 text-gray-400 py-2 rounded-xl transition-all duration-150 text-xs font-semibold"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar for Desktop */}
        <header className="hidden md:flex h-16 bg-dark-card border-b border-dark-border items-center justify-between px-8 z-10">
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">
              {userRole === 'recruiter' ? 'Recruiter Dashboard' : '🎓 Career Portal'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-dark-muted font-medium bg-dark-border/40 px-3 py-1.5 rounded-lg border border-dark-border">
              Host Environment: Stable
            </span>
            
            {/* Desktop Bell trigger */}
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-gray-400 hover:text-white p-2 rounded-xl bg-dark-bg border border-dark-border hover:border-brand-500/20 transition-all relative"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>

            <div className="h-6 w-px bg-dark-border"></div>
            <div className="text-right">
              <p className="text-xs text-white font-semibold">{profile?.full_name}</p>
              <p className="text-[10px] text-dark-muted leading-none font-bold uppercase tracking-wider">{userRole}</p>
            </div>
          </div>
        </header>

        {/* Inner Content Viewport */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* 5. NOTIFICATIONS SLIDE OVER PANEL */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-dark-card border-l border-dark-border w-full max-w-sm h-full flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250">
            
            {/* Header */}
            <div className="p-5 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="font-display font-extrabold text-white text-md">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-dark-border"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-left">
              {notifications.length === 0 ? (
                <p className="text-xs text-dark-muted py-8 text-center italic">No notifications found.</p>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-1 ${
                      n.is_read 
                        ? 'bg-dark-bg/20 border-dark-border/40 text-gray-400' 
                        : 'bg-brand-500/5 border-brand-500/20 text-white font-medium hover:border-brand-500/40 shadow-sm shadow-brand-500/5'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold">{n.title}</span>
                      <span className="text-[9px] text-dark-muted font-light">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="leading-relaxed font-light">{n.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {unreadCount > 0 && (
              <div className="p-4 border-t border-dark-border">
                <button
                  onClick={handleMarkAllAsRead}
                  className="w-full bg-dark-border hover:bg-dark-border/80 border border-transparent text-gray-200 py-2.5 rounded-xl text-xs font-bold transition-all text-center block"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
