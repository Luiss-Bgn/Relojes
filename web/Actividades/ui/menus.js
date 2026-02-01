// Lógica de menús contextual y de perfil para Actividades
// Se inicializa con dependencias inyectadas desde actividades.js para evitar acoplar estado global.
import {abrirFormularioCrearTarea} from "../../Gestion/Editar Empleado/Crear tareas/crear_tarea.js";
import {showToast} from "./toast.js";

let menuContext = null;

export function initMenus({DOM, diasSemana, state, openModal, deleteEmployee}) {
  const setMenuContext = (ctx) => { menuContext = ctx; };
  const getMenuContext = () => menuContext;

  function showCellMenu(evt, td) {
    if (!DOM.cellMenu) return;
    menuContext = {
      empId: td.dataset.empId ? parseInt(td.dataset.empId, 10) : null,
      empName: td.dataset.empName || '',
      dia: diasSemana[state.currentDayIndex],
      hora: td.dataset.hora || '',
      hora_fin: td.dataset.horaFin || '',
      actividad: td.dataset.nombre || '',
      tieneTarea: !!td.dataset.hasTask,
      estatus: td.dataset.estatus ? Number(td.dataset.estatus) : null,
      descripcion: td.dataset.desc || ''
    };
    if (td.dataset.tareaId) {
      const tareaIdRaw = td.dataset.tareaId;
      menuContext.tareaId = tareaIdRaw.startsWith('extra_') ? tareaIdRaw : Number(tareaIdRaw);
    }

    const margin = 8;
    const x = evt.clientX + margin;
    const y = evt.clientY + margin;
    DOM.cellMenu.style.left = `${x}px`;
    DOM.cellMenu.style.top = `${y}px`;
    DOM.cellMenu.classList.remove('hidden');
    DOM.cellMenu.setAttribute('aria-hidden', 'false');
  }

  function hideCellMenu() {
    if (!DOM.cellMenu) return;
    DOM.cellMenu.classList.add('hidden');
    DOM.cellMenu.setAttribute('aria-hidden', 'true');
    menuContext = null;
  }

  function handleCellMenuAction(action) {
    if (!menuContext) return;
    if (action === 'info' && menuContext.tieneTarea) {
      openModal({
        nombre: menuContext.actividad,
        descripcion: menuContext.descripcion,
        hora: menuContext.hora,
        hora_fin: menuContext.hora_fin || '',
        estatus: menuContext.estatus
      });
    }
    if (action === 'create') {
      abrirFormularioCrearTarea(menuContext.empId, menuContext.empName);
    }
    if (action === 'edit' && menuContext.tieneTarea) {
      // Placeholder para edición futura
    }
    hideCellMenu();
  }

  function showProfileMenu(x, y) {
    if (!DOM.profileMenu) return;
    const loggedUserString = localStorage.getItem('loggedUser');
    const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
    const isAdmin = loggedUser.role === 'admin' || loggedUser.role === 'supervisor';
    const deleteBtn = DOM.profileMenu.querySelector('[data-action="emp-delete"]');
    if (deleteBtn) deleteBtn.style.display = isAdmin ? 'block' : 'none';

    DOM.profileMenu.style.left = `${x}px`;
    DOM.profileMenu.style.top = `${y}px`;
    DOM.profileMenu.classList.remove('pm-hidden');
    DOM.profileMenu.classList.add('show');
  }

  function hideProfileMenu() {
    if (!DOM.profileMenu) return;
    DOM.profileMenu.classList.add('pm-hidden');
    DOM.profileMenu.classList.remove('show');
  }

  function showWorkerModal(trabajador) {
    const modal = DOM.createTaskModal;
    if (!modal) return;
    modal.innerHTML = '';
    modal.classList.remove('hidden');
    modal.classList.add('worker-options-modal');

    const wrapper = document.createElement('div');
    wrapper.className = 'modal-content';
    wrapper.addEventListener('click', (ev) => ev.stopPropagation());

    const header = document.createElement('div');
    header.className = 'worker-options-header';
    const title = document.createElement('h3');
    title.className = 'worker-options-title';
    title.textContent = `Opciones: ${trabajador.nombre}`;
    header.appendChild(title);

    const closeXBtn = document.createElement('button');
    closeXBtn.type = 'button';
    closeXBtn.innerHTML = '&times;';
    closeXBtn.className = 'worker-options-close';
    closeXBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideWorkerModal();
    });
    header.appendChild(closeXBtn);
    wrapper.appendChild(header);

    const body = document.createElement('div');
    body.className = 'worker-options-body';

    const btnCrear = document.createElement('button');
    btnCrear.type = 'button';
    btnCrear.innerHTML = '<span class="option-icon">➕</span> Crear Tarea';
    btnCrear.className = 'worker-option-btn';
    btnCrear.addEventListener('click', () => {
      try {
        abrirFormularioCrearTarea(trabajador.id, trabajador.nombre);
      } catch (err) {
        console.error('Error al invocar abrirFormularioCrearTarea:', err);
      }
    });
    body.appendChild(btnCrear);

    const btnEditarTareas = document.createElement('button');
    btnEditarTareas.type = 'button';
    btnEditarTareas.innerHTML = '<span class="option-icon">✏️</span> Editar Tareas';
    btnEditarTareas.className = 'worker-option-btn';
    btnEditarTareas.addEventListener('click', () => {
      window.empleadoSeleccionadoID = trabajador.id;
      (async () => {
        try {
          const mod = await import('../../Gestion/Editar Empleado/Editar Tarea/editar_tarea.js?v=' + Date.now());
          if (typeof mod.mostrar_edit === 'function') {
            hideWorkerModal();
            let editModal = document.getElementById('modal-edit-task');
            if (!editModal) {
              editModal = document.createElement('div');
              editModal.id = 'modal-edit-task';
              editModal.className = 'modal';
              editModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000;';
              document.body.appendChild(editModal);
              editModal.addEventListener('click', (e) => {
                if (e.target === editModal) {
                  editModal.classList.remove('active');
                  editModal.style.display = 'none';
                }
              });
            }
            editModal.classList.add('active');
            editModal.style.display = 'flex';
            mod.mostrar_edit();
          } else {
            console.error('Función mostrar_edit no encontrada en el módulo');
          }
        } catch (err) {
          console.error('Error al cargar el módulo de edición de tareas:', err);
        }
      })();
    });
    body.appendChild(btnEditarTareas);

    const btnInfo = document.createElement('button');
    btnInfo.type = 'button';
    btnInfo.innerHTML = '<span class="option-icon">ℹ️</span> Ver/Editar Información';
    btnInfo.className = 'worker-option-btn';
    btnInfo.addEventListener('click', () => {
      showToast(`Información: ${trabajador.nombre} - ${trabajador.puesto || 'Sin puesto'}`, 'info', 3000);
    });
    body.appendChild(btnInfo);

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.innerHTML = '<span class="option-icon">🗑️</span> Eliminar Empleado';
    btnDelete.className = 'worker-option-btn danger';
    btnDelete.addEventListener('click', () => deleteEmployee && deleteEmployee(trabajador.id, trabajador.nombre));
    body.appendChild(btnDelete);

    const btnCerrar = document.createElement('button');
    btnCerrar.type = 'button';
    btnCerrar.textContent = 'Cerrar';
    btnCerrar.className = 'worker-option-btn secondary';
    btnCerrar.addEventListener('click', hideWorkerModal);
    body.appendChild(btnCerrar);

    wrapper.appendChild(body);
    modal.appendChild(wrapper);
  }

  function hideWorkerModal() {
    const modal = DOM.createTaskModal;
    if (!modal) return;
    modal.classList.add('hidden');
    modal.innerHTML = '';
  }

  return {
    showCellMenu,
    hideCellMenu,
    handleCellMenuAction,
    showProfileMenu,
    hideProfileMenu,
    showWorkerModal,
    hideWorkerModal,
    getMenuContext,
    setMenuContext
  };
}
