import sqlite3

conn = sqlite3.connect('relojes.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# 1. Tablas
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print('=== TABLAS ===')
for row in cursor.fetchall():
    print(row['name'])

# 2. Historial
print('\n=== HISTORIAL (todos) ===')
cursor.execute('SELECT * FROM historial ORDER BY fecha DESC')
rows = cursor.fetchall()
print(f'Total: {len(rows)}')
for r in rows:
    print(dict(r))

# 3. Tareas semana
print('\n=== TAREAS_SEMANA (todas) ===')
cursor.execute('SELECT * FROM tareas_semana ORDER BY id')
rows = cursor.fetchall()
print(f'Total: {len(rows)}')
for r in rows:
    print(dict(r))

# 4. Estructura de tareas_semana
print('\n=== ESTRUCTURA tareas_semana ===')
cursor.execute("PRAGMA table_info(tareas_semana)")
for col in cursor.fetchall():
    print(dict(col))

# 5. Estructura de historial
print('\n=== ESTRUCTURA historial ===')
cursor.execute("PRAGMA table_info(historial)")
for col in cursor.fetchall():
    print(dict(col))

conn.close()
