import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/auth-context.jsx";
import { esCancelacion } from "./api-solicitudes.js";

const ESTADOS = new Set(["pendiente", "aceptada", "rechazada"]);

// Carga una lista de solicitudes (enviadas o recibidas) filtrada por la pestaña,
// que vive en la URL (?estado=). `recargar()` la vuelve a pedir.
export const useListaSolicitudes = (obtener) => {
  const { fijarUsuario } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const crudo = parametros.get("estado");
  const estado = ESTADOS.has(crudo) ? crudo : null;

  const [intento, setIntento] = useState(0);
  const [terminado, setTerminado] = useState(null);
  const clave = `${estado ?? "todas"}:${intento}`;
  const cargando = terminado?.clave !== clave;
  // Mientras recarga se sigue mostrando la lista anterior.
  const solicitudes = terminado?.solicitudes ?? null;
  const error = cargando ? null : terminado?.error ?? null;

  useEffect(() => {
    const controlador = new AbortController();
    obtener(estado, { signal: controlador.signal })
      .then((respuesta) => setTerminado({ clave, solicitudes: respuesta.solicitudes }))
      .catch((fallo) => {
        if (esCancelacion(fallo)) return;
        if (fallo?.status === 401) {
          fijarUsuario(null);
          return;
        }
        setTerminado({ clave, error: fallo });
      });
    return () => controlador.abort();
  }, [obtener, estado, clave, fijarUsuario]);

  const cambiarEstado = useCallback(
    (siguiente) => {
      setParametros(siguiente ? { estado: siguiente } : {}, { replace: true });
    },
    [setParametros],
  );

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  return { estado, cambiarEstado, solicitudes, cargando, error, recargar };
};
