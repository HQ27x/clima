# test_api.py

import requests
import json

# --- CONFIGURACIÓN ---

# 1. La URL de tu API con el endpoint "/predict/full"
api_url = "https://api-fusion-34si.onrender.com/predict/full"

# 2. Las coordenadas para la predicción (Lima, Perú)
latitud = -12.0464
longitud = -77.0428

# Construir la URL completa con los parámetros
url_con_parametros = f"{api_url}?lat={latitud}&lng={longitud}"

print(f"🚀 Realizando una petición a tu API Híbrida en:")
print(url_con_parametros)
print("\n(Esto puede tardar unos segundos mientras la API contacta a la NASA...)")

# --- EJECUCIÓN DEL TEST ---
try:
    # 3. Realizar la petición GET a la API (con un timeout generoso)
    response = requests.get(url_con_parametros, timeout=30)

    # 4. Comprobar y mostrar el resultado
    if response.status_code == 200:
        resultado = response.json()
        
        print("\n✅ ¡Respuesta completa recibida exitosamente!")
        
        # --- Mostrar el Pronóstico a Corto Plazo (de OpenWeatherMap) ---
        print("\n" + "="*50)
        print("🌦️  Pronóstico Diario para los Próximos 5 Días")
        print("="*50)
        
        forecast_diario = resultado.get("short_term_forecast_5_days")
        if forecast_diario:
            for dia in forecast_diario:
                print(f"\n  🗓️  {dia['day_name']}, {dia['date']}:")
                print(f"      - Condición: {dia['condition']}")
                print(f"      - Temp. Mín/Máx: {dia['temp_min_celsius']}°C / {dia['temp_max_celsius']}°C")
                # --- ¡AQUÍ ESTÁ LA MODIFICACIÓN! ---
                print(f"      - Humedad: {dia.get('humidity', 'N/A')}%")
                print(f"      - Viento: {dia.get('wind_speed_ms', 'N/A')} m/s")
        else:
            print("   (No se pudo obtener el pronóstico diario).")

        # --- Mostrar la Predicción a Largo Plazo (de tus Modelos de IA) ---
        print("\n" + "="*50)
        print("🧠 Predicción de IA para el Promedio del Próximo Mes")
        print("="*50)
        
        prediccion_ia = resultado.get("long_term_ml_prediction_next_month_avg")
        if prediccion_ia and "error" not in prediccion_ia:
            print(f"   🌡️ Temperatura Promedio: {prediccion_ia.get('temperature_celsius', 'N/A')} °C")
            print(f"   💧 Humedad Promedio:     {prediccion_ia.get('humidity_percent', 'N/A')} %")
            print(f"   💨 Viento Promedio:      {prediccion_ia.get('wind_speed_ms', 'N/A')} m/s")
            print(f"   🎈 Presión Promedio:     {prediccion_ia.get('pressure_kpa', 'N/A')} kPa")
        else:
            print("   (No se pudo obtener la predicción de IA).")

    else:
        # Si hay un error, mostrar los detalles
        print("\n❌ La API devolvió un error.")
        print(f"   Código de estado: {response.status_code}")
        print(f"   Respuesta del servidor: {response.text}")

except requests.exceptions.RequestException as e:
    # Capturar errores de conexión
    print(f"\n❌ Error de conexión. No se pudo contactar a la API.")
    print(f"   Detalle: {e}")