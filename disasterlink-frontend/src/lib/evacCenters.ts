import L from 'leaflet';

export const FALLBACK_EVAC_CENTERS = [
  { id: 1, name: 'Binalbagan Central School Evac Center', lat: 10.1933, lng: 122.8600, capacity: 500, current_occupants: 150, status: 'Open', food_level: 'Adequate', water_level: 'Low', medicine_level: 'Adequate', lgu_id: 1 },
  { id: 2, name: 'Binalbagan Catholic College Gym', lat: 10.1970, lng: 122.8610, capacity: 1000, current_occupants: 0, status: 'Standby', food_level: 'High', water_level: 'High', medicine_level: 'High', lgu_id: 1 },
  { id: 3, name: 'Cabanatuan City Central School Evac Center', lat: 15.4851, lng: 120.9734, capacity: 800, current_occupants: 100, status: 'Open', food_level: 'High', water_level: 'Adequate', medicine_level: 'Low', lgu_id: 2 },
  { id: 4, name: 'Nueva Ecija High School Gym', lat: 15.4820, lng: 120.9750, capacity: 1200, current_occupants: 0, status: 'Standby', food_level: 'High', water_level: 'High', medicine_level: 'High', lgu_id: 2 }
];

export const EVAC_CENTER_ICON = L.divIcon({
  className: "bg-transparent",
  html: `<div class="relative flex items-center justify-center h-10 w-10 rounded-full bg-purple-600 border-2 border-[#15181D] shadow-[0_0_15px_rgba(168,85,247,0.5)] z-20 transition-transform hover:scale-110">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tent"><path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/></svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});
