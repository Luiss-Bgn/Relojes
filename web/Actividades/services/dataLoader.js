export const loadPanelData = async (fecha = "a") => {
  try {
    const response = await fetch(`http://localhost:8001/tareas/panel/${fecha}`);
    if (!response.ok) throw new Error(`Error al obtener panel: ${response.status}`);
    const data = await response.json();
    console.log("Datos del panel cargados:", data);
    return data;
  } catch (error) {
    console.error("Error cargando datos del panel:", error);
    return { status: "error", panel: [] };
  }
};
