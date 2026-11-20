document.addEventListener("DOMContentLoaded", async () => {
    const apiUrl = (window.SAFFE_API_URL || "https://backend-saffe.onrender.com").replace(/\/+$/, "");
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/";
        return;
    }

    const state = {
        usuario: null,
        historial: [],
        usuarios: [],
        usuarioSeleccionado: null
    };

    const elements = {
        avatarIniciales: document.getElementById("avatarIniciales"),
        perfilNombre: document.getElementById("perfilNombre"),
        perfilRango: document.getElementById("perfilRango"),
        estadoBadge: document.getElementById("estadoBadge"),
        perfilResumen: document.getElementById("perfilResumen"),
        totalIngresos: document.getElementById("totalIngresos"),
        ultimoAcceso: document.getElementById("ultimoAcceso"),
        estadoResumen: document.getElementById("estadoResumen"),
        userDocumento: document.getElementById("userDocumento"),
        userNombre: document.getElementById("userNombre"),
        userCorreo: document.getElementById("userCorreo"),
        userRango: document.getElementById("userRango"),
        userFechaRegistro: document.getElementById("userFechaRegistro"),
        userEstado: document.getElementById("userEstado"),
        historialPersonalBody: document.getElementById("historialPersonalBody"),
        historialGlobalBody: document.getElementById("historialGlobalBody"),
        tablaGestionBody: document.getElementById("tablaGestionBody"),
        searchInput: document.getElementById("searchInput"),
        formDocumento: document.getElementById("formDocumento"),
        formNombre: document.getElementById("formNombre"),
        formApellido: document.getElementById("formApellido"),
        formCorreo: document.getElementById("formCorreo"),
        formRango: document.getElementById("formRango"),
        editarUsuarioForm: document.getElementById("editarUsuarioForm"),
        tabGlobalButton: document.getElementById("tabGlobalButton"),
        tabGestionButton: document.getElementById("tabGestionButton"),
        logoutButton: document.getElementById("logoutButton")
    };

    const normalizeStatus = (value) => {
        if (!value) return "Autorizado";
        return value.toString().toUpperCase() === "DENEGADO" ? "Denegado" : "Autorizado";
    };

    const normalizeStatusClass = (value) => {
        if (!value) return "autorizado";
        return value.toString().toUpperCase() === "DENEGADO" ? "denegado" : "autorizado";
    };

    const formatDate = (value) => {
        if (!value) return "--";

        const fecha = new Date(value);
        if (Number.isNaN(fecha.getTime())) {
            return value;
        }

        return fecha.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    };

    const formatDateTime = (registro) => {
        if (!registro) return "--";

        const fechaBase = registro.fecha_acceso || registro.fecha || new Date();
        const fecha = new Date(fechaBase);

        if (Number.isNaN(fecha.getTime())) {
            return registro.hora || "--";
        }

        return `${fecha.toLocaleDateString("es-ES")} ${registro.hora || fecha.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        })}`;
    };

    const isAdminRole = (rango = "") => {
        return /(administrador|comandante|mayor|coronel|general|jefe|director)/i.test(rango);
    };

    const setActiveTab = (tabId) => {
        const buttons = document.querySelectorAll(".tab-button");
        buttons.forEach((button) => {
            const isActive = button.dataset.tab === tabId;
            button.classList.toggle("active", isActive);
        });

        document.querySelectorAll(".tab-section").forEach((section) => {
            const shouldShow = section.id === tabId;
            section.classList.toggle("active", shouldShow);
            section.classList.toggle("hidden", !shouldShow);
        });
    };

    const renderProfileHeader = () => {
        if (!state.usuario) {
            return;
        }

        const usuario = state.usuario;
        const nombreCompleto = `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim();
        const rango = usuario.rango || "Sin rango";
        const personalHistory = state.historial.filter((entry) => entry.documento === usuario.documento);
        const ultimo = personalHistory[0];
        const accStatus = ultimo ? normalizeStatus(ultimo.estado) : "Autorizado";
        const esAdmin = isAdminRole(rango);

        elements.avatarIniciales.textContent = `${(usuario.nombre || "U").charAt(0)}${(usuario.apellido || "").charAt(0) || ""}`.toUpperCase();
        elements.perfilNombre.textContent = nombreCompleto || "Usuario SAFFE";
        elements.perfilRango.textContent = rango;
        elements.perfilResumen.textContent = esAdmin
            ? "Administrador del sistema con acceso a gestión global del personal y seguimiento institucional."
            : "Personal activo con acceso institucional registrado y historial personal disponible.";
        elements.totalIngresos.textContent = String(personalHistory.length);
        elements.ultimoAcceso.textContent = ultimo ? `${formatDate(ultimo.fecha_acceso || new Date())}` : "Sin registros";
        elements.estadoResumen.textContent = accStatus;

        elements.estadoBadge.textContent = esAdmin ? "Acceso autorizado" : accStatus;
        elements.estadoBadge.classList.toggle("revocado", !esAdmin && accStatus === "Denegado");

        elements.userDocumento.textContent = usuario.documento || "--";
        elements.userNombre.textContent = nombreCompleto || "--";
        elements.userCorreo.textContent = usuario.correo || "--";
        elements.userRango.textContent = rango;
        elements.userFechaRegistro.textContent = formatDate(usuario.fecha_registro || new Date());
        elements.userEstado.textContent = accStatus;
    };

    const renderPersonalHistory = () => {
        if (!state.usuario) {
            return;
        }

        const personalHistory = state.historial.filter((entry) => entry.documento === state.usuario.documento);

        if (personalHistory.length === 0) {
            elements.historialPersonalBody.innerHTML = '<tr><td colspan="4">No se registran ingresos para este usuario.</td></tr>';
            return;
        }

        elements.historialPersonalBody.innerHTML = personalHistory.map((entry) => {
            const estado = normalizeStatus(entry.estado);
            const badgeClass = normalizeStatusClass(entry.estado);
            const fecha = formatDate(entry.fecha_acceso || entry.created_at || new Date());

            return `
                <tr>
                    <td>${fecha}</td>
                    <td>${entry.hora || "--:--"}</td>
                    <td>Punto de acceso principal</td>
                    <td><span class="badge ${badgeClass}">${estado}</span></td>
                </tr>
            `;
        }).join("");
    };

    const renderGlobalHistory = () => {
        const esAdmin = isAdminRole(state.usuario?.rango || "");

        if (!esAdmin) {
            elements.historialGlobalBody.innerHTML = '<tr><td colspan="5">No tienes permisos para ver este historial.</td></tr>';
            return;
        }

        if (state.historial.length === 0) {
            elements.historialGlobalBody.innerHTML = '<tr><td colspan="5">No hay accesos registrados.</td></tr>';
            return;
        }

        elements.historialGlobalBody.innerHTML = state.historial.map((entry) => {
            const usuario = entry.nombre && entry.apellido
                ? `${entry.nombre} ${entry.apellido}`
                : `Usuario ${entry.documento || ""}`;
            const estado = normalizeStatus(entry.estado);
            const className = normalizeStatusClass(entry.estado);
            const nextStatus = entry.estado && entry.estado.toString().toUpperCase() === "DENEGADO" ? "AUTORIZADO" : "DENEGADO";

            return `
                <tr>
                    <td>${usuario}</td>
                    <td>${formatDate(entry.fecha_acceso || new Date())}</td>
                    <td>${entry.hora || "--:--"}</td>
                    <td><span class="badge ${className}">${estado}</span></td>
                    <td>
                        <button class="status-action ${entry.estado && entry.estado.toString().toUpperCase() === "DENEGADO" ? "secondary" : ""}" data-action="toggle-status" data-id="${entry.id}" data-estado="${nextStatus}" type="button">
                            ${entry.estado && entry.estado.toString().toUpperCase() === "DENEGADO" ? "Autorizar" : "Revocar"}
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    };

    const renderUsersForManagement = (usuarios) => {
        if (!usuarios.length) {
            elements.tablaGestionBody.innerHTML = '<tr><td colspan="4">No se encontraron usuarios con ese criterio.</td></tr>';
            return;
        }

        elements.tablaGestionBody.innerHTML = usuarios.map((usuario) => `
            <tr>
                <td>${`${usuario.nombre || ""} ${usuario.apellido || ""}`.trim() || "Sin nombre"}</td>
                <td>${usuario.documento || "--"}</td>
                <td>${usuario.rango || "Sin rango"}</td>
                <td>
                    <button class="status-action secondary" data-action="edit-user" data-documento="${usuario.documento}" type="button">Editar</button>
                </td>
            </tr>
        `).join("");
    };

    const populateUserForm = (usuario) => {
        if (!usuario) return;

        state.usuarioSeleccionado = usuario.documento;
        elements.formDocumento.value = usuario.documento || "";
        elements.formNombre.value = usuario.nombre || "";
        elements.formApellido.value = usuario.apellido || "";
        elements.formCorreo.value = usuario.correo || "";
        elements.formRango.value = usuario.rango || "";
    };

    const applyFilters = () => {
        const filterText = (elements.searchInput?.value || "").trim().toLowerCase();

        if (!filterText) {
            renderUsersForManagement(state.usuarios);
            return;
        }

        const filtered = state.usuarios.filter((usuario) => {
            const text = `${usuario.nombre || ""} ${usuario.apellido || ""} ${usuario.documento || ""} ${usuario.rango || ""}`.toLowerCase();
            return text.includes(filterText);
        });

        renderUsersForManagement(filtered);
    };

    const loadData = async () => {
        try {
            const [perfilResponse, historialResponse] = await Promise.all([
                fetch(`${apiUrl}/api/perfil`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/api/historial`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (!perfilResponse.ok) {
                throw new Error("La sesión es inválida o ha expirado.");
            }

            if (!historialResponse.ok) {
                throw new Error("No se pudo consultar el historial.");
            }

            state.usuario = await perfilResponse.json();
            state.historial = await historialResponse.json();

            if (isAdminRole(state.usuario.rango || "")) {
                const usuariosResponse = await fetch(`${apiUrl}/api/usuarios`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!usuariosResponse.ok) {
                    throw new Error("No se pudo obtener la gestión del personal.");
                }

                state.usuarios = await usuariosResponse.json();
            }

            renderProfileHeader();
            renderPersonalHistory();
            renderGlobalHistory();

            if (isAdminRole(state.usuario.rango || "")) {
                renderUsersForManagement(state.usuarios);
            } else {
                elements.tablaGestionBody.innerHTML = '<tr><td colspan="4">Este perfil no tiene permisos administrativos.</td></tr>';
            }

            elements.tabGlobalButton.style.display = isAdminRole(state.usuario.rango || "") ? "inline-flex" : "none";
            elements.tabGestionButton.style.display = isAdminRole(state.usuario.rango || "") ? "inline-flex" : "none";

            setActiveTab("tab-perfil");
        } catch (error) {
            console.error("Error cargando perfil:", error);
            localStorage.removeItem("token");
            window.location.href = "/";
        }
    };

    document.querySelectorAll(".tab-button").forEach((button) => {
        button.addEventListener("click", () => setActiveTab(button.dataset.tab));
    });

    elements.searchInput?.addEventListener("input", applyFilters);

    elements.logoutButton?.addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "/";
    });

    document.addEventListener("click", async (event) => {
        const target = event.target.closest("[data-action]");
        if (!target) return;

        const action = target.dataset.action;

        if (action === "toggle-status") {
            const id = target.dataset.id;
            const nuevoEstado = target.dataset.estado;

            try {
                const response = await fetch(`${apiUrl}/api/accesos/${id}/estado`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ estado: nuevoEstado })
                });

                if (!response.ok) {
                    const payload = await response.json();
                    throw new Error(payload.mensaje || "No se pudo actualizar el estado.");
                }

                await loadData();
            } catch (error) {
                console.error("Error actualizando estado de acceso:", error);
                alert(error.message || "No se pudo actualizar el estado del acceso.");
            }
        }

        if (action === "edit-user") {
            const doc = target.dataset.documento;
            const usuario = state.usuarios.find((item) => item.documento === doc);
            if (usuario) {
                populateUserForm(usuario);
                setActiveTab("tab-gestion");
            }
        }
    });

    elements.editarUsuarioForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const documento = elements.formDocumento.value.trim();
        const payload = {
            nombre: elements.formNombre.value.trim(),
            apellido: elements.formApellido.value.trim(),
            correo: elements.formCorreo.value.trim(),
            rango: elements.formRango.value.trim()
        };

        if (!documento || !payload.nombre || !payload.apellido || !payload.correo || !payload.rango) {
            alert("Completa todos los campos antes de guardar.");
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/api/usuarios/${encodeURIComponent(documento)}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.mensaje || "No se pudo guardar la información.");
            }

            alert("Perfil actualizado correctamente.");
            await loadData();
        } catch (error) {
            console.error("Error actualizando usuario:", error);
            alert(error.message || "No se pudo guardar la edición del usuario.");
        }
    });

    await loadData();
});
