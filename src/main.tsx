import * as React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log("DEBUG: main.tsx starting");
console.log("DEBUG: React version:", React.version);

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

try {
  const root = createRoot(container);
  root.render(<App />);
  console.log("DEBUG: App rendered successfully");
} catch (error) {
  console.error("DEBUG: Error rendering app:", error);
  // Fallback rendering
  container.innerHTML = `<div>Error rendering app: ${error}</div>`;
}
