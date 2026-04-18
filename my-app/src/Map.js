import React, { useEffect } from 'react';
import './Map.css';

function Map() {
  const initMap = () => {
    const mapNode = document.getElementById("map");
    if (!mapNode) {
      console.error('Google Map container element not found.');
      return;
    }

    if (!window.google || !window.google.maps) {
      console.error('Google Maps JS API is not available on window after loading.');
      return;
    }

    const socal = { lat: 34.0522, lng: -118.2437 };
    new window.google.maps.Map(mapNode, {
      center: socal,
      zoom: 7,
    });
  };

  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Missing REACT_APP_GOOGLE_MAPS_API_KEY in my-app/.env or environment.');
      return;
    }

    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps) {
        initMap();
      } else {
        console.error('Google Maps script loaded but window.google.maps is not available.');
      }
    };
    script.onerror = () => console.error('Google Maps script failed to load. Check your API key and network.');
    document.head.appendChild(script);
  }, []);


  return (
    <div id="map"></div>
  );
}

export default Map;