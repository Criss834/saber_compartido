import nodemailer from "nodemailer";
import { config } from "../../config/index.js";

const { smtp, brevo } = config;

// Hostings gratuitos (Render, Railway) bloquean el SMTP saliente. Con BREVO_API_KEY
// los correos salen por la API HTTPS de Brevo con la misma interfaz de Nodemailer
// (sendMail / verify), así que correo.service.js no cambia. Sin la clave se usa SMTP.
const URL_BREVO = "https://api.brevo.com/v3";
const TIMEOUT_MS = 15000;

class ErrorBrevo extends Error {
  constructor(status, detalle) {
    super(`Brevo respondió ${status}${detalle ? `: ${detalle}` : ""}`);
    this.name = "ErrorBrevo";
    this.code = `BREVO_${status}`;
  }
}

// "Nombre <correo@x.com>" o "correo@x.com" → { name?, email }
const direccion = (texto) => {
  const coincidencia = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(texto ?? "");
  if (coincidencia) {
    const [, nombre, email] = coincidencia;
    return nombre ? { name: nombre, email: email.trim() } : { email: email.trim() };
  }
  return { email: String(texto ?? "").trim() };
};

const pedirBrevo = async (ruta, opciones = {}) => {
  const respuesta = await fetch(`${URL_BREVO}${ruta}`, {
    ...opciones,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": brevo.apiKey,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!respuesta.ok) {
    let detalle = "";
    try {
      detalle = (await respuesta.json())?.code ?? "";
    } catch {
      // cuerpo vacío o no JSON
    }
    throw new ErrorBrevo(respuesta.status, detalle);
  }
  return respuesta.status === 204 ? null : respuesta.json();
};

const transporteBrevo = {
  async sendMail({ from, to, subject, html, text }) {
    const destinatarios = (Array.isArray(to) ? to : String(to).split(","))
      .map((d) => direccion(d))
      .filter((d) => d.email);
    const cuerpo = {
      sender: { name: "Saber Compartido", ...direccion(from) },
      to: destinatarios,
      subject,
      ...(html ? { htmlContent: html } : {}),
      ...(text ? { textContent: text } : {}),
    };
    const resultado = await pedirBrevo("/smtp/email", {
      method: "POST",
      body: JSON.stringify(cuerpo),
    });
    return { messageId: resultado?.messageId };
  },
  async verify() {
    await pedirBrevo("/account");
    return true;
  },
};

export const transporte = brevo.apiKey
  ? transporteBrevo
  : nodemailer.createTransport({
      host: smtp.host,
      port: smtp.puerto,
      secure: smtp.puerto === 465,
      auth: smtp.usuario ? { user: smtp.usuario, pass: smtp.clave } : undefined,
    });

export const medioCorreo = brevo.apiKey ? "API de Brevo" : "SMTP";
