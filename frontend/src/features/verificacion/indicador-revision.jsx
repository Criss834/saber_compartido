const ESTILOS_INDICADOR = {
  "Pendiente de revisión": "bg-status-pending text-status-pending-ink",
  "Requiere revisión manual": "bg-status-danger text-status-danger-ink",
};

export const IndicadorRevision = ({ indicador }) => (
  <span
    className={`inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-full px-2 py-[5px] text-[9px] font-bold ${
      ESTILOS_INDICADOR[indicador] ??
      "bg-status-neutral text-status-neutral-ink"
    }`}
  >
    {indicador ?? "Sin indicador"}
  </span>
);
