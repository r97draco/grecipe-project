const express = require('express');
const multer = require('multer');
const {
  updateItem,
  deleteItem,
  getItemsByUser,
  createItems,
  createItem,
  getItemsByFamily
} = require('../controllers/ItemsController');
const { parseReceipt } = require('../controllers/ReceiptController');

const authMiddleware = require('../middlewares/auth');

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

const inventoryRouter = express.Router();
inventoryRouter.use(authMiddleware, require('../middlewares/profile'));

inventoryRouter.get('/', getItemsByUser);
inventoryRouter.get('/family', getItemsByFamily)
inventoryRouter.post('/add', createItems);
inventoryRouter.put('/update/:id', updateItem);
inventoryRouter.delete('/delete/:id', deleteItem);
inventoryRouter.post('/upload', upload.single('receipt'), parseReceipt);

module.exports = inventoryRouter;
