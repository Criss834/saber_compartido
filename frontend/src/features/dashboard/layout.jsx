import { Outlet } from "react-router-dom";
import { useCerrarSesion } from "../auth/use-cerrar-sesion.js";
import { Footer } from "./footer.jsx";
import { Sidebar } from "./sidebar.jsx";
import { Topbar } from "./topbar.jsx";
import { useMenuMovil } from "./use-menu-movil.js";

export const LayoutDashboard = () => {
  const { abierto, alternar, cerrar } = useMenuMovil();
  const cerrarSesion = useCerrarSesion();

  return (
    <div className="min-h-screen">
      <Sidebar
        abierto={abierto}
        alNavegar={cerrar}
        onCerrarSesion={cerrarSesion}
      />

      {/* En móvil, tocar fuera del sidebar lo cierra. */}
      {abierto && (
        <div
          className="fixed inset-0 z-[25] hidden bg-[rgba(31,17,71,0.28)] max-[900px]:block"
          onClick={cerrar}
          aria-hidden="true"
        />
      )}

      <main className="ml-[258px] flex min-h-screen flex-col max-[900px]:ml-0">
        <Topbar menuAbierto={abierto} onAlternarMenu={alternar} />

        <section className="mx-auto w-full max-w-[1500px] flex-1 px-[35px] pb-[38px] pt-[30px] max-[900px]:px-5 max-[900px]:py-[23px] max-[650px]:px-[14px] max-[650px]:pt-5 max-[650px]:pb-[28px]">
          <Outlet />
        </section>

        <Footer />
      </main>
    </div>
  );
};
