import React from 'react';
import Routers from './Routers';
import { SessionProvider } from './context/Session';
import 'react-toastify/dist/ReactToastify.css';
export { UserContext } from './context/Session';
export { backendUrl } from './config/api';
export default function App() {
  return <SessionProvider><Routers/></SessionProvider>;
}
