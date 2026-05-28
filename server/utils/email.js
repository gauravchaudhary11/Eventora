const nodeMailer=require('nodemailer');
const dotenv=require('dotenv');
dotenv.config();

const transporter=nodeMailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS
    }
});

const sendMail = async (mailOptions, label) => {
    try{
        await transporter.sendMail(mailOptions);
        console.log(`${label} sent to ${mailOptions.to}`);
    }
    catch(err){
        console.error(`Error sending ${label.toLowerCase()} to ${mailOptions.to}:`, err);
        throw err;
    }
};

exports.sendOtpEmail=async(email,otp,type)=>{
    const isPasswordReset = type === 'password_reset';
    const mailOptions={
        from:process.env.EMAIL_USER,
        to:email,
        subject:isPasswordReset ? 'Reset your Eventora password' : 'Your OTP for Eventora',
        text:isPasswordReset
            ? `Use this OTP to reset your Eventora password: ${otp}. It will expire in 5 minutes. If you did not request this, you can ignore this email.`
            : `Your OTP is ${otp}. It will expire in 5 minutes.`
    };

    await sendMail(mailOptions, `OTP email (${type})`);
};

exports.sendEmail = async (email, subject, text) => {
    await sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        text
    }, 'Email');
};

exports.sendBookingEmail = async (email, eventTitle, bookingId) => {
    await sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Eventora booking received',
        text: `Your booking request for ${eventTitle} has been received. Booking ID: ${bookingId}`
    }, 'Booking email');
};
