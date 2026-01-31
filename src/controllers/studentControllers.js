const InmateSchema = require("../model/studentModel");
const mongoose = require("mongoose");
const logAudit = require("../utils/auditlogger");
const Inmate = require('../model/studentModel');
const bcrypt = require("bcrypt")
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { Parser } = require('json2csv');
const formatDateToYYYYMMDD = require("../utils/dateFormat");
const financialModel = require("../model/financialModel");
const userModel = require("../model/userModel");
const InmateLocation = require("../model/studentLocationModel");
const POSShoppingCart = require('../model/posShoppingCart');
const { faceRecognitionService, faceRecognitionExcludeUserService } = require("../service/faceRecognitionService");
const studentModel = require("../model/studentModel");
const classModel = require("../model/classModel");
const studentLocation = require("../model/studentLocationModel");
const fileUploadModel = require("../model/fileUploadModel");
const downloadInmatesCSV1 = async (req, res) => {
  try {
    const inmates = await Inmate.find().lean();

    if (!inmates || inmates.length === 0) {
      return res.status(404).json({ message: 'No inmates found to export' });
    }

    const fields = [
      'inmateId',
      'firstName',
      'lastName',
      'cellNumber',
      'balance',
      'dateOfBirth',
      'admissionDate',
      'crimeType',
      'status',
      'location_id',
      'custodyType'
    ];

    const formattedInmates = inmates.map(inmate => ({
      ...inmate,
      dateOfBirth: formatDateToYYYYMMDD(inmate.dateOfBirth),
      admissionDate: formatDateToYYYYMMDD(inmate.admissionDate),
    }));

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formattedInmates);

    res.setHeader('Content-Disposition', 'attachment; filename=inmates.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).end(csv);

  } catch (err) {
    res.status(500).json({ message: 'Failed to export CSV', error: err.message });
  }
};


const downloadInmatesCSV = async (req, res) => {
  try {
    const inmates = await Inmate.find().lean();

    if (!inmates || inmates.length === 0) {
      return res.status(404).json({ message: 'No inmates found to export' });
    }

    const fields = [
      'inmateId',
      'firstName',
      'lastName',
      'cellNumber',
      'balance',
      'dateOfBirth',
      'admissionDate',
      'crimeType',
      'status',
      'location_id',
      'custodyType'
    ];

    // Format each date field to dd-mm-yy
    const formattedInmates = inmates.map(inmate => ({
      ...inmate,
      dateOfBirth: formatDateToYYYYMMDD(inmate.dateOfBirth),
      admissionDate: formatDateToYYYYMMDD(inmate.admissionDate),
    }));

    const parser = new Parser({ fields });
    const csv = parser.parse(formattedInmates);

    res.setHeader('Content-Disposition', 'attachment; filename="inmates.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csv);

  } catch (err) {
    res.status(500).json({
      message: 'Failed to export CSV',
      error: err.message
    });
  }
};

const downloadStudentsCSV = async (req, res) => {
  try {
    // Populate class_info to get class_name, section, academic_year
    const students = await studentModel.find()
      .populate('class_info')  // populate class info
      .lean();

    if (!students || students.length === 0) {
      return res.status(404).json({ message: 'No students found to export' });
    }

    const fields = [
      'registration_number',
      'student_name',
      'father_name',
      'mother_name',
      'date_of_birth',
      'gender',
      'birth_place',
      'nationality',
      'mother_tongue',
      'blood_group',
      'religion',
      'deposite_amount',
      'class_name',
      'section',
      'academic_year',
      'contact_number'
    ];

    // Format student data
    const formattedStudents = students.map(student => ({
      registration_number: student.registration_number,
      student_name: student.student_name,
      father_name: student.father_name,
      mother_name: student.mother_name,
      date_of_birth: formatDateToYYYYMMDD(student.date_of_birth),
      gender: student.gender,
      birth_place: student.birth_place || '',
      nationality: student.nationality || '',
      mother_tongue: student.mother_tongue || '',
      blood_group: student.blood_group || '',
      religion: student.religion || '',
      deposite_amount: student.deposite_amount,
      class_name: student.class_info?.class_name || '',
      section: student.class_info?.section || '',
      academic_year: student.class_info?.academic_year || '',
      contact_number: student.contact_number,
      pro_pic: student.pro_pic || '',
      location_id: student.location_id || ''
    }));

    const parser = new Parser({ fields });
    const csv = parser.parse(formattedStudents);

    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csv);

  } catch (err) {
    console.error('❌ CSV export error:', err);
    res.status(500).json({
      message: 'Failed to export CSV',
      error: err.message
    });
  }
};

const createStudent = async (req, res) => {
  let savedStudent = null;
  let savedUser = null;

  try {
    const {
      registration_number, student_name, father_name, mother_name,
      date_of_birth, gender, birth_place, nationality, mother_tongue,
      blood_group, religion, deposite_amount, class_info, location_id,
      pro_pic, contact_number, descriptor
    } = req.body;
    const missingFields = [];
    if (!registration_number) missingFields.push("registration_number");
    // if (!deposite_amount && deposite_amount !== 0) missingFields.push("deposite_amount");
    if (!contact_number) missingFields.push("contact_number");
    if (!student_name) missingFields.push("student_name");
    if (!father_name) missingFields.push("father_name");
    if (!mother_name) missingFields.push("mother_name");
    // if (!date_of_birth) missingFields.push("date_of_birth");
    // if (!gender) missingFields.push("gender");
    // if (!class_info) missingFields.push("class_info");
    if (!location_id) missingFields.push("location_id");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      });
    }

    const validGenders = ["Male", "Female", "Other"];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ success: false, message: "Invalid gender value." });
    }
    

    // 2️⃣ Check duplicate student
    const existingStudent = await studentModel.findOne({ registration_number });
    if (existingStudent) return res.status(400).json({ success: false, message: "Registration number already exists." });

    // 3️⃣ Check descriptor in users
    if (descriptor) {
      const descriptorExists = await userModel.findOne({ descriptor });
      if (descriptorExists) return res.status(400).json({ success: false, message: "Descriptor already exists in users." });
    }

    // 4️⃣ Check if class exists or create new
    let classData = await classModel.findOne({
      class_name: class_info.class_name,
      section: class_info.section,
      academic_year: class_info.academic_year
    });

    if (!classData) {
      classData = await classModel.create(class_info);
    }

    // 5️⃣ Check if location exists
    const locationExists = await studentLocation.findById(location_id);
    if (!locationExists) return res.status(400).json({ success: false, message: "Invalid location_id" });

    // 6️⃣ Create user
    const hashedPassword = await bcrypt.hash(registration_number, 10);
    savedUser = await userModel.create({
      username: registration_number,
      fullname: student_name,
      password: hashedPassword,
      role: 'STUDENT',
      location_id,
      descriptor: descriptor || null
    });

    // 7️⃣ Create student with user_id
    savedStudent = await studentModel.create({
      registration_number,
      student_name,
      father_name,
      mother_name,
      date_of_birth,
      gender,
      birth_place,
      nationality,
      mother_tongue,
      blood_group,
      religion,
      deposite_amount,
      class_info: classData._id,
      location_id,
      contact_number,
      pro_pic: pro_pic || null,
      user_id: savedUser._id
    });

    // 8️⃣ Log audit
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: "CREATE",
      targetModel: "Student",
      targetId: savedStudent._id,
      description: `Created student ${registration_number} and corresponding user account`,
      changes: { student: savedStudent.toObject(), user: savedUser.toObject() }
    });

    return res.status(201).json({ success: true, message: "Student and user created successfully", student: savedStudent, user: savedUser });

  } catch (error) {
    // Rollback in case of any error
    if (savedStudent) await studentModel.findByIdAndDelete(savedStudent._id);
    if (savedUser) await userModel.findByIdAndDelete(savedUser._id);

    console.error("❌ Error creating student with user:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};



const getStudents = async (req, res) => {

  try {
    const {
      page = 1,
      limit = 10,
      sortField = 'createdAt',
      sortOrder,
      totalRecords,
      student_name,
      registration_number,
      gender,
      location_id,
      class_name,
      exactData,
      search
    } = req.query;

    const order = sortOrder === 'asc' ? 1 : -1;

    // 🧭 Build search/filter object
    const searchFilter = {};

    if (student_name) {
      searchFilter.student_name = { $regex: student_name, $options: 'i' }; // partial match
    }

    if (registration_number) {
      searchFilter.registration_number = { $regex: registration_number, $options: 'i' };
    }

    if (gender) {
      searchFilter.gender = gender;
    }

    if (location_id) {
      searchFilter.location_id = location_id;
    }
    if (search) {
      searchFilter.$or = [
        { student_name: { $regex: search, $options: 'i' } },
        { registration_number: { $regex: search, $options: 'i' } },
        { class_name: { $regex: search, $options: 'i' } }
      ];
    }
    if (exactData) {
      searchFilter.$expr = {
        $eq: [
          { $toLower: "$registration_number" },
          exactData.toLowerCase()
        ]
      };
    }

    // ✅ Handle class_name search (through populate)
    let classIds = [];
    if (class_name) {
      const classDocs = await classModel.find({
        class_name: { $regex: class_name, $options: 'i' }
      }).select('_id');

      if (classDocs.length) {
        classIds = classDocs.map(cls => cls._id);
        searchFilter.class_info = { $in: classIds };
      } else {
        // If no class matches found, return empty result
        return res.json({
          success: true,
          data: [],
          currentPage: Number(page),
          totalPages: 0,
          totalItems: 0,
          message: 'No students found'
        });
      }
    }

    let studentQuery = studentModel.find(searchFilter)
      .populate('location_id', 'locationName')
      .populate('class_info', 'class_name section academic_year')
      .populate('pro_pic', 'file_name file_url uploaded_by')
      .sort({ [sortField]: order });

    const currentPage = Number(page);
    const perPage = Number(limit);

    if (!totalRecords || totalRecords !== 'true') {
      const skip = (currentPage - 1) * perPage;
      studentQuery = studentQuery.skip(skip).limit(perPage);
    }

    const [students, totalItems] = await Promise.all([
      studentQuery,
      studentModel.countDocuments(searchFilter)
    ]);

    if (!students.length) {
      return res.status(200).json({
        success: true,
        message: 'No student data found',
        data: []
      });
    }

    const responseStudents = students.map(student => ({
      ...student.toObject(),
      currentPage: totalRecords === 'true' ? null : currentPage,
      totalPages: totalRecords === 'true' ? 1 : Math.ceil(totalItems / perPage),
      totalItems
    }));

    res.json({
      success: true,
      data: responseStudents,
      currentPage: totalRecords === 'true' ? null : currentPage,
      totalPages: totalRecords === 'true' ? 1 : Math.ceil(totalItems / perPage),
      totalItems,
      message: 'Students fetched successfully'
    });

  } catch (error) {
    console.error('getStudents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


const updateStudent = async (req, res) => {
  const { id } = req.params;
  let oldStudentData = null;
  let oldUserData = null;
  let uploadedProfilePic = null; // For rollback if needed

  try {
    const {
      registration_number,
      student_name,
      father_name,
      mother_name,
      date_of_birth,
      gender,
      birth_place,
      nationality,
      mother_tongue,
      blood_group,
      religion,
      deposite_amount,
      class_info,
      location_id,
      contact_number,
      descriptor,
      pro_pic
    } = req.body;

    // 1️⃣ Check if student exists
    const student = await studentModel.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Keep a copy of old data for rollback
    oldStudentData = student.toObject();
    const user = await userModel.findById(student.user_id);
    if (user) oldUserData = user.toObject();

    // 2️⃣ Validate gender if passed
    if (gender && !["Male", "Female", "Other"].includes(gender)) {
      return res.status(400).json({ success: false, message: "Invalid gender value." });
    }

    // 3️⃣ Check registration_number uniqueness if changed
    if (registration_number && registration_number !== student.registration_number) {
      const regExist = await studentModel.findOne({ registration_number, _id: { $ne: id } });
      if (regExist) {
        return res.status(400).json({ success: false, message: "Registration number already exists." });
      }
    }

    if (descriptor) {
      const descriptorExist = await userModel.findOne({
        descriptor,
        _id: { $ne: student.user_id }
      });
      if (descriptorExist) {
        return res.status(400).json({ success: false, message: "Descriptor already exists in other users." });
      }
    }

    // 4️⃣ Handle class_info if passed
    let classId = student.class_info;
    if (class_info) {
      let classData = await classModel.findOne({
        class_name: class_info.class_name,
        section: class_info.section,
        academic_year: class_info.academic_year
      });

      if (!classData) {
        classData = await classModel.create(class_info);
      }

      classId = classData._id;
    }

    // 5️⃣ Validate location if passed
    if (location_id) {
      const locationExists = await studentLocation.findById(location_id);
      if (!locationExists) {
        return res.status(400).json({ success: false, message: "Invalid location_id" });
      }
    }

    // 6️⃣ Handle profile pic if passed
    let profilePicId = student.pro_pic;
    if (pro_pic) {
      const fileExist = await fileUploadModel.findById(pro_pic);
      if (!fileExist) {
        return res.status(400).json({ success: false, message: "Invalid pro_pic file ID" });
      }
      profilePicId = pro_pic;
      uploadedProfilePic = fileExist;
    }

    // 7️⃣ Build dynamic update object for student
    const studentUpdateData = {
      ...(registration_number && { registration_number }),
      ...(student_name && { student_name }),
      ...(father_name && { father_name }),
      ...(mother_name && { mother_name }),
      ...(date_of_birth && { date_of_birth }),
      ...(gender && { gender }),
      ...(birth_place && { birth_place }),
      ...(nationality && { nationality }),
      ...(mother_tongue && { mother_tongue }),
      ...(blood_group && { blood_group }),
      ...(religion && { religion }),
      ...(req.body.deposite_amount !== undefined && {
        deposite_amount: student.deposite_amount + Number(req.body.deposite_amount)
      }),
      ...(classId && { class_info: classId }),
      ...(location_id && { location_id }),
      ...(contact_number && { contact_number }),
      ...(profilePicId && { pro_pic: profilePicId })
    };

    const updatedStudent = await studentModel.findByIdAndUpdate(id, studentUpdateData, { new: true });

    // 8️⃣ Update user
    const userUpdateData = {
      ...(registration_number && { username: registration_number }),
      ...(student_name && { fullname: student_name }),
      ...(location_id && { location_id }),
      ...(descriptor !== undefined && { descriptor: descriptor || null })
    };
    const updatedUser = await userModel.findByIdAndUpdate(student.user_id, userUpdateData, { new: true });

    // 9️⃣ Create Financial record if deposit changed
    if (deposite_amount !== undefined && deposite_amount !== student.deposite_amount) {
      const delta = deposite_amount - (student.deposite_amount || 0); // calculate added/removed deposit
      if (delta !== 0) {
        await financialModel.create({
          student_id: student._id.toString(),
          custodyType: "Student",
          transaction: delta > 0 ? "DEPOSIT" : "WITHDRAW",
          depositAmount: Math.abs(deposite_amount),
          depositName: student.student_name,
          type: "CASH",
          status: "COMPLETED"
        });
      }
    }

    // 🔟 Log audit
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: "UPDATE",
      targetModel: "Student",
      targetId: updatedStudent._id,
      description: `Updated student ${registration_number || student.registration_number} and corresponding user account`,
      changes: {
        student: updatedStudent.toObject(),
        user: updatedUser.toObject()
      }
    });

    return res.status(200).json({
      success: true,
      message: "Student and user updated successfully",
      student: updatedStudent,
      user: updatedUser
    });

  } catch (error) {
    console.error("❌ Error updating student:", error);

    try {
      // Rollback
      if (oldStudentData) await studentModel.findByIdAndUpdate(id, oldStudentData);
      if (oldUserData) await userModel.findByIdAndUpdate(oldUserData._id, oldUserData);
      if (uploadedProfilePic) {
        const filePath = path.join(__dirname, '..', uploadedProfilePic.file_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await fileUploadModel.findByIdAndDelete(uploadedProfilePic._id);
      }
    } catch (rollbackErr) {
      console.error("⚠️ Rollback failed:", rollbackErr);
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error - changes reverted",
      error: error.message
    });
  }
};


const deleteStudent = async (req, res) => {
  const { id } = req.params;

  let studentData = null;
  let userData = null;
  let profilePicData = null;

  try {
    // 1️⃣ Find student
    studentData = await studentModel.findById(id);
    if (!studentData) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // 2️⃣ Find user
    userData = await userModel.findById(studentData.user_id);

    // 3️⃣ Delete profile picture if exists
    if (studentData.pro_pic) {
      profilePicData = await fileUploadModel.findById(studentData.pro_pic);
      if (profilePicData) {
        const filePath = path.join(__dirname, '..', profilePicData.file_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Delete physical file
        }
        await fileUploadModel.findByIdAndDelete(profilePicData._id); // Delete DB record
      }
    }

    // 4️⃣ Delete student record
    await studentModel.findByIdAndDelete(id);

    // 5️⃣ Delete user account
    if (userData) {
      await userModel.findByIdAndDelete(userData._id);
    }

    // 6️⃣ Log audit
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: "DELETE",
      targetModel: "Student",
      targetId: id,
      description: `Deleted student ${studentData.registration_number} and associated user account`,
      changes: {
        student: studentData,
        user: userData,
        pro_pic: profilePicData
      }
    });

    return res.status(200).json({
      success: true,
      message: "Student, user, and profile picture deleted successfully"
    });

  } catch (error) {
    console.error("❌ Error deleting student:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

const getStudentById = async (req, res) => {
  try {
    const { id } = req.params; // student _id

    if (!id) {
      return res.status(400).json({ success: false, message: "Student ID is missing" });
    }

    // 🔎 Find the student and populate related fields
    const student = await studentModel.findById(id)
      .populate('location_id', 'locationName')
      .populate('class_info', 'class_name section academic_year')
      .populate('pro_pic', 'file_name file_url uploaded_by');

    if (!student) {
      return res.status(404).json({ success: false, message: "No student data found" });
    }

    res.status(200).json({
      success: true,
      data: student,
      message: "Student fetched successfully"
    });

  } catch (error) {
    console.error('getStudentById error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

const getStudentByIdProfile = async (req, res) => {
  try {
    const { id } = req.params; // student _id

    if (!id) {
      return res.status(400).json({ success: false, message: "Student ID is missing" });
    }

    // 🔎 Find the student and populate related fields
    const student = await studentModel.findById(id)
      .populate('location_id', 'locationName')
      .populate('class_info', 'class_name section academic_year')
      .populate('pro_pic', 'file_name file_url uploaded_by');

    if (!student) {
      return res.status(404).json({ success: false, message: "No student data found" });
    }

    res.status(200).json({
      success: true,
      data: student,
      message: "Student fetched successfully"
    });

  } catch (error) {
    console.error('getStudentById error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

const getStudentByData = async (req, res) => {
  try {
    const { id } = req.user // student _id

    if (!id) {
      return res.status(400).json({ success: false, message: "Student ID is missing" });
    }

    // 🔎 Find the student and populate related fields
    const student = await studentModel.findOne({ registration_number: req.params.regNo })
      .populate('location_id', 'locationName')
      .populate('class_info', 'class_name section academic_year')
      .populate('pro_pic', 'file_name file_url uploaded_by');

    if (!student) {
      return res.status(404).json({ success: false, message: "No student data found" });
    }

    res.status(200).json({
      success: true,
      data: student,
      message: "Student fetched successfully"
    });

  } catch (error) {
    console.error('getStudentById error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

const deleteInmate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "ID is missing" })
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    const updatedInmate = await InmateSchema.findByIdAndDelete(id);
    if (!updatedInmate) {
      return res.status(404).json({ message: "No data found" });
    }
    const inmateDelete = await userModel.deleteOne({ inmateId: updatedInmate.inmateId })

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'DELETE',
      targetModel: 'Inmate',
      targetId: updatedInmate._id,
      description: `Deleted inmate ${updatedInmate.inmateId}`,
      changes: updatedInmate.toObject()
    });
    res.status(200).json({ success: true, message: "Inmate successfully deleted" })
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
}

const searchInmates = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "Search query is required" });
    }

    const regex = new RegExp(query, "i");

    const filter = {
      $or: [
        { inmateId: regex },
        { firstName: regex },
        { lastName: regex },
        { cellNumber: regex },
      ],
    };

    const results = await InmateSchema.find(filter);
    const totalMatching = await InmateSchema.countDocuments(filter);
    const totalInmates = await InmateSchema.estimatedDocumentCount();

    res.status(200).json({
      success: true,
      data: results,
      totalPages: totalMatching,
      totalItems: results.length,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

const getInmateUsingInmateID = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "ID is missing" })
    }
    const findInmate = await InmateSchema.find({ inmateId: id });
    if (!findInmate) {
      return res.status(404).json({ message: "No data found" });
    }
    res.status(200).json({ success: true, data: findInmate, message: "Inmate successfully fetched" })
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
}

const getInmateTransactionData = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, days } = req.query;

    if (!id) {
      return res.status(400).json({ message: "ID is missing" });
    }

    let filter = { inmateId: id };

    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days, 10));
      filter.createdAt = { $gte: daysAgo };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);

    // Fetch POS and Financial transactions
    const [posTransactions, financialTransactions] = await Promise.all([
      POSShoppingCart.find(filter)
        .populate('products.productId')
        .lean(),
      financialModel.find(filter)
        .populate('workAssignId')
        .lean()
    ]);

    // Merge and tag
    let allTransactions = [
      ...posTransactions.map(t => ({ ...t, source: 'POS' })),
      ...financialTransactions.map(t => ({ ...t, source: 'FINANCIAL' }))
    ];

    // Sort newest first
    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    let paginated = allTransactions.slice(skip, skip + pageSize);

    // Add custodyType only for POS transactions
    paginated = await Promise.all(
      paginated.map(async (trx) => {
        if (trx.source === 'POS') {
          const inmate = await InmateSchema.findOne(
            { inmateId: trx.inmateId },
            { custodyType: 1, _id: 0 }
          ).lean();

          if (inmate) {
            trx.custodyType = inmate.custodyType;
          }
        }
        return trx;
      })
    );

    if (!allTransactions.length) {
      return res.status(404).send({ success: false, message: "No data found" });
    }

    // res.status(200).send({
    //   success: true,
    //   data: paginated,
    //   pagination: {
    //     total: allTransactions.length,
    //     page: parseInt(page),
    //     limit: pageSize,
    //     totalPages: Math.ceil(allTransactions.length / pageSize),
    //   },
    //   message: "Fetched inmate transactions",
    // });

    res.status(200).json({
      success: true,
      count: allTransactions.length,
      page: parseInt(page),
      limit: pageSize,
      totalPages: Math.ceil(allTransactions.length / pageSize),
      transactions: paginated,
      message: "Fetched inmate transactions",
    });



  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }




  // try {
  //   const { id } = req.params;
  //   const { page = 1, limit = 10, days } = req.query;

  //   if (!id) {
  //     return res.status(400).json({ message: "ID is missing" });
  //   }

  //   const pageNum = parseInt(page, 10);
  //   const limitNum = parseInt(limit, 10);
  //   const skip = (pageNum - 1) * limitNum;

  //   let filter = { inmateId: id };

  //   if (days) {
  //     const daysAgo = new Date();
  //     daysAgo.setDate(daysAgo.getDate() - parseInt(days, 10));
  //     filter.createdAt = { $gte: daysAgo };
  //   }

  //   const inmateDataTransaction = await financialModel
  //     .find(filter)
  //     .populate('workAssignId', 'name isActive')
  //     .sort({ createdAt: -1 })
  //     .skip(skip)
  //     .limit(limitNum);

  //   const totalCount = await financialModel.countDocuments(filter);

  //   if (!inmateDataTransaction.length) {
  //     return res.status(404).send({ success: false, message: "No data found" });
  //   }

  //   res.status(200).send({
  //     success: true,
  //     data: inmateDataTransaction,
  //     pagination: {
  //       total: totalCount,
  //       page: pageNum,
  //       limit: limitNum,
  //       totalPages: Math.ceil(totalCount / limitNum),
  //     },
  //     message: "Fetched inmate transactions",
  //   });

  // } catch (error) {
  //   res.status(500).json({
  //     success: false,
  //     message: "Internal server error",
  //     error: error.message,
  //   });
  // }
};

const getStudentTransactionData = async (req, res) => {
  try {
    const { id } = req.params; // student registration number
    const {
      page = 1,
      limit = 10,
      days,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = ''
    } = req.query;

    if (!id) {
      return res.status(400).json({ message: "Student registration number is required" });
    }

    // 🧭 Find student by registration number to get _id
    const student = await studentModel.findOne({ registration_number: id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const studentObjectId = student._id;
    let filter = { student_id: studentObjectId };

    // ⏳ Date filter
    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days, 10));
      filter.createdAt = { $gte: daysAgo };
    }

    // 🔍 Search filter (for depositor name, contact, or transaction)
    if (search.trim()) {
      filter.$or = [
        { depositedBy: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
        { transaction: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ✨ Fetch Financial & POS transactions in parallel
    const [financialTransactions, posTransactions] = await Promise.all([
      financialModel.find(filter)
        .populate('student_id')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .lean(),

      POSShoppingCart.find({ student_id: studentObjectId })
        .populate('products.productId')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .lean()
    ]);

    // 🧾 Tag each transaction type
    let allTransactions = [
      ...financialTransactions.map(t => ({ ...t, source: 'FINANCIAL' })),
      ...posTransactions.map(t => ({ ...t, source: 'POS' }))
    ];

    // 🪄 Sort combined transactions
    allTransactions.sort((a, b) => {
      const aDate = new Date(a[sortBy]);
      const bDate = new Date(b[sortBy]);
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    });

    // 📑 Paginate
    const totalCount = allTransactions.length;
    const paginatedTransactions = allTransactions.slice(skip, skip + limitNum);

    // 🕒 Format date for frontend
    const formattedTransactions = paginatedTransactions.map(trx => ({
      ...trx,
      createdAtFormatted: moment(trx.createdAt).format('YYYY-MM-DD HH:mm:ss')
    }));
    res.status(200).json({
      success: true,
      student: {
        id: student._id,
        registration_number: student.registration_number,
        name: student.student_name
      },
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      transactions: formattedTransactions,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch student transactions",
      error: error.message
    });
  }
};


const fetchInmateDataUsingFace = async (req, res) => {
  try {
    const { descriptor } = req.body
    if (!descriptor) {
      return res.status(404).send({ success: false, message: "could not find face" })
    }
    const allUsers = await userModel.find({}, { descriptor: 1, username: 1, role: 1, fullname: 1 })
    function euclideanDistance(desc1, desc2) {
      let sum = 0;
      for (let i = 0; i < desc1.length; i++) {
        let diff = desc1[i] - desc2[i];
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    }
    let bestMatch = null;
    let minDistance = Infinity;

    for (const user of allUsers) {
      if (!user.descriptor || user.descriptor.length !== descriptor.length) continue;

      const dist = euclideanDistance(user.descriptor, descriptor);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = user;
      }
    }
    const MATCH_THRESHOLD = 0.4;
    if (!bestMatch || minDistance > MATCH_THRESHOLD) {
      return res.status(400).json({ message: "Face not recognized" });
    }
    const userData = await Inmate.findOne({ user_id: bestMatch._id })
    return res.status(200).send({ success: true, data: userData, message: "data fetch successfully" })
  } catch (error) {
    return res.status(500).send({ success: false, message: "internal server down", error: error.message })
  }
}
module.exports = { createStudent, getStudents, deleteStudent, getStudentById, downloadStudentsCSV, updateStudent, deleteInmate, searchInmates, downloadInmatesCSV, getInmateUsingInmateID, getInmateTransactionData, fetchInmateDataUsingFace, getStudentByData, getStudentTransactionData,getStudentByIdProfile };