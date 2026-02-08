const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export const STATUS_ORDER = ["en_progreso", "sin_iniciar", "completada", "vencida", "extra"];

export const STATUS_LABELS = {
  sin_iniciar: "Sin iniciar",
  en_progreso: "En progreso",
  completada: "Completada",
  vencida: "Vencida",
  extra: "Extra"
};

const statusFromTask = (task) => {
  const raw = task.estatus || task.estado || task.status || "sin_iniciar";
  if ((task.tipo || "").toLowerCase() === "extra") return "extra";
  return raw;
};

const parseTime = (value) => {
  if (!value) return null;
  const [h, m] = value.split(":");
  const now = new Date();
  now.setHours(Number(h), Number(m || 0), 0, 0);
  return now;
};

const buildTimeRange = (task) => {
  const start = task.hora_ini || task.hora_inicio || task.inicio;
  const end = task.hora_fin || task.fin;
  if (start && end) return `${start} - ${end}`;
  return start || "--";
};

const derivePanelArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.panel)) return payload.panel;
  if (payload.data && Array.isArray(payload.data.panel)) return payload.data.panel;
  return [];
};

const findDateKey = (panel, preferred) => {
  // Si hay un día preferido, usarlo directamente (incluso si no tiene tareas)
  if (preferred) return preferred;
  
  const allDates = new Set();
  panel.forEach((emp) => {
    const tareasAsignadas = emp.tareas_asignadas || {};
    Object.keys(tareasAsignadas).forEach((k) => allDates.add(k));
  });

  if (allDates.size > 0) {
    const dateArray = Array.from(allDates);
    // Priorizar fechas en formato DD-MM-YY sobre días de la semana
    const dateFormats = dateArray.filter(d => d.includes("-"));
    if (dateFormats.length > 0) return dateFormats[0];
    return dateArray[0];
  }

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
};

const formatDateLabel = (dateKey) => {
  // Si es un día de la semana, retornarlo directamente
  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  if (diasSemana.includes(dateKey)) {
    return dateKey.toUpperCase();
  }

  const [dd, mm, yy] = (dateKey || "").split("-");
  const year = Number(yy) + 2000;
  const monthIndex = Number(mm) - 1;
  const day = Number(dd);
  if (!dd || Number.isNaN(monthIndex)) return "Sin fecha";
  const date = new Date(year, monthIndex, day);
  const weekday = date.toLocaleDateString("es-ES", { weekday: "long" });
  const label = `${weekday.toUpperCase()} ${day} ${MONTHS[monthIndex]} ${year}`;
  return label;
};

export const adaptPanel = (payload, preferredDate) => {
  const panelArray = derivePanelArray(payload);
  const dateKey = findDateKey(panelArray, preferredDate);

  // Obtener rol del usuario logueado
  const loggedUserString = localStorage.getItem("loggedUser");
  const loggedUser = loggedUserString ? JSON.parse(loggedUserString) : null;
  const userRole = loggedUser ? loggedUser.role.toLowerCase() : null;

  // Filtrar empleados según rol del usuario
  let employees;
  if (!userRole || userRole === 'empleado') {
    // Sin sesión o empleado: solo mostrar empleados
    employees = panelArray.filter((p) => p.rol === "empleado");
  } else if (userRole === 'supervisor' || userRole === 'admin') {
    // Supervisor o admin: mostrar empleados y supervisores
    employees = panelArray.filter((p) => p.rol === "empleado" || p.rol === "supervisor");
  } else {
    // Fallback: mostrar solo empleados
    employees = panelArray.filter((p) => p.rol === "empleado");
  }

  employees = employees.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    puesto: p.puesto,
    imagen: p.imagen,
    rol: p.rol,
    pin: p.pin,
    usuario: p.username,
    contraseña: p.contraseña
  }));

  const rows = [];
  employees.forEach((emp) => {
    const assigned = (panelArray.find((p) => p.id === emp.id)?.tareas_asignadas || {})[dateKey] || [];
    assigned.forEach((task) => {
      const taskStatus = statusFromTask(task);
      
      // Filtrar tareas con estatus "futura" - no mostrarlas en la tabla principal
      if (taskStatus === 'futura') {
        return;
      }
      
      rows.push({
        id: `${emp.id}-${task.id}`,
        tareaId: task.id,
        empleadoId: emp.id,
        hora: buildTimeRange(task),
        titulo: task.nombre || task.titulo || "Tarea",
        descripcion: task.descripcion || task.detalle || "",
        puntos: task.puntos ?? task.valor ?? 0,
        estatus: taskStatus,
        completadaPor: task.completadaPor,
        disponible_para_rol: task.disponible_para_rol || 'todos'
      });
    });
  });

  rows.sort((a, b) => {
    const startA = parseTime((a.hora || "").split(" - ")[0]);
    const startB = parseTime((b.hora || "").split(" - ")[0]);
    if (!startA || !startB) return 0;
    return startA - startB;
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.estatus === "completada") acc.completed += 1;
      if (row.estatus === "extra") acc.extra += row.puntos || 0;
      if (row.estatus === "sin_iniciar") acc.pending += 1;
      return acc;
    },
    { total: 0, completed: 0, extra: 0, pending: 0 }
  );

  const completionRate = totals.total === 0 ? 0 : Math.round((totals.completed / totals.total) * 100);

  return {
    dateKey,
    dateLabel: formatDateLabel(dateKey),
    employees,
    rows,
    stats: {
      completionRate,
      extra: totals.extra,
      pending: totals.pending
    }
  };
};
