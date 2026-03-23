import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type ThemeVariant = "current" | "refresh-a" | "refresh-b";

type ThemeContextValue = {
  theme: ThemeVariant;
  setTheme: (theme: ThemeVariant) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const themeLabels: Record<ThemeVariant, string> = {
  current: "Current (Purple/Magenta)",
  "refresh-a": "Refresh A (Teal/Minimal)",
  "refresh-b": "Refresh B (Cyan/Fintech)",
};

export const ThemeProvider = ({ children, initialTheme = "current" }: { children: ReactNode; initialTheme?: ThemeVariant }) => {
  const [theme, setThemeState] = useState<ThemeVariant>(initialTheme);

  const setTheme = useCallback((newTheme: ThemeVariant) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
