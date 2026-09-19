# ZEISS Talent Assessment

**Evaluación Integral de Competencias y Potencial** — plataforma web de evaluación psicométrica para Recursos Humanos: registro, consentimiento, 10 baterías (100 preguntas) con cronómetro de 60 minutos, motor de scoring, dashboard ejecutivo para RH, reporte PDF corporativo y envío por correo y WhatsApp mediante un backend en Node.js.

> **Advertencia sobre la validez psicométrica.** Este sistema es un **prototipo funcional**. Su contenido no está validado científicamente. Antes de utilizarse como instrumento psicométrico formal para decisiones de selección debe someterse a procesos de **validación, confiabilidad, validez de constructo, validez de criterio, análisis de ítems, calibración y revisión por profesionales especializados**. Los resultados son una herramienta complementaria y nunca una decisión automática de contratación.

---

## Contenido

1. [Archivos generados](#1-archivos-generados)
2. [Cómo ejecutar el proyecto](#2-cómo-ejecutar-el-proyecto)
3. [Cómo modificar preguntas](#3-cómo-modificar-preguntas)
4. [Cómo modificar ponderaciones](#4-cómo-modificar-ponderaciones)
5. [Cómo agregar nuevos perfiles](#5-cómo-agregar-nuevos-perfiles)
6. [Cómo configurar el correo](#6-cómo-configurar-el-correo)
7. [Cómo configurar WhatsApp](#7-cómo-configurar-whatsapp)
8. [Cómo desplegarlo en un servidor](#8-cómo-desplegarlo-en-un-servidor)
9. [Qué debe migrarse al backend antes de producción](#9-qué-debe-migrarse-al-backend-antes-de-producción)
10. [Seguridad](#10-seguridad)
11. [Lista de validación del sistema](#11-lista-de-validación-del-sistema)

---

## 1. Archivos generados

```
zeiss-talent-assessment/
├── index.html                  Versión de UN SOLO ARCHIVO (doble clic). Generada por build.js
├── app/                        Código fuente modular (lo que se edita)
│   ├── index.html              La misma aplicación con archivos separados (la sirve el backend)
│   ├── css/styles.css          Diseño: colores centralizados en :root, responsive y accesibilidad
│   ├── js/config.js            CONFIG / DATA: marca, duración, destinatarios, perfiles, ponderaciones,
│   │                           umbrales, niveles, colores y textos por dimensión
│   ├── js/questions.js         QUESTIONS: 10 baterías, 100 preguntas y pares de consistencia
│   ├── js/scoring.js           SCORING: motor 0–100, invertidas, consistencia, compatibilidad, clasificación
│   ├── js/report.js            REPORT: gráficas (Chart.js) y PDF corporativo de 9 páginas (jsPDF)
│   ├── js/app.js               UI · FLOW · EXAM · TIMER · STORAGE · VALIDATION · DASHBOARD · ADMIN · DEMO
│   ├── js/loader-fallback.js   Usa las copias locales si el CDN no responde
│   └── vendor/                 Chart.js 4.5.1 y jsPDF 4.2.1 (respaldo sin conexión)
├── backend/
│   ├── server.js               Express: API, Helmet/CSP, CORS, límites de solicitudes; sirve app/
│   ├── lib/config.js           Lectura de variables de entorno (.env)
│   ├── lib/security.js         Validación, sanitización, escape de HTML y tokens de sesión (HMAC)
│   ├── lib/engine.js           Recalcula el scoring con los mismos módulos del frontend
│   ├── lib/files.js            URL temporal firmada del PDF (requerida por Twilio)
│   ├── services/email.js       Correo: SMTP (Microsoft 365) · SendGrid · vista previa .eml
│   ├── services/whatsapp.js    WhatsApp: Business Cloud API (Meta) · Twilio · vista previa
│   ├── test/smoke.js           Pruebas del backend (sin credenciales)
│   ├── .env.example            Plantilla de variables de entorno (sin llaves)
│   └── package.json
├── tests/                      Validación del banco, pruebas del scoring y pruebas E2E (Playwright)
├── build.js                    Regenera index.html (un solo archivo) a partir de app/
├── Dockerfile                  Imagen de despliegue (backend + frontend)
└── README.md
```

### Las 10 baterías

| No. | Batería | Preguntas | Formato | Tiempo estimado |
|---|---|---|---|---|
| 01 | Personalidad Laboral | 10 | Escala Likert (3 invertidas) y situaciones breves | 4 min |
| 02 | Liderazgo | 10 | Casos situacionales (SJT) y escala | 6 min |
| 03 | Toma de Decisiones | 10 | Información incompleta, riesgo, presión, priorización | 7 min |
| 04 | Habilidades Blandas | 10 | Comunicación, negociación, colaboración | 5 min |
| 05 | Integridad y Ética | 10 | Escenarios con scoring situacional + actitudes | 6 min |
| 06 | Razonamiento Lógico | 10 | Secuencias, figuras SVG, matriz 3×3, deducción | 7 min |
| 07 | Razonamiento Numérico | 10 | Producción, inventarios, costos, indicadores, tablas | 9 min |
| 08 | Atención y Concentración | 10 | Selección múltiple interactiva, comparación de documentos | 6 min |
| 09 | Pensamiento Crítico | 10 | Supuestos, evidencia, correlación, falacias | 6 min |
| 10 | Adaptabilidad y Manejo de Situaciones | 10 | Cambio, presión, imprevistos | 4 min |

Las respuestas correctas están distribuidas (opción múltiple: A 7 · B 10 · C 9 · D 10; mejor opción situacional: A 10 · B 8 · C 8 · D 11) y todas las claves numéricas y de atención se verifican de forma independiente con `tests/validate-bank.js`.

---

## 2. Cómo ejecutar el proyecto

### A. Versión DEMO sin instalar nada

1. Abra **`index.html`** con doble clic (Chrome, Edge, Firefox o Safari; también en tablet y celular).
2. Elija **COMENZAR EVALUACIÓN** o **MODO DEMOSTRACIÓN**:
   - *Recorrido automático*: llena un candidato ficticio, responde las 100 preguntas, calcula resultados, genera el PDF y abre el dashboard.
   - *Explorar manualmente*: datos ficticios precargados; usted navega el examen (botón «Autocompletar (demo)» disponible).
   - El modo demo muestra la etiqueta **DEMO MODE** y **nunca** envía correos ni WhatsApp (el backend también rechaza envíos demo).
3. Al terminar, el candidato solo ve «Tu evaluación ha sido registrada correctamente». Recursos Humanos entra con **Acceso RH** (pie de página).

**PIN de RH y administración: `2026`** — cámbielo en *Administración › Seguridad y datos*.

Notas:
- Las gráficas y el PDF usan Chart.js y jsPDF desde CDN. Si no hay internet, se usan las copias de `app/vendor/` (mantenga la carpeta `app/` junto a `index.html`). Sin ninguna de las dos, el examen funciona igual y el dashboard muestra la tabla de resultados.
- Enlace preconfigurado para un candidato (el perfil queda bloqueado):
  `index.html?perfil=supervisor&puesto=Supervisor%20de%20Producción&area=Manufactura&evaluador=Hugo%20Guerrero`
- `index.html?demo=1` abre directamente el modo demostración.

### B. Versión con backend (envío de correo y WhatsApp)

Requiere Node.js 18.18 o superior (recomendado 22 LTS).

```bash
cd backend
cp .env.example .env        # Windows: copy .env.example .env
npm install
npm start                   # http://localhost:8080
```

El frontend servido por el backend detecta la API automáticamente. Con la configuración inicial (`EMAIL_PROVIDER=preview`, `WHATSAPP_PROVIDER=preview`) **no se envía nada**: el correo completo con el PDF adjunto se guarda como `.eml` en `backend/outbox/` (se abre con Outlook) y el mensaje de WhatsApp como `.json`. Así puede validar el flujo completo antes de agregar credenciales.

### C. Pruebas

```bash
npm test          # banco de preguntas + motor de scoring + backend
npm run test:e2e  # flujo completo en navegador (requiere: npm install y npx playwright-core install chromium)
```

---

## 3. Cómo modificar preguntas

**Opción 1 — sin programar (panel de administración):** *Administración › Preguntas* muestra el banco en JSON. Edite, presione **Validar** y **Guardar banco**. Puede **Exportar**/**Importar** el archivo para compartirlo. Este cambio se guarda en el navegador de ese equipo.

**Opción 2 — permanente (recomendada):** edite `app/js/questions.js` y ejecute `node build.js` para regenerar `index.html`. El backend usa el mismo archivo automáticamente.

```js
// Likert (1–5). El 4º parámetro indica pregunta invertida
L('PER-11', 'Planificación', 'Antes de una auditoría preparo la evidencia con anticipación.', false),

// Caso situacional: [texto, nivel 0–3]; exactamente una opción de nivel 3
S('LID-11', 'Delegación', 'Un colaborador te pide…', [
  ['Opción de riesgo', 0], ['Opción más efectiva', 3], ['Opción pasiva', 1], ['Opción parcial', 2]
]),

// Opción múltiple objetiva: respuesta correcta 'A'–'D'
M('NUM-11', 'Porcentajes', 'De 800 piezas, 5% fueron rechazadas…', ['36', '40', '42', '760'], 'B'),

// Selección múltiple (atención): índices correctos
G('ATE-11', 'Identificación de códigos', 'Selecciona TODOS los códigos iguales a AB-1020', ['AB-1020', 'AB-1002', …], [0, 5])
```

Reglas: IDs únicos; cuatro opciones en `S` y `M`; distribuya las respuestas correctas entre A–D; para detectar contradicciones agregue pares en `ZTA.CONSISTENCY_PAIRS` (`{ a: 'PER-02', b: 'PER-09', topic: '…' }`). Después ejecute `node tests/validate-bank.js`. Si cambia preguntas, incremente `version` en `ZTA.QUESTION_BANK`: las sesiones en curso con otra versión se descartan para no mezclar bancos.

---

## 4. Cómo modificar ponderaciones

*Administración › Perfiles y ponderaciones*: cada fila es un perfil y cada columna una dimensión; la suma debe ser **100%** (el panel no guarda si no se cumple). La última fila define el **Índice global**. En *Umbrales* se ajustan los criterios de clasificación y los niveles descriptivos. También puede editar `profiles`, `globalWeights`, `classification` y `levels` en `app/js/config.js`.

Para que el servidor recalcule con las mismas reglas: *Seguridad y datos › Exportar configuración*, copie el JSON a `backend/` y configure `SCORING_CONFIG_FILE=configuracion_zta.json` en `.env`.

**Cómo calcula el motor** (`app/js/scoring.js`):

| Indicador | Cálculo |
|---|---|
| Dimensión (0–100) | Σ(peso × puntaje de la pregunta) / Σ(peso) × 100. Las invertidas se recodifican (6 − respuesta). En razonamiento, atención y pensamiento crítico lo no respondido cuenta como incorrecto |
| Situacionales | Nivel de la opción elegida / 3 (conducta de riesgo = 0 … más efectiva = 3) |
| Selección múltiple | (aciertos − falsas alarmas) / total de correctas |
| Índice global | Promedio ponderado de las 10 dimensiones (`globalWeights`) |
| Compatibilidad | Promedio ponderado con el perfil − 0.5 puntos por cada punto debajo de un mínimo crítico |
| Consistencia | 100 × acuerdo de 9 pares de preguntas relacionadas − penalización por la misma respuesta repetida (máx. 20) − respuestas muy rápidas (máx. 20). **No detecta mentiras**: señala respuestas potencialmente contradictorias |
| Clasificación | **FAVORABLE** si cumple todos los mínimos; **NO FAVORABLE SEGÚN LOS CRITERIOS CONFIGURADOS** si cae debajo de los umbrales inferiores; **REQUIERE VALIDACIÓN ADICIONAL** en los demás casos (incluye consistencia baja o menos de 80% respondido) |

Niveles: 90–100 Muy alto · 75–89 Alto · 60–74 Medio alto · 45–59 Medio · 30–44 Medio bajo · 0–29 Bajo.

---

## 5. Cómo agregar nuevos perfiles

*Administración › Perfiles y ponderaciones › Agregar perfil*: escriba el nombre, asigne las ponderaciones (suma 100%), defina mínimos críticos (por ejemplo `integridad:50, atencion:45`) y guarde. O agréguelo en `app/js/config.js`:

```js
analista_calidad: {
  label: 'Analista de Calidad',
  weights: { personalidad: 8, liderazgo: 4, decisiones: 12, blandas: 8, integridad: 16,
             logico: 12, numerico: 14, atencion: 16, critico: 8, adaptabilidad: 2 },
  critical: { integridad: 50, atencion: 45 }
}
```

El perfil aparece en el registro, en el dashboard (para recalcular la compatibilidad) y puede preconfigurarse con `?perfil=analista_calidad`.

---

## 6. Cómo configurar el correo

El envío lo hace **el backend**; el navegador nunca contiene llaves. En `backend/.env`:

```ini
EMAIL_TO=Candy.paramo@zeiss.com,Hugo.guerrero@zess.com
EMAIL_FROM="ZEISS Talent Assessment <evaluaciones@midominio.com>"
EMAIL_SUBJECT_TEMPLATE=Evaluación Psicométrica | {candidato} | {puesto} | {id}
```

- **Destinatarios.** Se usan exactamente como fueron proporcionados. El segundo aparece con dominio **`zess.com`**: no se corrigió automáticamente; el panel de administración muestra una advertencia. Si debe ser `zeiss.com`, cámbielo en `EMAIL_TO` (y en *Administración › Correo y WhatsApp*, que genera el bloque `.env` listo para copiar).
- **Asunto:** `Evaluación Psicométrica | [Candidato] | [Puesto] | [Assessment ID]`. **Adjunto:** el PDF completo.
- **Proveedor** (`EMAIL_PROVIDER`):
  - `smtp` — Microsoft 365: `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`, `SMTP_SECURE=false` (STARTTLS), `SMTP_USER` y `SMTP_PASS` de un buzón con *SMTP AUTH* habilitado. Si su organización lo tiene deshabilitado, use un relay autorizado por TI o agregue un proveedor con Microsoft Graph en `services/email.js`.
  - `sendgrid` — `EMAIL_API_KEY` y un remitente verificado.
  - `preview` — no envía; guarda el `.eml` en `backend/outbox/`.
  - `none` — deshabilitado.
- Verifique con `GET /api/health` que el proveedor aparezca como listo.

---

## 7. Cómo configurar WhatsApp

Un archivo HTML no puede enviar WhatsApp automáticamente: se requieren credenciales que jamás deben estar en el navegador. Por eso el envío se hace desde el backend con **WhatsApp Business Cloud API (Meta)** o **Twilio**. Los destinatarios se definen en `.env` y se normalizan a formato internacional: `6633732713` → `526633732713`.

```ini
WHATSAPP_TO=6633732713,6643896885
WHATSAPP_COUNTRY_CODE=52
```

### Opción A — WhatsApp Business Cloud API (Meta)

1. En Meta for Developers cree una app con el producto WhatsApp, vinculada a su portafolio de Meta Business, y registre un número empresarial.
2. Obtenga el **Phone Number ID** y un **token permanente** de usuario del sistema con permiso `whatsapp_business_messaging`.
3. En WhatsApp Manager cree una **plantilla** (categoría *Utilidad*, idioma *Español (MEX)*) con **encabezado de tipo Documento** y cuatro variables en el cuerpo, por ejemplo:
   > Nueva evaluación psicométrica registrada. Candidato: {{1}}. Puesto: {{2}}. ID: {{3}}. Resultado: {{4}}. El reporte se adjunta en PDF.
4. Configure `.env`:
   ```ini
   WHATSAPP_PROVIDER=meta
   WHATSAPP_TOKEN=…
   WHATSAPP_PHONE_ID=…
   WHATSAPP_API_VERSION=v23.0      # use la versión vigente que indique Meta
   WHATSAPP_TEMPLATE_NAME=evaluacion_psicometrica
   WHATSAPP_TEMPLATE_LANG=es_MX
   ```
El backend sube el PDF a Meta y envía la plantilla con el documento a cada número. **Sin plantilla**, WhatsApp solo entrega mensajes dentro de la ventana de 24 horas posterior a que el destinatario escribió al número de la empresa. Meta cobra por mensaje de plantilla según su tabla de precios vigente.

### Opción B — Twilio

```ini
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=…
TWILIO_AUTH_TOKEN=…
TWILIO_WHATSAPP_FROM=whatsapp:+1XXXXXXXXXX
PUBLIC_BASE_URL=https://evaluaciones.midominio.com
TWILIO_CONTENT_SID=HX…            # plantilla aprobada (Content API), opcional
```

Twilio descarga el PDF desde una URL pública: el backend lo publica en `/files/<token>/…` con un token aleatorio que expira en 1 hora (por eso `PUBLIC_BASE_URL` debe ser HTTPS). Para mensajes iniciados por la empresa use una plantilla de Content API con variables `{{1}}` candidato, `{{2}}` puesto, `{{3}}` ID, `{{4}}` resultado y `{{5}}` ruta del PDF (`files/…`). Para pruebas puede usar el *sandbox* de WhatsApp de Twilio.

---

## 8. Cómo desplegarlo en un servidor

Requisitos: Node.js 18.18+ (recomendado 22 LTS) y **HTTPS obligatorio** (datos personales).

**Servidor Linux o Windows con Node.js**

```bash
cd backend && npm ci --omit=dev
cp .env.example .env              # complete llaves, SESSION_SECRET y PUBLIC_BASE_URL
NODE_ENV=production node server.js   # o con PM2: pm2 start server.js --name zta
```

En Windows puede ejecutarse como servicio (NSSM) detrás de IIS con ARR; en Linux detrás de Nginx:

```nginx
server {
  listen 443 ssl;
  server_name evaluaciones.midominio.com;
  ssl_certificate     /etc/ssl/certs/evaluaciones.crt;
  ssl_certificate_key /etc/ssl/private/evaluaciones.key;
  client_max_body_size 20m;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Docker**

```bash
docker build -t zeiss-talent-assessment .
docker run -d -p 8080:8080 --env-file backend/.env --name zta zeiss-talent-assessment
```

**Azure App Service (Node 22)**: publique el proyecto completo, comando de inicio `node backend/server.js` y capture las variables de `.env` en *Configuración › Variables de entorno*.

El backend sirve el frontend y la API en el mismo dominio (recomendado). Si publica el frontend en otro dominio, escriba la URL del backend en *Administración › Correo y WhatsApp* y agregue ese dominio en `ALLOWED_ORIGINS`. Publique la herramienta preferentemente en la red interna o detrás del inicio de sesión corporativo.

---

## 9. Qué debe migrarse al backend antes de producción

**Todo scoring calculado solo en el navegador puede ser manipulado** (herramientas de desarrollador, edición de JavaScript o de localStorage). Este prototipo ya recalcula el scoring en el servidor y marca diferencias, valida un token de sesión y fija los destinatarios en `.env`; aun así, antes de usarlo en producción:

| Componente | Prototipo actual | Producción |
|---|---|---|
| Claves de respuesta y banco | En el navegador (visibles) | Solo en el servidor; el navegador recibe preguntas sin claves, idealmente con orden aleatorio |
| Scoring crítico | Navegador + verificación en servidor | Únicamente en el servidor; el navegador no calcula ni muestra resultados |
| Reporte PDF | Generado en el navegador | Generado en el servidor a partir del resultado del servidor |
| Cronómetro | Fecha límite en el navegador + token HMAC | Inicio y fin registrados por el servidor; rechazo de envíos fuera de tiempo |
| Almacenamiento | localStorage del equipo | Base de datos cifrada, bitácora de auditoría y política de retención |
| Acceso de RH y administración | PIN en el navegador | Inicio de sesión corporativo (Microsoft Entra ID / SSO) con roles |
| Configuración (perfiles, ponderaciones, umbrales) | localStorage + JSON exportable | En el servidor, con historial de cambios |
| Acceso del candidato | Página abierta | Invitación única por candidato con expiración |
| Aviso de privacidad | Versión simplificada | Aviso integral validado por el área legal; registro del consentimiento |

---

## 10. Seguridad

**Frontend:** escape de HTML en todo dato mostrado; sanitización de entradas (sin etiquetas ni caracteres de control); validación de nombre, correo (formato) y teléfono (10 dígitos, acepta +52); respuestas validadas contra el banco (IDs y rangos); sesión en localStorage con suma de verificación SHA-256 (una edición manual se detecta y la sesión se descarta); cronómetro basado en fecha límite absoluta (recargar no reinicia el tiempo); banco congelado en memoria; Assessment ID con generador criptográfico; marcas de tiempo de inicio, fin y tiempo por pregunta; conteo de salidas de la ventana como indicador informativo; sin credenciales en el código.

**Backend:** Helmet con Content-Security-Policy; CORS con lista blanca; límite de solicitudes por IP; límite de tamaño; validación y sanitización de todos los campos; verificación de que el adjunto sea PDF; rechazo de envíos DEMO; tokens de sesión firmados (HMAC-SHA256); recálculo del scoring con los mismos módulos y reporte de diferencias; destinatarios definidos solo en `.env`; bitácora sin datos personales; secretos solo en variables de entorno.

El PIN del panel es una **protección básica** del prototipo y no sustituye la autenticación en servidor.

---

## 11. Lista de validación del sistema

Verificada con pruebas automatizadas (`tests/`) en Chromium, en escritorio (1440 px) y móvil (390 px), tanto en `index.html` (un solo archivo) como en `app/index.html` y servida por el backend:

| Verificación | Resultado | Prueba |
|---|---|---|
| El examen inicia correctamente | ✅ | e2e-candidate |
| Los datos se validan (nombre, correo, teléfono, HTML) | ✅ | e2e-candidate |
| El consentimiento es obligatorio | ✅ | e2e-candidate |
| Las preguntas aparecen (Likert, SJT, figuras, matriz, tablas, selección múltiple) | ✅ | e2e-candidate |
| Las respuestas se almacenan y se recuperan tras recargar | ✅ | e2e-candidate |
| El progreso funciona («Pregunta 6 de 100», «5% completado») | ✅ | e2e-candidate |
| El cronómetro funciona (avisos a 10 y 5 min, fin automático en 00:00) | ✅ | e2e-candidate, e2e-timeout-mobile |
| Las baterías cambian correctamente (pantalla «Batería completada») | ✅ | e2e-candidate |
| El scoring funciona | ✅ | test-scoring |
| Las preguntas invertidas funcionan | ✅ | test-scoring |
| El índice de consistencia funciona | ✅ | test-scoring |
| Las gráficas funcionan (radar, barras, dona) | ✅ | e2e-demo |
| El dashboard funciona (perfil, recálculo de compatibilidad) | ✅ | e2e-candidate |
| El PDF funciona (9 páginas) | ✅ | e2e-demo, e2e-candidate |
| El modo DEMO funciona y no envía nada | ✅ | e2e-demo, backend/test |
| El diseño responsive funciona (sin desplazamiento horizontal) | ✅ | e2e-timeout-mobile |
| No existen errores de JavaScript | ✅ | todas las pruebas E2E |
| No existen credenciales expuestas | ✅ | revisión de código + backend/test |
| Envío por backend: correo con PDF y WhatsApp (vista previa) | ✅ | e2e-backend, backend/test |

---

*Prototipo funcional desarrollado para Recursos Humanos. Los nombres de la plataforma y el espacio «LOGO ZEISS» son configurables; use únicamente los elementos de marca oficiales proporcionados por la empresa.*
