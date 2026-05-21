import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider } from "./hooks/useAuth";
import { SidebarProvider } from "./contexts/SidebarContext";
import { FeedbackModalProvider } from "./contexts/FeedbackModalContext";
import { useEffect } from "react";
import { initOfflineStore } from "./lib/offlineStore";

function App() {
  useEffect(() => {
    initOfflineStore().catch((error) => {
      console.error("Unable to initialize offline desktop storage", error);
    });
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <AuthProvider>
          <SidebarProvider>
            <FeedbackModalProvider>
              <AppRoutes />
            </FeedbackModalProvider>
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
