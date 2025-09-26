import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log("=== DEBUGGING REACT LOAD ===");
console.log("React object:", React);
console.log("React version:", React.version);
console.log("createRoot function:", createRoot);

// Emergency simple rendering
const container = document.getElementById("root");
console.log("Container found:", !!container);

if (container) {
  try {
    console.log("Creating root...");
    const root = createRoot(container);
    console.log("Root created:", root);
    
    console.log("Rendering App...");
    root.render(React.createElement(App));
    console.log("App rendered successfully");
  } catch (error) {
    console.error("Error during render:", error);
    container.innerHTML = `<div style="color: red; padding: 20px;">
      <h2>Render Error</h2>
      <p>Error: ${error}</p>
      <p>Check console for details</p>
    </div>`;
  }
} else {
  console.error("Root container not found!");
}
