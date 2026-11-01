export const formatearNota = (valor) =>
  valor === null || valor === undefined ? "—" : Number(valor).toFixed(2);
