# Sistema de Certificación Académica Blockchain (DApp - Estilo DocuSign)

Este proyecto es una aplicación descentralizada (DApp) diseñada para la gestión (emisión, firma colectiva, verificación y revocación) de certificados académicos de manera inalterable utilizando la Blockchain de Ethereum (red local Hardhat), un backend en Express integrado con Microsoft SQL Server y dos interfaces de usuario independientes desarrolladas en React + TypeScript con un diseño premium **Glassmorphism** en tonos oscuros, morados y lila.

---

## Arquitectura del Proyecto

El proyecto está organizado en las siguientes carpetas dentro de `CertificadosBlockchain/`:

* **`blockchain/`**: Contiene el entorno Hardhat. Aloja el Smart Contract de Solidity (`contracts/`), sus pruebas de Mocha (`test/`) y el script de despliegue de Hardhat Ignition (`ignition/`).
* **`backend/`**: Servidor API en Node.js/Express. Se conecta a Microsoft SQL Server mediante Sequelize. Se encarga de la gestión de la base de datos, generación de marcas de agua diagonales, códigos QR dinámicos reales, y realiza todas las transacciones con Ethereum (billetera del backend) de forma transparente para los usuarios.
* **`frontend-institucional/`**: Aplicación de administración y firmas (corre en el puerto **5173**). 
  - **Login**: Credenciales fijas (`admin` / `admin` o `rector` / `rector`).
  - **Panel de Administración**: Permite la carga de documentos (PDF o Word con conversión simulada), y cuenta con un **lienzo interactivo (mockup A4 de 500x700px)** para arrastrar y soltar las cajas de firmas de los colaboradores en la página y coordenadas deseadas.
  - **Portal de Colaboradores**: Interfaz limpia donde un validador (abriendo su enlace tokenizado `/sign/:token`) puede firmar digitalmente dibujando a mano o subiendo una imagen. Cuenta con **restricción de zonas**: solo se puede firmar en el recuadro asignado (los demás aparecen bloqueados).
* **`frontend-publico/`**: Verificador público para alumnos y empresas (corre en el puerto **5174**). Permite validar certificados mediante tres alternativas: arrastrando el archivo PDF oficializado, ingresando el código único manualmente, o subiendo la imagen del código QR impreso (simulación de escáner).

---

## Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:
* **Node.js** (v18.0.0 o superior)
* **npm** (v9.0.0 o superior)
* Extensión **MetaMask** en tu navegador (solo requerida si vas a realizar la configuración avanzada de roles de directivos en el Smart Contract).

---

## Guía de Instalación y Ejecución Paso a Paso

Sigue esta secuencia exacta en terminales separadas para poner en marcha toda la plataforma localmente:

### Paso 1: Iniciar el Nodo de Blockchain Local

1. Abre una terminal en la carpeta `blockchain/`.
2. Instala las dependencias y arranca el nodo simulador de Ethereum:
   ```bash
   cd blockchain
   npm install
   npx hardhat node
   ```
   *Esto levantará una blockchain local en `http://127.0.0.1:8545` (Chain ID `31337`) y generará cuentas de prueba.*

---

### Paso 2: Desplegar el Contrato Inteligente

1. Abre una nueva terminal en la carpeta `blockchain/`.
2. Compila y despliega el Smart Contract en el nodo local:
   ```bash
   cd blockchain
   npx hardhat ignition deploy ./ignition/modules/CertificadoAcademico.ts --network localhost --reset
   ```
   *La dirección del contrato se guarda y configura en `frontend-institucional`, `frontend-publico` y `backend`.*

---

### Paso 3: Configurar y Levantar el Servidor Backend

El backend se conecta directamente a la base de datos SQL Server.

1. Abre una terminal en la carpeta `backend/`.
2. Instala las dependencias:
   ```bash
   cd backend
   npm install
   ```
3. Asegúrate de configurar el archivo `.env` con la dirección del contrato inteligente y la cadena de conexión de base de datos SQL Server:
   ```env
   PORT=3001
   DB_DIALECT=mssql
   DB_HOST=db55198.public.databaseasp.net
   DB_PORT=1433
   DB_NAME=db55198
   DB_USER=db55198
   DB_PASS=jS@49bL#%P2r
   CONTRACT_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
   ```
4. Inicia el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```
   *El servidor sincronizará las tablas con SQL Server e iniciará el servicio en `http://localhost:3001`.*

---

### Paso 4: Levantar el Frontend Institucional (Panel y Firmas)

1. Abre una terminal en la carpeta `frontend-institucional/`.
2. Instala las dependencias e inicia el portal:
   ```bash
   cd frontend-institucional
   npm install
   npm run dev
   ```
   *Abrirá el portal en la dirección `http://localhost:5173`.*

---

### Paso 5: Levantar el Frontend Público (Verificador)

1. Abre una terminal en la carpeta `frontend-publico/`.
2. Instala las dependencias e inicia el verificador:
   ```bash
   cd frontend-publico
   npm install
   npm run dev -- --port 5174
   ```
   *Abrirá el portal en la dirección `http://localhost:5174`.*

---

## Flujo de Trabajo en la Aplicación (DocuSign Style)

### 1. Iniciar Sesión Carga (Administrador)
* Accede a `http://localhost:5173/` e inicia sesión con el usuario `admin` y contraseña `admin`.
* En la pestaña **Crear Certificados**, rellena los datos (código de certificado, graduado, billetera opcional) y sube el PDF o archivo de Word. Si subes un Word, el sistema te advertirá que se convertirá automáticamente a PDF.
* Agrega uno o más colaboradores/validadores. En el **Posicionador de Firmas Interactivo** (lienzo blanco), arrastra los rectángulos de cada colaborador al lugar exacto de la página donde deben estampar su firma.
* Presiona **Subir y Enviar Invitaciones**. El backend guardará el documento y enviará las solicitudes.

### 2. Consenso de Firmas (Colaboradores / Validadores)
* En la pestaña **Ver Historial** de la administración, copia el **Enlace de Firma** de un colaborador y ábrelo (ej. `http://localhost:5173/?token=TOKEN` o `/sign/TOKEN`).
* Verás la previsualización interactiva del documento. Solo la zona de firma asignada a tu token estará activa y resaltada en **ROSA** con la leyenda "Firma aquí". Las demás zonas de otros validadores aparecerán bloqueadas (grises).
* Haz clic sobre tu zona activa para abrir el modal de firma. Puedes trazar tu firma a mano sobre el lienzo o subir una imagen de tu firma física.
* Confirma tu firma. Una vez que **todos** los validadores asignados hayan firmado:
  1. El backend estampará cada firma manuscrita en las coordenadas PDF correspondientes.
  2. Generará el **PDF Oficializado** con una marca de agua diagonal `"VALIDADO - BLOCKCHAIN"`.
  3. Registrará el Hash SHA-256 en Ethereum de forma automática a través de la wallet institucional.
  4. Generará un **Certificado PDF Final** incorporando los datos, firmas de validadores y un **Código QR real** que enlaza directamente a la URL de verificación pública (`http://localhost:5174/?code=CODIGO`).

### 3. Recepción de Certificado y No Repudio (Graduado)
* Accede al Verificador Público (`http://localhost:5174/`).
* Sube el **PDF Oficializado** o ingresa el código único.
* La app consultará directamente el Smart Contract (sin usar MetaMask) para certificar que el hash es válido.
* Si el graduado aún no confirma la recepción, se le habilitará el recuadro **Firma de Recepción de Certificado**. Al trazar su firma y confirmar, la recepción quedará sellada e inmutable en el historial del documento.

### 4. Configuración del Smart Contract (Rector / Universidad)
* En el frontend institucional, inicia sesión como `rector` / `rector`.
* Entra a la pestaña **Configuración Blockchain**. Conecta MetaMask configurado en la red Hardhat e importa la clave privada del propietario del contrato para agregar o revocar cargos a otros directivos directamente sobre la blockchain.
