const Visitor = require('../models/visitorModel');

// Helper to get IP address
function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '';
}

exports.createVisitor = async (req, res) => {
  try {
    const { sessionToken, latitude: latRaw, longitude: lngRaw, accuracy: accRaw, timestamp, country, region, city } = req.body || {};
    const latitude = latRaw != null ? parseFloat(latRaw) : undefined;
    const longitude = lngRaw != null ? parseFloat(lngRaw) : undefined;
    const accuracy = accRaw != null ? parseFloat(accRaw) : undefined;
    if (!sessionToken) {
      return res.status(400).json({ message: 'sessionToken is required' });
    }

    const ip = getIp(req);
    const userAgent = req.headers['user-agent'] || '';

    // Upsert a visitor record by sessionToken so each browser yields one record
    const setOnInsert = {
      sessionToken,
      ip,
      userAgent,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    };

    if (Number.isFinite(latitude) && latitude >= -90 && latitude <= 90) setOnInsert.latitude = latitude;
    if (Number.isFinite(longitude) && longitude >= -180 && longitude <= 180) setOnInsert.longitude = longitude;
    if (Number.isFinite(accuracy) && accuracy >= 0) setOnInsert.accuracy = accuracy;
    if (country) setOnInsert.country = country;
    if (region) setOnInsert.region = region;
    if (city) setOnInsert.city = city;

    const update = { $setOnInsert: setOnInsert };

    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    const visitor = await Visitor.findOneAndUpdate({ sessionToken }, update, options);

    res.json({ message: 'Visitor recorded', visitor });
  } catch (err) {
    console.error('createVisitor error', err);
    res.status(500).json({ message: 'Failed to create visitor' });
  }
};

exports.getUniqueCount = async (req, res) => {
  try {
    // Count distinct non-empty sessionTokens
    const distinct = await Visitor.distinct('sessionToken', { sessionToken: { $ne: null } });
    const total = distinct.length;
    res.json({ totalUnique: total });
  } catch (err) {
    console.error('getUniqueCount error', err);
    res.status(500).json({ message: 'Failed to get visitor count' });
  }
};

exports.getTodayCount = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0,0,0,0);
    const end = new Date();

    const distinct = await Visitor.distinct('sessionToken', { createdAt: { $gte: start, $lte: end }, sessionToken: { $ne: null } });
    res.json({ totalToday: distinct.length });
  } catch (err) {
    console.error('getTodayCount error', err);
    res.status(500).json({ message: 'Failed to get today count' });
  }
};

exports.getByLocation = async (req, res) => {
  try {
    const pipeline = [
      { $match: { country: { $exists: true, $ne: null } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $project: { country: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ];

    const locations = await Visitor.aggregate(pipeline);
    res.json({ locations });
  } catch (err) {
    console.error('getByLocation error', err);
    res.status(500).json({ message: 'Failed to get visitors by location' });
  }
};

exports.getCoords = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const visitors = await Visitor.find({
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('sessionToken latitude longitude accuracy city region country timestamp -_id');

    res.json({ visitors });
  } catch (err) {
    console.error('getCoords error', err);
    res.status(500).json({ message: 'Failed to get visitor coordinates' });
  }
};
