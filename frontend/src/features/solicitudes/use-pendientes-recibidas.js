import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  EVENTO_SOLICITUDES,
  esCancelacion,
  obtenerPendientesRecibidas,
} from "./api-solicitudes.js";

// Número de solicitudes pendientes del tutor para la entrada "Solicitudes
// recibidas". Se pide al cargar, al cambiar de pantalla y cuando una respuesta
// avisa de un cambio (no es en tiempo real: eso es DAS-EST-004).
export const usePendientesRecibidas = (activo) => {
  const { pathname } = useLocation();
  const [cambios, setCambios] = useState(0);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    const alCambiar = () => setCambios((n) => n + 1);
    window.addEventListener(EVENTO_SOLICITUDES, alCambiar);
    return () => window.removeEventListener(EVENTO_SOLICITUDES, alCambiar);
  }, []);

  useEffect(() => {
    if (!activo) return undefined;
    const controlador = new AbortController();
    obtenerPendientesRecibidas({ signal: controlador.signal })
      .then((respuesta) => setPendientes(respuesta.pendientes))
      .catch((fallo) => {
        // El contador es secundario: si falla, simplemente no se muestra.
        if (!esCancelacion(fallo)) setPendientes(0);
      });
    return () => controlador.abort();
  }, [activo, pathname, cambios]);

  return activo ? pendientes : 0;
};
