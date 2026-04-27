require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Transaction = require('../src/models/transactionModel');

function makePrefix(date) {
  const d = date ? new Date(date) : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `GH${yy}-${mm}${dd}`;
}

function extractSeq(displayId, prefix) {
  if (!displayId || !prefix) return 0;
  const seqStr = displayId.replace(prefix, '');
  const n = parseInt(seqStr, 10);
  return isNaN(n) ? 0 : n;
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for displayId backfill');

    // Build initial map of max sequence per prefix from existing displayIds
    const docsWith = await Transaction.find({ displayId: { $exists: true, $ne: null } }).select('displayId dataApplied createdAt').lean();
    const prefixMax = {};
    for (const d of docsWith) {
      const refDate = d.dataApplied || d.createdAt || new Date();
      const prefix = makePrefix(refDate);
      const seq = extractSeq(d.displayId, prefix);
      if (!prefixMax[prefix] || seq > prefixMax[prefix]) prefixMax[prefix] = seq;
    }

    // Find transactions missing displayId
    const missing = await Transaction.find({ $or: [ { displayId: { $exists: false } }, { displayId: null } ] }).select('_id dataApplied createdAt').lean();
    console.log(`Found ${missing.length} transactions missing displayId`);

    // Sort missing by createdAt ascending so older get lower sequence numbers
    missing.sort((a, b) => new Date(a.dataApplied || a.createdAt) - new Date(b.dataApplied || b.createdAt));

    let updated = 0;
    for (const tx of missing) {
      const refDate = tx.dataApplied || tx.createdAt || new Date();
      const prefix = makePrefix(refDate);
      const nextSeq = (prefixMax[prefix] || 0) + 1;
      prefixMax[prefix] = nextSeq;
      const displayId = `${prefix}${String(nextSeq).padStart(2, '0')}`;

      await Transaction.findByIdAndUpdate(tx._id, { $set: { displayId } });
      updated++;
      if (updated % 50 === 0) console.log(`Updated ${updated} transactions...`);
    }

    console.log(`Backfill complete. Updated ${updated} transaction(s).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Backfill error:', err);
    process.exit(1);
  }
})();
