import Home from './pages/Home';


const routes = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '*', element: <NotFound /> },
];

export default routes;