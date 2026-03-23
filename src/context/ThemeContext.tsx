import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type ThemeVariant = "current" | "refresh";

type ThemeContextValue = {
  theme: ThemeVariant;
  setTheme: (theme: ThemeVariant) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({
  children,
  defaultTheme = "refresh"
}: {
  children: ReactNode;
  defaultTheme?: ThemeVariant;
}) => {
  const [theme, setTheme] = useState<ThemeVariant>(defaultTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-current", "theme-refresh");
    root.classList.add(`theme-${theme}`);
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

export default ThemeContext;
