import { useEffect, useState } from 'react';

const GOOGLE_MAPS_SCRIPT_ID = 'earthquake-google-maps-script';
const GOOGLE_MAPS_PROMISE_KEY = '__earthquakeGoogleMapsPromise__';

function loadGoogleMapsApi(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error('Missing Google Maps API key.'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (window[GOOGLE_MAPS_PROMISE_KEY]) {
    return window[GOOGLE_MAPS_PROMISE_KEY];
  }

  window[GOOGLE_MAPS_PROMISE_KEY] = new Promise((resolve, reject) => {
    const onLoad = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps loaded without a maps namespace.'));
      }
    };

    const onError = () => {
      reject(new Error('Failed to load the Google Maps JavaScript API.'));
    };

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener('load', onLoad, { once: true });
      existingScript.addEventListener('error', onError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=geometry`;
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    document.head.appendChild(script);
  });

  return window[GOOGLE_MAPS_PROMISE_KEY];
}

export function useGoogleMapsApi() {
  const [state, setState] = useState({
    status: process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? 'loading' : 'missing-key',
    error: '',
  });

  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setState({
        status: 'missing-key',
        error: '',
      });
      return undefined;
    }

    let cancelled = false;

    loadGoogleMapsApi(apiKey)
      .then(() => {
        if (!cancelled) {
          setState({
            status: 'loaded',
            error: '',
          });
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setState({
            status: 'error',
            error: loadError.message,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
