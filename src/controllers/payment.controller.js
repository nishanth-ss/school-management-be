const crypto = require('crypto');
const Student = require('../model/studentModel');
const Transaction = require('../model/transactionModel.js');
const { createOrder } = require('../service/razorpay.service.js');
const userModel = require('../model/userModel.js');
const studentModel = require('../model/studentModel');

// 1️⃣ Create Razorpay Order
exports.createOrder = async (req, res) => {
    try {
        const { studentId, amount } = req.body;
        const studentData = await studentModel.findOne({ user_id: studentId })
        const shortReceipt = `order_${studentData.registration_number}_${Date.now().toString().slice(-6)}`;
        const order = await createOrder(amount, shortReceipt);
        console.log("<><>order", order)
        const transaction = new Transaction({
            student_id: studentId,
            order_id: order.id,
            amount,
            user_id: studentData.user_id
        });
        await transaction.save();

        res.status(200).json({ success: true, order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Order creation failed' });
    }
};

// 2️⃣ Verify Payment
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature,studentId } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        const transaction = await Transaction.findOneAndUpdate(
            { order_id: razorpay_order_id },
            { payment_id: razorpay_payment_id, status: 'paid' },
            { new: true }
        );
console.log("<><>studentId",studentId)
        await userModel.findByIdAndUpdate(studentId, {
            subscription: true,
            subscriptionStart: new Date(),
            subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });

        // await Student.findByIdAndUpdate(transaction.student_id, {
        //     $inc: { wallet_balance: transaction.amount }
        // });

        res.json({ success: true, message: "Payment verified and wallet updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};
