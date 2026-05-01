import Home from './pages/Home/Home';
import About from './pages/About/About';
import ErrorPage from './pages/Error/ErrorPage';
import LoginPage from './pages/Login/LoginPage';
import SignUpPage from './pages/SignUp/SignUpPage';
import SuccessPage from "./pages/Success/SuccessPage";
import Room from './pages/Room/Room';
import SearchPage from './pages/Search/SearchPage';
import PrivacyPage from './pages/Privacy/PrivacyPage';
import ContactPage from './pages/Contact/ContactPage';
import FavouritesPage from './pages/Favourites/FavouritesPage';
import MyBookingsPage from './pages/MyBookings/MyBookingsPage';
import AdminPage from './pages/Admin/AdminPage';
import PlatformAdminPage from './pages/PlatformAdmin/PlatformAdminPage';
import RequireRole from './components/RequireRole/RequireRole';

/**
 * Central route table used by App when rendering <Routes>.
 */

const routes = [
  { path: '/', element: <Home /> },
  { path: '/search', element: <SearchPage />},
  { path: '/about', element: <About /> },
  { path: '/room/:roomId', element: <Room /> },
  { path: '/favourites', element: <FavouritesPage /> },
  { path: '/my-bookings', element: <MyBookingsPage /> },
  { path: '/login', element: <LoginPage />},
  { path: "/signup", element: <SignUpPage /> },
  { path: "/success", element: <SuccessPage /> },
  { path: "/admin", element: <RequireRole><AdminPage /></RequireRole> },
  { path: "/admin/system", element: <RequireRole minRole="SUPER_ADMIN"><PlatformAdminPage /></RequireRole> },
  { path: "/privacy", element: <PrivacyPage/> },
  { path: "/contactus", element: <ContactPage/> },
  { path: '*', element: <ErrorPage /> },
];

export default routes;
