const mongoose = require('mongoose');

// const custodyLimitSchema = new mongoose.Schema({
//     custodyType: {
//         type: String,
//         required: true,
//         enum: ['remand_prison', 'under_trail', 'contempt_of_court']
//     },
//     spendLimit: { type: Number, default: 0 },
//     depositLimit: { type: Number, default: 0 },
//     purchaseStatus: { type: String, default: 'approved' }
// }, { _id: false });

const studentLocationSchema = new mongoose.Schema(
    {
        locationName: {
            type: String,
            required: true,
            trim: true,
        },
        global_location_id:{
            type:String,
            required:true
        },
        schoolName:{
            type:String
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }
        // custodyLimits:[custodyLimitSchema]
    },
    {
        timestamps: true,
    }
);
const studentLocation = mongoose.model('StudentLocation', studentLocationSchema);
module.exports = studentLocation
