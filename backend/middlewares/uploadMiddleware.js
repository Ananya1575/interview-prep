const multer = require('multer');

// Use memory storage for cloud compatibility
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/jpg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpeg, .jpg, .png, .pdf, .doc, .docx, and .txt formats are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
