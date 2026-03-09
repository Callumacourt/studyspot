import Home from './pages/Home';
import About from './pages/About';
import ErrorPage from './pages/ErrorPage';
import LoginPage from './pages/LoginPage';
import Room from './components/Room';

const routes = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '/room/:roomId', element: <Room /> },
  { path: '*', element: <ErrorPage /> },
  { path: '/login', element: <LoginPage />}
];

export default routes;