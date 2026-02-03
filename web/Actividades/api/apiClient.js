const API_BASE = "http://localhost:8001";

export const api = {
  async getPanel(fecha = "a") {
    const response = await fetch(`${API_BASE}/tareas/panel/${fecha}`);
    if (!response.ok) throw new Error(`Error al obtener panel: ${response.status}`);
    return response.json();
  }
};
