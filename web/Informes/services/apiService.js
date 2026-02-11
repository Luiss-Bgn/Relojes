/*
  Esta madre se encarga de todas las llamadas HTTP al server.
  Solo jala datos del historial (backup), nada de tareas en vivo.
*/

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { cache: 'no-store', ...opts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchUsuarios() {
  const data = await fetchJSON('/usuarios');
  return data.usuarios || [];
}

export async function fetchHistorialUsuario(userId) {
  const data = await fetchJSON(`/historial/usuario/${userId}`);
  return data.registros || [];
}

export async function fetchTareasVencidas(soloQuincena = true) {
  try {
    return await fetchJSON(`/historial/top-vencidas?solo_quincena_actual=${soloQuincena}`);
  } catch {
    return { top_tareas: [], periodo: '', total: 0 };
  }
}
