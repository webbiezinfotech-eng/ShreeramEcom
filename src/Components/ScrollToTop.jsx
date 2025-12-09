import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathnameRef = useRef(pathname);
  const isBackRef = useRef(false);

  useEffect(() => {
    // Listen for browser back/forward navigation
    const handlePopState = () => {
      isBackRef.current = true;
    };
    window.addEventListener('popstate', handlePopState);

    // Save scroll position before navigation
    if (prevPathnameRef.current !== pathname) {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      sessionStorage.setItem(`scroll_${prevPathnameRef.current}`, scrollY.toString());
    }

    // Check if user is navigating back
    if (isBackRef.current) {
      // Restore scroll position when going back
      const savedScroll = sessionStorage.getItem(`scroll_${pathname}`);
      if (savedScroll) {
        setTimeout(() => {
          window.scrollTo({
            top: parseInt(savedScroll, 10),
            left: 0,
            behavior: "instant",
          });
        }, 100);
        isBackRef.current = false;
        prevPathnameRef.current = pathname;
        window.removeEventListener('popstate', handlePopState);
        return;
      }
      isBackRef.current = false;
    }

    // Scroll to top for new navigation
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    prevPathnameRef.current = pathname;

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  return null;
}

export default ScrollToTop;

