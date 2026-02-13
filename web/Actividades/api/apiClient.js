const API_BASE = "http://localhost:8001";

export const api = {
  async getPanel(fecha = "a") {
    const response = await fetch(`${API_BASE}/tareas/panel/${fecha}`);
    if (!response.ok) throw new Error(`Error al obtener panel: ${response.status}`);
    return response.json();
  }
};

export async function obtenerEmpleado(empleadoId) {
  try {
    const response = await fetch(`http://localhost:8001/usuarios/${empleadoId}`, { cache: 'no-store' });
    if (response.ok) {
      const empleado = await response.json();
      // console.log('Empleado obtenido:', empleado);
      return empleado.usuario || 'Empleado';
    }else{
      console.error('Error obteniendo empleado:', response.status);
      return 'Desconocido';
    }
    

  } catch (error) {
    console.error('Error en obtenerEmpleado:', error);
  }
}