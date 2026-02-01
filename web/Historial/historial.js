// ============================================
// MÓDULO DE HISTORIAL - Rankings Dinámicos
// ============================================
// Este módulo carga datos directamente de la BD
// y calcula rankings por quincena sin usar APIs

// Variables globales
let empleadosConTareas = [];
let backup = [];
let quincenasDetectadas = [];
let empleadosCache = [];

// ==================================================
// 1. CARGA INICIAL DE DATOS
// ==================================================
async function cargarDatosHistorial() {
  try {
    // [HISTORIAL] Cargar empleados con TODAS sus tareas desde BD
    // Usar endpoint específico para historial que no filtra por semana
    const resEmpleados = await fetch('/empleados-con-tareas-historial');
    if (!resEmpleados.ok) {
      console.error('Error cargando empleados-con-tareas-historial');
      return;
    }
    empleadosConTareas = await resEmpleados.json();
    console.log('✅ empleados-con-tareas-historial cargado:', empleadosConTareas);

    // Cargar backup (tareas completadas)
    const resBackup = await fetch('/backup.json');
    if (!resBackup.ok) {
      console.error('Error cargando backup.json:', resBackup.status);
      return;
    }
    backup = await resBackup.json();
    console.log('✅ backup.json cargado:', backup);

    // 🔥 REFACTORIZADO: Usar empleados del caché ya cargado desde BD
    // No necesitamos llamada separada a /api/v1/empleados
    // empleadosCache se llena con los datos de empleados-con-tareas
    empleadosCache = empleadosConTareas.map(emp => ({
      id: emp.id,
      nombre: emp.nombre,
      puesto: emp.puesto,
      role_dp: emp.role_dp
    }));
    console.log('✅ empleadosCache lleno desde empleados-con-tareas (sin llamada separada)');

    // Generar quincenas disponibles
    console.log('🔄 Generando quincenas disponibles...');
    generarQuincenasDisponibles();
    console.log('✅ Quincenas detectadas:', quincenasDetectadas);

    // Poblar selector
    poblarSelectorQuincenas();

    // Mostrar rankings iniciales
    console.log('🔄 Mostrando rankings...');
    mostrarRankingEmpleados();
    mostrarRankingExtras();
    console.log('✅ Rankings mostrados');
  } catch (error) {
    console.error('Error en cargarDatosHistorial:', error);
  }
}

// ==================================================
// 2. DETECTAR QUINCENAS DISPONIBLES
// ==================================================
function generarQuincenasDisponibles() {
  const quincenasSet = new Set();

  // 🔥 NUEVO: Siempre agregar la quincena actual para que aparezca en el selector
  const hoy = new Date();
  const diaActual = hoy.getDate();
  const mesActual = hoy.getMonth() + 1;
  const anoActual = hoy.getFullYear();
  const qActual = calcularQuincena(diaActual, mesActual, anoActual);
  const keyActual = `${qActual.ano}-${qActual.mes}-${qActual.quincena}`;
  quincenasSet.add(keyActual);

  // Escanear todas las tareas de empleados-con-tareas
  empleadosConTareas.forEach(empleado => {
    if (empleado.tareas_asignadas && typeof empleado.tareas_asignadas === 'object') {
      Object.entries(empleado.tareas_asignadas).forEach(([fecha, tareasDelDia]) => {
        if (Array.isArray(tareasDelDia) && fecha) {
          const fechaObj = new Date(fecha);
          const dia = fechaObj.getDate();
          const mes = fechaObj.getMonth() + 1;
          const ano = fechaObj.getFullYear();

          const q = calcularQuincena(dia, mes, ano);
          const key = `${q.ano}-${q.mes}-${q.quincena}`;
          quincenasSet.add(key);
        }
      });
    }
  });

  // Escanear backup también
  if (Array.isArray(backup)) {
    backup.forEach(empleadoBackup => {
      if (empleadoBackup.tareas_asignadas && typeof empleadoBackup.tareas_asignadas === 'object') {
        Object.entries(empleadoBackup.tareas_asignadas).forEach(([fecha, tareasDelDia]) => {
          if (Array.isArray(tareasDelDia) && fecha) {
            const fechaObj = new Date(fecha);
            const dia = fechaObj.getDate();
            const mes = fechaObj.getMonth() + 1;
            const ano = fechaObj.getFullYear();

            const q = calcularQuincena(dia, mes, ano);
            const key = `${q.ano}-${q.mes}-${q.quincena}`;
            quincenasSet.add(key);
          }
        });
      }
    });
  }

  // Convertir a array y ordenar (filtrar datos inválidos)
  quincenasDetectadas = Array.from(quincenasSet)
    .map(key => {
      const [ano, mes, quincena] = key.split('-').map(Number);
      const label = `Q${quincena} - ${obtenerNombreMes(mes)} ${ano}`;
      return { ano, mes, quincena, label, key };
    })
    // 🔥 Filtrar quincenas con datos inválidos (NaN)
    .filter(q => !isNaN(q.ano) && !isNaN(q.mes) && !isNaN(q.quincena) && q.mes >= 1 && q.mes <= 12)
    .sort((a, b) => {
      if (a.ano !== b.ano) return b.ano - a.ano;
      if (a.mes !== b.mes) return b.mes - a.mes;
      return b.quincena - a.quincena;
    });
}

function calcularQuincena(dia, mes, ano) {
  // Q1: días 28-31 del mes anterior + días 1-12 del mes actual
  // Q2: días 13-27 del mes actual
  // 
  // Retorna { quincena, mes, ano } donde mes/ano pueden ser del mes siguiente
  // si el día >= 28
  
  if (dia >= 28) {
    // Días 28+ pertenecen a Q1 del MES SIGUIENTE
    let nuevoMes = mes + 1;
    let nuevoAno = ano;
    if (nuevoMes > 12) {
      nuevoMes = 1;
      nuevoAno = ano + 1;
    }
    return { quincena: 1, mes: nuevoMes, ano: nuevoAno };
  } else if (dia <= 12) {
    // Días 1-12 pertenecen a Q1 del mes actual
    return { quincena: 1, mes: mes, ano: ano };
  } else {
    // Días 13-27 pertenecen a Q2 del mes actual
    return { quincena: 2, mes: mes, ano: ano };
  }
}

function obtenerNombreMes(mes) {
  const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return meses[mes] || '';
}

// ==================================================
// 3. POBLAR SELECTOR DE QUINCENAS
// ==================================================
function poblarSelectorQuincenas() {
  const selector = document.getElementById('selectorQuincena');
  if (!selector) return;

  selector.innerHTML = '<option value="">Todas las quincenas</option>';

  quincenasDetectadas.forEach((q, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = q.label;
    selector.appendChild(option);
  });
}

// ==================================================
// 4. OBTENER TODAS LAS TAREAS (BD + BACKUP)
// ==================================================
function getAllTasks() {
  const allTasks = {};

  // Agregar tareas de empleados-con-tareas
  // Las tareas están organizadas por fecha en tareas_asignadas
  empleadosConTareas.forEach(empleado => {
    if (!allTasks[empleado.id]) {
      allTasks[empleado.id] = {
        nombre: empleado.nombre,
        puesto: empleado.puesto,
        role_dp: empleado.role_dp,
        tareas: []
      };
    }
    
    // tareas_asignadas es un objeto: { "2026-01-11": [...tareas...], "2026-01-12": [...] }
    if (empleado.tareas_asignadas && typeof empleado.tareas_asignadas === 'object') {
      Object.entries(empleado.tareas_asignadas).forEach(([fecha, tareasDelDia]) => {
        if (Array.isArray(tareasDelDia)) {
          tareasDelDia.forEach(tarea => {
            // Agregar fecha si no la tiene
            if (!tarea.fecha) {
              tarea.fecha = fecha;
            }
            allTasks[empleado.id].tareas.push(tarea);
          });
        }
      });
    }
  });

  // Agregar tareas del backup (si existe)
  // El backup retorna un array de empleados con tareas_asignadas también por fecha
  if (Array.isArray(backup)) {
    backup.forEach(empleadoBackup => {
      const idStr = String(empleadoBackup.id);
      if (!allTasks[idStr]) {
        allTasks[idStr] = {
          nombre: empleadoBackup.nombre || 'Desconocido',
          puesto: empleadoBackup.puesto || 'N/A',
          tareas: []
        };
      }
      
      // Procesar tareas_asignadas del backup
      if (empleadoBackup.tareas_asignadas && typeof empleadoBackup.tareas_asignadas === 'object') {
        Object.entries(empleadoBackup.tareas_asignadas).forEach(([fecha, tareasDelDia]) => {
          if (Array.isArray(tareasDelDia)) {
            tareasDelDia.forEach(tarea => {
              if (!tarea.fecha) {
                tarea.fecha = fecha;
              }
              // Deduplicar por task ID si existe
              const existingIdx = allTasks[idStr].tareas.findIndex(t => t.id === tarea.id);
              if (existingIdx >= 0) {
                allTasks[idStr].tareas[existingIdx] = tarea; // Sobrescribir con del backup
              } else {
                allTasks[idStr].tareas.push(tarea);
              }
            });
          }
        });
      }
    });
  }

  return allTasks;
}

// ==================================================
// 5. CALCULAR RANKINGS POR QUINCENA
// ==================================================
function calcularRankingQuincena(quincenaIndex) {
  const allTasks = getAllTasks();
  console.log('📥 Todas las tareas obtenidas:', allTasks);
  
  const rankings = [];
  const rankingsExtra = [];

  // Obtener rango de fechas de la quincena (o null para todas)
  let fechaInicio, fechaFin;
  let esQuincenaActual = false;
  
  if (quincenaIndex !== null && quincenaIndex !== '') {
    const q = quincenasDetectadas[parseInt(quincenaIndex)];
    if (!q) return { rankings: [], rankingsExtra: [] };

    // 🔥 NUEVO: Detectar si es la quincena actual
    const hoy = new Date();
    const diaHoy = hoy.getDate();
    const mesHoy = hoy.getMonth() + 1;
    const anoHoy = hoy.getFullYear();
    const qHoy = calcularQuincena(diaHoy, mesHoy, anoHoy);
    
    esQuincenaActual = (q.quincena === qHoy.quincena && q.mes === qHoy.mes && q.ano === qHoy.ano);
    
    console.log(`📅 Quincena seleccionada: ${q.label}, ¿Es actual? ${esQuincenaActual}`);
    console.log(`   Q seleccionada: Q${q.quincena} - Mes ${q.mes} - Año ${q.ano}`);
    console.log(`   Q hoy: Q${qHoy.quincena} - Mes ${qHoy.mes} - Año ${qHoy.ano}`);
    
    // Calcular fechas de la quincena (en UTC para comparación consistente)
    if (q.quincena === 1) {
      // Q1: 28 del mes anterior - 12 del mes actual
      const mesAnterior = q.mes === 1 ? 12 : q.mes - 1;
      const anoAnterior = q.mes === 1 ? q.ano - 1 : q.ano;
      fechaInicio = new Date(Date.UTC(anoAnterior, mesAnterior - 1, 28));
      fechaFin = new Date(Date.UTC(q.ano, q.mes - 1, 12, 23, 59, 59, 999));
    } else {
      // Q2: 13 - 27 del mes actual
      fechaInicio = new Date(Date.UTC(q.ano, q.mes - 1, 13));
      fechaFin = new Date(Date.UTC(q.ano, q.mes - 1, 27, 23, 59, 59, 999));
    }
    
    // 🔥 Si es la quincena actual, ajustar fechaFin a HOY
    if (esQuincenaActual) {
      const hoyDate = new Date();
      const year = hoyDate.getFullYear();
      const month = hoyDate.getMonth();
      const day = hoyDate.getDate();
      // Crear fecha de hoy a medianoche UTC para comparación consistente
      fechaFin = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      console.log(`📅 Q1-Feb filtrado hasta HOY: ${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
    }
  }

  // Iterar empleados
  Object.entries(allTasks).forEach(([idEmpleado, data]) => {
    let totalTareas = 0;
    let completadas = 0;
    let vencidas = 0;
    let puntosGanados = 0;
    let tareasExtra = 0;
    let puntosExtras = 0;

    // Filtrar tareas por quincena si es necesario
    let tareasAContar = data.tareas;

    if (fechaInicio && fechaFin) {
      // Normalizar fechas de inicio y fin a strings YYYY-MM-DD para comparación
      const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
      const fechaFinStr = fechaFin.toISOString().split('T')[0];
      
      tareasAContar = data.tareas.filter(tarea => {
        if (!tarea.fecha) return false;
        
        // Comparar como strings YYYY-MM-DD para evitar problemas de zona horaria
        const fechaTareaStr = tarea.fecha; // Ya viene como "2026-01-28"
        return fechaTareaStr >= fechaInicioStr && fechaTareaStr <= fechaFinStr;
      });
    }

    // Contar y sumar
    tareasAContar.forEach(tarea => {
      const status = tarea.estatus || tarea.status || 0;

      if (status === 5) {
        // Tarea extra completada
        tareasExtra++;
        puntosExtras += tarea.puntaje || 0;
      } else {
        // Tarea normal
        totalTareas++;

        if (status === 3) {
          // Completada
          completadas++;
          puntosGanados += tarea.puntaje || 0;
        } else if (status === 4) {
          // Vencida
          vencidas++;
        }
      }
    });

    // Agregar al ranking si hay tareas o extras
    if (totalTareas > 0 || tareasExtra > 0) {
      const porcentaje = totalTareas > 0 
        ? ((completadas / totalTareas) * 100).toFixed(1)
        : 0;

      rankings.push({
        id: idEmpleado,
        nombre: data.nombre,
        puesto: data.puesto,
        role_dp: data.role_dp,
        total_tareas: totalTareas,
        completadas: completadas,
        vencidas: vencidas,
        puntos_ganados: puntosGanados,
        porcentaje: parseFloat(porcentaje)
      });

      if (tareasExtra > 0) {
        rankingsExtra.push({
          id: idEmpleado,
          nombre: data.nombre,
          puesto: data.puesto,
          tareas_extra: tareasExtra,
          puntos_extras: puntosExtras
        });
      }
    }
  });

  // Ordenar por puntos
  rankings.sort((a, b) => (b.puntos_ganados || 0) - (a.puntos_ganados || 0));
  rankingsExtra.sort((a, b) => (b.puntos_extras || 0) - (a.puntos_extras || 0));

  console.log('🏆 Rankings finales:', rankings);
  console.log('⭐ Rankings Extra finales:', rankingsExtra);

  return { rankings, rankingsExtra };
}

// ==================================================
// 6. MOSTRAR RANKING DE EMPLEADOS
// ==================================================
function mostrarRankingEmpleados(quincenaIndex = null) {
  const tbody = document.getElementById('tablaEmpleadosBody');
  if (!tbody) {
    console.error('❌ Elemento tablaEmpleadosBody no encontrado');
    return;
  }

  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
  const userRole = loggedUser.role;

  let { rankings } = calcularRankingQuincena(quincenaIndex);
  console.log('📊 Rankings calculados (antes de filtrar):', rankings);

  // 🔥 Filtrar según rol del usuario logueado
  rankings = rankings.filter(usuario => {
    const empRole = usuario.role_dp ? usuario.role_dp.toLowerCase() : 'empleado';
    
    // NUNCA mostrar admin
    if (empRole === 'admin' || empRole === 'administrador') {
      return false;
    }
    
    // Lógica de visibilidad por rol
    if (userRole === 'empleado' || userRole === 'visitante') {
      // Solo ver empleados
      return empRole === 'empleado';
    } else if (userRole === 'supervisor' || userRole === 'admin') {
      // Ver empleados + supervisores
      return empRole === 'empleado' || empRole === 'supervisor';
    }
    
    return true;
  });

  console.log('📊 Rankings (después de filtrar):', rankings);

  tbody.innerHTML = '';

  if (rankings.length === 0) {
    console.log('⚠️  Sin datos para mostrar en empleados');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #999;">No hay datos para mostrar</td></tr>';
    return;
  }

  // Actualizar total
  const totalTareas = rankings.reduce((acc, r) => acc + r.total_tareas, 0);
  const elTotal = document.getElementById('totalTareasRanking');
  if (elTotal) elTotal.textContent = totalTareas;

  rankings.forEach((usuario, index) => {
    const tr = document.createElement('tr');
    tr.className = index < 3 ? 'top-three' : '';

    let progressColorClass = 'progress-red';
    if (usuario.porcentaje >= 91) {
      progressColorClass = 'progress-green';
    } else if (usuario.porcentaje >= 81) {
      progressColorClass = 'progress-yellow';
    }

    // Determinar color de fondo completo según porcentaje
    let bgColor = '#ef4444'; // rojo por defecto
    if (usuario.porcentaje >= 91) {
      bgColor = '#10b981'; // verde
    } else if (usuario.porcentaje >= 81) {
      bgColor = '#f59e0b'; // amarillo/naranja
    }

    tr.innerHTML = `
      <td class="rank-cell">
        <div class="rank-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}">${index + 1}</div>
      </td>
      <td><strong>${usuario.nombre}</strong></td>
      <td>${usuario.puesto}</td>
      <td>${usuario.total_tareas}</td>
      <td class="vencidas-cell">${usuario.vencidas || 0}</td>
      <td class="completadas-cell">${usuario.completadas || 0}</td>
      <td style="text-align: center; padding: 8px;">
        <div style="background: ${bgColor}; color: white; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; display: inline-block;">${usuario.porcentaje}%</div>
      </td>
      <td class="puntos-cell">
        <div class="puntos-badge">${usuario.puntos_ganados || 0}</div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ==================================================
// 7. MOSTRAR RANKING DE EXTRAS
// ==================================================
function mostrarRankingExtras(quincenaIndex = null) {
  const tbody = document.getElementById('tablaTareasExtraBody');
  if (!tbody) return;

  const loggedUserString = localStorage.getItem('loggedUser');
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : { role: 'visitante' };
  const userRole = loggedUser.role;

  let { rankingsExtra } = calcularRankingQuincena(quincenaIndex);
  console.log('⭐ rankingsExtra ANTES de filtrar por rol:', rankingsExtra.length, rankingsExtra);

  // 🔥 Filtrar según rol del usuario logueado
  rankingsExtra = rankingsExtra.filter(usuario => {
    const emp = empleadosCache.find(e => e.id === usuario.id);
    const empRole = emp && emp.role_dp ? emp.role_dp.toLowerCase() : 'empleado';
    
    // NUNCA mostrar admin
    if (empRole === 'admin' || empRole === 'administrador') {
      console.log(`  ❌ ${usuario.nombre} - Admin excluido`);
      return false;
    }
    
    // Lógica de visibilidad por rol
    if (userRole === 'empleado' || userRole === 'visitante') {
      // Solo ver empleados
      const incluir = empRole === 'empleado';
      console.log(`  ${incluir ? '✓' : '✕'} ${usuario.nombre} (${empRole}) - Tu rol: ${userRole}`);
      return incluir;
    } else if (userRole === 'supervisor' || userRole === 'admin') {
      // Ver empleados + supervisores
      const incluir = empRole === 'empleado' || empRole === 'supervisor';
      console.log(`  ${incluir ? '✓' : '✕'} ${usuario.nombre} (${empRole}) - Tu rol: ${userRole}`);
      return incluir;
    }
    
    return true;
  });

  console.log('⭐ rankingsExtra DESPUÉS de filtrar por rol:', rankingsExtra.length);

  tbody.innerHTML = '';

  if (rankingsExtra.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: #999;">No hay tareas extra completadas</td></tr>';
    return;
  }

  // Actualizar total
  const totalExtras = rankingsExtra.reduce((acc, r) => acc + r.tareas_extra, 0);
  const totalPuntosExtras = rankingsExtra.reduce((acc, r) => acc + (r.puntos_extras || 0), 0);
  const elTotal = document.getElementById('totalTareasExtraRanking');
  if (elTotal) elTotal.textContent = totalExtras;

  rankingsExtra.forEach((usuario, index) => {
    const tr = document.createElement('tr');
    tr.className = index < 3 ? 'top-three' : '';

    const porcentajePuntos = totalPuntosExtras > 0
      ? ((usuario.puntos_extras / totalPuntosExtras) * 100).toFixed(1)
      : 0;

    tr.innerHTML = `
      <td class="rank-cell">
        <div class="rank-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}">${index + 1}</div>
      </td>
      <td></td>
      <td><strong style="color: #e63946;">${usuario.nombre}</strong></td>
      <td>${usuario.puesto}</td>
      <td style="text-align: center; font-weight: 600; padding: 12px 10px; color: #000;">${usuario.tareas_extra}</td>
      <td style="text-align: center; font-weight: 600; padding: 12px 10px; color: #000;">${usuario.puntos_extras || 0}</td>
      <td style="text-align: center; padding: 8px;">
        <div style="background: ${porcentajePuntos >= 91 ? '#10b981' : porcentajePuntos >= 81 ? '#f59e0b' : '#ef4444'}; color: white; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; display: inline-block;">${porcentajePuntos}%</div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ==================================================
// 8. APLICAR FILTRO DE QUINCENA
// ==================================================
function aplicarFiltroQuincena() {
  const selector = document.getElementById('selectorQuincena');
  if (!selector) return;

  const quincenaIndex = selector.value === '' ? null : selector.value;

  mostrarRankingEmpleados(quincenaIndex);
  mostrarRankingExtras(quincenaIndex);

  // Actualizar título de empleados
  const h2Empleados = document.getElementById('title-empleados');
  if (h2Empleados && quincenaIndex !== null) {
    const q = quincenasDetectadas[parseInt(quincenaIndex)];
    h2Empleados.textContent = `🏆 Ranking de Empleados - ${q.label}`;
  } else if (h2Empleados) {
    h2Empleados.textContent = '🏆 Ranking de Empleados';
  }

  // Actualizar título de extras
  const h2Extras = document.getElementById('title-extras');
  if (h2Extras && quincenaIndex !== null) {
    const q = quincenasDetectadas[parseInt(quincenaIndex)];
    h2Extras.textContent = `⭐ Ranking de Tareas Extra - ${q.label}`;
  } else if (h2Extras) {
    h2Extras.textContent = '⭐ Ranking de Tareas Extra';
  }
}

// ==================================================
// 9. INICIALIZACIÓN AL CARGAR LA PÁGINA
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
  cargarDatosHistorial();
});
