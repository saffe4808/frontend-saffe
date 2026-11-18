import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");

// Cargar variables de entorno locales si existen, sin sobreescribir las inyectadas por el entorno de producción (Render, etc.)
dotenv.config({ path: envPath, quiet: true });

