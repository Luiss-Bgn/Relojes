// esta madre regresa colores segun el porcentaje: rojo(<80), amarillo(80-89), verde(90+)

export function getColorByPercent(percent) {
  const p = Math.max(0, Math.min(100, percent));
  if (p < 80) return '#ef4444';
  if (p < 90) return '#f59e0b';
  return '#10b981';
}

export function getColorQuincenal(percent, { nd = false, sinTareas = false } = {}) {
  if (sinTareas) return '#d1d5db';
  if (nd) return '#9ca3af';
  return getColorByPercent(percent);
}
