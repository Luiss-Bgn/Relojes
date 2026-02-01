"""
Script para testear los endpoints de la API de tareas
Prueba CRUD completo en la tabla tareas_semana
"""

import requests
import json
from datetime import datetime

# Configuración
BASE_URL = "http://localhost:8001"
ENDPOINT_TAREAS = f"{BASE_URL}/tareas"

# Colores para la consola
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}")
    print(text)
    print(f"{'='*60}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKBLUE}ℹ {text}{Colors.ENDC}")

def test_health_check():
    """Verifica que la API esté funcionando"""
    print_header("TEST 1: HEALTH CHECK")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print_success("API está funcionando")
            print(json.dumps(response.json(), indent=2))
            return True
        else:
            print_error(f"Health check falló con status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"No se pudo conectar: {e}")
        return False

def test_crear_tarea():
    """Crea una nueva tarea"""
    print_header("TEST 2: CREAR TAREA")
    
    tarea = {
        "nombre": "Limpieza semanal",
        "descripcion": "Limpiar oficina",
        "id_dueño": 1,
        "hora_ini": "08:00",
        "hora_fin": "12:00",
        "fecha": "Lunes",
        "puntos": 10,
        "estatus": "pendiente"
    }
    
    print_info(f"Enviando POST /tareas")
    print(json.dumps(tarea, indent=2))
    
    try:
        response = requests.post(ENDPOINT_TAREAS, json=tarea)
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print_success("Tarea creada exitosamente")
            print(json.dumps(data, indent=2))
            
            # Guardar el ID para pruebas posteriores
            if "registro" in data and "id" in data["registro"]:
                return data["registro"]["id"]
            return None
        else:
            print_error(f"Error al crear: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print_error(f"Excepción: {e}")
        return None

def test_listar_tareas():
    """Lista todas las tareas"""
    print_header("TEST 3: LISTAR TODAS LAS TAREAS")
    print_info("Enviando GET /tareas")
    
    try:
        response = requests.get(ENDPOINT_TAREAS)
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success("Tareas listadas exitosamente")
            print(json.dumps(data, indent=2))
            return True
        else:
            print_error(f"Error al listar: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Excepción: {e}")
        return False

def test_obtener_tarea(tarea_id):
    """Obtiene una tarea específica"""
    print_header("TEST 4: OBTENER TAREA POR ID")
    print_info(f"Enviando GET /tareas/{tarea_id}")
    
    try:
        response = requests.get(f"{ENDPOINT_TAREAS}/{tarea_id}")
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Tarea {tarea_id} obtenida")
            print(json.dumps(data, indent=2))
            return True
        else:
            print_error(f"Error al obtener: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Excepción: {e}")
        return False

def test_obtener_por_usuario(usuario_id):
    """Obtiene tareas de un usuario"""
    print_header("TEST 5: OBTENER TAREAS POR USUARIO")
    print_info(f"Enviando GET /tareas/usuario/{usuario_id}")
    
    try:
        response = requests.get(f"{ENDPOINT_TAREAS}/usuario/{usuario_id}")
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Tareas del usuario {usuario_id} obtenidas")
            print(json.dumps(data, indent=2))
            return True
        else:
            print_error(f"Error: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Excepción: {e}")
        return False

def test_obtener_por_dia(dia):
    """Obtiene tareas por día de la semana"""
    print_header("TEST 6: OBTENER TAREAS POR DÍA")
    print_info(f"Enviando GET /tareas/fecha/{dia}")
    
    try:
        response = requests.get(f"{ENDPOINT_TAREAS}/fecha/{dia}")
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Tareas del {dia} obtenidas")
            print(json.dumps(data, indent=2))
            return True
        else:
            print_error(f"Error: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Excepción: {e}")
        return False

def test_actualizar_tarea(tarea_id):
    """Actualiza una tarea"""
    print_header("TEST 7: ACTUALIZAR TAREA")
    
    datos = {
        "estatus": "completada",
        "completadaPor": 1
    }
    
    print_info(f"Enviando PUT /tareas/{tarea_id}")
    print(json.dumps(datos, indent=2))
    
    try:
        response = requests.put(f"{ENDPOINT_TAREAS}/{tarea_id}", json=datos)
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Tarea {tarea_id} actualizada")
            print(json.dumps(data, indent=2))
            return True
        else:
            print_error(f"Error al actualizar: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print_error(f"Excepción: {e}")
        return False

def test_eliminar_tarea(tarea_id):
    """Elimina una tarea"""
    print_header("TEST 8: ELIMINAR TAREA")
    print_info(f"Enviando DELETE /tareas/{tarea_id}")
    
    try:
        response = requests.delete(f"{ENDPOINT_TAREAS}/{tarea_id}")
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Tarea {tarea_id} eliminada")
            print(json.dumps(data, indent=2))
            return True
        else:
            print_error(f"Error al eliminar: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Excepción: {e}")
        return False

def main():
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("╔" + "═"*58 + "╗")
    print("║" + " "*15 + "TEST DE API TAREAS - INTEGRACIÓN" + " "*11 + "║")
    print("╚" + "═"*58 + "╝")
    print(f"{Colors.ENDC}")
    
    # Test 1: Health Check
    if not test_health_check():
        print_error("La API no está disponible. Asegúrate de que el servidor esté corriendo en puerto 8001")
        return
    
    # Test 2: Crear tarea
    tarea_id = test_crear_tarea()
    
    # Test 3: Listar todas
    test_listar_tareas()
    
    # Test 4: Obtener por ID (si se creó)
    if tarea_id:
        test_obtener_tarea(tarea_id)
    
    # Test 5: Obtener por usuario
    test_obtener_por_usuario(1)
    
    # Test 6: Obtener por día
    test_obtener_por_dia("Lunes")
    
    # Test 7: Actualizar (si se creó)
    if tarea_id:
        test_actualizar_tarea(tarea_id)
    
    # Test 8: Eliminar (si se creó)
    if tarea_id:
        test_eliminar_tarea(tarea_id)
    
    # Resumen
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("╔" + "═"*58 + "╗")
    print("║" + " "*20 + "TESTS COMPLETADOS" + " "*21 + "║")
    print("╚" + "═"*58 + "╝")
    print(f"{Colors.ENDC}\n")
    
    print_info("Verifica los resultados arriba")
    print_info("Para más detalles, accede a: http://localhost:8001/docs")

if __name__ == "__main__":
    main()
