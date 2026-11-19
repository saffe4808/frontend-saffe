
const video = document.getElementById("camara");
const boton = document.getElementById("botonscan");
const canvas = document.getElementById("foto");
const ctx = canvas.getContext("2d");
const mensaje = document.getElementById("mensaje");

const API_URL = "https://backend-saffe.onrender.com";

let human = null;
let procesando = false;

boton.disabled = true;

async function iniciarCamara() {
    try {
        mensaje.textContent = "Cargando reconocimiento facial...";

        human = new Human.Human({
            backend: "webgl",
            warmup: "none",
            debug: false,
            modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human/models/",
            face: {
                enabled: true,
                detector: {
                    rotation: false,
                    maxDetected: 1
                },
                mesh: { enabled: false },
                iris: { enabled: false },
                emotion: { enabled: false },
                description: { enabled: true }
            },
            body: { enabled: false },
            hand: { enabled: false },
            gesture: { enabled: false },
            object: { enabled: false },
            segmentation: { enabled: false }
        });

        await human.load();

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        video.srcObject = stream;
        await video.play();

        mensaje.textContent = "SISTEMA LISTO. Ubique su rostro frente a la cámara.";
        boton.disabled = false;

    } catch (error) {
        console.error(error);
        mensaje.textContent = "Error al iniciar el sistema: " + error.message;
    }
}

boton.addEventListener("click", async () => {
    if (procesando || !human || !video.videoWidth) return;

    procesando = true;
    boton.disabled = true;
    mensaje.textContent = "Analizando rostro...";

    try {
        const escala = Math.min(1, 640 / video.videoWidth);

        canvas.width = Math.round(video.videoWidth * escala);
        canvas.height = Math.round(video.videoHeight * escala);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const resultado = await human.detect(canvas);
        const rostro = resultado.face?.[0];

        if (!rostro || !rostro.embedding?.length) {
            mensaje.textContent = "No se detectó el rostro. Intente nuevamente.";
            return;
        }

        mensaje.textContent = "Rostro detectado. Verificando identidad...";

        const respuesta = await fetch(`${API_URL}/api/escaneo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                descriptor: Array.from(rostro.embedding)
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.acceso) {
            mensaje.textContent = "ACCESO DENEGADO: " + datos.mensaje;
            return;
        }

        localStorage.setItem("token", datos.token);

        mensaje.textContent =
            "ACCESO CONCEDIDO. Bienvenido " + datos.usuario.nombre;

        setTimeout(() => {
            window.location.href = "/acceso_autorizado";
        }, 1500);

    } catch (error) {
        console.error("Error facial:", error);
        mensaje.textContent = "Error al analizar el rostro. Intente nuevamente.";
    } finally {
        procesando = false;
        boton.disabled = false;
    }
});

iniciarCamara();

