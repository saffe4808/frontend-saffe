document.addEventListener("DOMContentLoaded", () => {
    const apiUrl = window.SAFFE_API_URL || "https://saffe-backend.up.railway.app";
    const form = document.getElementById("form-registro");
    const checkPrivacidad = document.getElementById("check-privacidad");
    const btnRegistrar = document.getElementById("btn-registrar");
    const fotoInput = document.getElementById("foto");
    const previewImg = document.getElementById("preview");

    // Control de bloqueo del botón de registro según el consentimiento
    if (checkPrivacidad && btnRegistrar) {
        btnRegistrar.disabled = !checkPrivacidad.checked;

        checkPrivacidad.addEventListener("change", () => {
            btnRegistrar.disabled = !checkPrivacidad.checked;
        });
    }

    // Vista previa de la foto facial si se selecciona
    if (fotoInput && previewImg) {
        fotoInput.addEventListener("change", (e) => {
            const archivo = e.target.files[0];
            if (archivo) {
                const lector = new FileReader();
                lector.onload = (evento) => {
                    previewImg.src = evento.target.result;
                    previewImg.style.display = "block";
                };
                lector.readAsDataURL(archivo);
            } else {
                previewImg.style.display = "none";
            }
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Validación estricta del consentimiento antes del envío
        if (!checkPrivacidad || !checkPrivacidad.checked) {
            alert("Debe aceptar la Política de Privacidad y autorizar el tratamiento de sus datos biométricos para poder registrarse.");
            checkPrivacidad?.focus();
            return;
        }

        const payload = {
            nombre: document.getElementById("nombre").value.trim(),
            apellido: document.getElementById("apellidos").value.trim(),
            documento: document.getElementById("cedula").value.trim(),
            correo: document.getElementById("correo").value.trim(),
            contraseña: document.getElementById("password").value,
            rango: document.getElementById("rango").value
        };

        try {
            const respuesta = await fetch(`${apiUrl}/api/usuarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.error || resultado.mensaje || "Error al registrar");
            }

            alert("Registro exitoso.");
            form.reset();
            if (previewImg) previewImg.style.display = "none";
            if (btnRegistrar) btnRegistrar.disabled = true;
        } catch (error) {
            console.error("Error de registro:", error);
            alert(`Error: ${error.message}`);
        }
    });
});
