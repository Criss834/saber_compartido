import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context.jsx";
import { Avatar } from "./avatar.jsx";
import { BotonMenuMovil } from "./boton-menu-movil.jsx";
import { etiquetaDeRuta } from "./navegacion.js";

const svgBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-[17px] w-[17px]",
  "aria-hidden": true,
};

const IconoCampana = (
  <svg {...svgBase}>
    <path d="M18.5 9.5a6.5 6.5 0 1 0-13 0c0 6.5-2.5 8-2.5 8h18s-2.5-1.5-2.5-8" />
    <path d="M10.3 20.5a2 2 0 0 0 3.4 0" />
  </svg>
);

const IconoChevron = (
  <svg {...svgBase} className="h-4 w-4 text-[#9c95ab]">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const mayusculaInicial = (texto = "") =>
  texto.charAt(0).toUpperCase() + texto.slice(1);

export const Topbar = ({ menuAbierto, onAlternarMenu }) => {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  const [rutaPrevia, setRutaPrevia] = useState(pathname);
  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname);
    setDrawerAbierto(false);
  }

  useEffect(() => {
    if (!drawerAbierto) return;

    const alPulsar = (evento) => {
      if (evento.key === "Escape") setDrawerAbierto(false);
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [drawerAbierto]);

  const nombreCompleto = [usuario?.nombres, usuario?.apellidos]
    .filter(Boolean)
    .join(" ");

  // Lleva a la pantalla de búsqueda con el texto ya aplicado en la URL.
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const buscarTutor = (evento) => {
    evento.preventDefault();
    const texto = textoBusqueda.trim();
    navigate(
      texto
        ? `/dashboard/buscar-tutores?q=${encodeURIComponent(texto)}`
        : "/dashboard/buscar-tutores",
    );
    setTextoBusqueda("");
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#eeeaf5] bg-white/[0.94] px-[35px] backdrop-blur-[12px] max-[900px]:gap-[14px] max-[900px]:px-5 max-[650px]:h-[65px] max-[650px]:px-[14px]">
        <BotonMenuMovil abierto={menuAbierto} onAlternar={onAlternarMenu} />

        <div className="flex items-center gap-[11px] text-[11px] text-[#9b95aa] max-[900px]:mr-auto max-[650px]:gap-1.5 max-[650px]:text-[10px]">
          <span>Espacio académico</span>
          <span className="text-[#d1cbdc]" aria-hidden="true">
            /
          </span>
          <strong className="font-bold text-text">
            {etiquetaDeRuta(pathname)}
          </strong>
        </div>

        <div className="flex items-center gap-[17px] max-[900px]:gap-2.5 max-[650px]:gap-[7px]">
          {usuario?.rol !== "administrador" && (
            <form
              role="search"
              aria-label="Buscar tutores"
              onSubmit={buscarTutor}
              className="flex h-[38px] w-[min(285px,25vw)] min-w-[170px] items-center gap-[9px] rounded-[10px] border border-[#ece8f3] bg-[#fbfaff] px-2.5 text-[#a59cb7] focus-within:border-primary max-[650px]:hidden"
            >
              <svg {...svgBase} className="h-4 w-4 flex-none">
                <circle cx="11" cy="11" r="7" />
                <path d="m20.5 20.5-4-4" />
              </svg>
              <label className="sr-only" htmlFor="buscador-superior">
                Buscar tutor o materia
              </label>
              <input
                id="buscador-superior"
                type="search"
                value={textoBusqueda}
                maxLength={80}
                onChange={(evento) => setTextoBusqueda(evento.target.value)}
                placeholder="Buscar tutor, materia…"
                className="w-full min-w-0 border-0 bg-transparent text-[11px] text-text outline-none"
              />
            </form>
          )}

          <button
            type="button"
            aria-label="Ver notificaciones"
            aria-expanded={drawerAbierto}
            aria-controls="drawer-notificaciones"
            onClick={() => setDrawerAbierto((actual) => !actual)}
            className="relative inline-grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border border-[#eee8f5] bg-white text-[#716786]"
          >
            {IconoCampana}
          </button>

          <span
            className="h-7 w-px bg-[#eee9f3] max-[650px]:hidden"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={() => navigate("/dashboard/mi-perfil")}
            className="flex items-center gap-[9px] border-0 bg-transparent p-0 text-left"
          >
            <Avatar nombre={nombreCompleto} size="size-[34px]" />
            <span className="flex flex-col gap-1 max-[900px]:hidden">
              <strong className="text-[11px] font-semibold">
                {nombreCompleto}
              </strong>
              <small className="text-[10px] text-text-muted">
                {mayusculaInicial(usuario?.rol ?? "")}
              </small>
            </span>
            <span className="max-[900px]:hidden">{IconoChevron}</span>
          </button>
        </div>
      </header>

      <aside
        id="drawer-notificaciones"
        aria-label="Notificaciones"
        aria-hidden={!drawerAbierto}
        inert={!drawerAbierto}
        className={`fixed inset-y-0 right-0 z-[70] flex w-[min(390px,100vw)] flex-col bg-white p-[25px] shadow-[-15px_0_45px_rgba(39,17,58,0.09)] transition-transform duration-200 ${
          drawerAbierto ? "translate-x-0" : "translate-x-[105%]"
        }`}
      >
        <div className="flex items-start justify-between border-b border-[#f0ebf5] pb-[17px]">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-[1.15px] text-primary">
              Actualizaciones
            </span>
            <h2 className="mt-1.5 font-heading text-[21px] font-semibold">
              Notificaciones
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar notificaciones"
            onClick={() => setDrawerAbierto(false)}
            className="inline-grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border border-[#eee8f5] bg-white text-[17px] text-[#716786]"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-bg-soft text-primary">
            {IconoCampana}
          </span>
          <strong className="text-[13px]">
            No tienes notificaciones todavía
          </strong>
          <p className="m-0 max-w-[240px] text-[11px] leading-[1.6] text-text-muted">
            Cuando tengas novedades de tus tutorías, aparecerán aquí.
          </p>
        </div>
      </aside>
    </>
  );
};
