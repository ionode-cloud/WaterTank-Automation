const SensorData = require('../models/SensorData');
const MotorHistory = require('../models/MotorHistory');
const MotorCommand = require('../models/MotorCommand');
const iotService = require('./iotService');

let simulationInterval = null;
let lastDbSaveTime = 0;

/**
 * Seed historical data if the database has minimal or no records
 */
const seedInitialDataIfNeeded = async () => {
  try {
    const sensorCount = await SensorData.countDocuments();
    if (sensorCount > 30) {
      console.log(`[Seed Engine] Existing sensor dataset detected (${sensorCount} records). Skipping seeding.`);
      return;
    }

    console.log('[Seed Engine] Populating database with realistic historical sensor & motor data...');
    const now = Date.now();
    const sensorDocs = [];

    // Seed 24 hours of sensor data (every 30 mins = 48 points)
    let cumulativeEnergy = 11.2;
    let simWater = 45;

    for (let i = 48; i >= 0; i--) {
      const time = new Date(now - i * 30 * 60 * 1000);
      const hour = time.getHours();
      
      // Typical residential pumping cycles (e.g. morning 6-8 AM, afternoon 1-2 PM, evening 7-8 PM)
      const isMotorOnPeriod = (hour >= 6 && hour < 8) || (hour >= 13 && hour < 14) || (hour >= 19 && hour < 20);
      const motorStatus = isMotorOnPeriod ? 'ON' : 'OFF';

      const voltage = +(228 + Math.sin(i / 3) * 4 + Math.random() * 2).toFixed(1);
      const current = isMotorOnPeriod ? +(6.2 + Math.random() * 0.8).toFixed(2) : 0.0;
      const powerFactor = isMotorOnPeriod ? 0.91 : 0.98;
      const power = isMotorOnPeriod ? Math.round(voltage * current * powerFactor) : 0;

      if (isMotorOnPeriod) {
        simWater = Math.min(95, simWater + 4.5);
        cumulativeEnergy += (power * 0.5) / 1000;
      } else {
        simWater = Math.max(22, simWater - 1.2);
      }

      sensorDocs.push({
        voltage,
        current,
        power,
        powerFactor,
        tankCapacity: 1000,
        waterConsumption: Math.round((simWater / 100) * 1000),
        motorStatus,
        energyConsumption: +cumulativeEnergy.toFixed(3),
        timestamp: time,
      });
    }

    await SensorData.insertMany(sensorDocs);
    console.log(`[Seed Engine] Seeded ${sensorDocs.length} historical sensor records.`);

    // Seed past 7 days of MotorHistory events
    const historyCount = await MotorHistory.countDocuments();
    if (historyCount < 5) {
      const motorEvents = [];
      const days = 7;
      for (let d = days; d >= 1; d--) {
        const dayBase = new Date(now - d * 24 * 60 * 60 * 1000);
        
        // Morning run (6:30 AM to 7:15 AM)
        const mornStart = new Date(dayBase);
        mornStart.setHours(6, 30, 0, 0);
        const mornEnd = new Date(mornStart.getTime() + 45 * 60 * 1000);
        motorEvents.push({
          motorStatus: 'ON',
          eventType: 'AUTO_START',
          startTime: mornStart,
          endTime: mornEnd,
          duration: 45 * 60,
          timestamp: mornStart,
          note: 'Scheduled morning tank fill',
        });

        // Evening run (19:00 to 19:40)
        const eveStart = new Date(dayBase);
        eveStart.setHours(19, 0, 0, 0);
        const eveEnd = new Date(eveStart.getTime() + 40 * 60 * 1000);
        motorEvents.push({
          motorStatus: 'ON',
          eventType: 'FORCE_ON',
          startTime: eveStart,
          endTime: eveEnd,
          duration: 40 * 60,
          timestamp: eveStart,
          note: 'Evening water usage replenishment',
        });
      }

      await MotorHistory.insertMany(motorEvents);
      console.log(`[Seed Engine] Seeded ${motorEvents.length} motor history events.`);
    }
  } catch (err) {
    console.error('[Seed Engine Error]', err.message);
  }
};

/**
 * Start the realistic real-time simulation engine
 */
const startSimulation = () => {
  if (simulationInterval) clearInterval(simulationInterval);

  console.log('[Simulation Engine] Real-time IoT background simulation started (Tick: 3s)');

  simulationInterval = setInterval(async () => {
    try {
      const state = iotService.getRuntimeState();
      let {
        motorStatus,
        waterLevel,
        voltage,
        current,
        power,
        powerFactor,
        energyConsumption,
      } = state;

      // Realistic voltage fluctuation (227V - 235V)
      voltage = +(230 + Math.sin(Date.now() / 15000) * 3 + (Math.random() * 1.5 - 0.75)).toFixed(1);

      if (motorStatus === 'ON') {
        // Motor running
        current = +(6.4 + Math.sin(Date.now() / 8000) * 0.4 + (Math.random() * 0.3 - 0.15)).toFixed(2);
        powerFactor = +(0.91 + (Math.random() * 0.03 - 0.015)).toFixed(2);
        power = Math.round(voltage * current * powerFactor);

        // Water level rises
        waterLevel = Math.min(100, +(waterLevel + 0.6 + Math.random() * 0.3).toFixed(1));

        // Increment energy (tick is 3 seconds)
        const energyIncrement = (power * 3) / (3600 * 1000);
        energyConsumption = +(energyConsumption + energyIncrement).toFixed(4);

        // Auto safety stop when tank reaches 100% full
        if (waterLevel >= 100) {
          console.log('[Simulation Engine] Tank 100% Full! Auto-stopping motor to prevent overflow.');
          await iotService.executeMotorCommand('OFF', 'automation_rule');
          return;
        }
      } else {
        // Motor is OFF
        current = 0.0;
        power = 0;
        powerFactor = 0.98;

        // Slow household water drain/usage simulation
        if (Math.random() > 0.4) {
          waterLevel = Math.max(15, +(waterLevel - 0.15).toFixed(1));
        }
      }

      const updated = {
        voltage,
        current,
        power,
        powerFactor,
        waterLevel: Math.round(waterLevel),
        energyConsumption,
      };

      iotService.updateRuntimeState(updated);

      // Persist snapshot to MongoDB every 15 seconds
      const now = Date.now();
      if (now - lastDbSaveTime >= 15000) {
        lastDbSaveTime = now;
        const record = new SensorData({
          voltage,
          current,
          power,
          powerFactor,
          tankCapacity: 1000,
          waterConsumption: Math.round((waterLevel / 100) * 1000),
          motorStatus,
          energyConsumption: +energyConsumption.toFixed(3),
          timestamp: new Date(),
        });
        await record.save();
      }
    } catch (err) {
      console.error('[Simulation Engine Tick Error]', err.message);
    }
  }, 3000);
};

const stopSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    console.log('[Simulation Engine] Simulation stopped.');
  }
};

module.exports = {
  seedInitialDataIfNeeded,
  startSimulation,
  stopSimulation,
};
