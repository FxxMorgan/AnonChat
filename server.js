const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuración de proxy de confianza
app.set('trust proxy', 1);

// Configuración de multer con límite de tamaño de archivo
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        // Asegurarse de que el directorio de subida existe
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // Límite de tamaño de archivo de 20 MB
});

// Middleware de limitación de tasa
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100 // limitar cada IP a 100 solicitudes por minuto
});

app.use(limiter);
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Endpoint para subir archivos
app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = `/uploads/${req.file.filename}`;
    
    // Obtener la sala del usuario (esto requiere que enviemos el room en el header o query)
    // Por ahora, registraremos todos los archivos y los limpiaremos periódicamente
    
    res.json({ 
        filePath: filePath, 
        fileName: req.file.originalname 
    });
});

const userColors = {};
const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A2', '#FFD700', '#00FFFF', '#FF4500'];
const roomUsers = {}; // Contador de usuarios en cada sala
const roomTimeouts = {}; // Manejo de tiempo de inactividad en cada sala
const rooms = {}; // Información de salas (nombre, tipo, contraseña)
const roomFiles = {}; // Tracking de archivos por sala

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

function clearRoomFiles(room) {
    console.log(`🗑️ Limpiando archivos de la sala: ${room}`);
    
    if (!roomFiles[room]) {
        console.log(`No hay archivos registrados para la sala: ${room}`);
        return;
    }

    const filesToDelete = roomFiles[room];
    let deletedCount = 0;
    let errorCount = 0;

    filesToDelete.forEach(filePath => {
        const fullPath = path.join(__dirname, filePath.replace(/^\//, ''));
        
        fs.unlink(fullPath, (err) => {
            if (err) {
                console.error(`❌ Error al eliminar archivo ${filePath}:`, err.message);
                errorCount++;
            } else {
                console.log(`✅ Archivo eliminado: ${filePath}`);
                deletedCount++;
            }
            
            // Log final cuando se procesen todos los archivos
            if (deletedCount + errorCount === filesToDelete.length) {
                console.log(`📊 Limpieza completada para sala ${room}: ${deletedCount} eliminados, ${errorCount} errores`);
            }
        });
    });

    // Limpiar el registro de archivos de la sala
    delete roomFiles[room];
}

// Función para limpiar archivos antiguos (más de 1 hora)
function cleanupOldFiles() {
    const uploadsDir = path.join(__dirname, 'uploads');
    const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hora en milisegundos

    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            console.error('Error al leer directorio uploads:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                
                // Si el archivo es más viejo que 1 hora, eliminarlo
                if (stats.mtime.getTime() < oneHourAgo) {
                    fs.unlink(filePath, (err) => {
                        if (!err) {
                            console.log(`🕐 Archivo antiguo eliminado: ${file}`);
                        }
                    });
                }
            });
        });
    });
}

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado');

    // Enviar la lista de salas disponibles al usuario
    socket.emit('availableRooms', Object.values(rooms).map(room => ({
        name: room.name,
        isPrivate: room.isPrivate
    })));

    socket.on('joinRoom', ({ room, nickname, isPrivate, password }) => {
        // Check if room exists and is private
        if (rooms[room]) {
            if (rooms[room].isPrivate && rooms[room].password !== password) {
                socket.emit('incorrectPassword');
                return;
            }
        } else {
            // If room doesn't exist, create it with the provided settings
            rooms[room] = {
                name: room,
                isPrivate,
                password: isPrivate ? password : null
            };
        }

        socket.join(room);
        socket.room = room;
        socket.nickname = nickname;

        if (!userColors[nickname]) {
            userColors[nickname] = getRandomColor();
        }

        if (!roomUsers[room]) {
            roomUsers[room] = 0;
        }
        roomUsers[room]++;

        if (roomTimeouts[room]) {
            clearTimeout(roomTimeouts[room]);
            delete roomTimeouts[room];
        }

        // Emit success event
        socket.emit('joinSuccess');
        io.to(room).emit('message', {
            text: `${nickname} se ha unido a la sala`,
            color: userColors[nickname]
        });

        // Enviar contador de usuarios a todos en la sala
        io.to(room).emit('userCount', roomUsers[room]);

        // Update available rooms for all clients
        io.emit('availableRooms', Object.values(rooms).map(room => ({
            name: room.name,
            isPrivate: room.isPrivate
        })));
    });

    socket.on('chatMessage', (msg) => {
        io.to(socket.room).emit('message', {
            text: `${socket.nickname}: ${msg}`,
            color: userColors[socket.nickname]
        });

        if (roomTimeouts[socket.room]) {
            clearTimeout(roomTimeouts[socket.room]);
        }

        roomTimeouts[socket.room] = setTimeout(() => {
            clearRoomFiles(socket.room);
        }, 5 * 60 * 1000); // 5 minutos de inactividad
    });

    socket.on('fileMessage', (data) => {
        // Registrar el archivo en la sala
        if (!roomFiles[socket.room]) {
            roomFiles[socket.room] = [];
        }
        roomFiles[socket.room].push(data.filePath);
        
        io.to(socket.room).emit('fileMessage', {
            nickname: socket.nickname,
            color: userColors[socket.nickname],
            filePath: data.filePath,
            fileName: data.fileName
        });

        if (roomTimeouts[socket.room]) {
            clearTimeout(roomTimeouts[socket.room]);
        }

        roomTimeouts[socket.room] = setTimeout(() => {
            clearRoomFiles(socket.room);
        }, 5 * 60 * 1000); // 5 minutos de inactividad
    });

    socket.on('typing', () => {
        socket.to(socket.room).emit('typing', {
            nickname: socket.nickname,
            color: userColors[socket.nickname]
        });
    });

    socket.on('stopTyping', () => {
        socket.to(socket.room).emit('stopTyping', socket.nickname);
    });

    socket.on('disconnect', () => {
        if (socket.room && socket.nickname) {
            io.to(socket.room).emit('message', {
                text: `${socket.nickname} ha dejado la sala`,
                color: userColors[socket.nickname]
            });

            roomUsers[socket.room]--;
            
            // Enviar contador actualizado de usuarios
            io.to(socket.room).emit('userCount', roomUsers[socket.room]);
            
            if (roomUsers[socket.room] === 0) {
                clearRoomFiles(socket.room);
                // Delete room when empty
                delete rooms[socket.room];
                // Update available rooms for all clients
                io.emit('availableRooms', Object.values(rooms).map(room => ({
                    name: room.name,
                    isPrivate: room.isPrivate
                })));
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor en ejecución en el puerto ${PORT}`);
    console.log(`📁 Directorio de uploads: ${path.join(__dirname, 'uploads')}`);
    
    // Limpieza de archivos antiguos cada hora
    setInterval(cleanupOldFiles, 60 * 60 * 1000);
    console.log(`🕐 Limpieza automática de archivos configurada (cada hora)`);
    
    // Ejecutar limpieza inicial
    setTimeout(cleanupOldFiles, 5000); // Después de 5 segundos del inicio
});