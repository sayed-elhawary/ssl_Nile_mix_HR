const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: ['https://nilemix.duckdns.org'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// MongoDB connection
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Static uploads
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// API Routes
const authRoutes = require('./routes/auth');
const shiftRoutes = require('./routes/shift');
const userRoutes = require('./routes/user');
const attendanceRoutes = require('./routes/attendance');
const violationRoutes = require('./routes/violations');
const advanceRoutes = require('./routes/advance');

app.use('/api/auth', authRoutes);
app.use('/api/shift', shiftRoutes);
app.use('/api/user', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/advance', advanceRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Create HTTP server for WebSocket
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  path: "/socket.io/",
  cors: {
    origin: "https://nilemix.duckdns.org",
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log('⚡ User connected:', socket.id);

  // مثال على رسالة تجريبية
  socket.on("message", (data) => {
    console.log('Received message:', data);
    socket.emit("message", `Server received: ${data}`);
  });

  socket.on("disconnect", () => {
    console.log('⚡ User disconnected');
  });
});

// Start server
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

