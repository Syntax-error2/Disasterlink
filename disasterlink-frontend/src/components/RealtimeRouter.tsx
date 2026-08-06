import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

interface RealtimeRouterProps {
  start: [number, number] | null;
  end: [number, number] | null;
  showInstructions?: boolean;
}

export default function RealtimeRouter({ start, end, showInstructions = false }: RealtimeRouterProps) {
  const map = useMap();

  useEffect(() => {
    if (!start || !end || !map) return;

    // @ts-ignore - Leaflet Routing Machine extends L
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start[0], start[1]),
        L.latLng(end[0], end[1])
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      show: showInstructions,
      createMarker: function() { return null; }, // Hide default waypoint markers
      lineOptions: {
        styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      }
    }).addTo(map);


    return () => {
      if (map && routingControl) {
        try {
          map.removeControl(routingControl);
        } catch (e) {
          console.error("Error removing routing control:", e);
        }
      }
    };
  }, [start, end, map]);

  return null;
}
