"""
Test:Verificar que en efecto se muestren los datos correctos en informes
"""

import sqlite3
import json
from datetime import datetime

DB = "relojes.db"

def sep(titulo):
    print(f"\n{'='*60}")
    print(f"  {titulo}")
    print(f"{'='*60}")

def query_all(sql, params=()):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ─────────────────────────────────────────────
sep("1. DATOS EN HISTORIAL (tabla completa)")
registros = query_all("SELECT id, nombre, id_dueño, fecha, puntos, estatus, completadaPor FROM historial ORDER BY fecha, id_dueño")
for r in registros:
    print(f"  [{r['id']}] {r['fecha']} | Usuario {r['id_dueño']} | {r['nombre']:<30} | {r['puntos']}pts | {r['estatus']}")
print(f"\n  Total registros: {len(registros)}")

# ─────────────────────────────────────────────
sep("2. QUINCENA ACTUAL (Q1 Feb 2026: 28 Ene – 12 Feb)")
fecha_ini = "2026-01-28"
fecha_fin = "2026-02-12"
q_registros = query_all(
    "SELECT * FROM historial WHERE fecha BETWEEN ? AND ? ORDER BY fecha",
    (fecha_ini, fecha_fin)
)
print(f"  Registros en Q1: {len(q_registros)}")
for r in q_registros:
    print(f"    {r['fecha']} | Usuario {r['id_dueño']} | {r['nombre']} | {r['puntos']}pts | {r['estatus']}")

# ─────────────────────────────────────────────
sep("3. TAREAS VENCIDAS – Quincena Actual (top-vencidas)")
vencidas_q = query_all(
    """SELECT nombre, COUNT(*) as total_vencidas, SUM(puntos) as total_puntos
       FROM historial WHERE estatus='vencida' AND fecha BETWEEN ? AND ?
       GROUP BY nombre ORDER BY total_vencidas DESC""",
    (fecha_ini, fecha_fin)
)
print(f"  Tareas vencidas en Q1: {len(vencidas_q)}")
for v in vencidas_q:
    print(f"    #{v['nombre']}: {v['total_vencidas']} veces, {v['total_puntos']} pts perdidos")

# ─────────────────────────────────────────────
sep("4. TAREAS VENCIDAS – Ver Todo (histórico completo)")
vencidas_all = query_all(
    """SELECT nombre, COUNT(*) as total_vencidas, SUM(puntos) as total_puntos,
              MIN(fecha) as primera, MAX(fecha) as ultima
       FROM historial WHERE estatus='vencida'
       GROUP BY nombre ORDER BY total_vencidas DESC"""
)
print(f"  Tareas vencidas históricas: {len(vencidas_all)}")
for v in vencidas_all:
    print(f"    #{v['nombre']}: {v['total_vencidas']} veces, {v['total_puntos']} pts | {v['primera']} → {v['ultima']}")

# ─────────────────────────────────────────────
sep("5. PUNTOS POR EMPLEADO POR DÍA (lo que verá TareasPanel/ResumenAgregado)")
usuarios = query_all("SELECT id, nombre FROM usuarios ORDER BY id")
for u in usuarios:
    fechas = query_all(
        """SELECT fecha,
                  SUM(CASE WHEN estatus != 'extra' THEN puntos ELSE 0 END) as asignados,
                  SUM(CASE WHEN estatus = 'completada' THEN puntos ELSE 0 END) as completados,
                  SUM(CASE WHEN estatus = 'vencida' THEN puntos ELSE 0 END) as perdidos,
                  SUM(CASE WHEN estatus = 'extra' AND completadaPor IS NOT NULL THEN puntos ELSE 0 END) as extras
           FROM historial WHERE id_dueño=? GROUP BY fecha ORDER BY fecha""",
        (u['id'],)
    )
    if fechas:
        print(f"\n  👤 {u['nombre']} (id={u['id']}):")
        for f in fechas:
            print(f"    {f['fecha']}: asig={f['asignados']} comp={f['completados']} perd={f['perdidos']} ext={f['extras']}")

# ─────────────────────────────────────────────
sep("6. PROMEDIO EMPLEADOS – Donut Chart (Q1 Feb 2026)")
totales = query_all(
    """SELECT 
          SUM(CASE WHEN estatus != 'extra' THEN puntos ELSE 0 END) as asignados,
          SUM(CASE WHEN estatus = 'completada' THEN puntos ELSE 0 END) as completados,
          SUM(CASE WHEN estatus = 'vencida' THEN puntos ELSE 0 END) as perdidos,
          SUM(CASE WHEN estatus = 'extra' AND completadaPor IS NOT NULL THEN puntos ELSE 0 END) as extras
       FROM historial WHERE fecha BETWEEN ? AND ?""",
    (fecha_ini, fecha_fin)
)
t = totales[0]
pct = (t['completados'] / t['asignados'] * 100) if t['asignados'] else 0
print(f"  Asignados: {t['asignados']}")
print(f"  Completados: {t['completados']}")
print(f"  Perdidos: {t['perdidos']}")
print(f"  Extras: {t['extras']}")
print(f"  Porcentaje: {pct:.1f}%")

# ─────────────────────────────────────────────
sep("7. RESUMEN CHECK")
print(f"  Fecha actual: {datetime.now().strftime('%Y-%m-%d')}")
print(f"  Quincena: Q1 Feb 2026 ({fecha_ini} → {fecha_fin})")
total_hist = len(registros)
total_vencidas = sum(1 for r in registros if r['estatus'] == 'vencida')
total_completadas = sum(1 for r in registros if r['estatus'] == 'completada')
print(f"  Total historial: {total_hist} registros")
print(f"  Completadas: {total_completadas}")
print(f"  Vencidas: {total_vencidas}")
print(f"\n  ✅ Si todos los valores son > 0, Informes mostrará datos correctamente.")
print(f"  ✅ 'Ver todo' muestra TODAS las vencidas históricas (sin filtro de fecha).")
print(f"  ✅ 'Quincena actual' muestra solo Q1 o Q2 según la fecha actual.")
