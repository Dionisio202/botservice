import { useState, useEffect } from 'react';

export function useTheme() {
    const [isDark, setIsDark] = useState(
        () => localStorage.getItem('ecu_theme') === 'dark'
    );

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('ecu_theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggle = () => setIsDark(d => !d);

    return { isDark, toggle };
}