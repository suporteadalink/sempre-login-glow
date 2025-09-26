import * as React from "react";

console.log("DEBUG: App.tsx loading");

const App = () => {
  console.log("DEBUG: App component rendering");
  
  // Completely minimal React component
  return React.createElement('div', null, 
    React.createElement('h1', null, 'Minimal React Test'),
    React.createElement('p', null, 'Testing if React hooks work'),
    React.createElement('p', null, `React version: ${React.version || 'unknown'}`)
  );
};

export default App;