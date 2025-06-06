import React from "react";
import ReactDOM from "react-dom/client";
import { LlamaChat } from "./components/LlamaChat";
import './styles/globals.css';
import { ThemeProvider } from "./components/theme-provider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system">
      <LlamaChat />
    </ThemeProvider>
  </React.StrictMode>,
);
