import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import { ToastProvider } from './components/ToastProvider.jsx';
import { App } from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
