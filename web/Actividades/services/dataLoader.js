import { API_BASE } from "../../config.js";
export const loadPanelData = async () => {
  try {
    const response = await fetch(`${API_BASE}/tareas/panel/obtener`);
    if (!response.ok) throw new Error(`Error al obtener panel: ${response.status}`);
    const data = await response.json();
    console.log("Datos del panel cargados:", data);
    return data;
  } catch (error) {
    console.error("Error cargando datos del panel:", error);
    return { status: "error", panel: [] };
  }
};
