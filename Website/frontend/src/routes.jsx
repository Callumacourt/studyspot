import Home from './pages/Home';
import About from './pages/About';
import ErrorPage from './pages/ErrorPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import SuccessPage from "./pages/SuccessPage";
import Room from './components/Room';

/**
 * Here we define the respective component for each route path
 */

const routes = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '/room/:roomId', element: <Room /> },
  { path: '/login', element: <LoginPage />},
  { path: "/signup", element: <SignUpPage /> },
  { path: "/success", element: <SuccessPage /> },
  { path: '*', element: <ErrorPage /> },
];

export default routes;