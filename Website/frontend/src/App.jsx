/**
 * App.jsx - Main Application Shell
 * 
 * Renders the top-level application structure:
 * - React Router wrapper for client-side navigation
 * - Shared Header and Footer (persistent across all pages)
 * - Dynamic Routes loaded from routes.jsx configuration
 * 
 * This component is the entry point for the entire user interface.
 * All page-level views render within the <main> element between header/footer.
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import routes from './routes';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import './App.css'

/**
 * Top-level app shell: React Router provider + persistent layout wrapper.
 */
function App() {
    return (
        <Router>
            <div className="appShell">
                <Header />
                <main className="appBody">
                    <Routes>
                        {routes.map((route) => (
                            <Route key={route.path} path={route.path} element={route.element} />
                        ))}
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    )
}

export default App
