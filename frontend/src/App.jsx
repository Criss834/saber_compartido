import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Registro } from "./pages/Registro/Registro.jsx";
import { Verificacion } from "./pages/Verificacion/Verificacion.jsx";
import { Login } from "./pages/Login/Login.jsx";
import { Resumen } from "./pages/Dashboard/Resumen.jsx";
import { SerTutor } from "./pages/Dashboard/SerTutor.jsx";
import { BuscarTutores } from "./pages/Dashboard/BuscarTutores.jsx";
import { PerfilTutor } from "./pages/Dashboard/PerfilTutor.jsx";
import { Proximamente } from "./pages/Dashboard/Proximamente.jsx";
import { Verificaciones } from "./pages/Dashboard/Verificaciones.jsx";
import { VerificacionDetalle } from "./pages/Dashboard/VerificacionDetalle.jsx";
import { ResumenAdmin } from "./pages/Dashboard/ResumenAdmin.jsx";
import { AuthProvider, useAuth } from "./features/auth/auth-context.jsx";
import { RutaProtegida } from "./features/auth/ruta-protegida.jsx";
import { RutaPorRol } from "./features/auth/ruta-por-rol.jsx";
import { LayoutDashboard } from "./features/dashboard/layout.jsx";
import { PANTALLAS_PLACEHOLDER } from "./features/dashboard/navegacion.js";

// Las pantallas del estudiante (y del tutor, que conserva esa vista) no están
// disponibles para el administrador: se le redirige a su Resumen. Excepción:
// Mi perfil y Notificaciones (`todosLosRoles`) son accesibles para todos.
const ROLES_ESTUDIANTE = ["estudiante", "tutor"];
const ROLES_ADMIN = ["administrador"];

const rutaPlaceholder = (enlace) => (
  <Route
    key={enlace.ruta}
    path={enlace.ruta.replace("/dashboard/", "")}
    element={<Proximamente titulo={enlace.etiqueta} />}
  />
);

const ResumenPorRol = () => {
  const { usuario } = useAuth();
  return usuario?.rol === "administrador" ? <ResumenAdmin /> : <Resumen />;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Registro />} />
          <Route path="/verificar/:token" element={<Verificacion />} />
          <Route path="/iniciar-sesion" element={<Login />} />

          <Route element={<RutaProtegida />}>
            <Route path="/dashboard" element={<LayoutDashboard />}>
              <Route index element={<ResumenPorRol />} />
              {PANTALLAS_PLACEHOLDER.filter(
                (enlace) => enlace.todosLosRoles,
              ).map(rutaPlaceholder)}
              <Route
                element={<RutaPorRol rolesPermitidos={ROLES_ESTUDIANTE} />}
              >
                <Route path="ser-tutor" element={<SerTutor />} />
                <Route path="buscar-tutores" element={<BuscarTutores />} />
                <Route path="buscar-tutores/:id" element={<PerfilTutor />} />
                {PANTALLAS_PLACEHOLDER.filter(
                  (enlace) => !enlace.todosLosRoles,
                ).map(rutaPlaceholder)}
              </Route>
              <Route element={<RutaPorRol rolesPermitidos={ROLES_ADMIN} />}>
                <Route path="admin/verificaciones" element={<Verificaciones />} />
                <Route
                  path="admin/verificaciones/:id"
                  element={<VerificacionDetalle />}
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
