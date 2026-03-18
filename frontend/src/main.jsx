import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log(
`%c
██████╗  ██████╗ 
██╔══██╗ ██╔══██╗
██████╔╝ ██████╔╝
██╔══██╗ ██╔══██╗
██║  ██║ ██████╔╝
╚═╝  ╚═╝ ╚═════╝ 
`,
"color:#00ff88;font-weight:bold;"
);
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
