document.addEventListener("DOMContentLoaded", () => {
    const apiUrl = (window.SAFFE_API_URL || "https://backend-saffe.onrender.com").replace(/\/+$/, "");
    const form = document.getElementById("form-registro");
    const checkPrivacidad = document.getElementById("check-privacidad");
    const btnRegistrar = document.getElementById("btn-registrar");
    const btnActivarCamara = document.getElementById("btn-activar-camara");
    const btnCerrarCamara = document.getElementById("btn-cerrar-camara");
    const btnCapturarRostro = document.getElementById("btn-capturar-rostro");
    const contenedorCamara = document.getElementById("contenedor-camara");
    const video = document.getElementById("video-registro");
    const canvasOverlay = document.getElementById("canvas-overlay");
    const fotoInput = document.getElementById("foto");
    const previewImg = document.getElementById("preview");
    const textoEstado = document.getElementById("texto-estado-biometrico");
    const estadoBiometrico = document.getElementById("estado-biometrico");

    let streamCamara = null;
    let modelosCargados = false;
    let vectorFacialCapturado = null;
    let intervaloDeteccion = null;

    // Cargar modelos de face-api en segundo plano
    async function cargarModelos() {
        try {
            const MODELS_URI = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URI),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URI),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URI)
            ]);
            modelosCargados = true;
            if (checkPrivacidad && checkPrivacidad.checked) {
                actualizarEstadoBiometrico("info", "Motor biométrico listo. Usa la cámara o sube una foto.");
            }
        } catch (error) {
            console.error("Error al cargar modelos:", error);
            actualizarEstadoBiometrico("error", "Error al cargar modelos biométricos: " + error.message);
        }
    }

    function actualizarEstadoBiometrico(tipo, mensaje) {
        if (!textoEstado || !estadoBiometrico) return;
        textoEstado.textContent = mensaje;

        if (tipo === "exito") {
            estadoBiometrico.style.background = "#e8f5e9";
            estadoBiometrico.style.color = "#0b4d1e";
            estadoBiometrico.style.border = "1px solid #a5d6a7";
        } else if (tipo === "error") {
            estadoBiometrico.style.background = "#ffebee";
            estadoBiometrico.style.color = "#b71c1c";
            estadoBiometrico.style.border = "1px solid #ffcdd2";
        } else {
            estadoBiometrico.style.background = "#f0f4f1";
            estadoBiometrico.style.color = "#2e4732";
            estadoBiometrico.style.border = "1px solid #d4e8d8";
        }
    }

    // Control de consentimiento de Políticas de Privacidad
    if (checkPrivacidad) {
        const toggleConsentimiento = () => {
            const aceptado = checkPrivacidad.checked;
            btnActivarCamara.disabled = !aceptado;
            fotoInput.disabled = !aceptado;

            if (aceptado) {
                if (vectorFacialCapturado) {
                    btnRegistrar.disabled = false;
                    actualizarEstadoBiometrico("exito", "Vector facial de 128 números capturado con éxito.");
                } else {
                    btnRegistrar.disabled = true;
                    actualizarEstadoBiometrico("info", "Por favor, captura tu rostro con la cámara o sube una foto.");
                }
            } else {
                btnRegistrar.disabled = true;
                actualizarEstadoBiometrico("info", "Acepta la Política de Privacidad para habilitar la captura biométrica.");
                detenerCamara();
            }
        };

        checkPrivacidad.addEventListener("change", toggleConsentimiento);
        toggleConsentimiento();
    }

    // Detección facial visual en vivo en el video de registro
    function iniciarTrackingVisual() {
        if (intervaloDeteccion) clearInterval(intervaloDeteccion);

        intervaloDeteccion = setInterval(async () => {
            if (!modelosCargados || !video || video.paused || video.ended) return;

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
                    const resized = faceapi.resizeResults(deteccion, displaySize);
                    const box = resized.box;

                    ctx.strokeStyle = "#138a3a";
                    ctx.lineWidth = 3;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);

                    ctx.fillStyle = "rgba(19, 138, 58, 0.2)";
                    ctx.fillRect(box.x, box.y, box.width, box.height);

                    ctx.font = "bold 12px Arial";
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText("ROSTRO LISTO", box.x + 5, box.y > 20 ? box.y - 6 : box.y + 15);
                }
            } catch {
                // Ignorar
            }
        }, 150);
    }

    // Activar Cámara Web
    async function activarCamara() {
        if (!checkPrivacidad.checked) {
            alert("Debe aceptar la Política de Privacidad primero.");
            return;
        }

        try {
            actualizarEstadoBiometrico("info", "Encendiendo cámara web...");
            streamCamara = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });

            video.srcObject = streamCamara;
            contenedorCamara.style.display = "block";
            btnActivarCamara.style.display = "none";

            video.addEventListener("play", () => {
                iniciarTrackingVisual();
            });

            actualizarEstadoBiometrico("info", "Mire al frente y presione 'Capturar Vector Facial'.");
        } catch (error) {
            console.error("Error al abrir cámara:", error);
            actualizarEstadoBiometrico("error", "No se pudo acceder a la cámara: " + error.message);
        }
    }

    function detenerCamara() {
        if (intervaloDeteccion) clearInterval(intervaloDeteccion);
        if (streamCamara) {
            streamCamara.getTracks().forEach(t => t.stop());
            streamCamara = null;
        }
        contenedorCamara.style.display = "none";
        btnActivarCamara.style.display = "inline-block";
    }

    btnActivarCamara.addEventListener("click", activarCamara);
    btnCerrarCamara.addEventListener("click", detenerCamara);

    // Capturar descriptor facial desde la cámara web
    btnCapturarRostro.addEventListener("click", async () => {
        if (!modelosCargados) {
            alert("Los modelos de reconocimiento aún están cargando. Espera un momento.");
            return;
        }

        btnCapturarRostro.disabled = true;
        btnCapturarRostro.textContent = "Extrayendo descriptor...";

        try {
            const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
            const resultado = await faceapi
                .detectSingleFace(video, opciones)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!resultado) {
                actualizarEstadoBiometrico("error", "No se detectó un rostro nítido. Ajuste la luz o posición y reintente.");
                btnCapturarRostro.disabled = false;
                btnCapturarRostro.textContent = "Capturar Vector Facial";
                return;
            }

            // Vector de 128 posiciones convertido a Array estándar
            vectorFacialCapturado = Array.from(resultado.descriptor);

            // Generar vista previa del fotograma
            const canvasSnap = document.createElement("canvas");
            canvasSnap.width = video.videoWidth || 320;
            canvasSnap.height = video.videoHeight || 240;
            canvasSnap.getContext("2d").drawImage(video, 0, 0, canvasSnap.width, canvasSnap.height);
            previewImg.src = canvasSnap.toDataURL("image/jpeg", 0.9);
            previewImg.style.display = "block";

            detenerCamara();

            actualizarEstadoBiometrico("exito", "✅ Vector facial de 128 números generado con éxito.");
            if (checkPrivacidad.checked) {
                btnRegistrar.disabled = false;
            }
        } catch (error) {
            console.error("Error al capturar rostro:", error);
            actualizarEstadoBiometrico("error", "Error procesando el rostro: " + error.message);
        } finally {
            btnCapturarRostro.disabled = false;
            btnCapturarRostro.textContent = "Capturar Vector Facial";
        }
    });

    // Procesar fotografía cargada desde archivo
    fotoInput.addEventListener("change", async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        if (!checkPrivacidad.checked) {
            alert("Debe aceptar la Política de Privacidad primero.");
            fotoInput.value = "";
            return;
        }

        actualizarEstadoBiometrico("info", "Analizando rostro de la fotografía...");
        const lector = new FileReader();

        lector.onload = async (evento) => {
            const img = new Image();
            img.onload = async () => {
                previewImg.src = img.src;
                previewImg.style.display = "block";

                try {
                    const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
                    const resultado = await faceapi
                        .detectSingleFace(img, opciones)
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (!resultado) {
                        vectorFacialCapturado = null;
                        btnRegistrar.disabled = true;
                        actualizarEstadoBiometrico("error", "No se detectó ningún rostro en la fotografía. Intente con otra.");
                        return;
                    }

                    vectorFacialCapturado = Array.from(resultado.descriptor);
                    actualizarEstadoBiometrico("exito", "✅ Vector facial de 128 números extraído de la foto con éxito.");
                    if (checkPrivacidad.checked) {
                        btnRegistrar.disabled = false;
                    }
                } catch (err) {
                    console.error("Error procesando imagen:", err);
                    actualizarEstadoBiometrico("error", "Error procesando la imagen: " + err.message);
                }
            };
            img.src = evento.target.result;
        };

        lector.readAsDataURL(archivo);
    });

    // Envío del Formulario de Registro
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!checkPrivacidad || !checkPrivacidad.checked) {
            alert("Debe aceptar la Política de Privacidad y autorizar el tratamiento de sus datos biométricos para poder registrarse.");
            checkPrivacidad?.focus();
            return;
        }

        if (!vectorFacialCapturado || vectorFacialCapturado.length !== 128) {
            alert("Debe capturar su rostro con la cámara web o cargar una foto válida antes de registrarse.");
            return;
        }

        btnRegistrar.disabled = true;
        btnRegistrar.textContent = "Registrando...";

        const payload = {
            nombre: document.getElementById("nombre").value.trim(),
            apellido: document.getElementById("apellidos").value.trim(),
            documento: document.getElementById("cedula").value.trim(),
            correo: document.getElementById("correo").value.trim(),
            contraseña: document.getElementById("password").value,
            rango: document.getElementById("rango").value,
            faceDescriptor: vectorFacialCapturado
        };

        try {
            const respuesta = await fetch(`${apiUrl}/api/registro`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.error || resultado.mensaje || "Error al registrar");
            }

            alert("✅ Registro exitoso. Su vector biométrico facial ha sido guardado.");
            form.reset();
            vectorFacialCapturado = null;
            previewImg.style.display = "none";
            btnRegistrar.disabled = true;
            btnRegistrar.textContent = "Registrar";
            actualizarEstadoBiometrico("info", "Registro completado. Puede ingresar desde el inicio de sesión.");

            setTimeout(() => {
                window.location.href = "/";
            }, 1000);
        } catch (error) {
            console.error("Error de registro:", error);
            alert(`Error: ${error.message}`);
            btnRegistrar.disabled = false;
            btnRegistrar.textContent = "Registrar";
        }
    });

    // Iniciar carga de modelos
    cargarModelos();
});
