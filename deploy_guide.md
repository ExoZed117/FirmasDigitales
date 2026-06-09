# Guía de Despliegue en Render y Configuración de ngrok

Esta guía explica detalladamente cómo publicar tus frontends en **Render**, exponer tu backend local mediante **ngrok** y configurar la conexión interactiva en la aplicación.

---

## 1. Exponer el Backend Local mediante ngrok

Dado que tu backend se ejecuta localmente en tu laptop (conectándose a SQL Server y controlando las notificaciones y el nodo de Hardhat), debes crear un túnel público seguro para que el frontend (en Render) pueda comunicarse con él.

### Pasos:
1. **Descargar ngrok**: Descarga e instala ngrok en tu laptop desde [ngrok.com](https://ngrok.com/).
2. **Autenticar tu cuenta**: Crea una cuenta gratuita en ngrok, copia tu Authtoken del panel e ingresa el siguiente comando en tu terminal:
   ```bash
   ngrok config add-authtoken TU_AUTHTOKEN_DE_NGROK
   ```
3. **Iniciar el túnel para el Backend**: Inicia el túnel en el puerto `3001` (donde corre tu servidor Express):
   ```bash
   ngrok http 3001
   ```
4. **Copiar la URL Pública**: ngrok te mostrará una interfaz en consola con una sección de **Forwarding**. Copia la dirección HTTPS generada (por ejemplo: `https://abcd-123-45-67.ngrok-free.app`).

> [!IMPORTANT]
> - Deja la consola de ngrok abierta mientras estés operando. Si la cierras, el túnel se caerá y tu backend dejará de ser accesible.
> - Al reiniciar ngrok, se generará una URL aleatoria nueva (a menos que utilices un dominio estático de ngrok gratuito). Deberás actualizar esta URL en la configuración de la aplicación.

---

## 2. Configurar la URL de Conexión en los Frontends

Hemos integrado un widget interactivo de configuración de API en la parte superior derecha de ambos frontends. Esto te permite cambiar de URL sin tener que compilar el código de nuevo.

1. Abre el portal en tu navegador.
2. En la esquina superior derecha, verás un botón que dice **🔌 Conexión API**.
3. Haz clic en él para expandir el panel.
4. Pega tu URL de ngrok (ejemplo: `https://abcd-123-45-67.ngrok-free.app`) y haz clic en **Guardar**.
5. La página se recargará automáticamente y comenzará a realizar todas las solicitudes a tu laptop local a través del túnel seguro de ngrok.
6. Si deseas volver a trabajar localmente, abre el widget y haz clic en **Localhost** para restaurar `http://localhost:3001` instantáneamente.

---

## 3. Desplegar los Frontends en Render

Render permite hostear sitios web estáticos (como proyectos creados con React + Vite) de forma gratuita.

### Configuración en Render (Static Site):

1. **Crear una cuenta**: Regístrate en [Render.com](https://render.com/) y conecta tu cuenta de GitHub.
2. **Crear un nuevo Servicio**: Haz clic en **New +** y selecciona **Static Site**.
3. **Conectar Repositorio**: Selecciona tu repositorio de `FirmasDigitales`.
4. **Configurar Parámetros de Despliegue**:
   - **Name**: Dale un nombre descriptivo (ejemplo: `blockcert-publico` y `blockcert-institucional`).
   - **Root Directory**:
     - Para el portal público: `frontend-publico`
     - Para el portal institucional: `frontend-institucional`
   - **Build Command**:
     ```bash
     npm run build
     ```
   - **Publish Directory**:
     ```bash
     dist
     ```
5. **Variables de Entorno (Opcional)**:
   - En la sección **Environment**, puedes agregar la variable `VITE_API_URL` con tu dirección de ngrok por defecto para que la aplicación apunte a ella automáticamente en su primera carga.
     - **Key**: `VITE_API_URL`
     - **Value**: `https://tu-url-de-ngrok.ngrok-free.app`

### Nota sobre redirecciones en Render:
Dado que la aplicación institucional utiliza rutas en el cliente (como `/sign/TOKEN`), debes configurar una regla de redirección en Render para evitar errores `404 Not Found` cuando el navegador recargue páginas internas.
1. En el panel del servicio de Render, ve a **Redirects/Rewrites**.
2. Añade una regla:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`

---

## 4. Consideraciones con la Blockchain (Metamask)

* **Red Local en Metamask**: Para firmar transacciones desde el portal institucional desplegado, tu billetera MetaMask debe estar conectada a la red **Hardhat Localhost** (`http://localhost:8545`, Chain ID: `31337`).
* Dado que MetaMask se ejecuta localmente en la máquina del validador, se conectará directamente a `localhost:8545` de su PC. Si se está interactuando desde dispositivos móviles o redes externas, también puedes exponer el puerto de Hardhat (`8545`) mediante ngrok (`ngrok http 8545`) y añadir esa red RPC personalizada en MetaMask.
