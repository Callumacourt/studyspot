import Home from './pages/Home';
import About from './pages/About';
import ErrorPage from './pages/ErrorPage';

const routes = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '*', element: <ErrorPage /> },
];

export default routes;