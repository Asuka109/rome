import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFileBrowserStoreApi } from "../store/context";

/**
 * Intercepts plain left-clicks on in-app anchors when we have unsaved edits,
 * so the user gets the same confirm-on-leave flow we use for file/folder
 * selection changes.
 */
export function useDocumentLinkInterceptor() {
  const store = useFileBrowserStoreApi();
  const navigate = useNavigate();

  useEffect(() => {
    const handleDocumentClick = (event: globalThis.MouseEvent) => {
      const fileSlice = store.getState().file;
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !fileSlice.hasUnsavedEdits()
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.download || (anchor.target && anchor.target !== "_self")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (
        nextUrl.origin === currentUrl.origin &&
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void fileSlice.resolveUnsavedEditsBeforeLeaving().then((canLeave) => {
        if (!canLeave) return;
        if (nextUrl.origin === currentUrl.origin) {
          const nextBrowserPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
          store.getState().refs.acceptedBrowserPath = nextBrowserPath;
          navigate(nextBrowserPath);
          return;
        }
        store.getState().file.setSuppressNextBeforeUnload(true);
        window.location.assign(nextUrl.href);
      });
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [navigate, store]);
}
