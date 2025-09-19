// 🔧 src/main.jsx - VERSION SIMPLIFIÉE
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: "#1f1f1f",
          color: "#fff",
          border: "1px solid #333",
        },
        success: {
          iconTheme: {
            primary: "#22c55e", // vert
            secondary: "#1f1f1f",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444", // rouge
            secondary: "#1f1f1f",
          },
        },
      }}
    />
  </React.StrictMode>
);