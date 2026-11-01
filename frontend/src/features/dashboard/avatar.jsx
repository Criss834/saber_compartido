const COLORES_AVATAR = [
  "bg-avatar-purple text-avatar-purple-ink",
  "bg-avatar-coral text-avatar-coral-ink",
  "bg-avatar-green text-avatar-green-ink",
  "bg-avatar-blue text-avatar-blue-ink",
  "bg-avatar-amber text-avatar-amber-ink",
];

export const inicialesDe = (nombre = "") =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0] ?? "")
    .join("")
    .toUpperCase();

export const colorAvatarDe = (nombre = "") => {
  let indice = 0;
  for (let i = 0; i < nombre.length; i++) {
    indice = (indice + nombre.charCodeAt(i)) % COLORES_AVATAR.length;
  }
  return COLORES_AVATAR[indice];
};

export const Avatar = ({
  nombre,
  size = "size-[37px]",
  redondeo = "rounded-full",
  className = "",
}) => (
  <span
    className={`inline-grid ${size} flex-none place-items-center ${redondeo} text-[11px] font-extrabold ${colorAvatarDe(nombre)} ${className}`}
    aria-hidden="true"
  >
    {inicialesDe(nombre)}
  </span>
);
