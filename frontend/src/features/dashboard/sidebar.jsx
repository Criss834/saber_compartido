import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context.jsx";
import { Avatar } from "./avatar.jsx";
import { gruposDeRol } from "./navegacion.js";
import { usePendientesRecibidas } from "../solicitudes/use-pendientes-recibidas.js";

const Marca = (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden="true">
    <path d="M2 9.2 12 4l10 5.2L12 14.5 2 9.2Zm4 3.1v4.1c3.8 3 8.2 3 12 0v-4.1l-6 3.1-6-3.1Zm14-1.1v5h1.5v-5.8L20 11.2Z" />
  </svg>
);

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

const ICONOS = {
  resumen: (
    <svg {...svgBase}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  ),
  buscar: (
    <svg {...svgBase}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4-4" />
    </svg>
  ),
  tutorias: (
    <svg {...svgBase}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  ),
  grupal: (
    <svg {...svgBase}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20.5v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1" />
      <path d="M16.5 4.9a3.5 3.5 0 0 1 0 6.2" />
      <path d="M18.5 14.7a4.7 4.7 0 0 1 3 4.4v1.4" />
    </svg>
  ),
  notificaciones: (
    <svg {...svgBase}>
      <path d="M18.5 9.5a6.5 6.5 0 1 0-13 0c0 6.5-2.5 8-2.5 8h18s-2.5-1.5-2.5-8" />
      <path d="M10.3 20.5a2 2 0 0 0 3.4 0" />
    </svg>
  ),
  "ser-tutor": (
    <svg {...svgBase}>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
    </svg>
  ),
  perfil: (
    <svg {...svgBase}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5v-.7a5.8 5.8 0 0 1 5.8-5.8h3.4a5.8 5.8 0 0 1 5.8 5.8v.7" />
    </svg>
  ),
  solicitudes: (
    <svg {...svgBase}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  ),
  disponibilidad: (
    <svg {...svgBase}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  verificaciones: (
    <svg {...svgBase}>
      <path d="M9 11.5 11 13.5 15.5 9" />
      <path d="M12 21.5a9 9 0 1 0-8.5-6.2" />
      <path d="M3 21.5v-5h5" />
    </svg>
  ),
};

const IconoSalir = (
  <svg {...svgBase}>
    <path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m14.5 7.5 4.5 4.5-4.5 4.5" />
    <path d="M19 12H9.5" />
  </svg>
);

const mayusculaInicial = (texto = "") =>
  texto.charAt(0).toUpperCase() + texto.slice(1);

export const Sidebar = ({ abierto = false, alNavegar, onCerrarSesion }) => {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const nombreCompleto = [usuario?.nombres, usuario?.apellidos]
    .filter(Boolean)
    .join(" ");

  const gruposVisibles = gruposDeRol(usuario?.rol);
  const contadores = {
    pendientesRecibidas: usePendientesRecibidas(usuario?.rol === "tutor"),
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-[258px] flex-col border-r border-[#eee9f7] bg-white px-4 pb-4 pt-[25px] transition-transform duration-200 max-[900px]:shadow-[10px_0_35px_rgba(36,18,58,0.07)] ${
        abierto ? "translate-x-0" : "max-[900px]:-translate-x-full"
      }`}
      aria-label="Barra lateral"
      id="sidebar-movil"
    >
      <div className="flex items-center gap-[11px] px-2 pb-[25px]">
        <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-primary shadow-[0_7px_15px_rgba(124,58,237,0.19)]">
          {Marca}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <strong className="font-heading text-sm tracking-[-0.35px]">
            Saber Compartido
          </strong>
          <small className="whitespace-nowrap text-[10px] text-text-muted">
            Universidad Católica Luis Amigó
          </small>
        </span>
      </div>

      <nav
        className="min-h-0 flex-1 overflow-y-auto"
        aria-label="Navegación principal"
      >
        {gruposVisibles.map((grupo) => (
          <div key={grupo.etiqueta}>
            <p className="mb-[9px] px-[11px] text-[10px] font-extrabold uppercase tracking-[1px] text-[#a19ab0]">
              {grupo.etiqueta}
            </p>
            <ul className="mb-4 flex list-none flex-col gap-[5px] p-0">
              {grupo.enlaces.map((enlace) => (
                <li key={enlace.ruta}>
                  <NavLink
                    to={enlace.ruta}
                    end={enlace.inicio}
                    onClick={alNavegar}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-[10px] px-3 py-[11px] text-[12px] font-medium transition-colors ${
                        isActive
                          ? "bg-primary-light font-bold text-primary-dark"
                          : "text-[#756d89] hover:bg-[#faf7ff] hover:text-primary"
                      }`
                    }
                  >
                    <span className="grid w-[19px] flex-none place-items-center">
                      {ICONOS[enlace.icono]}
                    </span>
                    <span>{enlace.etiqueta}</span>
                    {enlace.contador && contadores[enlace.contador] > 0 && (
                      <span
                        className="ml-auto min-w-5 rounded-full bg-[#ffe4ed] px-1.5 py-[3px] text-center text-[10px] font-extrabold text-[#d8336d]"
                        aria-label={`${contadores[enlace.contador]} pendientes`}
                      >
                        {contadores[enlace.contador]}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0">
        <div className="my-[15px] flex items-start gap-[9px] rounded-xl border border-[#eee2ff] bg-[linear-gradient(135deg,#f5f0ff,#fff0f5)] p-[13px_10px]">
          <span className="grid h-7 w-7 flex-none place-items-center rounded-[9px] bg-white text-primary">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2.5l2.2 4.9 4.9.5-3.7 3.4 1.1 4.8L12 13.6l-4.5 2.5 1.1-4.8-3.7-3.4 4.9-.5z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <strong className="block text-[12px]">¿Necesitas ayuda?</strong>
            <p className="m-0 text-[10px] leading-[1.5] text-text-muted">
              Encuentra apoyo para continuar aprendiendo.
            </p>
          </div>
          <span
            className="grid h-6 w-6 flex-none place-items-center rounded-[8px] bg-white/70 text-[12px] text-[#756d89]"
            aria-hidden="true"
          >
            ↗
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            navigate("/dashboard/mi-perfil");
            alNavegar?.();
          }}
          className="flex w-full items-center gap-2.5 border-0 border-t border-[#f0edf6] bg-white px-1 pt-[15px] text-left"
        >
          <Avatar nombre={nombreCompleto} />
          <span className="flex min-w-0 flex-col gap-1">
            <strong className="truncate text-[12px]">{nombreCompleto}</strong>
            <small className="text-[10px] text-text-muted">
              {mayusculaInicial(usuario?.rol ?? "")}
            </small>
          </span>
          <span
            className="ml-auto text-[19px] leading-none text-[#9c95ab]"
            aria-hidden="true"
          >
            ›
          </span>
        </button>

        <button
          type="button"
          onClick={onCerrarSesion}
          className="mt-3 flex w-full items-center gap-3 rounded-[10px] border-0 bg-transparent px-3 py-[11px] text-[12px] font-medium text-[#756d89] transition-colors hover:bg-[#fff0f0] hover:text-danger"
        >
          <span className="grid w-[19px] flex-none place-items-center">
            {IconoSalir}
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
