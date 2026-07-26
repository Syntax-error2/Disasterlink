import { useEffect, useState } from "react";
import { Polyline, useMap } from "react-leaflet";
import axiosInstance from "../lib/axios";

interface RoutingMachineProps {
  start: [number, number] | null;
  end: [number, number] | null;
}

export default function RoutingMachine({ start, end }: RoutingMachineProps) {
  const map = useMap();
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!start || !end) {
      setRoutePoints([]);
      return;
    }

    const fetchRoute = async () => {
      try {
        const response = await axiosInstance.get(`/route?start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`);
        if (response.data && response.data.points) {
          setRoutePoints(response.data.points);
          // Optional: fit map bounds to route
          // const bounds = L.latLngBounds(response.data.points);
          // map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.error("Failed to fetch Google route", e);
      }
    };

    fetchRoute();
  }, [start, end, map]);

  if (routePoints.length === 0) return null;

  return (
    <Polyline 
      positions={routePoints} 
      pathOptions={{ color: "#3b82f6", weight: 6, opacity: 0.8 }} 
    />
  );
}
