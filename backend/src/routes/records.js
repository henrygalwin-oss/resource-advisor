'use strict';

const express  = require('express');
const multer   = require('multer');
const router   = express.Router();
const { protect } = require('../middleware/auth');

const {
  getRecords,
  createRecord,
  getRecord,
  updateRecord,
  deleteRecord,
  bulkUpload,
  getSummary,
} = require('../controllers/recordsController');
const { getAnalytics } = require('../controllers/analyticsController');

// Multer: store CSV in memory (buffer), max 5 MB, only allow text/csv
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = file.mimetype === 'text/csv'
      || file.originalname.toLowerCase().endsWith('.csv');
    cb(ok ? null : new Error('Only CSV files are accepted'), ok);
  },
});

// ── Bulk upload, summary & analytics — must be defined BEFORE /:id ─────────────
router.post('/bulk-upload', protect, upload.single('file'), bulkUpload);
router.get('/summary',      protect, getSummary);
router.get('/analytics',    protect, getAnalytics);

// ── Standard CRUD (auth required) ─────────────────────────────────────────────
router.route('/')
  .get(protect, getRecords)
  .post(protect, createRecord);

router.route('/:id')
  .get(protect, getRecord)
  .patch(protect, updateRecord)
  .delete(protect, deleteRecord);

module.exports = router;
