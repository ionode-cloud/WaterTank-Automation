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
const userRoutes = require('./routes/userRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const modelRoutes = require('./routes/modelRoutes');
const faultRoutes = require('./routes/faultRoutes');
const dataRoutes = require('./routes/dataRoutes');
const authController = require('./controllers/authController');
const sensorController = require('./controllers/sensorController');
const { optionalProtect } = require('./middleware/auth');

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
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/motor', motorRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/faults', faultRoutes);

// Live 1-second Acknowledgement endpoint
app.get('/api/iot/ack', (req, res) => {
  return res.status(200).json({
    success: true,
    status: 'Active',
    acknowledgedAt: new Date().toISOString(),
    serverTime: Date.now(),
  });
});

// Dedicated endpoints required by Section 6:
app.get('/api/water-level/history', optionalProtect, sensorController.getWaterLevelHistory);
app.get('/api/power/history', optionalProtect, sensorController.getPowerHistory);

// Hardware IoT bridge endpoints (Ready for physical ESP32 / Arduino / PLC)
app.post('/api/iot/telemetry', async (req, res) => {
  try {
    const {
      deviceId,
      voltage,
      current,
      vol1,
      vol2,
      vol3,
      cu1,
      cu2,
      cu3,
      power,
      powerFactor,
      frequency,
      waterLevel,
      waterLevelStatus,
      sumpTank,
      overheadTank,
      tankCapacity,
      tankcapacity,
      waterConsumption,
      waterconsuption,
      motorStatus,
      status,
      deviceStatus,
      faultDescription,
    } = req.body;

    const devId = deviceId ? String(deviceId).trim().toUpperCase() : 'WT-DEV-001';

    const v = voltage !== undefined ? Number(voltage) : null;
    const c = current !== undefined ? Number(current) : null;
    const v1 = vol1 !== undefined ? Number(vol1) : null;
    const v2 = vol2 !== undefined ? Number(vol2) : null;
    const v3 = vol3 !== undefined ? Number(vol3) : null;
    const c1 = cu1 !== undefined ? Number(cu1) : null;
    const c2 = cu2 !== undefined ? Number(cu2) : null;
    const c3 = cu3 !== undefined ? Number(cu3) : null;

    const pf = powerFactor !== undefined ? Number(powerFactor) : null;
    const freq = frequency !== undefined ? Number(frequency) : null;

    let p = power !== undefined ? Number(power) : null;
    if (p === null) {
      if (v !== null && c !== null) {
        p = Math.round(v * c * (pf || 0.92));
      } else if (v1 !== null && c1 !== null) {
        p = Math.round((v1 * c1 + (v2 || v1) * (c2 || c1) + (v3 || v1) * (c3 || c1)) * (pf || 0.92));
      }
    }

    const cap = tankCapacity !== undefined 
      ? Number(tankCapacity) 
      : (tankcapacity !== undefined ? Number(tankcapacity) : null);

    const con = waterConsumption !== undefined 
      ? Number(waterConsumption) 
      : (waterconsuption !== undefined 
          ? Number(waterconsuption) 
          : (waterLevel !== undefined && cap ? Math.round((Number(waterLevel) / 100) * cap) : null));

    let wl = waterLevel !== undefined ? Number(waterLevel) : null;
    if (wl === null && cap && con !== null && cap > 0) {
      wl = Math.min(100, Math.max(0, Math.round((con / cap) * 100)));
    }

    let wlStatus = waterLevelStatus || null;
    if (!wlStatus && wl !== null) {
      wlStatus = wl < 25 ? 'Low' : wl > 75 ? 'High' : 'Medium';
    }

    const ms = motorStatus ? (String(motorStatus).toUpperCase() === 'ON' ? 'ON' : 'OFF') : 'OFF';
    const isFault = (status && status.toLowerCase() === 'fault') || (deviceStatus && deviceStatus.toLowerCase() === 'fault') || Boolean(faultDescription);
    const resolvedStatus = isFault ? 'Fault' : 'Active';

    iotService.updateRuntimeState({
      deviceId: devId,
      voltage: v,
      current: c,
      vol1: v1,
      vol2: v2,
      vol3: v3,
      cu1: c1,
      cu2: c2,
      cu3: c3,
      power: p,
      powerFactor: pf,
      frequency: freq,
      tankCapacity: cap,
      waterConsumption: con,
      waterLevel: wl,
      waterLevelStatus: wlStatus,
      sumpTank: sumpTank || null,
      overheadTank: overheadTank || null,
      motorStatus: ms,
      status: resolvedStatus,
      deviceStatus: resolvedStatus,
      isHardwareConnected: true,
    });

    if (isFault) {
      const FaultLog = require('./models/FaultLog');
      const now = new Date();
      const fl = new FaultLog({
        deviceId: devId,
        faultDescription: faultDescription || 'Hardware reported fault condition',
        faultStatus: 'Active',
        timestamp: now,
      });
      await fl.save();
      const io = iotService.getSocketIO();
      if (io) {
        io.emit('new_fault', fl);
        io.emit('device_status_update', { deviceId: devId, status: 'Fault', deviceStatus: 'Fault' });
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Hardware telemetry synced', 
      waterLevel: wl,
      waterLevelStatus: wlStatus,
      deviceStatus: resolvedStatus,
    });
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
