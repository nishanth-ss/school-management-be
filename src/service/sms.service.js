const axios = require("axios");

exports.sendSMS=async(otp,number)=>{
    try {
        const message = `Your School Management OTP is ${otp}. Do not share it. Valid for 5 minutes.`;
        const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",               
        sender_id: "TXTIND",
        message:message,
        language: "english",
        numbers: number     
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    return { status:true, data:response.data}
    } catch (error) {
        return { status:false,message:`Something went wrong (${error.message})`}
    }
}