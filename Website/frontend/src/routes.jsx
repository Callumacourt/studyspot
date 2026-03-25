import Home from './pages/Home';
import SearchPage from './pages/SearchPage'
import About from './pages/About';
import PrivacyPage from "./pages/PrivacyPage";
import ErrorPage from './pages/ErrorPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import SuccessPage from "./pages/SuccessPage";
import Room from './components/Room';
import ContactPage from "./pages/ContactPage";
/**
 * Here we define the respective component for each route path
 */

const routes = [
  { path: '/', element: <SearchPage /> },
  { path: '/home', element: <Home /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/about', element: <About /> },
  { path: '/contactus', element: <ContactPage /> },
  { path: '/room/:roomId', element: <Room /> },
  { path: '/login', element: <LoginPage />},
  { path: "/signup", element: <SignUpPage /> },
  { path: "/success", element: <SuccessPage /> },
  { path: '*', element: <ErrorPage /> },

];

export default routes;
