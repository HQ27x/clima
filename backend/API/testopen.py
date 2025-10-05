# test_key.py

import requests
from datetime import datetime

# --- CONFIGURACIÓN ---

# Pega aquí la clave de API que quieres probar.
# Estoy usando la que compartiste, asegúrate de que sea la correcta.
API_KEY = "b9887004fb83b6baf80ea22a539cc923" 

# Coordenadas de Lima, Perú
LATITUD = -12.0464
LONGITUD = -77.0428

# URL para el pronóstico de la API "One Call 3.0"
api_url = f"https://api.openweathermap.org/data/3.0/onecall?lat={LATITUD}&lon={LONGITUD}&appid={API_KEY}&units=metric"

print("🌦️  Realizando una llamada de prueba DIRECTA a OpenWeatherMap...")
print(f"URL: {api_url}")

# --- EJECUCIÓN DEL TEST ---
try:
    response = requests.get(api_url)
    data = response.json()

    if response.status_code == 200:
        print("\n✅ ¡ÉXITO! Tu API Key está activa y funciona correctamente.")
        
        primer_dia = data['daily'][0]
        fecha = datetime.fromtimestamp(primer_dia['dt'])
        
        print("\n--- Ejemplo de Datos Recibidos ---")
        print(f"Pronóstico para: {fecha.strftime('%A')}")
        print(f"   - Condición: {primer_dia['weather'][0]['description'].capitalize()}")

    else:
        print("\n❌ ¡FALLO! Tu API Key no es válida o hay un problema.")
        print(f"   Código de estado: {response.status_code}")
        if 'message' in data:
            print(f"   Mensaje de la API: {data['message']}")

except requests.exceptions.RequestException as e:
    print(f"\n❌ Error de conexión. No se pudo contactar a OpenWeatherMap.")