// app/theme/ThemeContext.tsx

import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: any) {
  const system = useColorScheme();
  const [override, setOverride] = useState<"light" | "dark" | null>(null);

  const isDark = override ? override === "dark" : system === "dark";

  const theme = useMemo(
    () => ({
      isDark,
      accent: "#ff6b00",
      success: "#24C78C",
      bg: isDark ? "#0d0d0f" : "#f6f7fb",
      card: isDark ? "#111213" : "#fff",
      text: isDark ? "#f5f5f5" : "#111",
      textSecondary: isDark ? "#bfbfbf" : "#666",
      border: isDark ? "#222" : "#eef0f5",
      warningBg: isDark ? "#2b200e" : "#fff7e6",
      warningBorder: isDark ? "#3a2a15" : "#f3debf",
      warningText: isDark ? "#eeca82" : "#6a4b00",
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        theme,
        toggleTheme: () => setOverride(isDark ? "light" : "dark"),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
