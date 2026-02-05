// editar_tarea_send.js
export async function update(data, dia, buttonElement = null) {
    let newdata = {
        "tareas_asignadas": {
            [dia]: [data] // Usamos corchetes para que `dia` se evalúe como variable
        }
    }
    
    console.log('Actualizando tarea:', newdata);
    
    try {
        // Actualizar tarea original
        const response = await fetch(`/empleados/${window.empleadoSeleccionadoID}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(newdata)
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        console.log('✅ Tarea actualizada exitosamente');
        
        // 🔥 NUEVO: Actualizar tareas extras que referencian esta tarea original
        const tareaOriginalId = Number(data.id);
        const tareasExtrasActualizadas = [];
        
        console.log(`🔍 Buscando tareas extras con tareaOriginalId === ${tareaOriginalId}`);
        
        try {
            // Obtener lista completa de empleados desde BD
            const empResp = await fetch('/api/v1/empleados', { cache: 'no-store' });
            if (!empResp.ok) throw new Error('No se pudo cargar empleados');
            
            const empleados = await empResp.json();
            console.log(`📋 Total empleados a revisar: ${empleados.length}`);
            
            // Buscar en todos los empleados tareas extras con tareaOriginalId === tareaId
            for (const empleado of empleados) {
                // Saltar el empleado original que ya actualizamos
                if (Number(empleado.id) === Number(window.empleadoSeleccionadoID)) {
                    console.log(`⏭️ Saltando empleado original: ${empleado.nombre} (ID: ${empleado.id})`);
                    continue;
                }
                if (!empleado.tareas_asignadas) continue;
                
                for (const diaKey in empleado.tareas_asignadas) {
                    const tareasDelDia = empleado.tareas_asignadas[diaKey] || [];
                    
                    for (const tarea of tareasDelDia) {
                        console.log(`🔎 Revisando ${empleado.nombre} - ${diaKey}: esExtra=${tarea.esExtra}, tareaOriginalId=${tarea.tareaOriginalId}, buscando=${tareaOriginalId}`);
                        
                        // Si es una tarea extra que referencia la tarea original
                        if (tarea.esExtra === true && Number(tarea.tareaOriginalId) === tareaOriginalId) {
                            console.log(`🎯 ENCONTRADA tarea extra en ${empleado.nombre} (${diaKey}), ID: ${tarea.id}`);
                            
                            // Preparar payload con los nuevos valores
                            const payloadExtra = {
                                tareas_asignadas: {}
                            };
                            payloadExtra.tareas_asignadas[diaKey] = [{
                                id: Number(tarea.id),
                                nombre: data.nombre,
                                descripcion: data.descripcion,
                                hora: data.hora
                                // Mantener estatus 'extra'
                            }];
                            
                            console.log(`📤 Enviando actualización a empleado ${empleado.id}:`, payloadExtra);
                            
                            // Enviar actualización al backend
                            try {
                                const respExtra = await fetch(`/empleados/${empleado.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payloadExtra)
                                });
                                
                                if (respExtra.ok) {
                                    tareasExtrasActualizadas.push(`${empleado.nombre} (${diaKey})`);
                                    console.log(`✅ Tarea extra actualizada en ${empleado.nombre} - Nuevo nombre: "${data.nombre}"`);
                                } else {
                                    console.error(`❌ Error HTTP ${respExtra.status} al actualizar ${empleado.nombre}`);
                                }
                            } catch (errExtra) {
                                console.warn(`⚠️ Error al actualizar tarea extra en ${empleado.nombre}:`, errExtra);
                            }
                        }
                    }
                }
            }
            
            // Mensaje final
            if (tareasExtrasActualizadas.length > 0) {
                console.log(`✅ ${tareasExtrasActualizadas.length} tarea(s) extra(s) actualizada(s):`, tareasExtrasActualizadas);
            } else {
                console.log(`ℹ️ No se encontraron tareas extras con tareaOriginalId=${tareaOriginalId}`);
            }
        } catch (errExtras) {
            console.warn('⚠️ Error al actualizar tareas extras (no afecta tarea original):', errExtras);
        }
        
        // Mostrar confirmación visual en el botón si está disponible
        if (buttonElement) {
            const originalText = buttonElement.textContent;
            const originalBackground = buttonElement.style.background || '#007bff';
            
            // Mensaje que incluye tareas extras actualizadas
            let mensaje = '✓ Cambios Guardados';
            if (tareasExtrasActualizadas.length > 0) {
                mensaje += ` (+${tareasExtrasActualizadas.length} extra${tareasExtrasActualizadas.length > 1 ? 's' : ''})`;
            }
            
            buttonElement.textContent = mensaje;
            buttonElement.style.background = '#28a745';
            buttonElement.disabled = true;
            
            // Después de 2 segundos, cerrar el modal
            setTimeout(() => {
                // Cerrar el modal de edición de tareas
                const editModal = document.getElementById('modal-edit-task');
                if (editModal) {
                    editModal.classList.remove('active');
                    editModal.style.display = 'none';
                    console.log('🔴 Modal de edición cerrado automáticamente');
                }
                
                // Resetear el botón (por si el modal se vuelve a abrir)
                buttonElement.textContent = originalText;
                buttonElement.style.background = originalBackground;
                buttonElement.disabled = false;
            }, 2500); // Un poco más de tiempo si hay extras actualizadas
        }
        
        return true; // Indicar éxito
    } catch (error) {
        console.error('❌ Error al actualizar tarea:', error);
        
        // Mostrar error en el botón si está disponible
        if (buttonElement) {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '❌ Error al guardar';
            buttonElement.style.background = '#dc3545';
            
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.style.background = '#007bff';
            }, 3000);
        } else {
            alert('Error al guardar los cambios: ' + error.message);
        }
        
        return false; // Indicar fallo
    }
}

/**
 * Función para eliminar una tarea específica de un empleado.
 */
export async function deleteTarea(tareaId, dia, buttonElement = null, callback = null) {
    try {
        const empleadoId = window.empleadoSeleccionadoID;
        if (!empleadoId) {
            alert("No hay empleado seleccionado");
            return false;
        }

        if (!tareaId || !dia) {
            alert("Datos incompletos para eliminar la tarea");
            return false;
        }

        // Mostrar estado de carga en el botón
        const originalText = buttonElement?.textContent || '🗑️ Eliminar';
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.textContent = '⏳ Eliminando...';
            buttonElement.style.opacity = '0.7';
        }

        // Realizar la solicitud DELETE
        const response = await fetch(`/empleados/${empleadoId}/tareas/${dia}/${tareaId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Mostrar confirmación en el botón
        if (buttonElement) {
            buttonElement.textContent = '✓ Eliminada';
            buttonElement.style.background = '#28a745';
            buttonElement.disabled = true;
        }

        console.log('✅ Tarea eliminada exitosamente:', result);

        // Ejecutar callback después de 1 segundo (para que vea el mensaje)
        if (callback) {
            setTimeout(() => {
                callback();
            }, 1000);
        }

        return true;
    } catch (error) {
        console.error('❌ Error al eliminar tarea:', error);

        // Mostrar error en el botón
        if (buttonElement) {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '❌ Error al eliminar';
            buttonElement.style.background = '#dc3545';
            buttonElement.disabled = false;

            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
            }, 3000);
        } else {
            alert('Error al eliminar la tarea: ' + error.message);
        }

        return false;
    }
}