import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/transactions', label: 'Transactions', icon: '💳' },
    { path: '/add', label: 'Add New', icon: '➕' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
    { path: '/budgets', label: 'Budgets', icon: '🎯' },
    { path: '/stocks', label: 'Stocks', icon: '📉' },
    { path: '/loans', label: 'Loans', icon: '🤝' },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { theme, toggle } = useTheme();
    const nav = useNavigate();

    const handleLogout = () => {
        logout();
        nav('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="brand-icon">💰</span>
                <span className="brand-text">FinTrack</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                {/* Theme Toggle */}
                <div className="theme-toggle-row">
                    <span className="theme-toggle-label">
                        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                    </span>
                    <button
                        className="theme-toggle-btn"
                        data-active={theme === 'dark'}
                        onClick={toggle}
                        aria-label="Toggle theme"
                    >
                        <span className="theme-toggle-indicator">
                            {theme === 'dark' ? '🌙' : '☀️'}
                        </span>
                    </button>
                </div>

                <div className="user-info">
                    <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
                    <div className="user-details">
                        <div className="user-name">{user?.name || 'User'}</div>
                        <div className="user-email">{user?.email || ''}</div>
                    </div>
                </div>
                <button onClick={handleLogout} className="logout-btn" title="Logout">
                    ↪ Logout
                </button>
            </div>
        </aside>
    );
}
