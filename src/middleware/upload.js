import multer from 'multer';
import path from 'path';

// Configure storage
const storage = multer.memoryStorage(); // Store in memory as buffer

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    req.fileValidationError = 'Only image files are allowed (jpeg, jpg, png, gif, webp)';
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB max file size
  },
  fileFilter: fileFilter,
});

// Middleware for single profile picture upload
export const uploadProfilePicture = upload.single('profile_picture');

