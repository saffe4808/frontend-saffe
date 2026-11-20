// Configuración del Endpoint
const API_URL = (window.SAFFE_API_URL || "https://saffe-backend.up.railway.app").replace(/\/+$/, "");

const video = document.getElementById("camara");
const canvasOverlay = document.getElementById("canvas-escaneo");
const botonScan = document.getElementById("botonscan");
const campoMensaje = document.getElementById("mensaje");
const instruccion = document.getElementById("instruccion-escaneo");

let streamCamara = null;
let modelosCargados = false;
let intervaloDeteccion = null;
let escaneoEnProgreso = false;

/**
 * Cargar los modelos de Face-API desde jsDelivr.
 */
async function cargarModelos() {
    try {
        campoMensaje.innerHTML = `<span style="color:#0b4d1e;">⏳ Cargando modelos biométricos...</span>`;

        const MODELS_URI = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URI),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URI),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URI)
        ]);

        modelosCargados = true;
        campoMensaje.innerHTML = `<span style="color:#0b4d1e;">✅ Motor biométrico listo. Mire al frente.</span>`;
        botonScan.disabled = false;
        botonScan.textContent = "AUTENTICAR ROSTRO";
    } catch (error) {
        console.error("Error cargando modelos face-api:", error);
        campoMensaje.innerHTML = `<span style="color:#b71c1c;">❌ Error al cargar los modelos biométricos: ${error.message}</span>`;
    }
}

/**
 * Iniciar la cámara web
 */
async function iniciarCamara() {
    try {
        streamCamara = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });

        video.srcObject = streamCamara;

        video.addEventListener("play", () => {
            iniciarTrackingVisual();
        });
    } catch (error) {
        console.error("Error al acceder a la cámara:", error);
        campoMensaje.innerHTML = `<span style="color:#b71c1c;">❌ No se pudo acceder a la cámara: ${error.message}. Verifica los permisos.</span>`;
    }
}

/**
 * Dibujar el indicador visual en tiempo real alrededor del rostro
 */
function iniciarTrackingVisual() {
    if (intervaloDeteccion) clearInterval(intervaloDeteccion);

    intervaloDeteccion = setInterval(async () => {
        if (!modelosCargados || !video || video.paused || video.ended || escaneoEnProgreso) return;

        const displaySize = {
            width: video.videoWidth || video.clientWidth,
            height: video.videoHeight || video.clientHeight
        };

        if (displaySize.width === 0 || displaySize.height === 0) return;

        faceapi.matchDimensions(canvasOverlay, displaySize);

        try {
            const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
            const deteccion = await faceapi.detectSingleFace(video, opciones);

            const ctx = canvasOverlay.getContext("2d");
            ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);

            if (deteccion) {
                const resizedDeteccion = faceapi.resizeResults(deteccion, displaySize);
                const box = resizedDeteccion.box;

                // Dibujar marco verde militar tecnológico
                ctx.strokeStyle = "#138a3a";
                ctx.lineWidth = 3;
                ctx.strokeRect(box.x, box.y, box.width, box.height);

                ctx.fillStyle = "rgba(19, 138, 58, 0.2)";
                ctx.fillRect(box.x, box.y, box.width, box.height);

                ctx.font = "bold 13px Arial";
                ctx.fillStyle = "#ffffff";
                ctx.fillText("ROSTRO DETECTADO", box.x + 5, box.y > 20 ? box.y - 8 : box.y + 15);
            }
        } catch {
            // Ignorar frames intermedios
        }
    }, 150);
}

/**
 * Detener la cámara y liberar recursos
 */
function detenerCamara() {
    if (intervaloDeteccion) clearInterval(intervaloDeteccion);
    if (streamCamara) {
        streamCamara.getTracks().forEach(track => track.stop());
    }
}

/**
 * Evento de Escaneo y Autenticación Facial
 */
botonScan.addEventListener("click", async () => {
    if (!modelosCargados || escaneoEnProgreso) return;

    escaneoEnProgreso = true;
    botonScan.disabled = true;
    botonScan.textContent = "PROCESANDO ROSTRO...";
    campoMensaje.innerHTML = `<span style="color:#0b4d1e;">🔍 Extrayendo vector facial en el navegador...</span>`;

    try {
        const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

        // Detectar rostro, puntos de referencia y calcular el descriptor de 128 valores
        const resultadoDeteccion = await faceapi
            .detectSingleFace(video, opciones)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!resultadoDeteccion) {
            campoMensaje.innerHTML = `
                <div style="color: #b71c1c; font-weight: bold; margin-top: 10px; border: 2px solid #b71c1c; padding: 10px; background-color: #ffebee; border-radius: 6px;">
                    ⚠️ No se detectó ningún rostro con claridad.<br>
                    <span style="font-weight: normal; font-size: 13px;">Asegúrese de mirar al frente con buena iluminación y sin accesorios que cubran su cara.</span>
                </div>
            `;
            botonScan.disabled = false;
            botonScan.textContent = "REINTENTAR AUTENTICACIÓN";
            escaneoEnProgreso = false;
            return;
        }

        // Convertir Float32Array a Array estándar de 128 posiciones
        const faceDescriptor = Array.from(resultadoDeteccion.descriptor);

        campoMensaje.innerHTML = `<span style="color:#0b4d1e;">⚡ Comparando vector biométrico con la base de datos...</span>`;

        // Enviar el vector al backend para verificación 1:N o 1:1
        const respuesta = await fetch(`${API_URL}/api/login-facial`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ faceDescriptor })
        });

        const data = await respuesta.json();

        if (respuesta.ok && data.token) {
            // Guardar el token de autenticación exactamente igual que en el login tradicional
            localStorage.setItem("token", data.token);

            const nombreUsuario = data.usuario ? `${data.usuario.nombre} ${data.usuario.apellido || ""}` : "Personal Autorizado";
            const distancia = data.distancia !== undefined ? `(Distancia euclidiana: ${data.distancia})` : "";

            campoMensaje.innerHTML = `
                <div style="color: #0b4d1e; font-weight: bold; margin-top: 15px; border: 2px solid #0b4d1e; padding: 12px; background-color: #e8f5e9; border-radius: 8px;">
                    🟢 ACCESO CONCEDIDO<br>
                    <span style="font-size: 16px; color: #1b5e20;">Bienvenido, ${nombreUsuario}</span><br>
                    <span style="font-size: 12px; font-weight: normal; color: #555;">Autenticación biométrica exitosa ${distancia}</span>
                </div>
            `;

            detenerCamara();

            // Redirigir a acceso autorizado tras 1.5 segundos
            setTimeout(() => {
                window.location.href = "/acceso_autorizado";
            }, 1500);

        } else {
            campoMensaje.innerHTML = `
                <div style="color: #b71c1c; font-weight: bold; margin-top: 15px; border: 2px solid #b71c1c; padding: 12px; background-color: #ffebee; border-radius: 8px;">
                    🔴 ACCESO DENEGADO<br>
                    <span style="font-size: 14px; font-weight: normal; color: #7f0000;">
                        ${data.mensaje || "Rostro no coincide con ningún registro activo en el sistema."}
                    </span>
                </div>
            `;

            botonScan.disabled = false;
            botonScan.textContent = "INTENTAR DE NUEVO";
            escaneoEnProgreso = false;
        }

    } catch (error) {
        console.error("Error durante el escaneo facial:", error);
        campoMensaje.innerHTML = `
            <div style="color: red; font-weight: bold; margin-top: 10px;">
                ❌ Error de comunicación: ${error.message}
            </div>
        `;
        botonScan.disabled = false;
        botonScan.textContent = "REINTENTAR";
        escaneoEnProgreso = false;
    }
});

// Inicializar la carga de modelos y la cámara al cargar la página
window.addEventListener("DOMContentLoaded", async () => {
    await cargarModelos();
    await iniciarCamara();
});

// Detener la cámara al salir de la página
window.addEventListener("beforeunload", () => {
    detenerCamara();
});
