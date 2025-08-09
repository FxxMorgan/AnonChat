# 🔒 AnonChat - Chat Anónimo en Tiempo Real

Un chat completamente anónimo sin persistencia, construido con Node.js, Socket.io y diseño responsive con Tailwind CSS.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D%2016.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Características

### 🎯 **Funcionalidades Principales**
- **Chat en tiempo real** con WebSockets (Socket.io)
- **Completamente anónimo** - Sin registro ni persistencia
- **Salas públicas y privadas** con contraseñas
- **Subida de archivos** (imágenes, videos, audios, documentos)
- **Grabación de audio** en tiempo real
- **Emojis integrados** para expresión
- **Indicadores de escritura** ("está escribiendo...")

### 🛡️ **Seguridad y Privacidad**
- **Sin persistencia** - Los mensajes se pierden al cerrar
- **Sin tracking** - No se almacenan datos de usuarios
- **Limpieza automática** - Archivos se eliminan automáticamente
- **Rate limiting** - Protección contra spam
- **Sanitización HTML** - Prevención de ataques XSS
- **Validación de archivos** - Solo tipos permitidos

### 🎨 **Experiencia de Usuario**
- **Diseño responsivo** - Funciona en móviles y desktop
- **Tema oscuro** - Diseño moderno y cómodo
- **Notificaciones sonoras** - Avisos de nuevos mensajes
- **Timestamps** - Hora de cada mensaje
- **Contador de usuarios** - Usuarios activos en la sala
- **Scroll inteligente** - Auto-scroll cuando estás al final
- **Shortcuts de teclado** - Enter para enviar, Shift+Enter para nueva línea

## 🚀 Instalación Rápida

### Prerrequisitos
- Node.js 16.0.0 o superior
- npm o yarn

### Pasos
```bash
# Clonar el repositorio
git clone https://github.com/TuUsuario/AnonChat.git
cd AnonChat

# Instalar dependencias
npm install

# Iniciar el servidor
npm start
```

¡Listo! Abre tu navegador en `http://localhost:3000`

## 📦 Dependencias

```json
{
  "express": "^4.18.2",
  "socket.io": "^4.7.2",
  "multer": "^1.4.5-lts.1",
  "express-rate-limit": "^6.8.1"
}
```

## 🎮 Uso

### 1. **Unirse a una Sala**
- Ingresa tu **nickname** (máx. 20 caracteres)
- Escribe el **nombre de la sala** (máx. 30 caracteres)
- Opcionalmente marca **"Sala Privada"** y establece una contraseña
- Haz clic en **"Unirse a la Sala"**

### 2. **Chatear**
- Escribe mensajes (máx. 500 caracteres)
- Usa **Enter** para enviar o **Shift+Enter** para nueva línea
- Haz clic en emojis para agregarlos a tu mensaje

### 3. **Compartir Archivos**
- **📎 Archivo**: Imágenes, videos, audios, PDFs, documentos (máx. 20MB)
- **🎤 Audio**: Graba mensajes de voz directamente (máx. 60 segundos)

### 4. **Funciones Avanzadas**
- **Salas de la lista**: Haz clic en una sala disponible para unirte
- **Indicador de usuarios**: Ve cuántos usuarios hay en tu sala
- **Previsualización**: Las imágenes y videos se muestran automáticamente

## 🔧 Configuración

### Variables de Entorno
```bash
PORT=3000                    # Puerto del servidor (opcional)
```

### Límites Configurables (en server.js)
```javascript
// Límite de archivos
limits: { fileSize: 20 * 1024 * 1024 }  // 20MB

// Rate limiting
windowMs: 60 * 1000,  // 1 minuto
max: 100              // 100 requests por IP

// Tiempo de inactividad
5 * 60 * 1000         // 5 minutos
```

## 📁 Estructura del Proyecto

```
AnonChat/
├── server.js              # Servidor principal
├── package.json           # Dependencias y scripts
├── .gitignore             # Archivos ignorados por Git
├── README.md              # Este archivo
├── public/                # Archivos estáticos
│   └── index.html         # Frontend completo
└── uploads/               # Archivos temporales (auto-eliminados)
```

## 🗑️ Sistema de Limpieza Automática

Los archivos se eliminan automáticamente en 3 situaciones:

1. **⏱️ Inactividad (5 minutos)** - Cuando no hay actividad en la sala
2. **👥 Sala vacía** - Cuando todos los usuarios salen
3. **🕐 Limpieza programada (1 hora)** - Archivos antiguos se eliminan automáticamente

## 🔒 Privacidad y Anonimato

### ✅ **Lo que NO se guarda:**
- Mensajes de chat
- Información personal
- Historial de conversaciones
- Logs de usuarios
- Direcciones IP (más allá del rate limiting temporal)

### ✅ **Lo que SÍ es temporal:**
- Archivos subidos (máx. 1 hora)
- Colores de usuario (durante la sesión)
- Lista de salas activas (mientras tengan usuarios)

## 🌐 Despliegue

### Heroku
```bash
# Instalar Heroku CLI
# Crear app
heroku create tu-anonchat

# Configurar variables
heroku config:set NODE_ENV=production

# Desplegar
git push heroku main
```

### Railway / Render / Vercel
1. Conecta tu repositorio de GitHub
2. Configura el comando de inicio: `node server.js`
3. Establece `PORT` como variable de entorno (opcional)

### VPS/Servidor Propio
```bash
# Con PM2 para producción
npm install -g pm2
pm2 start server.js --name "anonchat"
pm2 startup
pm2 save
```

## 🛠️ Desarrollo

### Scripts Disponibles
```bash
npm start          # Iniciar servidor
npm run dev        # Desarrollo con nodemon (instalar nodemon globalmente)
npm test           # Ejecutar tests (cuando los implementes)
```

### Agregar nuevas funcionalidades
1. **Frontend**: Modifica `public/index.html`
2. **Backend**: Modifica `server.js`
3. **Estilos**: CSS dentro de `<style>` en index.html
4. **Emojis**: Agrega más en el array del emoji picker

## 🐛 Solución de Problemas

### Error: EADDRINUSE
```bash
# El puerto ya está en uso
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

### Error: Cannot upload files
- Verifica permisos de escritura en la carpeta del proyecto
- Asegúrate de que no hay antivirus bloqueando la creación de carpetas

### Error: Micrófono no funciona
- Verifica permisos del navegador
- Usa HTTPS en producción (requerido para audio)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ve el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

**FxxMorgan** - [GitHub](https://github.com/FxxMorgan)

## 🙏 Agradecimientos

- **Socket.io** - Por hacer el tiempo real tan fácil
- **Tailwind CSS** - Por el diseño rápido y responsive
- **Express.js** - Por la simplicidad del servidor
- **Multer** - Por el manejo de archivos
- **La comunidad open source** - Por inspirar este proyecto

---

### 💡 **¿Te gusta el proyecto?**
⭐ ¡Dale una estrella en GitHub!  
🐛 ¿Encontraste un bug? Abre un issue  
💬 ¿Ideas nuevas? ¡Contribuye!

---

**AnonChat - Donde la privacidad es lo primero** 🔒
