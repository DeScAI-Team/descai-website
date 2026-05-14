import React from "react";
import ReactDOM from "react-dom/client";
import "./polyfills.ts";
import App from "./App.tsx";
import "./styles/globals.css";
import { BrowserRouter } from "react-router-dom";
import { WalletProvider } from "@/context/WalletContext";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <App />
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>
);
