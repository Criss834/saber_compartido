export const normalizar = (texto) =>
  (texto ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

export const nombreCoincide = (nombreCuenta, nombreExtraido) => {
  const palabrasCuenta = normalizar(nombreCuenta)
    .split(" ")
    .filter(Boolean);
  if (palabrasCuenta.length === 0) return false;

  const palabrasExtraidas = new Set(
    normalizar(nombreExtraido)
      .split(" ")
      .filter(Boolean),
  );
  return palabrasCuenta.every((palabra) => palabrasExtraidas.has(palabra));
};

export const materiaCoincide = (nombreSolicitada, nombreExtraido) =>
  normalizar(nombreSolicitada) === normalizar(nombreExtraido);

export const aCentesimas = (nota) => {
  const numero = Number(nota);
  if (nota === null || nota === undefined || Number.isNaN(numero)) {
    return null;
  }
  return Math.round(numero * 100);
};

const MENSAJES_ALERTA = {
  NOMBRE_NO_COINCIDE: "El nombre del certificado no coincide con el de la cuenta",
  MATERIA_AUSENTE: "La materia solicitada no aparece en el certificado",
  NOTA_DISTINTA: "La nota del certificado no coincide con la declarada",
  NOTA_BAJA: "La nota del certificado es menor que 4.00",
  MATERIA_NO_APROBADA: "La materia no figura como APROBADA en el certificado",
  SIN_FIRMA: "No se detectó bloque de firma en el certificado",
  ILEGIBLE: "El certificado no se pudo leer de forma legible",
  NO_PROCESADO: "No se pudo procesar el certificado con la IA",
};

const alerta = (codigo) => ({ codigo, mensaje: MENSAJES_ALERTA[codigo] });

export const generarAlertas = ({
  procesado,
  cuenta,
  extraccion,
  solicitud,
}) => {
  if (!procesado || !extraccion) {
    return [alerta("NO_PROCESADO")];
  }

  const alertas = [];

  const nombreCuenta = `${cuenta.nombres ?? ""} ${cuenta.apellidos ?? ""}`.trim();
  const nombreExtraido = [
    extraccion.nombre,
    extraccion.primerApellido,
    extraccion.segundoApellido,
  ]
    .filter(Boolean)
    .join(" ");
  if (!nombreCoincide(nombreCuenta, nombreExtraido)) {
    alertas.push(alerta("NOMBRE_NO_COINCIDE"));
  }

  const materiaExtraida = extraccion.materias.find((materia) =>
    materiaCoincide(solicitud.materiaNombre, materia.nombre),
  );

  if (!materiaExtraida) {
    alertas.push(alerta("MATERIA_AUSENTE"));
  } else {
    const notaExtraida = aCentesimas(materiaExtraida.nota);
    const notaDeclarada = aCentesimas(solicitud.promedioAcademico);

    if (notaExtraida === null || notaExtraida !== notaDeclarada) {
      alertas.push(alerta("NOTA_DISTINTA"));
    }
    if (notaExtraida !== null && notaExtraida < 400) {
      alertas.push(alerta("NOTA_BAJA"));
    }

    const estado = normalizar(materiaExtraida.estado ?? "");
    if (estado !== "APROBADO") {
      alertas.push(alerta("MATERIA_NO_APROBADA"));
    }
  }

  if (!extraccion.firmaDetectada) {
    alertas.push(alerta("SIN_FIRMA"));
  }
  if (!extraccion.legible) {
    alertas.push(alerta("ILEGIBLE"));
  }

  return alertas;
};

export default normalizar;
