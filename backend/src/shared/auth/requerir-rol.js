import { prisma } from "../prisma/client.js";
import { errorNegocio } from "../errores/error-negocio.js";

export const requerirRol =
  (...rolesPermitidos) =>
  async (req, res, next) => {
    try {
      const usuario = await prisma.usuarios.findUnique({
        where: { id: req.usuarioId },
        select: { rol: true },
      });

      if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
        return next(
          errorNegocio(
            "ACCESO_DENEGADO",
            "No tienes permiso para realizar esta acción",
            403,
          ),
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

export default requerirRol;
