import { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext({ isDark: true, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
    // Leer preferencia guardada; default oscuro
    const [isDark, setIsDark] = useState(() => {
        try {
            const saved = localStorage.getItem('simopt-theme');
            if (saved !== null) return saved === 'dark';
        } catch (_) {}
        return true;
    });

    // Persistir en localStorage cada vez que cambie
    useEffect(() => {
        try {
            localStorage.setItem('simopt-theme', isDark ? 'dark' : 'light');
        } catch (_) {}
    }, [isDark]);

    const toggleTheme = () => setIsDark(d => !d);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
