// Modal de PIN para completar tareas mediante código
// Dependencias inyectadas para evitar acoplar estado global.
import {showToast} from "./toast.js";

export function initPinModal({diasSemana, state, validarSiPuedeCompletarse, calcularEstatusCompletado}) {
  let currentPinTask = null;
  let currentPin = '';

  function updatePinDots(pinDots) {
    pinDots.forEach((dot, index) => {
      if (index < currentPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  async function completarTareaNormalConPin(taskInfo, empleadoId, username) {
    const dayName = diasSemana[state.currentDayIndex];
    const nuevoEstatus = calcularEstatusCompletado(
      taskInfo,
      taskInfo.empId,
      dayName,
      false,
      empleadoId
    );

    const payload = {tareas_asignadas: {}};
    payload.tareas_asignadas[dayName] = [{id: Number(taskInfo.tareaId), estatus: Number(nuevoEstatus)}];

    const response = await fetch(`/empleados/${empleadoId}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
    closePinModal();
    showToast(`✅ Tarea completada por ${username}`, 'success', 3000);
    setTimeout(() => { location.reload(); }, 1000);
  }

  async function completarTareaExtraConPin(taskInfo, empleadoId, username) {
    const hoy = new Date();
    const hoyDayIndex = hoy.getDay();
    const dayName = diasSemana[hoyDayIndex];
    const fechaKey = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    if (state.currentDayIndex !== hoyDayIndex) {
      throw new Error('⚠️ Solo puedes completar tareas extras el día actual. Por favor, vuelve a hoy.');
    }

    const empleadoQueCompleta = state.trabajadores.find(t => t.id === Number(empleadoId));
    if (!empleadoQueCompleta) throw new Error('Empleado no encontrado');
    const empleadoOriginal = state.trabajadores.find(t => t.id === Number(taskInfo.originalEmpId));
    if (!empleadoOriginal) throw new Error('Tarea original no encontrada');

    const tareasOriginal = (empleadoOriginal.tareas_asignadas && empleadoOriginal.tareas_asignadas[fechaKey]) || [];
    const tareaOriginal = tareasOriginal.find(t => String(t.id) === String(taskInfo.originalTaskId));
    if (!tareaOriginal) throw new Error('Tarea original no encontrada');

    if (!empleadoQueCompleta.tareas_asignadas) empleadoQueCompleta.tareas_asignadas = {};
    if (!empleadoQueCompleta.tareas_asignadas[fechaKey]) empleadoQueCompleta.tareas_asignadas[fechaKey] = [];
    const tareasDelQueCompleta = empleadoQueCompleta.tareas_asignadas[fechaKey];
    const yaCompletada = tareasDelQueCompleta.some(t =>
      t.estatus === 5 &&
      String(t.tarea_original_id) === String(taskInfo.originalTaskId) &&
      String(t.empleado_original_id) === String(taskInfo.originalEmpId)
    );
    if (yaCompletada) throw new Error('Ya completaste esta tarea extra');

    const nuevaTareaExtra = {
      id: `extra_${taskInfo.originalTaskId}_${Date.now()}`,
      nombre: tareaOriginal.nombre || taskInfo.taskDesc,
      hora: tareaOriginal.hora || taskInfo.hour,
      hora_fin: tareaOriginal.hora_fin,
      puntaje: tareaOriginal.puntaje || "0",
      estatus: 5,
      esExtra: true,
      tareaOriginalId: Number(taskInfo.originalTaskId),
      tarea_original_id: taskInfo.originalTaskId,
      empleado_original_id: taskInfo.originalEmpId,
      empleado_original_nombre: empleadoOriginal.nombre,
      fecha_completado: new Date().toISOString()
    };

    tareasDelQueCompleta.push(nuevaTareaExtra);
    const response = await fetch(`/empleados/${empleadoId}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({tareas_asignadas: {[dayName]: [nuevaTareaExtra]}})
    });
    if (!response.ok) throw new Error('Error al actualizar tarea en el servidor');

    closePinModal();
    showToast(`✅ Tarea extra completada por ${username}`, 'success', 3000);
    setTimeout(() => { location.reload(); }, 1000);
  }

  async function validatePinAndCompleteTask(pin, taskInfo, errorElement, pinDots) {
    try {
      errorElement.textContent = '⏳ Validando PIN...';
      errorElement.style.color = '#666';
      const response = await fetch('/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({pin})
      });
      if (!response.ok) throw new Error('PIN incorrecto');
      const responseText = await response.text();
      const userData = JSON.parse(responseText);
      if (!userData.empleado_id) {
        errorElement.textContent = '❌ Usuario sin empleado asignado';
        errorElement.style.color = '#dc3545';
        currentPin = '';
        updatePinDots(pinDots);
        return;
      }
      const empleadoId = Number(userData.empleado_id);
      const dayName = diasSemana[state.currentDayIndex];
      if (taskInfo.isAvailableExtra) {
        await completarTareaExtraConPin(taskInfo, empleadoId, userData.username);
        return;
      }
      if (empleadoId !== taskInfo.empId) {
        errorElement.textContent = '❌ Esta tarea no te pertenece';
        errorElement.style.color = '#dc3545';
        currentPin = '';
        updatePinDots(pinDots);
        return;
      }
      const validacion = validarSiPuedeCompletarse(taskInfo, empleadoId, dayName);
      if (!validacion.puedeCompletar) {
        errorElement.textContent = `❌ ${validacion.razon}`;
        errorElement.style.color = '#dc3545';
        currentPin = '';
        updatePinDots(pinDots);
        return;
      }
      await completarTareaNormalConPin(taskInfo, empleadoId, userData.username);
    } catch (error) {
      console.error('Error al validar PIN:', error);
      errorElement.textContent = '❌ PIN incorrecto';
      errorElement.style.color = '#dc3545';
      currentPin = '';
      updatePinDots(pinDots);
    }
  }

  function handlePinKeyPress(value, pinDots, pinError) {
    if (value === 'clear') {
      if (currentPin.length > 0) {
        currentPin = currentPin.slice(0, -1);
        updatePinDots(pinDots);
        pinError.textContent = '';
      }
      return;
    }
    if (currentPin.length < 4) {
      currentPin += value;
      updatePinDots(pinDots);
      pinError.textContent = '';
      if (currentPin.length === 4) {
        setTimeout(() => validatePinAndCompleteTask(currentPin, currentPinTask, pinError, pinDots), 300);
      }
    }
  }

  function openPinModal(taskInfo) {
    currentPinTask = taskInfo;
    currentPin = '';
    const pinModal = document.getElementById('pin-modal');
    const pinDots = pinModal.querySelectorAll('.pin-dot');
    const pinError = document.getElementById('pin-error');
    pinDots.forEach(dot => dot.classList.remove('filled'));
    pinError.textContent = '';
    pinModal.classList.remove('hidden');
    const pinKeys = pinModal.querySelectorAll('.pin-key');
    pinKeys.forEach(key => {
      key.onclick = () => handlePinKeyPress(key.dataset.value, pinDots, pinError);
    });
  }

  function closePinModal() {
    const pinModal = document.getElementById('pin-modal');
    pinModal.classList.add('hidden');
    currentPinTask = null;
    currentPin = '';
  }

  return {openPinModal, closePinModal};
}
