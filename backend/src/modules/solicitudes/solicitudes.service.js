import { prisma } from "../../shared/prisma/client.js";
import { errorNegocio } from "../../shared/errores/error-negocio.js";
import {
  enviarCorreoNuevaSolicitud,
  enviarCorreoSolicitudAceptada,
  enviarCorreoSolicitudRechazada,
} from "../../shared/email/correo.service.js";
import { esTutorVisible } from "../busqueda/busqueda.repository.js";
import { DIAS_POR_SEMANA, HORAS_PERMITIDAS } from "../disponibilidad/disponibilidad.constantes.js";
import {
  ahoraEnColombia,
  describirBloque,
  diaDeLaSemana,
  esPasado,
  fechaDeBd,
  fechaHoraABd,
  horaDeBd,
  horaLegible,
} from "../disponibilidad/fechas.js";
import { METODOS_PAGO } from "./solicitudes.constantes.js";
import {
  bloqueTieneSolicitudViva,
  bloquearBloque,
  buscarBloque,
  buscarSolicitud,
  contarPendientesFuturas,
  estudianteTieneChoque,
  insertarSolicitud,
  listarSolicitudes,
  materiaAprobadaDeTutor,
  responderSiPendiente,
} from "./solicitudes.repository.js";

const HORAS = new Set(HORAS_PERMITIDAS);

const nombreCompleto = (persona) => `${persona.nombres} ${persona.apellidos}`.trim();

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

const horarioNoDisponible = () =>
  errorNegocio("HORARIO_NO_DISPONIBLE", "Este horario ya no está disponible", 409);

const tutorNoEncontrado = () =>
  errorNegocio("TUTOR_NO_ENCONTRADO", "No encontramos este tutor", 404);

const solicitudNoEncontrada = () =>
  errorNegocio("SOLICITUD_NO_ENCONTRADA", "No encontramos esta solicitud", 404);

const yaRespondida = () =>
  errorNegocio("SOLICITUD_YA_RESPONDIDA", "Esta solicitud ya fue respondida", 409);

// ---------------------------------------------------------------------------
// Vista pública de una solicitud
// ---------------------------------------------------------------------------

const horarioDe = (solicitud) => {
  const fecha = fechaDeBd(solicitud.bloque.fecha);
  const horaInicio = horaDeBd(solicitud.bloque.horaInicio);
  const horaFin = horaDeBd(solicitud.bloque.horaFin);
  return { fecha, horaInicio, horaFin };
};

const textoHorario = ({ fecha, horaInicio, horaFin }) =>
  `${describirBloque({ fecha, horaInicio })} – ${horaLegible(horaFin)} (hora de Colombia)`;

// `perspectiva`: "estudiante" (Mis tutorías) o "tutor" (Solicitudes recibidas).
// La contraparte solo muestra su correo institucional si la tutoría está aceptada.
const aVista = (solicitud, perspectiva, ahora) => {
  const horario = horarioDe(solicitud);
  const aceptada = solicitud.estado === "aceptada";
  const contraparte = perspectiva === "estudiante" ? solicitud.tutor : solicitud.estudiante;
  const datosContraparte = {
    nombreCompleto: nombreCompleto(contraparte),
    correo: aceptada ? contraparte.correoInstitucional : null,
  };

  return {
    id: solicitud.id,
    estado: solicitud.estado,
    vencida:
      solicitud.estado === "pendiente" && esPasado(horario.fecha, horario.horaInicio, ahora),
    ...horario,
    materia: { id: solicitud.materia.id, nombre: solicitud.materia.nombre },
    metodoPago: {
      clave: solicitud.metodoPago,
      etiqueta: METODOS_PAGO[solicitud.metodoPago],
    },
    mensaje: solicitud.mensaje,
    motivoRechazo: solicitud.estado === "rechazada" ? solicitud.motivoRechazo : null,
    creadoEn: solicitud.creadoEn,
    respondidoEn: solicitud.respondidoEn,
    ...(perspectiva === "estudiante"
      ? { tutor: { id: contraparte.id, ...datosContraparte } }
      : { estudiante: datosContraparte }),
  };
};

// Las pendientes primero (la más próxima arriba); después el resto, de la más
// reciente a la más antigua.
const ordenar = (vistas) => {
  const momento = (vista) => `${vista.fecha}T${vista.horaInicio}`;
  const pendientes = vistas
    .filter((vista) => vista.estado === "pendiente")
    .sort((a, b) => momento(a).localeCompare(momento(b)));
  const resto = vistas
    .filter((vista) => vista.estado !== "pendiente")
    .sort((a, b) => momento(b).localeCompare(momento(a)));
  return [...pendientes, ...resto];
};

// ---------------------------------------------------------------------------
// Notificaciones (asíncronas: nunca afectan la respuesta)
// ---------------------------------------------------------------------------

// El log no incluye destinatarios ni contenido: solo qué falló y el código.
const notificar = (que, solicitudId, envio) => {
  Promise.resolve()
    .then(envio)
    .catch((error) => {
      console.error(
        `No se pudo enviar el correo de ${que} (solicitud ${solicitudId}): ${error?.code ?? error?.name ?? "error"}`,
      );
    });
};

// ---------------------------------------------------------------------------
// Crear
// ---------------------------------------------------------------------------

export const crearSolicitud = async (estudianteId, { disponibilidadId, materiaId, metodoPago, mensaje }) => {
  const ahora = ahoraEnColombia();

  const solicitudId = await prisma.$transaction(async (transaccion) => {
    // Primero el bloqueo: lo que se lee después ya ve las solicitudes que otra
    // transacción haya confirmado sobre este bloque.
    await bloquearBloque(transaccion, disponibilidadId);
    const bloque = await buscarBloque(transaccion, disponibilidadId);
    if (!bloque) throw horarioNoDisponible();

    if (!(await esTutorVisible({ tutorId: bloque.tutorId, usuarioId: estudianteId }))) {
      throw tutorNoEncontrado();
    }

    const fecha = fechaDeBd(bloque.fecha);
    const horaInicio = horaDeBd(bloque.horaInicio);
    if (
      !bloque.activo ||
      !HORAS.has(horaInicio) ||
      diaDeLaSemana(fecha) >= DIAS_POR_SEMANA ||
      esPasado(fecha, horaInicio, ahora) ||
      (await bloqueTieneSolicitudViva(transaccion, disponibilidadId))
    ) {
      throw horarioNoDisponible();
    }

    if (!(await materiaAprobadaDeTutor(transaccion, bloque.tutorId, materiaId))) {
      throw errorNegocio(
        "MATERIA_NO_OFRECIDA",
        "El tutor no ofrece esa materia",
        400,
      );
    }

    const fechaHoraSolicitud = fechaHoraABd(fecha, horaInicio);
    if (await estudianteTieneChoque(transaccion, estudianteId, fechaHoraSolicitud)) {
      throw errorNegocio(
        "CHOQUE_DE_HORARIO",
        "Ya tienes otra tutoría pendiente o confirmada a esa misma hora",
        409,
      );
    }

    const creada = await insertarSolicitud(transaccion, {
      estudianteId,
      tutorId: bloque.tutorId,
      materiaId,
      disponibilidadId,
      fechaHoraSolicitud,
      metodoPago,
      mensaje: mensaje ?? null,
    });
    return creada.id;
  });

  const solicitud = await buscarSolicitud(solicitudId);
  notificar("nueva solicitud", solicitudId, () =>
    enviarCorreoNuevaSolicitud({
      correo: solicitud.tutor.correoInstitucional,
      nombreTutor: solicitud.tutor.nombres,
      nombreEstudiante: nombreCompleto(solicitud.estudiante),
      materia: solicitud.materia.nombre,
      horario: textoHorario(horarioDe(solicitud)),
      metodoPago: METODOS_PAGO[solicitud.metodoPago],
      mensaje: solicitud.mensaje,
    }),
  );

  return aVista(solicitud, "estudiante", ahora);
};

// ---------------------------------------------------------------------------
// Responder
// ---------------------------------------------------------------------------

// Solicitud pendiente del tutor, o el error que corresponda.
const solicitudPendienteDe = async (tutorId, id) => {
  const solicitud = await buscarSolicitud(id);
  // Mismo 404 si no existe o es de otro tutor: no se revela cuál.
  if (!solicitud || solicitud.tutorId !== tutorId) throw solicitudNoEncontrada();
  if (solicitud.estado !== "pendiente") throw yaRespondida();
  return solicitud;
};

export const aceptarSolicitud = async (tutorId, id) => {
  const ahora = ahoraEnColombia();
  const solicitud = await solicitudPendienteDe(tutorId, id);
  const horario = horarioDe(solicitud);
  if (esPasado(horario.fecha, horario.horaInicio, ahora)) {
    throw errorNegocio(
      "SOLICITUD_VENCIDA",
      "El horario de esta solicitud ya pasó; no se puede aceptar",
      409,
    );
  }

  if (!(await responderSiPendiente(id, tutorId, { estado: "aceptada" }))) {
    throw yaRespondida();
  }

  const actualizada = await buscarSolicitud(id);
  notificar("solicitud aceptada", id, () =>
    enviarCorreoSolicitudAceptada({
      correo: actualizada.estudiante.correoInstitucional,
      nombreEstudiante: actualizada.estudiante.nombres,
      nombreTutor: nombreCompleto(actualizada.tutor),
      correoTutor: actualizada.tutor.correoInstitucional,
      materia: actualizada.materia.nombre,
      horario: textoHorario(horario),
    }),
  );

  return aVista(actualizada, "tutor", ahora);
};

// Una solicitud vencida se puede rechazar (sirve para limpiar la lista).
export const rechazarSolicitud = async (tutorId, id, motivo) => {
  const ahora = ahoraEnColombia();
  await solicitudPendienteDe(tutorId, id);

  const respondida = await responderSiPendiente(id, tutorId, {
    estado: "rechazada",
    motivoRechazo: motivo ?? null,
  });
  if (!respondida) throw yaRespondida();

  const actualizada = await buscarSolicitud(id);
  notificar("solicitud rechazada", id, () =>
    enviarCorreoSolicitudRechazada({
      correo: actualizada.estudiante.correoInstitucional,
      nombreEstudiante: actualizada.estudiante.nombres,
      nombreTutor: nombreCompleto(actualizada.tutor),
      materia: actualizada.materia.nombre,
      horario: textoHorario(horarioDe(actualizada)),
      motivo: actualizada.motivoRechazo,
    }),
  );

  return aVista(actualizada, "tutor", ahora);
};

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export const listarEnviadas = async (estudianteId, estado) => {
  const ahora = ahoraEnColombia();
  const solicitudes = await listarSolicitudes({ estudianteId, estado });
  return { solicitudes: ordenar(solicitudes.map((s) => aVista(s, "estudiante", ahora))) };
};

export const listarRecibidas = async (tutorId, estado) => {
  const ahora = ahoraEnColombia();
  const solicitudes = await listarSolicitudes({ tutorId, estado });
  return { solicitudes: ordenar(solicitudes.map((s) => aVista(s, "tutor", ahora))) };
};

// Pendientes que aún se pueden aceptar (sin las vencidas), para el contador.
export const contarPendientesRecibidas = async (tutorId) => {
  const ahora = ahoraEnColombia();
  const pendientes = await contarPendientesFuturas(
    tutorId,
    fechaHoraABd(ahora.fecha, ahora.hora),
  );
  return { pendientes };
};
