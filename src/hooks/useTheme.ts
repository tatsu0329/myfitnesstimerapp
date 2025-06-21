import { useState, useEffect } from "react";

export const useTheme = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
    // You would typically also change a class on the `html` or `body` element here.
  };

  return { isDark, toggleTheme };
};
