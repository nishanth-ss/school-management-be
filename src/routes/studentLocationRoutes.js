const express = require('express');
const { AddLocation, getAllLocation, updateLocation, deleteLocation, adminUpdateLocation } = require('../controllers/studentLocationController');
const router = express.Router();

router.post("/",AddLocation)
router.get("/",getAllLocation)
router.put("/:id",updateLocation)
router.delete("/:id",deleteLocation)

 router.post("/admin/:id",adminUpdateLocation)

module.exports = router;