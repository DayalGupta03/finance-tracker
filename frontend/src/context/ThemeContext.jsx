/**
 * ThemeContext — Light/Dark mode with system preference detection,
 * localStorage persistence, and no FOUC.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

function getInitialTheme() {
    // Check localStorage first
    const stored = localStorage.getItem('ft_theme');
    if (stored === 'light' || stored === 'dark') return stored;
    // Fall back to system preference
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(getInitialTheme);

    const setTheme = useCallback((t) => {
        setThemeState(t);
        localStorage.setItem('ft_theme', t);
        document.documentElement.setAttribute('data-theme', t);
    }, []);

    const toggle = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    // Apply theme on mount (prevent FOUC)
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Listen for system preference changes
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            if (!localStorage.getItem('ft_theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
