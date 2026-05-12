import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { HomePage } from './pages/HomePage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { AgentsPage } from './pages/AgentsPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { ActivityPage } from './pages/ActivityPage';
import { getServices, type PublicService } from './lib/api';

export function App() {
  const [services, setServices] = useState<PublicService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    getServices(ctrl.signal)
      .then((r) => {
        setServices(r.services);
        setServicesLoading(false);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setServicesError(e instanceof Error ? e.message : 'unknown error');
        setServicesLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div style={{ minHeight: '100vh', background: 'var(--pro-bg)' }}>
        <Header />
        <Routes>
          <Route
            path="/"
            element={
              <HomePage services={services} loading={servicesLoading} error={servicesError} />
            }
          />
          <Route path="/service/:agentId" element={<ServiceDetailPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route
            path="/activity"
            element={<ActivityPage initialServiceCount={services.length} />}
          />
          <Route
            path="*"
            element={
              <HomePage services={services} loading={servicesLoading} error={servicesError} />
            }
          />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
