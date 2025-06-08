const { rtdb } = require("../../database");

function getDirectionFromHeading(heading) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
    "N",
  ];
  const index = Math.round(heading / 22.5) % 16;
  return directions[index];
}

async function saveIMULog({
  timestamp,
  sessionId = null,
  acceleration,
  gyroscope,
  magnetometer,
  heading,
  direction,
  status,
}) {
  const parsedHeading = parseFloat(heading || 0);
  const calculatedDirection = getDirectionFromHeading(parsedHeading);

  const ref = firestore.collection("imu_logs").doc();
  const data = {
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    sessionId: sessionId,
    acceleration: {
      x: parseFloat(acceleration?.x || 0),
      y: parseFloat(acceleration?.y || 0),
      z: parseFloat(acceleration?.z || 0),
    },
    gyroscope: {
      x: parseFloat(gyroscope?.x || 0),
      y: parseFloat(gyroscope?.y || 0),
      z: parseFloat(gyroscope?.z || 0),
    },
    magnetometer: {
      magnetometerX: parseFloat(magnetometer?.magnetometerX || 0),
      magnetometerY: parseFloat(magnetometer?.magnetometerY || 0),
      magnetometerZ: parseFloat(magnetometer?.magnetometerZ || 0),
    },
    heading: parsedHeading,
    direction: direction || calculatedDirection,
    status: status || "Normal",
    createdAt: new Date(),
  };

  await ref.set(data);
  return {
    status: "success",
    code: 200,
    message: "IMU log saved successfully",
    data: { id: ref.id, ...data },
  };
}

async function getAllSummaries() {
  const snapshot = await rtdb.ref('realtime_monitoring').once('value');
  const val = snapshot.val();

  if (!val) {
    return {
      average_heading: 0,
      heading_range: [0, 0],
      total_orientation_changes: 0,
      max_turn_angle: 0,
    };
  }

  const entries = val
    .filter((item) => item && typeof item === 'object')
    .flatMap((obj) => Object.values(obj))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  let total_heading = 0;
  let max_turn_angle = 0;
  let count = 0;
  let previous_heading = null;
  let min_heading = Infinity;
  let max_heading = -Infinity;

  entries.forEach((entry) => {
    const heading = Number(entry.metadata?.heading);
    if (heading == null || isNaN(heading)) return;

    total_heading += heading;
    count++;

    min_heading = Math.min(min_heading, heading);
    max_heading = Math.max(max_heading, heading);

    if (previous_heading !== null) {
      const diff = Math.abs(heading - previous_heading);
      max_turn_angle = Math.max(max_turn_angle, diff);
    }
    previous_heading = heading;
  });

  return {
    average_heading: count > 0 ? total_heading / count : 0,
    heading_range: count > 0 ? [min_heading, max_heading] : [0, 0],
    total_orientation_changes: count > 1 ? count - 1 : 0,
    max_turn_angle,
  };
}

async function getSummariesByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await rtdb.ref('realtime_monitoring').once('value');
  const val = snapshot.val();

  if (!val) {
    return {
      average_heading: 0,
      heading_range: [0, 0],
      total_orientation_changes: 0,
      max_turn_angle: 0,
    };
  }

  const entries = val
    .filter((item) => item && typeof item === 'object')
    .flatMap((obj) => Object.values(obj))
    .filter((entry) => {
      if (!entry.createdAt) return false;
      const ts = new Date(entry.createdAt);
      return ts >= startOfDay && ts <= endOfDay;
    });

  entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  let total_heading = 0;
  let max_turn_angle = 0;
  let count = 0;
  let previous_heading = null;
  let min_heading = Infinity;
  let max_heading = -Infinity;

  entries.forEach((entry) => {
    const heading = Number(entry.metadata?.heading);
    if (heading == null || isNaN(heading)) return;

    total_heading += heading;
    count++;

    min_heading = Math.min(min_heading, heading);
    max_heading = Math.max(max_heading, heading);

    if (previous_heading !== null) {
      const diff = Math.abs(heading - previous_heading);
      max_turn_angle = Math.max(max_turn_angle, diff);
    }
    previous_heading = heading;
  });

  return {
    average_heading: count > 0 ? total_heading / count : 0,
    heading_range: count > 0 ? [min_heading, max_heading] : [0, 0],
    total_orientation_changes: count > 1 ? count - 1 : 0,
    max_turn_angle,
  };
}

async function getSummariesByDateAndSessionId(date, sessionId) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await rtdb
    .ref(`realtime_monitoring/${sessionId}`)
    .once('value');
  const val = snapshot.val();

  if (!val) {
    return {
      average_heading: 0,
      heading_range: [0, 0],
      total_orientation_changes: 0,
      max_turn_angle: 0,
    };
  }

  const entries = Object.values(val).filter((entry) => {
    if (!entry.createdAt) return false;
    const ts = new Date(entry.createdAt);
    return ts >= startOfDay && ts <= endOfDay;
  });

  if (entries.length === 0) {
    return {
      average_heading: 0,
      heading_range: [0, 0],
      total_orientation_changes: 0,
      max_turn_angle: 0,
    };
  }

  entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  let total_heading = 0;
  let max_turn_angle = 0;
  let count = 0;
  let previous_heading = null;
  let min_heading = Infinity;
  let max_heading = -Infinity;

  entries.forEach((entry) => {
    const heading = Number(entry.metadata?.heading);
    if (isNaN(heading)) return;

    total_heading += heading;
    count++;

    min_heading = Math.min(min_heading, heading);
    max_heading = Math.max(max_heading, heading);

    if (previous_heading !== null) {
      const diff = Math.abs(heading - previous_heading);
      max_turn_angle = Math.max(max_turn_angle, diff);
    }
    previous_heading = heading;
  });

  return {
    average_heading: count > 0 ? total_heading / count : 0,
    heading_range: count > 0 ? [min_heading, max_heading] : [0, 0],
    total_orientation_changes: count > 1 ? count - 1 : 0,
    max_turn_angle,
  };
}

async function getAllIMULogs() {
  const snapshot = await rtdb.ref('realtime_monitoring').once('value');
  const val = snapshot.val();
  if (!val) return [];

  const data = [];

  for (const [sessionId, sessionEntries] of Object.entries(val)) {
    for (const [id, entry] of Object.entries(sessionEntries)) {
      if (!entry.metadata) continue;
      data.push({
        id,
        sessionId: Number(sessionId),
        ...entry,
        createdAt: entry.createdAt || null,
      });
    }
  }

  return data.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

async function getIMULogById(sessionId, id) {
  const snapshot = await rtdb
    .ref(`realtime_monitoring/${sessionId}/${id}`)
    .once('value');
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  return {
    id,
    sessionId: Number(sessionId),
    ...data,
    createdAt: data.createdAt || null,
  };
}

async function getIMULogsByDate(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const snapshot = await rtdb.ref('realtime_monitoring').once('value');
  const val = snapshot.val();
  if (!val) return [];

  const result = [];

  for (const [sessionId, sessionEntries] of Object.entries(val)) {
    for (const [id, entry] of Object.entries(sessionEntries)) {
      if (!entry.metadata) continue;
      const ts = entry.createdAt ? new Date(entry.createdAt) : null;
      if (ts && ts >= start && ts <= end) {
        result.push({
          id,
          sessionId: Number(sessionId),
          ...entry,
          createdAt: entry.createdAt,
        });
      }
    }
  }

  return result.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

async function getIMULogsByDateAndSessionId(start, end, sessionId) {
  const snapshot = await rtdb
    .ref(`realtime_monitoring/${sessionId}`)
    .once('value');
  const val = snapshot.val();
  if (!val) return [];

  return Object.entries(val)
    .map(([id, entry]) => ({
      id,
      sessionId: Number(sessionId),
      ...entry,
    }))
    .filter((item) => {
      const ts = new Date(item.createdAt);
      return item.metadata && ts >= start && ts <= end;
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function getAvailableDates() {
  const snapshot = await rtdb.ref('realtime_monitoring').once('value');
  const val = snapshot.val();
  if (!val) return [];

  const dates = new Set();

  for (const sessionEntries of Object.values(val)) {
    for (const entry of Object.values(sessionEntries)) {
      if (entry.createdAt) {
        const date = new Date(entry.createdAt).toISOString().split('T')[0];
        dates.add(date);
      }
    }
  }

  return Array.from(dates).sort((a, b) => new Date(a) - new Date(b));
}

async function getAvailableSessionIdsFromDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await rtdb.ref('realtime_monitoring').once('value');
  const val = snapshot.val();
  if (!val) return [];

  const sessionIds = new Set();

  for (const [sessionId, sessionEntries] of Object.entries(val)) {
    for (const entry of Object.values(sessionEntries)) {
      if (entry.createdAt) {
        const ts = new Date(entry.createdAt);
        if (ts >= startOfDay && ts <= endOfDay) {
          sessionIds.add(Number(sessionId));
          break;
        }
      }
    }
  }

  return Array.from(sessionIds).sort((a, b) => a - b);
}

async function getAvailableDatesWithSessions() {
  const snapshot = await rtdb.ref('realtime_monitoring').once('value');
  const val = snapshot.val();
  if (!val) return [];

  const dateSessionMap = new Map();

  for (const [sessionId, sessionEntries] of Object.entries(val)) {
    for (const entry of Object.values(sessionEntries)) {
      if (!entry.createdAt) continue;
      const date = new Date(entry.createdAt).toISOString().split('T')[0];
      if (!dateSessionMap.has(date)) {
        dateSessionMap.set(date, new Set());
      }
      dateSessionMap.get(date).add(Number(sessionId));
    }
  }

  const result = Array.from(dateSessionMap.entries())
    .map(([date, sessionSet]) => ({
      label: new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      value: date,
      sessions: Array.from(sessionSet)
        .sort((a, b) => a - b)
        .map((sessionId) => ({
          label: `Session ${sessionId}`,
          value: sessionId,
        })),
    }))
    .sort((a, b) => new Date(a.value) - new Date(b.value));

  return result;
}

async function deleteIMULogByID(sessionId, id) {
  const ref = rtdb.ref(`realtime_monitoring/${sessionId}/${id}`);
  const snapshot = await ref.once("value");
  if (!snapshot.exists()) return false;
  await ref.remove();
  return true;
}

async function deleteIMULogByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await rtdb.ref("realtime_monitoring").once("value");
  const val = snapshot.val();
  if (!val) return 0;

  let deleteCount = 0;

  for (const [sessionId, sessionEntries] of Object.entries(val)) {
    for (const [id, entry] of Object.entries(sessionEntries)) {
      if (entry.createdAt) {
        const ts = new Date(entry.createdAt);
        if (ts >= startOfDay && ts <= endOfDay) {
          await rtdb.ref(`realtime_monitoring/${sessionId}/${id}`).remove();
          deleteCount++;
        }
      }
    }
  }

  return deleteCount;
}

async function deleteIMULogByDateAndSessionId(startOfDay, endOfDay, sessionId) {
  const snapshot = await rtdb
    .ref(`realtime_monitoring/${sessionId}`)
    .once("value");
  const val = snapshot.val();
  if (!val) return 0;

  let deleteCount = 0;

  for (const [id, entry] of Object.entries(val)) {
    if (entry.createdAt) {
      const ts = new Date(entry.createdAt);
      if (ts >= startOfDay && ts <= endOfDay) {
        await rtdb.ref(`realtime_monitoring/${sessionId}/${id}`).remove();
        deleteCount++;
      }
    }
  }

  return deleteCount;
}

module.exports = {
  saveIMULog,
  getAllSummaries,
  getSummariesByDate,
  getSummariesByDateAndSessionId,
  getAllIMULogs,
  getIMULogById,
  getIMULogsByDate,
  getIMULogsByDateAndSessionId,
  getAvailableDates,
  getAvailableSessionIdsFromDate,
  getAvailableDatesWithSessions,
  deleteIMULogByID,
  deleteIMULogByDate,
  deleteIMULogByDateAndSessionId,
};
