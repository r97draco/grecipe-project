import React, { useState, useContext, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../App";
import { FaGoogle } from "react-icons/fa";
import Logo from "../Assets/Grecipe-Logo.svg";

export { notify } from "../utils/notifications";

function Nav() {
  const [top, setTop] = useState(true);
  const location = useLocation();
  const currentRoute = useRef(location.key);
  currentRoute.current = location.key;
  const isLinkActive = (path) => location.pathname === path;

  // detect whether user has scrolled the page down by 10px
  useEffect(() => {
    const scrollHandler = () => {
      window.scrollY > 10 ? setTop(false) : setTop(true);
    };
    window.addEventListener("scroll", scrollHandler);
    return () => window.removeEventListener("scroll", scrollHandler);
  }, []);

  const navigate = useNavigate();
  const { user, signIn: login, signOut: logout, authBusy, sessionLoading } = useContext(UserContext);

  const signIn = async () => {
    const route = currentRoute.current;
    const profile = await login();
    if (profile && route === currentRoute.current) navigate('/inventory', {replace:true});
  };
  const signOut = async () => {
    if (await logout()) navigate('/', {replace:true});
  };

  const links = [
    { to: "/family", title: "Family" },
    { to: "/inventory", title: "Inventory" },
    { to: "/recipe", title: "Recipe" },
  ];
  return (
    <header
      className={`fixed w-full z-30 backdrop-blur-md  md:bg-opacity-90 transition duration-300 ease-in-out shadow-lg ${
        !top && "  "
      }`}
    >
      <div className="px-5 mx-auto max-w-8xl sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex-shrink-0 mr-2 sm:mr-4">
            <Link className=" nav-logo-container" to={"/"}>
              <img src={Logo} className="h-auto w-20 sm:w-28" alt="" />
            </Link>
          </div>

          <nav className="flex flex-grow">
            <ul className="flex flex-wrap items-center justify-end flex-grow">
              {links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={event => { if (isLinkActive(link.to)) event.preventDefault(); }}
                    className={`flex items-center text-xs sm:text-base font-medium font-inter px-2 sm:px-4 py-3 transition duration-150 ease-in-out hover:text-gray-600 text-gray-700 ${
                      isLinkActive(link.to) &&
                      "text-gray-900 underline-offset-4 underline"
                    }`}
                  >
                    {link.title}
                  </Link>
                </li>
              ))}

              {user._id ? (
                <li className="flex items-center gap-3">
                    <img
                      className="w-12 h-12 rounded-full"
                      title={user.userName}
                      src={user.photoURL || "/favicon.ico"}
                      alt=""
                    />
                    <button type="button" onClick={signOut} disabled={authBusy || sessionLoading} className="ml-3 text-gray-200 bg-primary-500 btn-sm hover:bg-primary-400">
                      <span>{user.isDemo ? "Exit demo" : "Logout"}</span>
                      <FaGoogle className="flex items-center ml-2 text-gray-200" />
                    </button>
                </li>
              ) : (
                <>
                  <li>
                    <button type="button" onClick={signIn} disabled={authBusy || sessionLoading} className="ml-3 text-gray-200 bg-primary-500 btn-sm hover:bg-primary-400">
                      <span>{sessionLoading ? "Loading…" : authBusy ? "Please wait…" : "Join"}</span>
                      <FaGoogle className="flex items-center ml-2 text-gray-200" />
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Nav;
