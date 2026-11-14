import React, { useState, useContext, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../App";
import { FaGoogle } from "react-icons/fa";
import { loadOrCreateUser, userSyncErrorMessage } from "../utils/userSession";
import Logo from "../Assets/Grecipe-Logo.svg";
import { toast } from "react-toastify";

export const notify = (message, type) => {
  if (type === "success") {
    toast.success(message, {
      position: "bottom-right",
    });
  } else if (type === "error") {
    toast.error(message, {
      position: "bottom-right",
    });
  } else if (type === "warning") {
    toast.warn(message, {
      position: "bottom-right",
    });
  } else if (type === "info") {
    toast.info(message, {
      position: "bottom-right",
    });
  } else {
    toast(message, {
      position: "bottom-right",
    });
  }
};

function Nav() {
  const [top, setTop] = useState(true);
  const location = useLocation();
  const isLinkActive = (path) => location.pathname === path;

  // detect whether user has scrolled the page down by 10px
  useEffect(() => {
    const scrollHandler = () => {
      window.screenY > 10 ? setTop(false) : setTop(true);
    };
    window.addEventListener("scroll", scrollHandler);
    return () => window.removeEventListener("scroll", scrollHandler);
  }, [top]);

  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  const signingIn = useRef(false);

  const signIn = async () => {
    if (signingIn.current) return;
    signingIn.current = true;
    try {
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      localStorage.setItem("self_care_token", token);
      try {
        const profile = await loadOrCreateUser(result.user, token);
        setUser(profile);
        notify("User logged in successfully", "success");
        navigate("/inventory");
      } catch (error) {
        setUser({});
        notify(userSyncErrorMessage(error), "error");
      }
    } catch (error) {
      notify("Google sign-in failed. Please try again.", "error");
    } finally {
      signingIn.current = false;
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem("self_care_token");
      notify("User logged out successfully", "success");
      navigate("/");
      setUser({});
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (signingIn.current) return;
      if (!firebaseUser) {
        localStorage.removeItem("self_care_token");
        setUser({});
        return;
      }
      try {
        const token = await firebaseUser.getIdToken();
        if (!active) return;
        localStorage.setItem("self_care_token", token);
        const profile = await loadOrCreateUser(firebaseUser, token);
        if (active) setUser(profile);
      } catch (error) {
        if (active) {
          setUser({});
          notify(userSyncErrorMessage(error), "error");
        }
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [setUser]);

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
                    className={`flex items-center text-xs sm:text-base font-medium font-inter px-2 sm:px-4 py-3 transition duration-150 ease-in-out hover:text-gray-600 text-gray-700 ${
                      isLinkActive(link.to) &&
                      "text-gray-900 underline-offset-4 underline"
                    }`}
                  >
                    {link.title}
                  </Link>
                </li>
              ))}

              {user.userName ? (
                <ul className="flex items-center gap-3">
                  <li>
                    <img
                      className="w-12 h-12 rounded-full"
                      src={user.photoURL}
                      alt=""
                    />
                  </li>
                  <li onClick={signOut}>
                    <Link className="ml-3 text-gray-200 bg-primary-500 btn-sm hover:bg-primary-400">
                      <span>Logout</span>
                      <FaGoogle className="flex items-center ml-2 text-gray-200" />
                    </Link>
                  </li>
                </ul>
              ) : (
                <>
                  <li onClick={signIn}>
                    <Link className="ml-3 text-gray-200 bg-primary-500 btn-sm hover:bg-primary-400">
                      <span>Join </span>
                      <FaGoogle className="flex items-center ml-2 text-gray-200" />
                    </Link>
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
