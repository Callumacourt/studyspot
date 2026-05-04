/**
 * routes.jsx - Frontend Route Configuration
 * 
 * Centralised definition of all client-side routes.
 * Consumed by App.jsx to render React Router <Routes>.
 * 
 * Route types:
 * - **Public**: Home, Search, Room detail, About, Privacy, Contact (no auth required)
 * - **Auth-only**: Favourites, My Bookings (require user login)
 * - **Admin**: AdminPage (UNIVERSITY_ADMIN+ required)
 * - **Super-Admin**: PlatformAdminPage (SUPER_ADMIN required)
 * - **Auth flows**: Login, SignUp, Success (post-registration)
 * - **Fallback**: ErrorPage (404 catch-all for undefined routes)
 * 
 * Protected routes use <RequireRole> wrapper component for runtime access control.
 * 
 * @typedef {Object} Route
 * @property {string} path - URL path pattern (React Router syntax)
 * @property {JSX.Element} element - Component to render for this path
 */

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
 * Central route configuration table.
 * 
 * Used by App.jsx to dynamically generate React Router <Routes>.
 * Modifications here automatically reflect in navigation without code changes.
 * 
 * @type {Array<{path: string, element: JSX.Element}>}
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
