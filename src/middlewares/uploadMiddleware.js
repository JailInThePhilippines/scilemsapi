const cloudinary = require('../config/cloudinary');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadToCloudinary = async (file) => {
  try {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          public_id: `equipments/${Date.now()}`,
          folder: 'equipments/'
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );
      
      stream.end(file.buffer);
    });
  } catch (error) {
    throw new Error('Cloudinary upload failed');
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
};