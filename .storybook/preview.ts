import "../src/styles/globals.css";
import "../styles.css";
import type { Preview } from "@storybook/react-vite";
import React from "react";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: "auto",
      values: [
        { name: "auto", value: "var(--bg-base)" },
        { name: "current-theme", value: "#040516" },
        { name: "refresh-theme", value: "#0d0d0f" }
      ]
    },
    layout: "fullscreen",
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo"
    }
  },
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Switch between visual theme variants",
      defaultValue: "refresh",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "current", title: "Current (Purple/Magenta Gradient)" },
          { value: "refresh", title: "Refresh (Fintech/Teal)" }
        ],
        dynamicTitle: true
      }
    }
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || "refresh";

      // Apply theme class to document root
      React.useEffect(() => {
        document.documentElement.classList.remove("theme-current", "theme-refresh");
        document.documentElement.classList.add(`theme-${theme}`);
      }, [theme]);

      return React.createElement(
        "div",
        {
          className: "min-h-screen bg-surface-base p-6 text-content-primary",
          "data-theme": theme
        },
        React.createElement(Story)
      );
    }
  ]
};

export default preview;
