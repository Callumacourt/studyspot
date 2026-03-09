import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import routes from './routes';
import Header from './components/Header';
import Footer from './components/Footer';
import './App.css'

function App() {
    return (
        <Router>
            <Header />
            <Routes>
                {routes.map((route) => (
                    <Route key={route.path} path={route.path} element={route.element} />
                ))}
            </Routes>
            <Footer />
        </Router>
    )
}

export default App
