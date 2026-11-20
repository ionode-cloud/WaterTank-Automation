require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const iotService = require('./services/iotService');
const simulationService = require('./services/simulationService');

// Routes
const dashboardRoutes = require('./routes/dashboardRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const motorRoutes = require('./routes/motorRoutes');
const systemRoutes = require('./routes/systemRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const authRoutes = require('./routes/authRoutes');
const authController = require('./controllers/authController');
const sensorController = require('./controllers/sensorController');

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

iotService.setSocketIO(io);

// Middleware - Robust CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Dynamically allow the requesting origin (localhost:5173, localhost:5174, etc.)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Explicit CORS headers fallback to guarantee matching origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

// Request logger for API calls
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!req.path.includes('/system/health')) {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/motor', motorRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/devices', deviceRoutes);

// Dedicated endpoints required by Section 6:
app.get('/api/water-level/history', sensorController.getWaterLevelHistory);
app.get('/api/power/history', sensorController.getPowerHistory);

// Hardware IoT bridge endpoints (Ready for physical ESP32 / Arduino / PLC)
app.post('/api/iot/telemetry', async (req, res) => {
  try {
    const {
      voltage,
      current,
      powerFactor,
      waterLevel,
      tankCapacity,
      tankcapacity,
      waterConsumption,
      waterconsuption,
      motorStatus,
    } = req.body;

    const v = Number(voltage) || 230;
    const c = Number(current) || 0;
    const pf = Number(powerFactor) || 0.92;
    const p = Math.round(v * c * pf);

    const cap = tankCapacity !== undefined 
      ? Number(tankCapacity) 
      : (tankcapacity !== undefined ? Number(tankcapacity) : 1000);

    const con = waterConsumption !== undefined 
      ? Number(waterConsumption) 
      : (waterconsuption !== undefined 
          ? Number(waterconsuption) 
          : (waterLevel !== undefined ? Math.round((Number(waterLevel) / 100) * cap) : 0));

    const wl = cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 0;
    const ms = motorStatus === 'ON' ? 'ON' : 'OFF';

    iotService.updateRuntimeState({
      voltage: v,
      current: c,
      power: p,
      powerFactor: pf,
      tankCapacity: cap,
      waterConsumption: con,
      waterLevel: wl,
      motorStatus: ms,
      isHardwareConnected: true,
    });

    return res.status(200).json({ success: true, message: 'Hardware telemetry synced', waterLevel: wl });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload. Please check for syntax errors or missing commas in your request body.',
      error: err.message,
    });
  }
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  
  // Immediately push the latest runtime state to the newly connected client
  socket.emit('sensor_update', iotService.getRuntimeState());

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Server Initialization
const PORT = process.env.PORT || 5010;

const startServer = async () => {
  // Connect to MongoDB Atlas
  await connectDB();

  // Seed default admin account if none exists
  await authController.seedDefaultAdmin();

  // Restore latest runtime state from database if available
  await iotService.initRuntimeStateFromDB();

  // Simulation and initial seeding (only active when SIMULATION_MODE === 'true')
  if (process.env.SIMULATION_MODE === 'true') {
    await simulationService.seedInitialDataIfNeeded();
    simulationService.startSimulation();
  } else {
    console.log('[System] Simulation and Dummy Seeding are DISABLED. System is ready for live Postman / Hardware data.');
  }

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  WaterTank Automation IoT Server Running!`);
    console.log(`  Port: http://localhost:${PORT}`);
    console.log(`  Mode: ${process.env.SIMULATION_MODE === 'true' ? 'Real-Time Simulation' : 'Live Hardware Ready'}`);
    console.log(`====================================================`);
  });
};

startServer();
