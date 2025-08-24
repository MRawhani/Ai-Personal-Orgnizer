import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Money from './pages/Money';
import Notes from './pages/Notes';
import References from './pages/References';
import Bookmarks from './pages/Bookmarks';
import Knowledge from './pages/Knowledge';
import Files from './pages/Files';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/money" element={<Money />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/references" element={<References />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/files" element={<Files />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 