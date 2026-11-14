import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebase/firebase';
import { loadOrCreateUser, userSyncErrorMessage } from '../utils/userSession';
import { blockApiRequests, resetApiSession } from '../utils/authenticatedApi';
import { clearNotifications, notify, notificationScope } from '../utils/notifications';

import { getDemoProfile, startDemoSession, clearDemoSession } from '../demo/demoSession';

export const UserContext = createContext();
export function SessionProvider({children}) {
  const [user,setUser] = useState(()=>getDemoProfile() || {});
  const [sessionRevision,setSessionRevision]=useState(0);
  const [sessionLoading,setSessionLoading] = useState(true);
  const [authBusy,setAuthBusy] = useState(false);
  const sync = useRef(null);
  const controller = useRef(null);
  const version = useRef(0);
  const operation = useRef(null);
  const mounted = useRef(true);

  const synchronize = useCallback(identity => {
    const demo=getDemoProfile();
    if(demo){if(mounted.current){setUser(demo);setSessionLoading(false);}return Promise.resolve(demo);}
    if (!identity) {
      version.current += 1; controller.current?.abort(); sync.current=null;
      resetApiSession(); clearNotifications(); localStorage.removeItem('self_care_token');
      if (mounted.current) {setUser({});setSessionLoading(false);}
      return Promise.resolve(null);
    }
    if (sync.current?.uid === identity.uid) return sync.current.promise;
    const scope = notificationScope();
    const current = ++version.current;
    controller.current?.abort();
    const request = new AbortController(); controller.current=request;
    resetApiSession(); blockApiRequests(false);
    if(mounted.current) {setUser({});setSessionLoading(true);}
    const promise = (async () => {
      try {
        const token = await identity.getIdToken();
        if(request.signal.aborted) return null;
        const profile = await loadOrCreateUser(identity,token,{signal:request.signal});
        if (!mounted.current || request.signal.aborted || version.current !== current || auth.currentUser?.uid !== identity.uid) return null;
        setUser(profile);return profile;
      } catch (error) {
        if(mounted.current && !request.signal.aborted && version.current === current) {
          setUser({});sync.current=null;
          notify(userSyncErrorMessage(error),'error',scope);
        }
        return null;
      } finally {if(mounted.current && version.current === current) setSessionLoading(false);}
    })();
    sync.current={uid:identity.uid,promise};
    return promise;
  },[]);

  useEffect(() => {
    mounted.current=true;
    localStorage.removeItem('self_care_token');
    const unsubscribe = onAuthStateChanged(auth,identity => {
      // Ignore old callbacks that arrive after an account switch or logout.
      if (identity?.uid !== auth.currentUser?.uid && (identity || auth.currentUser)) return;
      synchronize(identity);
    });
    return () => {mounted.current=false;version.current+=1;controller.current?.abort();sync.current=null;unsubscribe();resetApiSession();};
  },[synchronize]);

  const signIn = useCallback(() => {
    if(operation.current) return operation.current;
    setAuthBusy(true);
    const scope = notificationScope();
    const promise = (async () => {
      try { const result = await signInWithPopup(auth,provider);return await synchronize(result.user); }
      catch(error) {if(mounted.current && error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') notify('Google sign-in failed. Please try again.','error',scope);return null;}
      finally {operation.current=null;if(mounted.current) setAuthBusy(false);}
    })();
    operation.current=promise;return promise;
  },[synchronize]);

  const signOut = useCallback(() => {
    if(operation.current) return operation.current;
    setAuthBusy(true);blockApiRequests(true);version.current+=1;controller.current?.abort();sync.current=null;
    clearDemoSession();setUser({});setSessionLoading(false);resetApiSession();clearNotifications();localStorage.removeItem('self_care_token');
    const promise = (async () => {
      try {await auth.signOut();return true;}
      catch {blockApiRequests(false);await synchronize(auth.currentUser);notify('Couldn’t sign out. Please try again.','error');return false;}
      finally {operation.current=null;if(mounted.current) setAuthBusy(false);}
    })();
    operation.current=promise;return promise;
  },[synchronize]);

  const startDemo = useCallback(() => {
    version.current+=1;controller.current?.abort();sync.current=null;resetApiSession();clearNotifications();
    const profile=startDemoSession();blockApiRequests(false);setUser(profile);setSessionLoading(false);setSessionRevision(value=>value+1);
    return profile;
  },[]);

  return <UserContext.Provider value={{user,setUser,signIn,signOut,authBusy,sessionLoading,startDemo,sessionRevision}}>{children}</UserContext.Provider>;
}
