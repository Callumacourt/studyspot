import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import routes from './routes';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import './App.css'

// Top-level app shell: router + shared header/footer around route content.
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
