import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider } from "./hooks/useAuth";
import { SidebarProvider } from "./contexts/SidebarContext";
import { FeedbackModalProvider } from "./contexts/FeedbackModalContext";
import { BusinessProvider } from "./contexts/BusinessContext";
import { useEffect } from "react";
import { initOfflineStore } from "./lib/offlineStore";
import { syncPendingChanges } from "./lib/syncEngine";
import { offlineSyncHandlers } from "./lib/offlineSyncHandlers";

function App() {
  useEffect(() => {
    const runSync = () => {
      syncPendingChanges({ handlers: offlineSyncHandlers }).catch((error) => {
        console.error("Unable to sync offline changes", error);
      });
    };

    initOfflineStore()
      .then(runSync)
      .catch((error) => {
        console.error("Unable to initialize offline desktop storage", error);
      });

    window.addEventListener("online", runSync);
    const syncInterval = window.setInterval(runSync, 60_000);

    return () => {
      window.removeEventListener("online", runSync);
      window.clearInterval(syncInterval);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <AuthProvider>
          <BusinessProvider>
            <SidebarProvider>
              <FeedbackModalProvider>
                <AppRoutes />
              </FeedbackModalProvider>
            </SidebarProvider>
          </BusinessProvider>
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
