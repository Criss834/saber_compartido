import { config } from "../../config/index.js";
import { transporte } from "./transporte.js";

const escaparHtml = (texto) =>
  String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const plantillaVerificacion = (nombres, enlace) => `
  <div style="font-family: Inter, Arial, sans-serif; background: #F5F3FF; padding: 24px 12px;">
    <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 28px 22px; border: 1px solid #E5E7EB; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word;">
      <h1 style="font-family: Poppins, Arial, sans-serif; color: #7C3AED; font-size: 22px; margin: 0 0 16px;">
        Saber Compartido
      </h1>
      <p style="color: #1F1147; font-size: 15px; line-height: 1.6; margin: 0 0 12px;">
        Hola <strong>${escaparHtml(nombres)}</strong>, gracias por crear tu cuenta en Saber Compartido.
      </p>
      <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Verifica tu correo para activar tu cuenta y poder buscar tutores.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${escaparHtml(enlace)}" style="background: #FF5A8C; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; display: inline-block;">
          Verificar mi correo
        </a>
      </p>
      <p style="color: #6B7280; font-size: 13px; line-height: 1.6; margin: 0 0 8px;">
        Este enlace vence en 24 horas. Si no solicitaste esta cuenta, ignora este correo.
      </p>
      <p style="color: #6B7280; font-size: 12px; word-break: break-all; margin: 0;">
        ${escaparHtml(enlace)}
      </p>
    </div>
  </div>
`;

export const enviarCorreoVerificacion = async ({ correo, nombres, token }) => {
  const enlace = `${config.urlFrontend}/verificar/${token}`;
  return transporte.sendMail({
    from: config.smtp.remitente || config.smtp.usuario || "no-responder@localhost",
    to: correo,
    subject: "Verifica tu correo — Saber Compartido",
    html: plantillaVerificacion(nombres, enlace),
  });
};

// ---------------------------------------------------------------------------
// Notificaciones de solicitudes de tutoría (010). Los textos llegan ya
// formateados (fecha y hora de Colombia, etiqueta del método de pago) y se
// escapan aquí. El asunto no lleva datos personales.
// ---------------------------------------------------------------------------

const remitente = () =>
  config.smtp.remitente || config.smtp.usuario || "no-responder@localhost";

// Etiqueta arriba y valor debajo: en Gmail móvil una tabla de dos columnas con
// valores largos (correos, horarios) se salía de la tarjeta.
const filaDato = (etiqueta, valor) => `
  <tr>
    <td style="padding: 9px 0; border-bottom: 1px solid #F0EDF6;">
      <div style="color: #6B7280; font-size: 12px; line-height: 1.4; margin: 0 0 2px;">${escaparHtml(etiqueta)}</div>
      <div style="color: #1F1147; font-size: 14px; line-height: 1.5; font-weight: 600; word-break: break-word; overflow-wrap: anywhere;">${escaparHtml(valor)}</div>
    </td>
  </tr>`;

const plantillaSolicitud = ({ saludo, intro, datos, boton, enlace, pie }) => `
  <div style="font-family: Inter, Arial, sans-serif; background: #F5F3FF; padding: 24px 12px;">
    <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 28px 22px; border: 1px solid #E5E7EB; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word;">
      <h1 style="font-family: Poppins, Arial, sans-serif; color: #7C3AED; font-size: 22px; margin: 0 0 16px;">
        Saber Compartido
      </h1>
      <p style="color: #1F1147; font-size: 15px; line-height: 1.6; margin: 0 0 12px;">
        Hola <strong>${escaparHtml(saludo)}</strong>,
      </p>
      <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin: 0 0 18px;">
        ${escaparHtml(intro)}
      </p>
      <table role="presentation" width="100%" style="width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 24px;">
        ${datos
          .filter(([, valor]) => valor)
          .map(([etiqueta, valor]) => filaDato(etiqueta, valor))
          .join("")}
      </table>
      <p style="margin: 0 0 24px;">
        <a href="${escaparHtml(enlace)}" style="background: #FF5A8C; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; display: inline-block;">
          ${escaparHtml(boton)}
        </a>
      </p>
      <p style="color: #6B7280; font-size: 12px; line-height: 1.6; margin: 0;">
        ${escaparHtml(pie)}
      </p>
    </div>
  </div>
`;

const PIE_PAGO =
  "Saber Compartido solo registra el método de pago preferido; no procesa pagos.";

// Al tutor: nueva solicitud pendiente.
export const enviarCorreoNuevaSolicitud = ({ correo, nombreTutor, nombreEstudiante, materia, horario, metodoPago, mensaje }) =>
  transporte.sendMail({
    from: remitente(),
    to: correo,
    subject: "Nueva solicitud de tutoría — Saber Compartido",
    html: plantillaSolicitud({
      saludo: nombreTutor,
      intro: `${nombreEstudiante} te pidió una tutoría. Revísala y acéptala o recházala desde Saber Compartido.`,
      datos: [
        ["Materia", materia],
        ["Horario", horario],
        ["Método de pago", metodoPago],
        ["Mensaje", mensaje],
      ],
      boton: "Ver solicitudes recibidas",
      enlace: `${config.urlFrontend}/dashboard/solicitudes-recibidas`,
      pie: PIE_PAGO,
    }),
  });

// Al estudiante: el tutor aceptó.
export const enviarCorreoSolicitudAceptada = ({ correo, nombreEstudiante, nombreTutor, correoTutor, materia, horario }) =>
  transporte.sendMail({
    from: remitente(),
    to: correo,
    subject: "Tu tutoría fue confirmada — Saber Compartido",
    html: plantillaSolicitud({
      saludo: nombreEstudiante,
      intro: `${nombreTutor} aceptó tu solicitud. Escríbele a su correo institucional para coordinar la sesión.`,
      datos: [
        ["Materia", materia],
        ["Horario", horario],
        ["Correo del tutor", correoTutor],
      ],
      boton: "Ver mis tutorías",
      enlace: `${config.urlFrontend}/dashboard/mis-tutorias`,
      pie: PIE_PAGO,
    }),
  });

// Al estudiante: el tutor rechazó; el horario queda libre.
export const enviarCorreoSolicitudRechazada = ({ correo, nombreEstudiante, nombreTutor, materia, horario, motivo }) =>
  transporte.sendMail({
    from: remitente(),
    to: correo,
    subject: "Tu solicitud de tutoría fue rechazada — Saber Compartido",
    html: plantillaSolicitud({
      saludo: nombreEstudiante,
      intro: `${nombreTutor} no puede atender tu solicitud. Puedes elegir otro horario o buscar otro tutor.`,
      datos: [
        ["Materia", materia],
        ["Horario", horario],
        ["Motivo", motivo],
      ],
      boton: "Buscar tutores",
      enlace: `${config.urlFrontend}/dashboard/buscar-tutores`,
      pie: "Este correo es informativo; no necesitas responderlo.",
    }),
  });
