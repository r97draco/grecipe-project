const { unlink } = require('node:fs/promises');
const tesseract = require('tesseract.js');
const logger = require('../config/logger');
const { parseReceiptText } = require('../utils/inventory');
const ApiError = require('../utils/ApiError');

exports.parseReceipt = async (req, res, next) => {
  if (!req.file) return next(new ApiError(400, 'Please upload a receipt image'));
  try {
    const rawData = await tesseract.recognize(req.file.path, 'eng');
    const items = parseReceiptText(rawData.data.text);
    res.status(200).json({ message: 'Review the scanned items before adding them', items, confidence: rawData.data.confidence });
  } catch (error) {
    next(error);
  } finally {
    try { await unlink(req.file.path); }
    catch (error) { if (error.code !== 'ENOENT') logger.warn('Could not remove temporary receipt'); }
  }
};
