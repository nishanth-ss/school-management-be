const express = require('express');
const { registerFaceID, loginFaceID } = require('../controllers/faceRecognationController');
const router = express.Router();

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });


router.post("/register-face",upload.any(),registerFaceID)
router.post("/login-face",upload.none(),loginFaceID)


module.exports = router;