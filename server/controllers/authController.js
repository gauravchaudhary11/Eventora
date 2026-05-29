const User=require('../models/User');
const Otp=require('../models/otp');
const bcrypt=require('bcryptjs');
const {sendOtpEmail}=require('../utils/email');
const jwt=require('jsonwebtoken');

const generateToken=(id,role)=>{
    const token=jwt.sign({id,role},process.env.JWT_SECRET,{expiresIn:'7d'});
    return token;
}

const isUnsafeAdminSecret = (secret) => {
    return !secret || secret === 'eventora-admin-key' || secret.length < 16;
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const normalizeEmail = (email) => email.trim().toLowerCase();

const sendOtpEmailSafely = async (email, otp, type) => {
    try {
        const delivered = await Promise.race([
            sendOtpEmail(email, otp, type).then(() => true).catch((err) => {
                console.error(`OTP email delivery failed for ${type} (${email}):`, err);
                return false;
            }),
            new Promise((resolve) => setTimeout(() => resolve(false), 3500))
        ]);

        if (!delivered) {
            console.warn(`OTP email for ${type} (${email}) was not confirmed within timeout.`);
        }

        return Boolean(delivered);
    } catch (err) {
        console.error(`OTP email delivery failed for ${type} (${email}):`, err);
        return false;
    }
};


// Register user
exports.registerUser = async (req, res) => {
    const { name, email, password, role, adminSecret } = req.body;

    try {
        const normalizedEmail = normalizeEmail(email);
        const wantsAdminRole = role === 'admin' || Boolean(adminSecret);
        if (wantsAdminRole) {
            if (isUnsafeAdminSecret(process.env.ADMIN_SIGNUP_SECRET)) {
                return res.status(500).json({ message: 'Admin signup is not configured yet' });
            }

            if (adminSecret !== process.env.ADMIN_SIGNUP_SECRET) {
                return res.status(403).json({ message: 'Invalid admin access key' });
            }
        }

        const targetRole = wantsAdminRole ? 'admin' : 'user';
        let user = await User.findOne({ email: normalizedEmail });

        if (user) {
            if (!user.isVerified) {
                if (user.role !== targetRole) {
                    user.role = targetRole;
                    await user.save();
                }

                const otp = generateOtp();

                await Otp.create({
                    email: normalizedEmail,
                    otp,
                    action: 'account_verification'
                });

                const emailSent = await sendOtpEmailSafely(normalizedEmail, otp, 'account_verification');
                return res.json({
                    message: emailSent
                        ? 'OTP resent for verification'
                        : 'OTP generated, but email delivery failed. Please check mail settings.',
                    emailSent
                });
            }

            return res.status(400).json({ message: 'User already exists' });
        }

        user = await User.create({ name, email: normalizedEmail, password, role: targetRole });

        const otp = generateOtp();

        await Otp.create({
            email: normalizedEmail,
            otp,
            action: 'account_verification'
        });

        const emailSent = await sendOtpEmailSafely(normalizedEmail, otp, 'account_verification');
        res.status(201).json({
            message: emailSent
                ? 'User registered, please verify OTP'
                : 'User registered, but OTP email delivery failed. Please check mail settings.',
            emailSent
        });
    } catch (err) {
        if (err?.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }
        console.error(err);
        res.status(500).json({
            message: err?.message || 'Server error'
        });
    }
};
//login User


exports.loginUser=async(req,res)=>{
    const {email,password}=req.body;
    try{
        const normalizedEmail = normalizeEmail(email);
        // Check if user exists
        const user=await User.findOne({email:normalizedEmail});
        if(!user){

            return res.status(400).json({message:'Invalid credentials,please Sign up'});
        }
        // Check password
        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (error) {
            isMatch = user.password === password;
            if (isMatch) {
                user.password = password;
                await user.save();
            }
        }
        if(!isMatch){
            return res.status(400).json({message:'Invalid credentials'});
        }
        if(!user.isVerified && user.role!=='admin'){
            const otp=generateOtp();
            await Otp.deleteMany({email: normalizedEmail,action:'account_verification'}); // delete old OTPs
            await Otp.create({email: normalizedEmail,otp,action:'account_verification'});
            const emailSent = await sendOtpEmailSafely(normalizedEmail, otp, 'account_verification');
            return res.status(400).json({
                message:'Please verify your email before logging in',
                emailSent
            });
        }
        res.json({
            message:'Login successful',
            _id:user._id,
            name:user.name,
            email:user.email,
            role:user.role,
            token:generateToken(user._id,user.role)
        });

        
    }
    catch(err){
        if (err?.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }
        console.error(err);
        res.status(500).json({message: err?.message || 'Server error'});
    }
};

// Verify OTP

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = normalizeEmail(email);

        // ✅ 1. Validate input
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        // ✅ 2. Get latest OTP
        const otpRecord = await Otp.findOne({
            email: normalizedEmail,
            action: 'account_verification'
        }).sort({ createdAt: -1 });

        // ❌ No OTP found
        if (!otpRecord) {
            return res.status(400).json({ message: 'OTP not found or expired' });
        }

        // ❌ OTP mismatch
        if (otpRecord.otp.trim() !== otp.toString().trim()) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // ✅ 3. Mark user verified
        await User.findOneAndUpdate(
            { email: normalizedEmail },
            { isVerified: true }
        );

        // ✅ 4. Delete all OTPs for security
        await Otp.deleteMany({
            email: normalizedEmail,
            action: 'account_verification'
        });

        // ✅ 5. Get updated user
        const user = await User.findOne({ email: normalizedEmail });

        // ✅ 6. Send response with token
        res.json({
            message: 'Email verified successfully',
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: 'No account found for this email' });
        }

        const otp = generateOtp();

        await Otp.deleteMany({
            email: normalizedEmail,
            action: 'password_reset'
        });

        await Otp.create({
            email: normalizedEmail,
            otp,
            action: 'password_reset'
        });

        const emailSent = await sendOtpEmailSafely(normalizedEmail, otp, 'password_reset');

        res.json({
            message: emailSent
                ? 'Password reset OTP sent to your email'
                : 'Password reset OTP generated, but email delivery failed. Please check mail settings.',
            emailSent
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!email || !otp || !password) {
            return res.status(400).json({ message: 'Email, OTP and new password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const otpRecord = await Otp.findOne({
            email: normalizedEmail,
            action: 'password_reset'
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({ message: 'OTP not found or expired' });
        }

        if (otpRecord.otp.trim() !== otp.toString().trim()) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: 'No account found for this email' });
        }

        user.password = password;
        await user.save();

        await Otp.deleteMany({
            email: normalizedEmail,
            action: 'password_reset'
        });

        res.json({
            message: 'Password reset successful'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
