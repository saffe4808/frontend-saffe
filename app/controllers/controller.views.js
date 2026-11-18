const getApiUrl = () => process.env.BACKEND_URL || "https://saffe-backend.up.railway.app";

export const getLogin = (req, res) => res.render("login", { apiUrl: getApiUrl() });
export const getRecuperar = (req, res) => res.render("recuperar", { apiUrl: getApiUrl() });
export const getRegistrarse = (req, res) => res.render("registrarse", { apiUrl: getApiUrl() });
export const getEscaneo = (req, res) => res.render("escaneo", { apiUrl: getApiUrl() });
export const getAccesoAutorizado = (req, res) => res.render("acceso_autorizado", { apiUrl: getApiUrl() });
export const getAccesoDenegado = (req, res) => res.render("acceso_denegado", { apiUrl: getApiUrl() });
export const getDetalleUsuario = (req, res) => res.render("detalle_usuario", { apiUrl: getApiUrl() });
export const getPerfil = (req, res) => res.render("perfil", { apiUrl: getApiUrl() });