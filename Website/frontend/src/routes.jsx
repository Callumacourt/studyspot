import Home from './pages/Home';
import SearchPage from './pages/SearchPage'
import About from './pages/About';
import PrivacyPage from "./pages/PrivacyPage";
import ErrorPage from './pages/ErrorPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import SuccessPage from "./pages/SuccessPage";
import RoomDetail from './pages/RoomDetail';
import ContactPage from "./pages/ContactPage";
import Favorites from "./pages/Favorites";
import Recommendations from "./pages/Recommendations";
/**
 * Here we define the respective component for each route path
 */

const routes = [
  { path: '/', element: <SearchPage /> },
  { path: '/home', element: <Home /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/about', element: <About /> },
  { path: '/contactus', element: <ContactPage /> },
  { path: '/room/:roomId', element: <RoomDetail /> },
  { path: '/login', element: <LoginPage />},
  { path: "/signup", element: <SignUpPage /> },
  { path: "/success", element: <SuccessPage /> },
  { path: "/favorites", element: <Favorites /> },
  { path: "/recommendations", element: <Recommendations /> },
  { path: '*', element: <ErrorPage /> },

];

export default routes;
