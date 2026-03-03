import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react'
import routes from './routes';
import Header from './components/Header';
import Footer from './components/Footer';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

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
