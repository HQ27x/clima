
<?php
header('Content-Type: application/json');

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

$respuestaDeGoogle = curl_exec($ch);
curl_close($ch);

$datosRespuesta = json_decode($respuestaDeGoogle, true);
// Usamos trim() para quitar posibles espacios en blanco al inicio o final
$textoFinal = trim($datosRespuesta['candidates'][0]['content']['parts'][0]['text'] ?? 'Lo siento, no pude procesar la recomendación.');

echo json_encode(['recomendacion' => $textoFinal]);

?>