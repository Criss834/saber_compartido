const GRUPOS_ESTUDIANTE = [
  {
    etiqueta: "Menú principal",
    enlaces: [
      {
        ruta: "/dashboard",
        etiqueta: "Resumen",
        icono: "resumen",
        inicio: true,
      },
      {
        ruta: "/dashboard/buscar-tutores",
        etiqueta: "Buscar tutores",
        icono: "buscar",
        implementado: true,
      },
      {
        ruta: "/dashboard/mis-tutorias",
        etiqueta: "Mis tutorías",
        icono: "tutorias",
      },
      {
        ruta: "/dashboard/tutorias-grupales",
        etiqueta: "Tutorías grupales",
        icono: "grupal",
      },
      {
        ruta: "/dashboard/notificaciones",
        etiqueta: "Notificaciones",
        icono: "notificaciones",
        todosLosRoles: true,
      },
    ],
  },
  {
    etiqueta: "Mi espacio",
    enlaces: [
      {
        ruta: "/dashboard/ser-tutor",
        etiqueta: "Ser tutor",
        icono: "ser-tutor",
        implementado: true,
      },
      {
        ruta: "/dashboard/mi-perfil",
        etiqueta: "Mi perfil",
        icono: "perfil",
        todosLosRoles: true,
      },
    ],
  },
];

// Según el prototipo, el administrador tiene su propio menú. "Usuarios" y
// "Reportes" quedan fuera: mission.md limita el rol a verificar tutores.
const GRUPOS_ADMINISTRADOR = [
  {
    etiqueta: "Administración",
    enlaces: [
      {
        ruta: "/dashboard",
        etiqueta: "Resumen",
        icono: "resumen",
        inicio: true,
      },
      {
        ruta: "/dashboard/admin/verificaciones",
        etiqueta: "Verificación de tutores",
        icono: "verificaciones",
        implementado: true,
      },
    ],
  },
];

export const gruposDeRol = (rol) =>
  rol === "administrador" ? GRUPOS_ADMINISTRADOR : GRUPOS_ESTUDIANTE;

// Pantallas aún sin implementar. Las marcadas con `todosLosRoles` (Mi perfil,
// Notificaciones) también son accesibles para el administrador.
export const PANTALLAS_PLACEHOLDER = GRUPOS_ESTUDIANTE.flatMap((grupo) =>
  grupo.enlaces.filter((enlace) => !enlace.inicio && !enlace.implementado),
);

const TODOS_LOS_ENLACES = [...GRUPOS_ESTUDIANTE, ...GRUPOS_ADMINISTRADOR].flatMap(
  (grupo) => grupo.enlaces,
);

export const etiquetaDeRuta = (ruta) => {
  if (ruta.startsWith("/dashboard/buscar-tutores/")) return "Perfil del tutor";
  const coincidencia = TODOS_LOS_ENLACES.find((enlace) => enlace.ruta === ruta);
  if (coincidencia) return coincidencia.etiqueta;

  const segmento = ruta.split("/").filter(Boolean).pop() ?? "";
  if (!segmento) return "Resumen";
  return segmento
    .replace(/-/g, " ")
    .replace(/^./, (letra) => letra.toUpperCase());
};
