import { useCallback, useLayoutEffect, useRef } from 'react';
export default function usePageScope() {
  const active = useRef(true);
  useLayoutEffect(() => { active.current=true; return () => {active.current=false;}; },[]);
  return useCallback(() => active.current,[]);
}
