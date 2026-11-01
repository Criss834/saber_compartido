import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/auth-context.jsx";
import {
  buscarTutores,
  esCancelacion,
  obtenerMateriasConTutores,
} from "./api-busqueda.js";

export const FILTROS = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "calificacion", etiqueta: "Calificación 4.8 o más" },
  { valor: "promedio", etiqueta: "Promedio 4.5 o más" },
];

const PAUSA_ESCRITURA_MS = 350;
const VALORES_FILTRO = new Set(FILTROS.map((filtro) => filtro.valor));

// La URL es la única fuente de verdad. Lo que no sea válido se ignora aquí, para
// que un enlace editado a mano no termine en un 400 del servidor.
const leerBusqueda = (parametros) => {
  const materiaId = Number(parametros.get("materiaId"));
  const filtro = parametros.get("filtro");
  return {
    q: (parametros.get("q") ?? "").slice(0, 80),
    materiaId: Number.isInteger(materiaId) && materiaId > 0 ? materiaId : null,
    filtro: VALORES_FILTRO.has(filtro) ? filtro : "todos",
  };
};

export const useBusqueda = () => {
  const { fijarUsuario } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const { q, materiaId, filtro } = leerBusqueda(parametros);

  // El campo de texto tiene su propio estado para no reescribir la URL en cada
  // tecla; si la URL cambia desde fuera (buscador de la barra superior, atrás
  // del navegador), el campo se sincroniza.
  const [texto, setTexto] = useState(q);
  const [qPrevia, setQPrevia] = useState(q);
  if (qPrevia !== q) {
    setQPrevia(q);
    // No pisar lo que el usuario está escribiendo (p. ej. un espacio final).
    if (texto.trim() !== q.trim()) setTexto(q);
  }

  const [intento, setIntento] = useState(0);
  // Última búsqueda terminada. "Cargando" se deriva: la búsqueda actual aún no
  // es la última que respondió.
  const [terminada, setTerminada] = useState(null);
  const clave = JSON.stringify([q, materiaId, filtro, intento]);
  const cargando = terminada?.clave !== clave;
  const resultado = terminada?.resultado ?? null;
  const error = cargando ? null : (terminada?.error ?? null);

  const [materias, setMaterias] = useState([]);

  const actualizarUrl = useCallback(
    (cambios) => {
      setParametros(
        (actuales) => {
          const siguientes = new URLSearchParams(actuales);
          for (const [clave, valor] of Object.entries(cambios)) {
            const vacio =
              valor === null ||
              valor === undefined ||
              valor === "" ||
              (clave === "filtro" && valor === "todos");
            if (vacio) siguientes.delete(clave);
            else siguientes.set(clave, String(valor));
          }
          return siguientes;
        },
        { replace: true },
      );
    },
    [setParametros],
  );

  // Pausa breve al escribir antes de llevar el texto a la URL.
  useEffect(() => {
    if (texto.trim() === q.trim()) return undefined;
    const temporizador = setTimeout(
      () => actualizarUrl({ q: texto.trim() }),
      PAUSA_ESCRITURA_MS,
    );
    return () => clearTimeout(temporizador);
  }, [texto, q, actualizarUrl]);

  const manejarFallo = useCallback(
    (fallo) => {
      if (fallo?.status === 401) {
        fijarUsuario(null);
        return true;
      }
      return false;
    },
    [fijarUsuario],
  );

  // Cada búsqueda cancela la anterior, así que una respuesta lenta nunca pisa a
  // una más reciente.
  useEffect(() => {
    const controlador = new AbortController();
    const [qActual, materiaActual, filtroActual] = JSON.parse(clave);

    buscarTutores(
      { q: qActual, materiaId: materiaActual, filtro: filtroActual },
      { signal: controlador.signal },
    )
      .then((respuesta) => setTerminada({ clave, resultado: respuesta }))
      .catch((fallo) => {
        if (esCancelacion(fallo)) return;
        if (manejarFallo(fallo)) return;
        // Se conserva el resultado anterior; la pantalla muestra el error.
        setTerminada((anterior) => ({
          clave,
          resultado: anterior?.resultado ?? null,
          error: fallo,
        }));
      });

    return () => controlador.abort();
  }, [clave, manejarFallo]);

  // Materias del filtro: solo las que tienen tutores. Un fallo aquí no bloquea
  // la búsqueda; el selector queda solo con "Todas las materias".
  const materiasCargadas = useRef(false);
  useEffect(() => {
    if (materiasCargadas.current) return undefined;
    const controlador = new AbortController();
    obtenerMateriasConTutores({ signal: controlador.signal })
      .then((lista) => {
        materiasCargadas.current = true;
        setMaterias(Array.isArray(lista) ? lista : []);
      })
      .catch((fallo) => {
        if (!esCancelacion(fallo)) manejarFallo(fallo);
      });
    return () => controlador.abort();
  }, [manejarFallo]);

  const hayFiltros = Boolean(q.trim() || materiaId || filtro !== "todos");

  return {
    q,
    texto,
    setTexto,
    materiaId,
    filtro,
    hayFiltros,
    materias,
    resultado,
    error,
    cargando,
    elegirMateria: (id) => actualizarUrl({ materiaId: id || null }),
    elegirFiltro: (valor) => actualizarUrl({ filtro: valor }),
    limpiarFiltros: () => {
      setTexto("");
      actualizarUrl({ q: null, materiaId: null, filtro: null });
    },
    reintentar: () => setIntento((anterior) => anterior + 1),
  };
};
