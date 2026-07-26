import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import { useMap } from "react-leaflet";

interface RoutingMachineProps {
  start: [number, number] | null;
  end: [number, number] | null;
}

export default function RoutingMachine({ start, end }: RoutingMachineProps) {
  const map = useMap();
  const [routingControl, setRoutingControl] = useState<L.Routing.Control | null>(null);

  useEffect(() => {
    if (!start || !end) {
      if (routingControl) {
        map.removeControl(routingControl);
        setRoutingControl(null);
      }
      return;
    }

    if (routingControl) {
      routingControl.setWaypoints([
        L.latLng(start[0], start[1]),
        L.latLng(end[0], end[1])
      ]);
    } else {
      const control = L.Routing.control({
        waypoints: [
          L.latLng(start[0], start[1]),
          L.latLng(end[0], end[1])
        ],
        lineOptions: {
          styles: [{ color: "#3b82f6", weight: 6, opacity: 0.8 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0
        },
        show: false, // Hide the turn-by-turn text box to keep UI clean
        addWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
      }).addTo(map);

      // We only want the line, not the default markers
      control.on('routesfound', function(e) {
          // You can extract distance/time here if needed:
          // const routes = e.routes;
          // const summary = routes[0].summary;
      });

      setRoutingControl(control);
    }

    return () => {
      // Cleanup on unmount, but not on every render
    };
  }, [start, end, map]);

  return null;
}
