"""
Script de prueba para verificar el endpoint de quincenas disponibles
"""
import requests

def test_quincenas_disponibles():
    """Prueba el endpoint /historial/quincenas-disponibles"""
    url = "http://localhost:8001/historial/quincenas-disponibles"
    
    try:
        print(f"🔄 Probando endpoint: {url}")
        response = requests.get(url)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ Respuesta exitosa:")
            print(f"Status: {data.get('status')}")
            print(f"Total de quincenas: {data.get('total')}")
            print("\nQuincenas disponibles:")
            for q in data.get('quincenas', []):
                print(f"  - {q['label']} (año={q['año']}, mes={q['mes']}, quincena={q['quincena']})")
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(response.text)
    
    except requests.exceptions.ConnectionError:
        print("❌ Error: No se pudo conectar al servidor. Asegúrate de que el servidor esté ejecutándose.")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == "__main__":
    test_quincenas_disponibles()
