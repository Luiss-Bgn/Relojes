"""
Script para migrar imágenes de usuarios del formato antiguo al nuevo
Antiguo: <username>.<extension>
Nuevo: <id_user>.<extension>
"""
import sqlite3
from pathlib import Path
import shutil
import os

# Configurar rutas
BASE_DIR = Path(__file__).resolve().parent
IMAGES_DIR = BASE_DIR / "web" / "Images"
DB_PATH = BASE_DIR / "relojes.db"

def migrar_imagenes():
    """Migra las imágenes del formato username al formato ID"""
    
    print("=" * 60)
    print("MIGRACIÓN DE IMÁGENES DE USUARIOS")
    print("=" * 60)
    print(f"Base de datos: {DB_PATH}")
    print(f"Directorio de imágenes: {IMAGES_DIR}")
    print("=" * 60)
    
    if not DB_PATH.exists():
        print("❌ Error: No se encontró la base de datos")
        return
    
    if not IMAGES_DIR.exists():
        print("❌ Error: No se encontró el directorio de imágenes")
        return
    
    # Conectar a la base de datos
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Obtener todos los usuarios
    cursor.execute("SELECT id, username, imagen FROM usuarios")
    usuarios = cursor.fetchall()
    
    print(f"\n📋 Usuarios encontrados: {len(usuarios)}\n")
    
    migrados = 0
    actualizados = 0
    no_encontrados = 0
    errores = 0
    
    for usuario in usuarios:
        user_id = usuario['id']
        username = usuario['username']
        imagen_actual = usuario['imagen']
        
        print(f"Usuario ID {user_id} ({username}):")
        
        if not imagen_actual:
            print(f"  ℹ️  Sin imagen asignada")
            continue
        
        # Si la imagen ya está en formato de ID, saltar
        nombre_sin_ext = Path(imagen_actual).stem
        if nombre_sin_ext.isdigit() and int(nombre_sin_ext) == user_id:
            print(f"  ✅ Ya migrado: {imagen_actual}")
            continue
        
        # Buscar imagen con el username
        extension = Path(imagen_actual).suffix
        imagen_antigua = IMAGES_DIR / imagen_actual
        imagen_nueva = IMAGES_DIR / f"{user_id}{extension}"
        
        if imagen_antigua.exists():
            try:
                # Renombrar archivo
                shutil.move(str(imagen_antigua), str(imagen_nueva))
                
                # Actualizar base de datos
                nuevo_nombre = f"{user_id}{extension}"
                cursor.execute(
                    "UPDATE usuarios SET imagen = ? WHERE id = ?",
                    (nuevo_nombre, user_id)
                )
                
                print(f"  ✅ Migrado: {imagen_actual} → {nuevo_nombre}")
                migrados += 1
                actualizados += 1
                
            except Exception as e:
                print(f"  ❌ Error al migrar: {e}")
                errores += 1
        else:
            # Intentar encontrar por extensión común
            encontrado = False
            for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                imagen_buscar = IMAGES_DIR / f"{username}{ext}"
                if imagen_buscar.exists():
                    try:
                        imagen_nueva = IMAGES_DIR / f"{user_id}{ext}"
                        shutil.move(str(imagen_buscar), str(imagen_nueva))
                        
                        nuevo_nombre = f"{user_id}{ext}"
                        cursor.execute(
                            "UPDATE usuarios SET imagen = ? WHERE id = ?",
                            (nuevo_nombre, user_id)
                        )
                        
                        print(f"  ✅ Migrado: {username}{ext} → {nuevo_nombre}")
                        migrados += 1
                        actualizados += 1
                        encontrado = True
                        break
                    except Exception as e:
                        print(f"  ❌ Error al migrar: {e}")
                        errores += 1
                        break
            
            if not encontrado:
                print(f"  ⚠️  Imagen no encontrada: {imagen_actual}")
                no_encontrados += 1
    
    # Commit cambios
    conn.commit()
    conn.close()
    
    # Resumen
    print("\n" + "=" * 60)
    print("RESUMEN DE LA MIGRACIÓN")
    print("=" * 60)
    print(f"  📋 Usuarios procesados:     {len(usuarios)}")
    print(f"  ✅ Imágenes migradas:       {migrados}")
    print(f"  🔄 BD actualizadas:         {actualizados}")
    print(f"  ⚠️  Imágenes no encontradas: {no_encontrados}")
    print(f"  ❌ Errores:                 {errores}")
    print("=" * 60)
    print("\n✅ Migración completada\n")

if __name__ == "__main__":
    respuesta = input("¿Deseas migrar las imágenes de usuarios? (s/n): ")
    if respuesta.lower() in ['s', 'si', 'yes', 'y']:
        migrar_imagenes()
    else:
        print("Migración cancelada")
