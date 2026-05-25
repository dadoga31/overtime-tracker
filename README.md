# HorasExtra Tracker

Control de horas extras con Firebase + Vercel. Los datos se sincronizan entre dispositivos vía Firestore.

---

## 🚀 Configuración en 5 pasos

### 1. Crear proyecto Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. **Agregar proyecto** → ponle nombre (ej: `horasextra`)
3. Desactiva Google Analytics si no lo necesitas → **Crear proyecto**

### 2. Configurar Authentication

1. En el menú lateral: **Authentication** → **Comenzar**
2. Pestaña **Sign-in method** → **Google** → Activar → Guardar

### 3. Configurar Firestore

1. En el menú lateral: **Firestore Database** → **Crear base de datos**
2. Selecciona **Modo de producción** → elige región `europe-west1` → Finalizar
3. Ve a la pestaña **Reglas** y pega el contenido de `firestore.rules` → Publicar
4. Ve a **Índices** → **Índices compuestos** → **Agregar índice**:
   - Colección: `entries`
   - Campos: `uid (Asc)` → `date (Desc)` → `createdAt (Desc)`
   - Ámbito: Colección → Crear

### 4. Obtener credenciales

1. **Configuración del proyecto** (⚙️) → **Tus apps** → **Agregar app** → icono Web (`</>`)
2. Registra la app (nombre cualquiera) → Copia el objeto `firebaseConfig`
3. Abre `src/js/firebase.js` y reemplaza los valores de `firebaseConfig`

También añade el dominio de Vercel en:
**Authentication** → **Settings** → **Dominios autorizados** → Añadir tu dominio `.vercel.app`

### 5. Subir a GitHub y publicar en Vercel

```bash
# En la carpeta del proyecto:
git init
git add .
git commit -m "feat: initial commit"
git remote add origin https://github.com/TU_USUARIO/horasextra.git
git push -u origin main
```

Luego en [vercel.com](https://vercel.com):
- **Add New Project** → importa tu repo → **Deploy** (sin cambiar nada más)

---

## 📁 Estructura del proyecto

```
overtime-tracker/
├── index.html                  # App principal
├── vercel.json                 # Configuración de Vercel
├── firestore.rules             # Reglas de seguridad de Firestore
├── firestore.indexes.json      # Índices compuestos de Firestore
├── .gitignore
├── public/
│   ├── favicon.svg
│   └── manifest.json           # PWA manifest
└── src/
    ├── css/
    │   └── main.css
    └── js/
        ├── firebase.js         # ⚙️  Pon aquí tus credenciales
        └── app.js              # Lógica de la aplicación
```

---

## 💾 ¿Cómo se guardan los datos?

- **Firebase Firestore** (base de datos en la nube de Google)
- Cada registro pertenece a tu cuenta de Google (campo `uid`)
- Los datos persisten entre dispositivos y sesiones
- Las reglas de seguridad (`firestore.rules`) garantizan que solo tú puedes ver y modificar tus datos
- La tarifa por hora se guarda en `localStorage` del navegador (preferencia local, no necesita cuenta)

---

## 📄 PDF exportado

El PDF incluye:
- Tabla con fecha, cliente, horas, ubicación y descripción
- Resumen con total de horas, desglose Madrid/Desplazamiento y número de registros
- Área de firma para trabajador y empresa
- **No incluye el valor económico**, solo las horas

---

## 🔧 Tarifa por hora

Se guarda localmente en el navegador. Si accedes desde otro dispositivo tendrás que configurarla de nuevo. Esto es intencional: la tarifa es una preferencia personal del dispositivo, no un dato sensible que necesite sincronizarse.
