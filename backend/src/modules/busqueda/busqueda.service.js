import { errorNegocio } from "../../shared/errores/error-negocio.js";
import {
  buscarTutorPorId,
  buscarTutores,
  calificacionesDeTutores,
  materiasConTutores,
} from "./busqueda.repository.js";

export const MAXIMO_RESULTADOS = 50;
const CALIFICACION_MINIMA = 480; // 4.80, en centésimas
const PROMEDIO_MINIMO = 450; // 4.50, en centésimas

// Las notas se comparan en centésimas enteras, sin `float`. `promedioAcademico`
// llega como Decimal(3,2) de Prisma; su texto ("4.70") se convierte sin perder precisión.
const aCentesimas = (valor) => {
  if (valor === null || valor === undefined) return null;
  const [entero, decimales = ""] = valor.toString().split(".");
  return Number(entero) * 100 + Number(decimales.padEnd(2, "0").slice(0, 2));
};

const desdeCentesimas = (centesimas) =>
  centesimas === null ? null : centesimas / 100;

const iniciales = ({ nombres, apellidos }) =>
  [nombres, apellidos]
    .map((parte) => parte?.trim().charAt(0) ?? "")
    .join("")
    .toUpperCase();

const calificacionEnCentesimas = ({ suma, cantidad }) =>
  cantidad > 0 ? Math.round((suma * 100) / cantidad) : null;

// Une el tutor con su calificación y prepara los valores en centésimas que usan
// el filtro y el orden. La materia elegida va primero en la lista.
const prepararTutor = (tutor, calificaciones, materiaId) => {
  const { suma = 0, cantidad = 0 } = calificaciones.get(tutor.id) ?? {};
  const calificacion = calificacionEnCentesimas({ suma, cantidad });

  const materias = tutor.materias
    .map((materia) => ({ ...materia, centesimas: aCentesimas(materia.promedio) }))
    .sort((a, b) => (b.id === materiaId) - (a.id === materiaId));

  const promedioReferencia = materiaId
    ? (materias.find((materia) => materia.id === materiaId)?.centesimas ?? null)
    : Math.max(...materias.map((materia) => materia.centesimas ?? 0));

  return { tutor, calificacion, cantidad, materias, promedioReferencia };
};

const cumpleFiltro = (filtro) => (candidato) => {
  if (filtro === "calificacion") {
    // Sin calificaciones no se puede afirmar 4.8 o más: queda fuera.
    return (
      candidato.calificacion !== null &&
      candidato.calificacion >= CALIFICACION_MINIMA
    );
  }
  if (filtro === "promedio") {
    // Con materia, su promedio; sin materia, el mejor de sus materias.
    return (candidato.promedioReferencia ?? 0) >= PROMEDIO_MINIMO;
  }
  return true;
};

// Calificación descendente (sin calificación, al final); a igualdad, promedio
// en la materia; y por último el nombre, para que el orden sea estable.
const compararCandidatos = (a, b) =>
  (b.calificacion ?? -1) - (a.calificacion ?? -1) ||
  (b.promedioReferencia ?? -1) - (a.promedioReferencia ?? -1) ||
  `${a.tutor.nombres} ${a.tutor.apellidos}`.localeCompare(
    `${b.tutor.nombres} ${b.tutor.apellidos}`,
    "es",
  );

// Respuesta pública: sin correo, cédula, documentos ni estados de solicitudes.
const aRespuestaPublica = ({ tutor, calificacion, cantidad, materias }) => ({
  id: tutor.id,
  nombreCompleto: `${tutor.nombres} ${tutor.apellidos}`.trim(),
  iniciales: iniciales(tutor),
  calificacion: { promedio: desdeCentesimas(calificacion), cantidad },
  descripcion: tutor.descripcion,
  materias: materias.map(({ id, nombre, centesimas }) => ({
    id,
    nombre,
    promedio: desdeCentesimas(centesimas),
  })),
});

const palabrasDe = (texto) =>
  (texto ?? "").split(/\s+/).filter(Boolean);

export const buscar = async (usuarioId, { q, materiaId, filtro = "todos" }) => {
  const tutores = await buscarTutores({
    usuarioId,
    palabras: palabrasDe(q),
    materiaId,
  });
  const calificaciones = await calificacionesDeTutores(
    tutores.map((tutor) => tutor.id),
  );

  const coincidencias = tutores
    .map((tutor) => prepararTutor(tutor, calificaciones, materiaId))
    .filter(cumpleFiltro(filtro))
    .sort(compararCandidatos);

  return {
    total: coincidencias.length,
    tutores: coincidencias.slice(0, MAXIMO_RESULTADOS).map(aRespuestaPublica),
  };
};

export const listarMaterias = (usuarioId) => materiasConTutores(usuarioId);

export const obtenerPerfil = async (usuarioId, tutorId) => {
  const tutor = await buscarTutorPorId({ tutorId, usuarioId });
  // Mismo 404 si no existe, no tiene materias aprobadas o es el propio usuario.
  if (!tutor) {
    throw errorNegocio("TUTOR_NO_ENCONTRADO", "No encontramos este tutor", 404);
  }
  const calificaciones = await calificacionesDeTutores([tutor.id]);
  return aRespuestaPublica(prepararTutor(tutor, calificaciones));
};
