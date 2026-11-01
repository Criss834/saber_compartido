import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth-context.jsx";

export const RutaPorRol = ({ rolesPermitidos, redirigirA = "/dashboard" }) => {
  const { usuario, cargando } = useAuth();

  if (cargando) return null;

  if (!usuario) return <Navigate to="/iniciar-sesion" replace />;

  if (!rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to={redirigirA} replace />;
  }

  return <Outlet />;
};
