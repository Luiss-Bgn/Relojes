// ============================================
// MÓDULO DE HISTORIAL - Rankings Dinámicos
// ============================================
// Este módulo usa los endpoints de la API /historial/top-empleados y /historial/top-extras
import { API_BASE } from "../config.js";

// Variables globales
let quincenasDetectadas = [];
let quincenaSeleccionada = null;

// ==================================================
// 1. CARGA INICIAL DE DATOS
// ==================================================
async function cargarDatosHistorial() {
  try {
    // console.log('🔄 Iniciando carga de datos usando endpoints /historial/top-*...');

    // Obtener quincenas disponibles desde la API
    await cargarQuincenasDisponibles();
    console.log('✅ Quincenas detectadas:', quincenasDetectadas);

    // Poblar selector
    poblarSelectorQuincenas();

    // Mostrar rankings iniciales (histórico general)
    console.log('🔄 Mostrando rankings...');
    await mostrarRankingEmpleados();
    await mostrarRankingExtras();
    console.log('✅ Rankings mostrados');
  } catch (error) {
    console.error('Error en cargarDatosHistorial:', error);
  }
}

// ==================================================
// 2. OBTENER QUINCENAS DISPONIBLES DESDE LA API
// ==================================================
async function cargarQuincenasDisponibles() {
  try {
    const url = `${API_BASE}/historial/quincenas-disponibles`;
    // console.log('🔄 Obteniendo quincenas disponibles desde:', url);

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Error al obtener quincenas disponibles:', response.status, response.statusText);
      // Si falla, generar quincenas por defecto
      generarQuincenasDisponibles();
      return;
    }

    const data = await response.json();
    // console.log('✅ Quincenas disponibles recibidas:', data);

    if (data.status === 'success' && data.quincenas && data.quincenas.length > 0) {
      // Mapear las quincenas recibidas al formato esperado
      quincenasDetectadas = data.quincenas.map(q => ({
        ano: q.año,
        mes: q.mes,
        quincena: q.quincena,
        label: q.label,
        key: `${q.año}-${q.mes}-${q.quincena}`
      }));
    } else {
      console.warn('⚠️  No se encontraron quincenas con datos, usando generación por defecto');
      generarQuincenasDisponibles();
    }
  } catch (error) {
    console.error('Error al cargar quincenas disponibles:', error);
    // En caso de error, usar generación por defecto
    generarQuincenasDisponibles();
  }
}

// ==================================================
// 3. GENERAR QUINCENAS DISPONIBLES (FALLBACK)
// ==================================================
function generarQuincenasDisponibles() {
  // Generar quincenas de los últimos 6 meses
  const hoy = new Date();
  const quincenas = [];

  // Generar quincenas hacia atrás desde hoy
  for (let i = 0; i < 12; i++) { // 12 quincenas = 6 meses aproximadamente
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - (i * 15)); // Retroceder 15 días por cada iteración

    const dia = fecha.getDate();
    const mes = fecha.getMonth() + 1;
    const ano = fecha.getFullYear();

    const q = calcularQuincena(dia, mes, ano);
    const key = `${q.ano}-${q.mes}-${q.quincena}`;

    // Evitar duplicados
    if (!quincenas.find(quin => quin.key === key)) {
      const label = `Q${q.quincena} - ${obtenerNombreMes(q.mes)} ${q.ano}`;
      quincenas.push({ ano: q.ano, mes: q.mes, quincena: q.quincena, label, key });
    }
  }

  // Ordenar por fecha descendente
  quincenasDetectadas = quincenas.sort((a, b) => {
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
// 4. POBLAR SELECTOR DE QUINCENAS
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
// 5. FETCH TOP EMPLEADOS DESDE API
// ==================================================
async function fetchTopEmpleados(quincenaData = null) {
  try {
    let url = `${API_BASE}/historial/top-empleados?limite=100`;

    // Si hay quincena seleccionada, agregar parámetros
    if (quincenaData) {
      url += `&año=${quincenaData.ano}&mes=${quincenaData.mes}&quincena=${quincenaData.quincena}`;
      console.log(`📊 Fetching top empleados para: ${quincenaData.label}`, url);
    } else {
      console.log('📊 Fetching top empleados (histórico general)', url);
    }

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Error en fetch top empleados:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return { top_empleados: [], periodo: 'Error' };
    }

    const data = await response.json();
    console.log('✅ Top empleados recibido:', data);
    return data;
  } catch (error) {
    console.error('Error en fetchTopEmpleados:', error);
    return { top_empleados: [], periodo: 'Error' };
  }
}

// ==================================================
// 6. FETCH TOP EXTRAS DESDE API
// ==================================================
async function fetchTopExtras(quincenaData = null) {
  try {
    let url = `${API_BASE}/historial/top-extras?limite=100`;

    // Si hay quincena seleccionada, agregar parámetros
    if (quincenaData) {
      url += `&año=${quincenaData.ano}&mes=${quincenaData.mes}&quincena=${quincenaData.quincena}`;
      console.log(`⭐ Fetching top extras para: ${quincenaData.label}`, url);
    } else {
      console.log('⭐ Fetching top extras (histórico general)', url);
    }

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Error en fetch top extras:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return { top_extras: [], periodo: 'Error' };
    }

    const data = await response.json();
    console.log('✅ Top extras recibido:', data);
    return data;
  } catch (error) {
    console.error('Error en fetchTopExtras:', error);
    return { top_extras: [], periodo: 'Error' };
  }
}

// ==================================================
// 7. MOSTRAR RANKING DE EMPLEADOS
// ==================================================
async function mostrarRankingEmpleados(quincenaIndex = null) {
  const tbody = document.getElementById('tablaEmpleadosBody');
  if (!tbody) {
    console.error('❌ Elemento tablaEmpleadosBody no encontrado');
    return;
  }

  // Obtener datos de quincena si aplica
  let quincenaData = null;
  if (quincenaIndex !== null && quincenaIndex !== '') {
    quincenaData = quincenasDetectadas[parseInt(quincenaIndex)];
  }

  // Fetch datos desde API
  const resultado = await fetchTopEmpleados(quincenaData);
  let rankings = resultado.top_empleados || [];

  console.log('📊 Rankings de empleados:', rankings);

  tbody.innerHTML = '';

  if (rankings.length === 0) {
    console.log('⚠️  Sin datos para mostrar en empleados');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: #999;">No hay datos para mostrar</td></tr>';

    // Actualizar total a 0
    const elTotal = document.getElementById('totalTareasRanking');
    if (elTotal) elTotal.textContent = '0';
    return;
  }

  // Actualizar total
  const totalTareas = rankings.reduce((acc, r) => acc + (r.total_tareas || 0), 0);
  const elTotal = document.getElementById('totalTareasRanking');
  if (elTotal) elTotal.textContent = totalTareas;

  rankings.forEach((usuario, index) => {
    const tr = document.createElement('tr');
    tr.className = index < 3 ? 'top-three' : '';

    // Calcular porcentaje (si no viene del backend)
    const porcentaje = usuario.porcentaje || 0;

    // Determinar color según porcentaje
    let bgColor = '#ef4444'; // rojo por defecto
    if (porcentaje >= 91) {
      bgColor = '#10b981'; // verde
    } else if (porcentaje >= 81) {
      bgColor = '#f59e0b'; // amarillo/naranja
    }

    tr.innerHTML = `
      <td style="width: 3%; text-align: center;">
        <div class="rank-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}">${index + 1}</div>
      </td>
      <td style="width: 3%;"></td>
      <td style="width: 20%;"><strong>${usuario.nombre}</strong></td>
      <td style="width: 15%;">${usuario.puesto ?? 'N/A'}</td>
      <td style="width: 8%; text-align: center;">${usuario.total_tareas ?? 0}</td>
      <td style="width: 8%; text-align: center;" class="vencidas-cell">${usuario.vencidas ?? 0}</td>
      <td style="width: 15%; text-align: center;" class="completadas-cell">${usuario.completadas ?? 0}</td>
      <td style="width: 15%; text-align: center; padding: 8px;">
        <div style="background: ${bgColor}; color: white; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; display: inline-block; width: 10ch;">
        ${porcentaje.toFixed(1)}%
        </div>
      </td>
      <td style="width: 10%; text-align: center;" class="puntos-cell">
        <div class="puntos-badge">${usuario.total_puntos ?? 0}</div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Actualizar título
  const h2Empleados = document.getElementById('title-empleados');
  if (h2Empleados) {
    if (quincenaData) {
      h2Empleados.textContent = `🏆 Ranking de Empleados - ${quincenaData.label}`;
    } else {
      h2Empleados.textContent = '🏆 Ranking de Empleados';
    }
  }
}

// ==================================================
// 8. MOSTRAR RANKING DE EXTRAS
// ==================================================
async function mostrarRankingExtras(quincenaIndex = null) {
  const tbody = document.getElementById('tablaTareasExtraBody');
  if (!tbody) return;

  // Obtener datos de quincena si aplica
  let quincenaData = null;
  if (quincenaIndex !== null && quincenaIndex !== '') {
    quincenaData = quincenasDetectadas[parseInt(quincenaIndex)];
  }

  // Fetch datos desde API
  const resultado = await fetchTopExtras(quincenaData);
  let rankingsExtra = resultado.top_extras || [];

  console.log('⭐ Rankings de extras:', rankingsExtra);

  tbody.innerHTML = '';

  if (rankingsExtra.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #999;">No hay tareas extra completadas</td></tr>';

    // Actualizar total a 0
    const elTotal = document.getElementById('totalTareasExtraRanking');
    if (elTotal) elTotal.textContent = '0';
    return;
  }

  // Actualizar total
  const totalExtras = rankingsExtra.reduce((acc, r) => acc + (r.total_tareas || 0), 0);
  const totalPuntosExtras = rankingsExtra.reduce((acc, r) => acc + (r.total_puntos || 0), 0);
  const elTotal = document.getElementById('totalTareasExtraRanking');
  if (elTotal) elTotal.textContent = totalExtras;

  rankingsExtra.forEach((usuario, index) => {
    const tr = document.createElement('tr');
    tr.className = index < 3 ? 'top-three' : '';

    const porcentajePuntos = totalPuntosExtras > 0
      ? ((usuario.total_puntos / totalPuntosExtras) * 100)
      : 0;

    // Determinar color según porcentaje
    let bgColor = '#ef4444'; // rojo
    if (porcentajePuntos >= 40) {
      bgColor = '#10b981'; // verde
    } else if (porcentajePuntos >= 20) {
      bgColor = '#f59e0b'; // amarillo
    }

    tr.innerHTML = `
      <td style="width: 10%; text-align: center;">
        <div class="rank-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}">${index + 1}</div>
      </td>
      <td style="width: 2%; text-align: center;"></td>
      <td style="width: 15%; text-align: left;"><strong style="color: #e63946;">${usuario.nombre ?? 'N/A'}</strong></td>
      <td style="width: 19%;  text-align: center;">${usuario.puesto ?? 'N/A'}</td>
      <td style="width: 14%; text-align: center; font-weight: 600; padding: 12px 10px; color: #000;">${usuario.total_tareas ?? 0}</td>
      <td style="width: 19%; text-align: center; font-weight: 600; padding: 12px 10px; color: #000;">${usuario.total_puntos ?? 0}</td>
      <td style="width: 23%; text-align: center; padding: 8px;">
        <div style="background: ${bgColor}; color: white; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; display: inline-block; width: 10ch;">
        ${porcentajePuntos.toFixed(1)}%
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Actualizar título
  const h2Extras = document.getElementById('title-extras');
  if (h2Extras) {
    if (quincenaData) {
      h2Extras.textContent = `⭐ Ranking de Tareas Extra - ${quincenaData.label}`;
    } else {
      h2Extras.textContent = '⭐ Ranking de Tareas Extra';
    }
  }
}

// ==================================================
// 9. APLICAR FILTRO DE QUINCENA
// ==================================================
async function aplicarFiltroQuincena() {
  const selector = document.getElementById('selectorQuincena');
  if (!selector) return;

  const quincenaIndex = selector.value === '' ? null : selector.value;
  quincenaSeleccionada = quincenaIndex;

  await mostrarRankingEmpleados(quincenaIndex);
  await mostrarRankingExtras(quincenaIndex);
}

// ==================================================
// 10. INICIALIZACIÓN AL CARGAR LA PÁGINA
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
  cargarDatosHistorial();
});
