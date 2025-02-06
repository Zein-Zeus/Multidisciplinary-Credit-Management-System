const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const multer = require('multer'); // Import multer
const XLSX = require('xlsx'); // Import xlsx
const { Student, RegisteredStudent, Course, updateGoogleSheet, importExcelToMongoDB, UploadedCertificate } = require("./mongodb");
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const router = express.Router();
require('dotenv').config();

// Set up storage engine for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Folder where images will be saved
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Store with a timestamp to avoid name conflicts
  }
});

// Create upload instance
const upload = multer({ storage: storage });

//Seperate storage for course images
const courseImage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'uploads', 'courseImage');
        cb(null, dir); // Images saved in the specified directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to avoid conflicts
    }
});

const uploadCourseImage = multer({ storage: courseImage });

// Separate storage for certificate uploads
const certificateStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'uploads', 'uploadedCertificates');
        cb(null, dir); // Certificates saved in the specified directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to avoid conflicts
    }
});

const uploadCertificate = multer({ storage: certificateStorage });

// Generate a random secret key for each session
const secret = crypto.randomBytes(16).toString('hex');

const TWO_HOURS = 1000 * 60 * 60 * 2;

const {
    PORT = 3000,
    NODE_ENV = 'development',
    SESS_NAME = 'sid',
    SESS_LIFETIME = TWO_HOURS
} = process.env;

const IN_PROD = NODE_ENV === 'production';


// Session middleware setup
app.use(session({
    name: SESS_NAME,
    resave: false,
    saveUninitialized: false,
    secret: secret,
    cookie: {
        maxAge: SESS_LIFETIME,
        sameSite: true,
        secure: IN_PROD
    }
}));

// Middleware for parsing and static files
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.set("view engine", "hbs");

// Routes
// -------------------------------------------------------------------- Student --------------------------------------------------------------------
app.get("/", (req, res) => {
    res.render("homepage");
});

app.get("/login", (req, res) => {
    res.render("studentLogin");
});

app.get("/signup", (req, res) => {
    res.render("studentSignup");
});

app.get("/home", async (req, res) => {
    // Check if user is logged in
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    try {
        // Find the user by PRN number
        const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch all courses from the database
        const courses = await Course.find();

        // Render the student home page with user info and courses
        res.render('studentHome', {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
            courses // Pass the courses to the template
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
});

app.get("/dashboard", async (req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    try {
        // Fetch user details
        const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch certificates for the logged-in student
        const certificates = await UploadedCertificate.find({ studentPRN: req.session.prnNumber });

        // Filter approved certificates and calculate total credits
        const approvedCertificates = certificates.filter(cert => cert.status === 'Approved');
        const totalCredits = approvedCertificates.reduce((sum, cert) => sum + cert.credits, 0);

        // Add serial numbers to certificates
        const certificatesWithSrNo = certificates.map((cert, index) => ({
            serialNumber: index + 1, // Start from 1
            courseName: cert.courseName,
            credits: cert.credits,
            courseOrganization: cert.courseOrganization,
            dateOfCompletion: cert.uploadedAt.toLocaleDateString(),
            status: cert.status || 'Pending',
            remarks: cert.remarks || '-'
        }));

        // Render dashboard with user and certificate data
        res.render('studentDashboard', {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
            totalCredits,
            certificates: certificatesWithSrNo,
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('An error occurred while loading the dashboard');
    }
});

app.get("/course", async(req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    try {
        // Find the user by PRN number
        const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch all courses from the database
        const courses = await Course.find();

        // Render the student home page with user info and courses
        res.render('studentCourses', {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
            courses // Pass the courses to the template
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
});

app.get("/certificate", async(req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });

    if (user) {
        res.render('studentUploadCertificate', {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
        });
    } else {
        res.status(404).send('User not found');
    }
});

app.get('/forgot-password', (req, res) => {
    res.render('studentForgotPassword');
});


// Route to get PRNs by first and last name (Already present)
app.get('/api/getPrn', async (req, res) => {
    const { firstName, lastName } = req.query;
    console.log('Received firstName:', firstName, 'lastName:', lastName); // Log incoming params

    try {
        const query = {};

        if (firstName) {
            query.firstName = new RegExp(firstName, 'i'); // Case-insensitive match for first name
        }

        if (lastName) {
            query.lastName = new RegExp(lastName, 'i'); // Case-insensitive match for last name
        }

        console.log('Query:', query);  // Log the database query being used

        const students = await Student.find(query);
        console.log('Found students:', students); // Log the students returned by the query

        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/get-student-info', async (req, res) => {
    const { prnNumber } = req.query;

    try {
        // Fetch the full student details based on the selected PRN
        const student = await Student.findOne({ prnNumber }).select('collegeName abcId email contact');
        
        if (student) {
            res.json(student);
        } else {
            res.status(404).json({ message: 'Student not found' });
        }
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ message: 'Error fetching student details' });
    }
});

app.post("/signup", async (req, res) => {
    const { password } = req.body;

    const passwordValidation = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordValidation.test(password)) {
        return res.status(400).send('Password does not meet the requirements');
    }

    try {
        const existingStudent = await Student.findOne({ prnNumber: req.body.prnNumber });

        if (!existingStudent) {
            res.status(400).send('PRN number not found in the database. Registration failed.');
            return res.redirect('/signup');
        }

        // Create a new registered student document
        const registeredStudentData = new RegisteredStudent({
            firstName: req.body.firstName,
            middleName: req.body.middleName,
            lastName: req.body.lastName,
            prnNumber: req.body.prnNumber,
            Email: req.body.Email,
            Contact: req.body.Contact,
            collegeName: req.body.collegeName,
            abcId: req.body.abcId,
            password: req.body.password
        });

        await registeredStudentData.save();
        res.redirect('/login');
    } catch (err) {
        console.error('Error during signup:', err.message);
        res.status(400).send('Error during signup: ' + err.message);
    }
});

app.post("/login", async (req, res) => {
    try {
        const prnNumber = Number(req.body.prnNumber); // Convert to number
        const password = req.body.password; // Use plaintext password

        // Find the registered student by PRN number
        const user = await RegisteredStudent.findOne({ prnNumber: prnNumber });

        // Check if user exists and password matches
        if (user && user.password === password) {
            req.session.prnNumber = user.prnNumber;
            req.session.studentName = `${user.firstName} ${user.lastName}`; // Full name

            res.redirect("/dashboard"); // Redirect to the dashboard
        } else {
            res.send("Wrong Details"); // Handle incorrect login
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send("An error occurred during login.");
    }
});

app.get("/course/:id", async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).send('Course not found');
        }

        const modulesArray = course.courseModules.split(/\n/).map(module => module.trim());
        const outcomesArray = course.courseOutcomes.split(/\n/).map(outcome => outcome.trim());

        // Render the course detail page with the course data
        res.render('courseDetails', {
            courseName: course.courseName,
            courseDescription: course.courseDescription,
            credits: course.credits,
            duration: course.duration,
            mode: course.mode,
            collegeName: course.collegeName,
            facultyName: course.facultyName,
            modules: modulesArray ,
            outcomes: outcomesArray,
            image: course.image
            // Include any other fields you want to display
        });
    } catch (error) {
        console.error('Error fetching course details:', error);
        res.status(500).send('Error fetching course details');
    }
});

app.delete('/course/:id', async (req, res) => {
    try {
        const courseId = req.params.id;

        // Find the course by ID
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).send({ success: false, message: 'Course not found' });
        }

        // Check if the course has an associated image
        if (course.image) {
            const imagePath = path.join(__dirname, 'public', course.image); // Adjust 'public' to your static folder path

            // Delete the image file
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Error deleting image:', err);
                } else {
                    console.log('Image deleted:', imagePath);
                }
            });
        }

        // Delete the course from the database
        await course.deleteOne();
        res.send({ success: true, message: 'Course and associated image deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).send({ success: false, message: 'Error deleting course' });
    }
});

app.post('/upload-certificate', uploadCertificate.single('certificate-upload'), async (req, res) => {
    const { courseName, credits, courseOrganization, studentPRN } = req.body;

    try {
        const certificateData = {
            studentPRN: req.session.prnNumber, // Ensure this maps correctly in your schema
            certificatePath: req.file.path,
            courseName,
            credits: parseInt(credits, 10),
            courseOrganization,
            status: 'Pending',
            uploadedAt: new Date(),
        };

        const newCertificate = new UploadedCertificate(certificateData);
        await newCertificate.save();

        console.log('Certificate successfully saved:', newCertificate);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error saving certificate:', error);
        res.status(500).send('An error occurred while uploading the certificate.');
    }
});

// Forget Password Route (PRN Lookup and Email Sending)
app.post("/forget-password", async (req, res) => {
  const { prnNumber } = req.body;

  try {
    // Find the user by PRN number
    const user = await RegisteredStudent.findOne({ prnNumber });

    if (!user) {
      return res.status(404).send("PRN Number not found.");
    }

    // Generate a unique token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Save the reset token and expiration to the database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour
    await user.save();

    // Create reset password URL
    const resetUrl = `http://${req.headers.host}/reset-password/${resetToken}`;

    // Configure nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail", // Or use another email provider
      auth: {
        user: process.env.EMAIL_USER, // Your email address from .env file
        pass: process.env.EMAIL_PASS, // Your app password or email password
      },
    });

    // Send password reset email
    const mailOptions = {
      to: user.email, // The user's email from the database
      from: process.env.EMAIL_USER, // Your email address
      subject: "Password Reset Request",
      text: `You are receiving this email because you (or someone else) requested a password reset for your account.\n\n
      Please click on the following link, or paste it into your browser, to reset your password:\n\n
      ${resetUrl}\n\n
      If you did not request this, please ignore this email and your password will remain unchanged.`,
    };

    await transporter.sendMail(mailOptions);

    res.send("Password reset email sent. Please check your email.");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while processing your request.");
  }
});

// Reset Password Route (Render form with token)
app.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;

  try {
    // Find the user with the valid token and ensure it's not expired
    const user = await RegisteredStudent.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send("Password reset token is invalid or has expired.");
    }

    // Render reset password form (You can render this dynamically on the frontend)
    res.send(`
      <form action="/reset-password" method="POST">
        <input type="hidden" name="token" value="${token}" />
        <label for="password">New Password:</label>
        <input type="password" name="password" required />
        <label for="confirmPassword">Confirm Password:</label>
        <input type="password" name="confirmPassword" required />
        <button type="submit">Reset Password</button>
      </form>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred.");
  }
});

// Handle Reset Password Form Submission
app.post("/reset-password", async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match.");
  }

  try {
    // Find the user with the valid token and ensure it's not expired
    const user = await RegisteredStudent.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send("Password reset token is invalid or has expired.");
    }

    // Update password and clear reset fields
    user.password = password; // Ensure hashing if needed
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.send("Password has been reset successfully.");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred.");
  }
});

// Add this route for handling course upload
//app.post("/submit-course", upload.single('certificate-upload'), uploadCourse);

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error during logout:", err);
            return res.status(500).send("Error during logout. Please try again.");
        }
        res.redirect('/login');
    });
});

// -------------------------------------------------------------------- College routes --------------------------------------------------------------------
app.get("/clglogin", (req, res) => {
    res.render("collegeLogin");
});

app.get("/clghome", (req, res) => {
    res.render("collegeHome");
});

app.get("/clgdashboard", async (req, res) => {
    try {
        const totalStudents = await RegisteredStudent.countDocuments(); // Count total students in the collection
        const totalCourses = await Course.countDocuments();
        res.render("collegeDashboard", { totalStudents, totalCourses }); // Pass the count to the view
    } catch (err) {
        console.error('Error fetching students:', err);
        res.status(500).send('Error fetching student data.');
    }
});

app.get("/clgstudentreg", (req, res) => {
    res.render("collegeStudentRegistration");
});

app.get("/clgverifycredits", (req, res) => {
    res.render("collegeVerifyCredits");
});

app.get("/clguploadcourse", (req, res) => {
    res.render("collegeUploadCourse");
});


app.post("/register", async (req, res) => {
    try {
        // Check for existing PRN number
        const existingStudentByPrn = await Student.findOne({ prnNumber: req.body.prnNumber });
        if (existingStudentByPrn) {
            console.log('Student with this PRN number already exists.');
            return res.status(400).json({ success: false, message: 'Student with this PRN number already exists.' });
        }

        // Check for existing ABC ID
        const existingStudentByAbcId = await Student.findOne({ abcId: req.body.abcId });
        if (existingStudentByAbcId) {
            console.log('Student with this ABC ID already exists.');
            return res.status(400).json({ success: false, message: 'Student with this ABC ID already exists.' });
        }

        // Create a new student document
        const studentData = new Student({
            firstName: req.body.firstName,
            middleName: req.body.middleName,
            lastName: req.body.lastName,
            collegeName: req.body.collegeName,
            prnNumber: req.body.prnNumber,
            abcId: req.body.abcId,
            email: req.body.email,
            contact: req.body.contact
        });

        await studentData.save();

        console.log('Student registered successfully.');
        return res.json({ success: true, message: 'Student registered successfully.' });

    } catch (err) {
        console.error('Error adding student:', err.message);
        res.status(500).json({ success: false, message: 'Error adding student: ' + err.message });
    }
});

// Handle Excel file upload and import
app.post('/import', upload.single('excelFile'), async (req, res) => {
    console.log('File upload initiated.');

    if (!req.file) {
        console.error('No file uploaded.');
        return res.status(400).send('No file uploaded.');
    }

    const filePath = path.join(__dirname, '../uploads', req.file.filename);
    console.log('File path:', filePath);

    try {
        await importExcelToMongoDB(filePath);
        console.log('File imported successfully.');

        // Delete the uploaded file after successful import
        fs.unlinkSync(filePath);
        console.log('File deleted successfully.');

        res.send('File imported and data saved to MongoDB successfully.');
    } catch (err) {
        console.error('Error during import:', err);
        res.status(500).send('Error importing file: ' + err.message);
    }
});

// Add this route for handling course upload
app.post("/uploadcourse", uploadCourseImage.single('image'), async (req, res) => {
    console.log(req.body);
    
    // Get the value of credits from the form
    let credits = req.body.credits;

    // If "others" is selected, use the value from customCredits
    if (credits === "others" && req.body.customCredits) {
        credits = req.body.customCredits;  // This is the custom value entered by the user
    }

    // Convert credits to a number if it's not a string (to ensure it's a valid number)
    credits = Number(credits);
    if (isNaN(credits)) {
        return res.status(400).send('Please enter a valid number for credits.');
    }

    // Prepare the course data to save
    const newCourseData = {
        courseName: req.body.courseName,
        courseDescription: req.body.courseDescription,
        credits: credits,
        duration: req.body.duration,
        mode: req.body.mode,
        collegeName: req.body.collegeName,
        facultyName: req.body.facultyName,
        courseModules: req.body.courseModules,
        courseOutcomes: req.body.courseOutcomes,
        image: req.file ? `/uploads/courseImage/${req.file.filename}` : null  // Path for the uploaded image
    };

    // Create a new course with the data
    const newCourse = new Course(newCourseData);

    try {
        await newCourse.save();
        console.log('Course saved successfully:', newCourse);
        
        // Send success response back
        return res.json({
            success: true,
            message: 'Course uploaded successfully.'
        });
    } catch (error) {
        console.error('Error saving course:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving course: ' + error.message
        });
    }
});

app.get('/student-certificates', async (req, res) => {
    try {
        const certificates = await UploadedCertificate.find({});

        const updatedCertificates = await Promise.all(certificates.map(async (certificate) => {
            // Use PRN to find the student in RegisteredStudent
            const student = await RegisteredStudent.findOne({ prn: certificate.studentPRN });

            // Extract the student's name or use a default value if the student is not found
            const fullName = student ? `${student.firstName} ${student.lastName}` : 'N/A';

            return {
                ...certificate.toObject(),
                studentName: fullName, // Add the student's name
                certificatePath: `/uploads/uploadedCertificates/${path.basename(certificate.certificatePath)}`
            };
        }));

        res.status(200).json(updatedCertificates); // Send the updated certificates with names
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).send('Error fetching certificates');
    }
});

app.post('/review-certificate/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;

        const certificate = await UploadedCertificate.findById(id);
        if (!certificate) {
            return res.status(404).send('Certificate not found');
        }

        certificate.status = status; // 'Approved' or 'Rejected'
        certificate.remarks = remarks || '';
        await certificate.save();

        res.status(200).send('Certificate status updated');
    } catch (error) {
        console.error('Error reviewing certificate:', error);
        res.status(500).send('Error updating certificate status');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
