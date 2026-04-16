import Home from './pages/Home/Home';
import About from './pages/About/About';
import ErrorPage from './pages/Error/ErrorPage';
import LoginPage from './pages/Login/LoginPage';
import SignUpPage from './pages/SignUp/SignUpPage';
import SuccessPage from "./pages/Success/SuccessPage";
import Room from './pages/Room/Room';
import SearchPage from './pages/Search/SearchPage';

/**
 * Here we define the respective component for each route path
 */

const routes = [
  { path: '/', element: <Home /> },
  { path: '/search', element: <SearchPage />},
  { path: '/about', element: <About /> },
  { path: '/room/:roomId', element: <Room /> },
  { path: '/login', element: <LoginPage />},
  { path: "/signup", element: <SignUpPage /> },
  { path: "/success", element: <SuccessPage /> },
  { path: '*', element: <ErrorPage /> },
];

export default routes;