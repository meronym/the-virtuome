export class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeIcon = this.themeToggle.querySelector('.theme-icon');
        
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            // Use system preference if no saved preference
            this.setTheme('dark');
        }
        
        // Listen for theme toggle clicks
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        this.themeIcon.textContent = theme === 'dark' ? '🌜' : '🌞';
        localStorage.setItem('theme', theme);
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.dataset.theme;
        this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }
} 