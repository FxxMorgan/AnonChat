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
    res.json({ filePath: `/uploads/${req.file.filename}`, fileName: req.file.originalname });
});

const userColors = {};
const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A2', '#FFD700', '#00FFFF', '#FF4500'];
const roomUsers = {}; // Contador de usuarios en cada sala
const roomTimeouts = {}; // Manejo de tiempo de inactividad en cada sala

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

function clearRoomFiles(room) {
    const dir = 'uploads/';
    fs.readdir(dir, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            if (file.includes(room)) {
                fs.unlink(path.join(dir, file), err => {
                    if (err) throw err;
                });
            }
        }
    });
}

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado');

    socket.on('joinRoom', ({ room, nickname }) => {
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

        io.to(room).emit('message', { text: `${nickname} se ha unido a la sala`, color: userColors[nickname] });
    });

    socket.on('chatMessage', (msg) => {
        io.to(socket.room).emit('message', { text: `${socket.nickname}: ${msg}`, color: userColors[socket.nickname] });

        if (roomTimeouts[socket.room]) {
            clearTimeout(roomTimeouts[socket.room]);
        }

        roomTimeouts[socket.room] = setTimeout(() => {
            clearRoomFiles(socket.room);
        }, 5 * 60 * 1000); // 5 minutos de inactividad
    });

    socket.on('fileMessage', (data) => {
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
        socket.to(socket.room).emit('typing', { nickname: socket.nickname, color: userColors[socket.nickname] });
    });

    socket.on('stopTyping', () => {
        socket.to(socket.room).emit('stopTyping', socket.nickname);
    });

    socket.on('disconnect', () => {
        io.to(socket.room).emit('message', { text: `${socket.nickname} ha dejado la sala`, color: userColors[socket.nickname] });

        roomUsers[socket.room]--;
        if (roomUsers[socket.room] === 0) {
            clearRoomFiles(socket.room);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en ejecución en el puerto ${PORT}`));