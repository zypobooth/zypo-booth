import { HelmetProvider } from 'react-helmet-async';
import React, { Suspense, lazy, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AlertProvider } from './context/AlertContext';
import { ThemeProvider } from './context/ThemeContext';
import SocialNotification from './components/SocialNotification';

function lazyRetry(importFn, retriesLeft = 3, interval = 1500) {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attempt = (left) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (left <= 0) {
              reject(error);
              return;
            }
            setTimeout(() => {
              attempt(left - 1);
            }, interval);
          });
      };
      attempt(retriesLeft);
    });
  });
}

const Home = lazyRetry(() => import('./pages/Home'));
const Booth = lazyRetry(() => import('./pages/Booth'));
const Result = lazyRetry(() => import('./pages/Result'));
const About = lazyRetry(() => import('./pages/About'));
const PrivacyPolicy = lazyRetry(() => import('./pages/PrivacyPolicy'));
const Contact = lazyRetry(() => import('./pages/Contact'));
const FrameCreator = lazyRetry(() => import('./pages/FrameCreator'));
const FrameSelection = lazyRetry(() => import('./pages/FrameSelection'));
const SelectFilter = lazyRetry(() => import('./pages/SelectFilter'));

const NotFound = lazyRetry(() => import('./pages/NotFound'));
const DeveloperProfile = lazyRetry(() => import('./pages/DeveloperProfile'));
const Gallery = lazyRetry(() => import('./pages/Gallery'));

import HamsterLoader from './components/Loader/HamsterLoader';

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-game-bg">
    <HamsterLoader message="LOADING MISSION..." />
  </div>
);

const ErrorFallback = () => {
  const handleReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
    }
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white gap-6 p-6 text-center">
      <h1 className="text-2xl md:text-4xl font-titan text-game-accent">Something went wrong</h1>
      <p className="text-white/70 max-w-md font-nunito">
        This may be caused by a network issue or a stale cache. Click the button below to clear the cache and reload.
      </p>
      <button
        onClick={handleReload}
        className="px-8 py-3 btn-game-accent btn-cute text-black font-titan text-lg rounded-xl shadow-game transition-all"
      >
        CLEAR CACHE & RELOAD
      </button>
    </div>
  );
};


import { PhotoBoothProvider } from './context/PhotoBoothContext';

function App() {
  useEffect(() => {
    // Force clear old aggressive caches from previous versions
    try {
      localStorage.removeItem('frames_cache');
      localStorage.removeItem('frames_cache_timestamp');
      localStorage.removeItem('cached_frames');
      localStorage.removeItem('cached_db_frames');
    } catch (e) {
      // Ignore
    }

    // Force service worker to check for updates immediately on load
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update();
        });
      }).catch(() => { });
    }
  }, []);

  return (
    <HelmetProvider>
      <ThemeProvider>
        <PhotoBoothProvider>
          <AlertProvider>
            <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
              <AuthProvider>
                <Router>
                  <a href="#main-content" className="skip-to-content">Skip to Main Content</a>
                  <SocialNotification />
                  <main id="main-content" tabIndex="-1">
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/select-frame" element={<FrameSelection />} />
                        <Route path="/booth" element={<Booth />} />
                        <Route path="/select-filter" element={<SelectFilter />} />
                        <Route path="/result" element={<Result />} />
                        <Route path="/create-frame" element={<FrameCreator />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/contact" element={<Contact />} />

                        <Route path="/developer-nanda" element={<DeveloperProfile />} />
                        <Route path="/g/:id" element={<Gallery />} />
                        <Route path="/gallery/:id" element={<Gallery />} />

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </main>
                </Router>
              </AuthProvider>
            </Sentry.ErrorBoundary>
          </AlertProvider>
        </PhotoBoothProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
