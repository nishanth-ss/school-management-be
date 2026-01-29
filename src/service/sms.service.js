const axios = require("axios");
const twilio = require("twilio");

exports.sendSMS1=async(otp,number)=>{
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

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.sendSMS = async (otp, number) => {
  try {
    const response = await client.messages.create({
      body: `Your AG School OTP is ${otp}. It is valid for 30 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: number, 
    });

    return {
      status: true,
      sid: response.sid,
      message: "OTP sent successfully",
    };
  } catch (error) {
    return {
      status: false,
      message: error.message,
    };
  }
};