# EduLink — Red Social Educativa

Red social web para instituciones educativas. Hasta ~2000 usuarios.  
Stack: **React + Vite + Supabase + Netlify**.

---

## 🚀 Instalación rápida

```bash
# 1. Instala dependencias
npm install

# 2. Copia el archivo de variables de entorno
cp .env.example .env.local
# Rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# 3. Inicia en desarrollo
npm run dev

# 4. Build para producción
npm run build
```

---

## 🗄️ Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el archivo:
   ```
   supabase/migrations/001_schema.sql
   ```
3. Copia la URL y la clave `anon` a `.env.local`

---

## ⚙️ Cambiar proveedor de almacenamiento

Edita **`src/config/storage.config.js`**:

```js
// Opciones: "supabase" | "cloudinary" | "r2" | "b2" | "oracle" | "firebase"
export const STORAGE_PROVIDER = "supabase";
```

Rellena solo las variables del proveedor elegido en `.env.local`.

---

## 🎨 Cambiar nombre y datos globales

Edita **`src/config/site.config.js`**:

```js
export const SITE_CONFIG = {
  name:         "EduLink",          // ← cambia el nombre aquí
  supportEmail: "soporte@tu-web.com",
  // ...
};
```

---

## 👤 Sistema de roles

| Rol         | Leer | Comentar | Publicar Inicio | Publicar Novedades | Borrar posts ajenos | Panel Admin |
|-------------|------|----------|-----------------|--------------------|---------------------|-------------|
| Usuario     | ✅   | ✅       | ✅              | ❌                 | ❌                  | ❌          |
| Encargado   | ✅   | ✅       | ✅              | ✅ (su grupo)      | ✅ (su grupo)       | ❌          |
| Administrador| ✅  | ✅       | ✅              | ✅                 | ✅                  | ✅          |

Los roles se asignan desde el **Panel Admin → Usuarios**.

---

## 🔒 Seguridad implementada

- Row Level Security (RLS) en todas las tablas de Supabase
- Sanitización XSS en todos los inputs
- Rate limiting en publicaciones y comentarios
- Validación de tipo y tamaño de archivos
- Headers HTTP de seguridad en `netlify.toml`
- Contraseñas con validación fuerte
- Usuarios baneados bloqueados a nivel de base de datos
- Foros anónimos: solo admins ven la identidad real

---

## 📁 Estructura del proyecto

```
src/
├── config/
│   ├── site.config.js      ← nombre, correo, features, límites
│   └── storage.config.js   ← proveedor de almacenamiento
├── context/
│   └── AuthContext.jsx     ← sesión y rol global
├── lib/
│   ├── supabase.js          ← cliente de Supabase
│   ├── security.js          ← sanitización, rate limit, validaciones
│   └── storage/
│       └── storageAdapter.js ← adaptador unificado de almacenamiento
├── components/
│   ├── layout/
│   │   ├── Header.jsx
│   │   └── Navbar.jsx
│   └── feed/
│       ├── PostCard.jsx
│       └── CreatePost.jsx
├── pages/
│   ├── HomePage.jsx
│   ├── NewsPage.jsx
│   ├── CommunitiesPage.jsx
│   ├── ProfilePage.jsx
│   ├── AuthPage.jsx
│   └── AdminPanel.jsx
└── styles/
    └── main.css

supabase/
└── migrations/
    └── 001_schema.sql      ← esquema completo + RLS + triggers
```

---

## 🌐 Deploy en Netlify

1. Conecta el repositorio en [netlify.com](https://netlify.com)
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Agrega las variables de entorno en el panel de Netlify
5. El archivo `netlify.toml` configura automáticamente los headers de seguridad y el redirect SPA

---

## 📝 Notas importantes

- **El correo y nombre real del usuario no pueden cambiarse desde el perfil** — solo desde el Panel Admin.
- **El foro "Anónimo"** se crea automáticamente con el script SQL. Su slug es `anonimo`.
- Para crear usuarios como admin en producción, se recomienda crear una **Supabase Edge Function** (`admin-create-user`) que use la `service_role key` — nunca expongas esa clave en el frontend.
