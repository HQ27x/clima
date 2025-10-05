
<?php
// Allow requests from any origin for local testing (adjust in production)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Simple GET handler so you can ping the endpoint from the browser for debugging
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'ok',
        'message' => 'gemini-api.php reachable. Send a POST with { prompt } as JSON to get a recommendation.',
        'method' => 'GET'
    ]);
    exit;
}

// If the method isn't POST at this point, return 405
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST, OPTIONS');
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed', 'allowed' => ['GET','POST','OPTIONS'], 'received' => $_SERVER['REQUEST_METHOD']]);
    exit;
}

$apiKey = "AIzaSyA_ELvchvKFW9ZaqkHYZV8KVTXygshpV8M";

// Recibimos solo los datos del clima desde JavaScript
$datosRecibidos = json_decode(file_get_contents('php://input'), true);
$datosClima = $datosRecibidos['prompt'] ?? 'No hay datos de clima.';

// --- INICIO DEL PROMPT MEJORADO ---

// Usamos la sintaxis HEREDOC (<<<PROMPT) para escribir un texto largo y limpio.
$promptFinal = <<<PROMPT
**INSTRUCCIONES DE SISTEMA:**
Actúa como "Alertify", un asistente de clima para Lima, Perú. Eres amigable, moderno y muy directo. Tu objetivo es dar recomendaciones de ropa y precauciones súper concisas basadas en datos.

**REGLAS ESTRICTAS:**
1.  **NUNCA uses la frase "vístete en capas".** En su lugar, sugiere prendas específicas (ej: "un polo y una casaca ligera").
2.  Tu respuesta debe ser una o dos frases cortas. Máximo 30 palabras en total.
3.  Usa un tono casual y local (peruano si es posible).
4.  Menciona el protector solar solo si las temperaturas son altas o la condición es "cielo claro". tambien 
5.  Considera la consulta personalizada del usuario sobre si estará “muy caliente,” “muy frío,” “muy ventoso,” “muy mojado,” o con condiciones “muy incómodas” para la ubicación y hora indicada, y adapta tu recomendación de ropa y consejos según esa información.
6.  Tu respuesta final SIEMPRE debe terminar con la frase exacta: "Alertify IA, tu aliada para un día sin sorpresas climatológicas." sin añadir nada más después.

**EJEMPLO DE RESPUESTA IDEAL (para un día caluroso):**
Mañana habrá sol intenso. Se recomienda usar una camiseta de algodón, pantalones cortos y lentes de sol. No olvide aplicar protector solar. Alertify IA, su aliada para un día sin sorpresas climatológicas.

**TAREA:**
Analiza los siguientes datos del clima y genera una recomendación siguiendo todas mis reglas.

**DATOS DEL CLIMA:**
$datosClima
PROMPT;

// --- FIN DEL PROMPT MEJORADO ---

$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . $apiKey;
$datosParaEnviar = [
    'contents' => [['parts' => [['text' => $promptFinal]]]]
];
$jsonDatos = json_encode($datosParaEnviar);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonDatos);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

// Timeouts and UA
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);
curl_setopt($ch, CURLOPT_USERAGENT, 'Alertify-Gemini-Client/1.0');

$respuestaDeGoogle = curl_exec($ch);
$curlErr = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($respuestaDeGoogle === false) {
    http_response_code(500);
    echo json_encode(['error' => 'curl_error', 'message' => $curlErr]);
    exit;
}

$datosRespuesta = json_decode($respuestaDeGoogle, true);

// Basic validation of the expected path in the API response
if (isset($datosRespuesta['candidates'][0]['content']['parts'][0]['text'])) {
    $textoFinal = trim($datosRespuesta['candidates'][0]['content']['parts'][0]['text']);
    echo json_encode(['recomendacion' => $textoFinal]);
} else {
    // Return raw response for easier debugging
    http_response_code($httpCode ?: 502);
    echo json_encode([
        'error' => 'unexpected_response',
        'httpCode' => $httpCode,
        'raw' => $datosRespuesta
    ]);
}

?>