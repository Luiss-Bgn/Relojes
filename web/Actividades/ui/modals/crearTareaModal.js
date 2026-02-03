import { loadModalHTML } from './modalLoader.js';
import { showToast } from '../toast.js';

export const showCrearTareaModal = async (emp) => {
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.id = 'crear-tarea-overlay';
  overlay.className = 'crear-tarea-overlay';

  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'crear-tarea-modal';

  // Cargar HTML del modal
  const modalHTML = await loadModalHTML('/web/Actividades/ui/modals/crearTareaModal.html');
  
  if (!modalHTML) {
    showToast('Error al cargar el modal', 'error');
    return;
  }

  modal.innerHTML = modalHTML;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Rellenar nombre del empleado
  const employeeNameSpan = modal.querySelector('#modal-employee-name');
  if (employeeNameSpan) {
    employeeNameSpan.textContent = emp.nombre;
  }

  // Event listeners para botones de cerrar
  const closeBtn = modal.querySelector('#close-crear-tarea');
  const cancelBtn = modal.querySelector('#cancel-crear-tarea');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.remove());
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => overlay.remove());
  }

  // Handler para el formulario
  const form = modal.querySelector('#crear-tarea-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const diasSeleccionados = Array.from(form.querySelectorAll('input[name="dias"]:checked'))
      .map(cb => cb.value);
    
    if (diasSeleccionados.length === 0) {
      showToast('Debes seleccionar al menos un día de la semana', 'warning');
      return;
    }
    
    const tareaData = {
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion'),
      hora_ini: formData.get('hora_ini'),
      hora_fin: formData.get('hora_fin') || null,
      puntos: parseInt(formData.get('puntos')),
      disponible_para_rol: formData.get('disponible_para_rol'),
      fecha: diasSeleccionados,
      id_dueño: emp.id,
      estatus: 'sin_iniciar',
    };
    
    console.log('Crear tarea:', tareaData);
    
    try {
      const response = await fetch(`/tareas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tareaData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showToast('Tarea creada exitosamente', 'success');
        overlay.remove();
        // Actualizar panel sin recargar página
        const event = new CustomEvent('refreshPanel');
        window.dispatchEvent(event);
      } else {
        showToast('Error al crear la tarea: ' + (result.message || 'Error desconocido'), 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al crear la tarea. Verifica tu conexión.', 'error');
    }
  });

  // Cerrar al hacer clic fuera
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
};
