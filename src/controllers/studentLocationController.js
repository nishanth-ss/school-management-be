const studentLocation = require("../model/studentLocationModel");
const UserSchema = require("../model/userModel")
const axios = require('axios')
exports.AddLocation = async (req, res) => {
    try {
        const { locationName,schoolName,baseUrl, custodyLimits } = req.body;
        if (!locationName) {
            return res.status(400).json({ success: false, message: "Location name is required." });
          }
          // if (!Array.isArray(custodyLimits) || custodyLimits.length === 0) {
          //   return res.status(400).json({ success: false, message: "At least one custody limit is required." });
          // }
      
          const checkLocationName = locationName.trim().toLowerCase();
          const existing = await studentLocation.findOne();
          if (existing) {
            return res.status(409).json({ success: false, message: "Location already exists." });
          }

          // const allowedTypes = ['remand_prison', 'under_trail', 'contempt_of_court'];
          // for (const c of custodyLimits) {
          //   if (!allowedTypes.includes(c.custodyType)) {
          //     return res.status(400).json({ success: false, message: `Invalid custodyType: ${c.custodyType}` });
          //   }
          // }

        const payload = { name:schoolName,baseUrl:baseUrl,location:locationName}
          const globalLocationRes = await axios.post(`${process.env.GLOBAL_URL}/api/location`,payload);
          const location = new studentLocation({
            locationName: checkLocationName,
            createdBy: req.user.id,
            updatedBy: req.user.id,
            schoolName:schoolName,
            global_location_id:globalLocationRes.data._id
          });

          const result = await location.save();

          const adminAccess = await UserSchema.findById(req.user.id);
          if (!adminAccess.location_id) {
            await UserSchema.findByIdAndUpdate(req.user.id, { location_id: result._id });
          }

          return res.status(201).json({
            success: true,
            data: result,
            message: "Location created successfully."
          });
    } catch (error) {
      console.log("<><>error",error);
      
        res.status(500).send({ success: false, message: "internal server down", message:error.response.data.message?error.response.data.message:error.message })
    }
}

// exports.updateLocation = async (req, res) => {
//     try {
//         const { locationName, depositLimit, spendLimit } = req.body;
//         const { id } = req.params;
//         if (!locationName || depositLimit == null || spendLimit == null) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Please provide locationName, depositLimit, and spendLimit.",
//             });
//         }

//         const existingLocation = await studentLocation.findById(id);
//         if (!existingLocation) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Location not found with the provided ID.",
//             });
//         }

//         const updateData = { locationName, depositLimit, spendLimit,updatedBy: req.user.id };
//         const updatedLocation = await studentLocation.findByIdAndUpdate(id, updateData, {
//             new: true,
//             runValidators: true,
//         });

//         if (!updatedLocation) {
//             return res.status(500).json({
//                 success: false,
//                 message: "Failed to update the location. Please try again.",
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Location updated successfully.",
//             data: updatedLocation,
//         });

//     } catch (error) {
//         console.error("Error updating location:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Internal server error. Please try again later.",
//         });
//     }
// };

exports.updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
    // const { locationName, custodyLimits } = req.body;
    const { locationName,schoolName,baseUrl } = req.body;

    // --- 1. Validate request ---
    // if (!locationName && !custodyLimits) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Provide at least one field to update: locationName or custodyLimits."
    //   });
    // }
     if (!locationName) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update: locationName or custodyLimits."
      });
    }

    // --- 2. Check existence ---
    const existingLocation = await studentLocation.findById(id);
    if (!existingLocation) {
      return res.status(404).json({
        success: false,
        message: "Location not found with the provided ID."
      });
    }
    const payload = {
      name:schoolName,
      baseUrl:baseUrl,
      location:locationName
    }
    const globalLocationUpdateRes = await axios.put(`${process.env.GLOBAL_URL}/api/location/${existingLocation.global_location_id}`,payload);
    // --- 3. Prepare update data ---
    const updateData = { updatedBy: req.user.id };
    if (locationName) updateData.locationName = locationName.trim().toLowerCase();
    if(schoolName) updateData.schoolName=schoolName.trim().toLowerCase()
    // if (custodyLimits) {
    //   if (!Array.isArray(custodyLimits) || custodyLimits.length === 0) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "custodyLimits must be a non-empty array."
    //     });
    //   }

    //   const allowedTypes = ['remand_prison', 'under_trail', 'contempt_of_court'];
    //   for (const c of custodyLimits) {
    //     if (!allowedTypes.includes(c.custodyType)) {
    //       return res.status(400).json({
    //         success: false,
    //         message: `Invalid custodyType: ${c.custodyType}`
    //       });
    //     }
    //   }

    //   // Replace entire custodyLimits array
    //   updateData.custodyLimits = custodyLimits;
    // }

    // --- 4. Update document ---
    const updatedLocation = await studentLocation.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    return res.status(200).json({
      success: true,
      message: "Location updated successfully.",
      data: updatedLocation
    });

    } catch (error) {
         res.status(500).send({ success: false, message: "internal server down", message:error.response.data.message?error.response.data.message:error.message })
    }
};


exports.getAllLocation = async (req, res) => {
    try {
        const response = await studentLocation.find().populate({ path: 'createdBy', select: 'fullname' }).populate({ path: 'updatedBy', select: 'fullname' })
        if (!response.length) {
            res.status(404).send({ success: false, data: response, message: "could not find location" })
        }
        res.status(200).send({ success: true, data: response, message: "location fetch successfully" })
    } catch (error) {
        res.status(500).send({ success: false, message: "internal server down" })
    }
}

exports.deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedLocation = await studentLocation.findByIdAndDelete(id);

        if (!deletedLocation) {
            return res.status(404).json({
                success: false,
                message: "Location not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Location deleted successfully.",
        });
    } catch (error) {
        console.error("Delete Location Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

exports.adminUpdateLocation = async(req,res)=>{
  try {
    const response = await axios.put(`${process.env.GLOBAL_URL}/api/location/${req.params.id}`,req.body)
    if(response.data.status){
      return res.status(200).send({status:true,data:response.data.data,message:response.data.message})
    }
    
  } catch (error) {
    return res.status(500).send({status:false,message:"internal server down"})
  }
}