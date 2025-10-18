const express = require('express');
const { createStudent, getStudents, updateStudent, searchInmates, deleteInmate, downloadInmatesCSV, getInmateUsingInmateID, getInmateTransactionData, fetchInmateDataUsingFace } = require('../controllers/studentControllers');
const router = express.Router();

router.post("/create",createStudent);
router.get('/',getStudents);
router.get('/download-csv/:id', downloadInmatesCSV);
router.get('/search',searchInmates);
router.post('/fetch-by-face',fetchInmateDataUsingFace)
router.get('/inmate-transaction/:id',getInmateTransactionData);
router.get('/inmateid/:id',getInmateUsingInmateID);
router.put('/:id',updateStudent);
router.delete('/:id',deleteInmate);

module.exports = router;