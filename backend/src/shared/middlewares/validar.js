export const detalleDeIssues = (issues) =>
  issues.reduce((acumulado, issue) => {
    const campo = issue.path.join(".") || "general";
    (acumulado[campo] ??= []).push(issue.message);
    return acumulado;
  }, {});

const ORIGENES = new Set(["body", "query", "params"]);

// Valida `req[origen]` con el esquema Zod. En Express 5 `req.query` es un getter
// y no se puede reasignar, así que el resultado limpio de query y params se deja
// en `req.validado[origen]`; el del body sigue reemplazando a `req.body`.
export const validar =
  (esquema, origen = "body") =>
  (req, res, next) => {
    if (!ORIGENES.has(origen)) {
      return next(new Error(`Origen de validación desconocido: ${origen}`));
    }

    const resultado = esquema.safeParse(req[origen] ?? {});
    if (!resultado.success) {
      return res.status(400).json({
        mensaje: "Datos inválidos",
        detalle: detalleDeIssues(resultado.error.issues),
      });
    }

    if (origen === "body") {
      req.body = resultado.data;
    } else {
      req.validado = { ...req.validado, [origen]: resultado.data };
    }
    return next();
  };
