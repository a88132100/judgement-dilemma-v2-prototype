import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/legacy-ui.css';
import './styles/tribunal-lobby.css';
import './styles/tribunal-board.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
