require('dotenv').config({path:'.env'});
const mongoose = require('mongoose');
const Transaction = require('../src/models/transactionModel');
(async ()=>{
  try{
    await mongoose.connect(process.env.MONGO_URI);
    const total = await Transaction.countDocuments();
    const withDisplay = await Transaction.countDocuments({ displayId: { $exists: true, $ne: null } });
    const sampleNo = await Transaction.find({ displayId: { $exists: false } }).limit(10).lean();
    const sampleYes = await Transaction.find({ displayId: { $exists: true } }).limit(10).lean();
    console.log(JSON.stringify({ total, withDisplay, withoutDisplay: total-withDisplay, sampleNo: sampleNo.map(s => ({ _id: s._id, currentStatus: s.currentStatus, dataApplied: s.dataApplied, createdAt: s.createdAt, dateApproved: s.dateApproved, displayId: s.displayId })), sampleYes: sampleYes.map(s => ({ _id: s._id, currentStatus: s.currentStatus, dataApplied: s.dataApplied, createdAt: s.createdAt, dateApproved: s.dateApproved, displayId: s.displayId })) }, null,2));
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('ERR', e);
    process.exit(1);
  }
})();
