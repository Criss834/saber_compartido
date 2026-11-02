import { prisma } from "../../shared/prisma/client.js";

// Las columnas de texto usan la colación utf8mb4_unicode_ci, así que `contains`
// ya ignora mayúsculas y tildes ("algoritmica" encuentra "Algorítmica").

const APROBADO = "aprobado";

const seleccionTutor = {
  id: true,
  nombres: true,
  apellidos: true,
  tutores_materias_tutores_materias_tutor_idTousuarios: {
    where: { estado: APROBADO },
    select: {
      promedioAcademico: true,
      descripcion: true,
      revisadoEn: true,
      creadoEn: true,
      materias: { select: { id: true, nombre: true } },
    },
  },
};

const fechaOrden = (fila) =>
  (fila.revisadoEn ?? fila.creadoEn)?.getTime?.() ?? 0;

// Descripción de la solicitud aprobada más reciente que tenga una. Se guarda en
// cada fila del mismo envío, así que si hay varias distintas se muestra una.
const descripcionMasReciente = (filas) =>
  [...filas]
    .filter((fila) => fila.descripcion?.trim())
    .sort((a, b) => fechaOrden(b) - fechaOrden(a))[0]?.descripcion.trim() ??
  null;

const aTutor = (usuario) => {
  const aprobadas = usuario.tutores_materias_tutores_materias_tutor_idTousuarios;
  return {
    id: usuario.id,
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    descripcion: descripcionMasReciente(aprobadas),
    materias: aprobadas
      .map((fila) => ({
        id: fila.materias.id,
        nombre: fila.materias.nombre,
        promedio: fila.promedioAcademico,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  };
};

const tieneMateriaAprobada = (condicion = {}) => ({
  tutores_materias_tutores_materias_tutor_idTousuarios: {
    some: { estado: APROBADO, ...condicion },
  },
});

// Prisma no escapa los comodines de LIKE en MySQL: sin esto, buscar "%" o "_"
// coincidiría con cualquier tutor.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);

// Cada palabra debe aparecer en los nombres, los apellidos o el nombre de
// alguna materia aprobada del tutor.
const coincidePalabra = (texto) => {
  const palabra = escaparLike(texto);
  return {
    OR: [
      { nombres: { contains: palabra } },
      { apellidos: { contains: palabra } },
      tieneMateriaAprobada({ materias: { nombre: { contains: palabra } } }),
    ],
  };
};

export const buscarTutores = async ({ usuarioId, palabras = [], materiaId }) => {
  const usuarios = await prisma.usuarios.findMany({
    where: {
      id: { not: usuarioId },
      AND: [
        tieneMateriaAprobada(materiaId ? { materiaId } : {}),
        ...palabras.map(coincidePalabra),
      ],
    },
    select: seleccionTutor,
  });
  return usuarios.map(aTutor);
};

// Promedio y cantidad de calificaciones por tutor, en una sola consulta. Se
// devuelve la suma para que el service calcule el promedio sin `float`.
export const calificacionesDeTutores = async (tutorIds) => {
  if (tutorIds.length === 0) return new Map();

  const grupos = await prisma.calificaciones.groupBy({
    by: ["tutorId"],
    where: { tutorId: { in: tutorIds } },
    _sum: { calificacion: true },
    _count: { _all: true },
  });

  return new Map(
    grupos.map((grupo) => [
      grupo.tutorId,
      { suma: grupo._sum.calificacion ?? 0, cantidad: grupo._count._all },
    ]),
  );
};

// Materias con al menos un tutor aprobado distinto del usuario, para el filtro.
export const materiasConTutores = async (usuarioId) =>
  prisma.materias.findMany({
    where: {
      tutores_materias: {
        some: { estado: APROBADO, tutorId: { not: usuarioId } },
      },
    },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

// Un tutor por id con la misma regla de la búsqueda: al menos una materia
// aprobada y distinto del usuario. Devuelve null en cualquier otro caso.
export const buscarTutorPorId = async ({ tutorId, usuarioId }) => {
  if (tutorId === usuarioId) return null;

  const usuario = await prisma.usuarios.findFirst({
    where: { id: tutorId, ...tieneMateriaAprobada() },
    select: seleccionTutor,
  });
  return usuario ? aTutor(usuario) : null;
};

// Misma regla que buscarTutorPorId, sin cargar el perfil. La usa el calendario
// público de disponibilidad (009).
export const esTutorVisible = async ({ tutorId, usuarioId }) => {
  if (tutorId === usuarioId) return false;
  const usuario = await prisma.usuarios.findFirst({
    where: { id: tutorId, ...tieneMateriaAprobada() },
    select: { id: true },
  });
  return Boolean(usuario);
};
