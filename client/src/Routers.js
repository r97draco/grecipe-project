import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useContext, useLayoutEffect } from 'react';
import Landing from './pages/Landing';
import Inventory from './pages/Inventory';
import Recipee from './pages/Recipee';
import FamilyPage from './pages/Family';
import Health from './pages/Health';
import Nav from './components/Nav';
import { UserContext } from './context/Session';
import { cancelPendingRequests } from './utils/authenticatedApi';
import { clearNotifications } from './utils/notifications';
import { ToastContainer } from 'react-toastify';
import './css/PageTypography.css';

function PageContent() {
  const location = useLocation();
  const { user,sessionLoading,startDemo,sessionRevision } = useContext(UserContext);
  useLayoutEffect(() => {
    clearNotifications();
    window.scrollTo(0,0);
    return () => cancelPendingRequests();
  },[location.key]);
  if (sessionLoading && location.pathname !== '/') return <div className="pt-32 pb-16 text-center" role="status">Loading your account…</div>;
  return <>{user.isDemo && <div className="demo-banner" role="status"><span>Demo mode · Sample data</span><button onClick={startDemo}>Reset demo</button></div>}<Routes key={`${location.key}:${user._id || 'guest'}:${user.family || ''}:${sessionRevision}`}>
    <Route path="/" element={<Landing/>}/>
    <Route path="/family" element={<FamilyPage/>}/>
    <Route path="/inventory" element={<Inventory/>}/>
    <Route path="/recipe" element={<Recipee/>}/>
    <Route path="/health" element={<Health/>}/>
    <Route path="*" element={<div className="pt-32 text-center">Page not found.</div>}/>
  </Routes></>;
}
export default function Routers() {
  return <BrowserRouter><main className="flex-grow"><Nav/><div className="px-4 mx-auto sm:px-6"><PageContent/></div></main><ToastContainer position="bottom-right" autoClose={3000} limit={3} pauseOnFocusLoss={false} pauseOnHover={false} closeOnClick newestOnTop/></BrowserRouter>;
}
