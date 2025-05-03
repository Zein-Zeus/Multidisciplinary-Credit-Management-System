const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const multer = require('multer'); // Import multer
const XLSX = require('xlsx'); // Import xlsx
const { Student, RegisteredStudent, Course, importExcelToMongoDB, College, EnrolledStudent, Assignment, Submission, Attendance, Grade } = require("./mongodb");
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const moment = require('moment');

hbs.registerHelper("json", function (context) {
    return JSON.stringify(context);
});

// Register 'eq' helper for Handlebars
hbs.registerHelper("eq", function (a, b) {
    return a === b;
});

hbs.registerHelper('ifEquals', function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
});

hbs.registerHelper('addOne', function (value) {
    return value + 1;
});

hbs.registerHelper('formatDate', function (date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
});

hbs.registerHelper("lookup", (obj, field) => obj && obj[field]);

// Set up storage engine for Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Folder where images will be saved
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Store with a timestamp to avoid name conflicts
    }
});

// Create upload instance (excel sheet - student registration)
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

// Multer config for assignment file upload
const assignmentFile = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'uploads', 'assignmentFiles');
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const uploadAssignmentFile = multer({ storage: assignmentFile });

const studentAssignmentFiles = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'uploads', 'studentAssignmentFiles');
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const uploadStudentAssignment = multer({ storage: studentAssignmentFiles });

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

app.get('/get-student-info', async (req, res) => {
    const { prnNumber } = req.query;
    console.log(`Fetching details for PRN: ${prnNumber}`);

    try {
        const student = await Student.findOne({ prnNumber }).select('firstName middleName lastName collegeName degree branch abcId email contact passoutYear');
        console.log("Found student data:", student);

        if (student) {
            res.json(student);
        } else {
            console.warn("No student found for PRN:", prnNumber);
            res.status(404).json({ message: 'Student not found' });
        }
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post("/signup", async (req, res) => {
    const { prnNumber, password } = req.body;

    // Validate password format
    const passwordValidation = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordValidation.test(password)) {
        return res.status(400).send('Password does not meet the requirements');
    }

    try {
        // Find student details in the database
        const existingStudent = await Student.findOne({ prnNumber });

        if (!existingStudent) {
            return res.status(400).send('PRN number not found in the database. Registration failed.');
        }

        // Ensure email exists
        if (!existingStudent.email) {
            return res.status(400).send('Error: Email not found for this PRN.');
        }

        // Create a new registered student document
        const registeredStudentData = new RegisteredStudent({
            firstName: existingStudent.firstName,
            middleName: existingStudent.middleName,
            lastName: existingStudent.lastName,
            prnNumber: existingStudent.prnNumber,
            Email: existingStudent.email,
            Contact: existingStudent.contact,
            collegeName: existingStudent.collegeName,
            abcId: existingStudent.abcId,
            degree: existingStudent.degree,
            branch: existingStudent.branch,
            passoutYear: existingStudent.passoutYear,
            password: password
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
            req.session.studentName = `${user.firstName} ${user.lastName}`;
            req.session.abcId = user.abcId;
            req.session.studentId = user._id; 
        
            console.log("Logged in user abcId:", req.session.abcId);
            console.log("Logged in user studentId:", req.session.studentId); // Optional debug log
        
            res.redirect("/home");
        }
        else {
            res.send("Wrong Details"); // Handle incorrect login
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send("An error occurred during login.");
    }
});

app.get("/home", async (req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    try {
        const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch enrolled courses by status
        const enrolledCourses = await EnrolledStudent.find({ prnNumber: req.session.prnNumber });

        // Separate course IDs by status
        const ongoingIds = enrolledCourses
            .filter(course => course.status === "Ongoing")
            .map(course => course.courseId);

        const completedIds = enrolledCourses
            .filter(course => course.status === "Completed")
            .map(course => course.courseId);

        // Fetch full course details
        const ongoingCourses = await Course.find({ _id: { $in: ongoingIds } });
        const completedCourses = await Course.find({ _id: { $in: completedIds } });

        // Render the page
        res.render("studentHome", {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
            ongoingCourses,
            completedCourses
        });
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).send("Server error");
    }
});

app.get("/dashboard", async (req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect("/login");
    }

    try {
        const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });

        if (!user) {
            return res.status(404).send("User not found");
        }

        // Fetch enrolled courses
        const enrolledCourses = await EnrolledStudent.find({ prnNumber: req.session.prnNumber });

        // Filter courses by their status
        const ongoingCourses = enrolledCourses.filter(course => course.status === "Ongoing");
        const completedCourses = enrolledCourses.filter(course => course.status === "Completed");
        const approvalPendingCourses = enrolledCourses.filter(course => course.status === "Approval Pending");

        // Render the dashboard page with dynamic data
        res.render("studentDashboard", {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
            ongoingCourses,
            completedCourses,
            approvalPendingCourses, // Include approval pending courses
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).send("An error occurred while loading the dashboard");
    }
});

app.get("/course", async (req, res) => {
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

app.get("/course/:id", async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).send('Course not found');
        }

        const modulesArray = course.courseModules.split(/\n/).map(module => module.trim());

        // Render the course detail page with the course data
        res.render('studentCourseDetails', {
            _id: course._id.toString(),  // Ensure this is sent correctly
            courseName: course.courseName,
            courseDescription: course.courseDescription,
            credits: course.credits,
            duration: course.duration,
            mode: course.mode,
            collegeID: course.collegeID,
            collegeName: course.collegeName,
            facultyName: course.facultyName,
            modules: modulesArray,
            image: course.image
            // Include any other fields you want to display
        });
    } catch (error) {
        console.error('Error fetching course details:', error);
        res.status(500).send('Error fetching course details');
    }
});

app.post("/enroll", async (req, res) => {
    if (!req.session.prnNumber) {
        return res.status(401).send("Please log in to enroll in a course.");
    }

    try {
        let { courseId, courseName, collegeName } = req.body;

        if (!courseId || courseId.length !== 24) {
            console.error("Invalid Course ID:", courseId);
            return res.status(400).send("Invalid Course ID.");
        }

        const student = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });

        if (!student) {
            return res.status(404).send("Student not found.");
        }

        const existingEnrollment = await EnrolledStudent.findOne({
            prnNumber: req.session.prnNumber,
            courseId
        });

        if (existingEnrollment) {
            return res.status(400).send("You are already enrolled in this course.");
        }

        console.log("Session abcId:", req.session.abcId); // Debugging Log

        // Set status to "Approval Pending" instead of "Ongoing"
        const enrollment = new EnrolledStudent({
            prnNumber: req.session.prnNumber,
            studentName: `${student.firstName} ${student.lastName}`,
            courseId: new mongoose.Types.ObjectId(courseId),
            courseName,
            collegeName,
            status: "Approval Pending", // Set initial status to Approval Pending
            abcId: req.session.abcId || student.abcId // Fallback if session abcId is missing
        });

        await enrollment.save();
        res.redirect("/dashboard"); // Redirect to dashboard
    } catch (error) {
        console.error("Error enrolling in course:", error);
        res.status(500).send("An error occurred while enrolling.");
    }
});


app.get("/enrolled-course/:id", async (req, res) => {
    const courseId = req.params.id;

    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    try {
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).send('Course not found');
        }

        const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch assignments for this course
        const assignments = await Assignment.find({ courseId: courseId }).exec();

        // Fetch submissions for this student
        const studentSubmissions = await Submission.find({ studentId: user._id });

        // Prepare assignment details, including fileUrl and clean fileName
        const assignmentDetails = assignments.map(assign => {
            const submission = studentSubmissions.find(sub => sub.assignmentId.toString() === assign._id.toString());

            let fileUrl = null;
            let fileName = null;

            if (submission && submission.file && submission.file.path) {
                fileUrl = submission.file.path;

                // Extract clean file name
                const fullName = path.basename(fileUrl); // e.g., '1746285791306-3324283-Ancient Indian Craftsmanship (1).pdf'
                const nameParts = fullName.split('-');
                fileName = nameParts.slice(2).join('-'); // remove first two parts (timestamp and ID)
            }

            return {
                assignmentId: assign._id,
                name: assign.title,
                topic: assign.topic,
                marks: assign.marks,
                description: assign.description,
                posted: assign.uploadedAt ? assign.uploadedAt.toDateString() : "N/A",
                due: assign.dueDate ? assign.dueDate.toDateString() : "N/A",
                file: assign.file ? assign.file.name : "No file uploaded",
                submitted: !!submission,
                fileUrl: fileUrl,
                fileName: fileName
            };
        });

        res.render("studentCourseDashboard", {
            title: "Student Course Dashboard",
            username: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
            course,
            assignmentDetails
        });
    } catch (error) {
        console.error("Error loading course details:", error);
        res.status(500).send("Server error");
    }
});

app.post("/student-upload-assignment", uploadStudentAssignment.single('assignmentFile'), async (req, res) => {
    if (!req.session.prnNumber) {
        return res.status(401).send({ message: "Student session not found. Please log in." });
    }

    const { assignmentId } = req.body;
    const file = req.file;

    if (!file) return res.status(400).send({ message: "No file uploaded" });
    if (!assignmentId) return res.status(400).send({ message: "Missing assignmentId" });

    try {
        if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
            return res.status(400).send({ message: "Invalid assignmentId" });
        }

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).send({ message: "Assignment not found" });

        const student = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });
        if (!student) return res.status(404).send({ message: "Student not found" });

        const submission = new Submission({
            studentId: student._id,
            courseId: assignment.courseId,
            assignmentId: assignment._id,
            studentName: `${student.firstName} ${student.lastName}`,
            file: {
                name: file.originalname,
                path: `/uploads/studentAssignmentFiles/${file.filename}`,
                mimeType: file.mimetype
            },
            status: 'Uploaded'
        });

        await submission.save();
        res.json({ message: "Assignment submitted successfully!" });
    } catch (err) {
        console.error("Error submitting assignment:", err);
        res.status(500).send({ message: "Server error" });
    }
});

app.post("/student-unsubmit-assignment", async (req, res) => {
    try {
        const assignmentId = req.body.assignmentId;
        const studentId = req.session.studentId; // Ensure this is saved during login

        if (!studentId) {
            return res.status(401).json({ message: "Unauthorized: No studentId in session." });
        }

        // Remove the submission from the database
        const result = await Submission.deleteOne({
            assignmentId: assignmentId,
            studentId: studentId
        });

        if (result.deletedCount > 0) {
            return res.json({ message: "Unsubmission successful." });
        } else {
            return res.status(404).json({ message: "No submission found." });
        }
    } catch (error) {
        console.error("Error in unsubmit route:", error);
        return res.status(500).json({ message: "Error during unsubmission." });
    }
});

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
app.get("/clgsignup", (req, res) => {
    res.render("collegeSignup");
});

app.get("/clglogin", (req, res) => {
    res.render("collegeLogin");
});

app.get("/clgdashboard", async (req, res) => {
    try {
        if (!req.session.collegeName) {
            return res.redirect("/clglogin");
        }

        // Fetch latest 5 registered students for this college
        const recentRegistrations = await RegisteredStudent.find({ collegeName: req.session.collegeName })
            .sort({ _id: -1 })  // latest first
            .limit(5)
            .lean();

        // Fetch latest 5 pending approvals for this college
        const pendingApprovals = await EnrolledStudent.find({
            collegeName: req.session.collegeName,
            status: "Approval Pending"
        })
            .sort({ enrollmentDate: -1 })
            .limit(5)
            .lean();

        // Create activity messages
        const activities = [];

        recentRegistrations.forEach(student => {
            activities.push({
                icon: "✅",
                message: `${student.firstName} ${student.lastName} registered.`
            });
        });

        pendingApprovals.forEach(enrollment => {
            activities.push({
                icon: "📌",
                message: `Course '${enrollment.courseName}' approval pending for ${enrollment.studentName}.`
            });
        });

        // Fetch new courses added recently (limit 3)
        const recentCourses = await Course.find({ collegeName: req.session.collegeName })
            .sort({ _id: -1 })
            .limit(3)
            .lean();

        const totalNewCourses = recentCourses.length;

        // Fetch latest registered students (limit 3)
        const recentStudents = await RegisteredStudent.find({ collegeName: req.session.collegeName })
            .sort({ _id: -1 })
            .limit(3)
            .lean();

        const totalNewStudents = recentStudents.length;

        const adminNotifications = [
            "Stream updated by Admin",
            // add more from DB if available
        ];

        const totalAdminNotifications = adminNotifications.length;

        // Total notifications count is sum of all
        const totalNotifications = totalNewCourses + totalNewStudents + totalAdminNotifications;

        // Combine notifications in order
        const notifications = [];

        recentCourses.forEach(course => {
            notifications.push(`New course added: ${course.courseName}`);
        });

        recentStudents.forEach(student => {
            notifications.push(`Student ${student.firstName} registered`);
        });

        // Add admin notifications
        notifications.push(...adminNotifications);

        // Optionally limit to last 5 notifications total
        const limitedNotifications = notifications.slice(0, 5);

        // Pass the activities and other counts/stats to your template
        const totalStudents = await RegisteredStudent.countDocuments({ collegeName: req.session.collegeName });
        const totalCourses = await Course.countDocuments({ collegeName: req.session.collegeName });

        res.render("collegeDashboard", {
            collegeName: req.session.collegeName,
            totalStudents,
            totalCourses,
            activities,
            totalNotifications,
            notifications: limitedNotifications
        });

    } catch (err) {
        console.error("Error loading dashboard:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/clgstudentreg", (req, res) => {
    if (!req.session.collegeName) {
        res.redirect('/clglogin');
    }
    res.render("collegeStudentRegistration", { collegeName: req.session.collegeName });
});

app.post("/clgsignup", async (req, res) => {
    const { password } = req.body;

    // Password validation: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordValidation = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordValidation.test(password)) {
        return res.status(400).send('Password does not meet the security requirements.');
    }

    try {
        // Check if the college is already registered
        const existingCollege = await College.findOne({ collegeID: req.body.collegeID });

        if (existingCollege) {
            return res.status(400).send('Duplicate College ID. Registration failed.');
        }

        // Create a new registered college document
        const newCollege = new College({
            collegeID: req.body.collegeID,
            collegeName: req.body.collegeName,
            password: req.body.password
        });

        await newCollege.save();
        res.redirect('/course-login'); // Redirect to course login after successful signup
    } catch (err) {
        console.error('Error during course signup:', err.message);
        res.status(400).send('Error during signup: ' + err.message);
    }
});

app.post("/clglogin", async (req, res) => {
    try {
        const collegeID = req.body.collegeID; // Get college ID from request
        const password = req.body.password; // Get plaintext password

        // Find the registered college by ID
        const college = await College.findOne({ collegeID: req.body.collegeID });

        // Check if college exists and password matches
        if (college && college.password === password) {
            req.session.collegeID = college.collegeID;
            req.session.collegeName = college.collegeName; // Store college name in session

            res.redirect("/clgdashboard"); // Redirect to course dashboard
        } else {
            res.send("Wrong Details"); // Handle incorrect login
        }
    } catch (error) {
        console.error("Error during college login:", error);
        res.status(500).send("An error occurred during login.");
    }
});

app.post("/register", async (req, res) => {
    try {
        if (!req.session.collegeName) {
            return res.status(403).json({ success: false, message: "Unauthorized: College not logged in" });
        }

        const { firstName, middleName, lastName, degree, branch, prnNumber, abcId, email, contact, passoutYear } = req.body;
        const collegeName = req.session.collegeName; // Autofill from session

        // Validate Passout Year (ensure it is within a reasonable range)
        const currentYear = new Date().getFullYear();
        if (passoutYear < 1900 || passoutYear > currentYear + 5) {
            return res.status(400).json({ success: false, message: "Invalid Passout Year" });
        }

        // Check for existing PRN number
        const existingStudentByPrn = await Student.findOne({ prnNumber });
        if (existingStudentByPrn) {
            console.log("Student with this PRN number already exists.");
            return res.status(400).json({ success: false, message: "Student with this PRN number already exists." });
        }

        // Check for existing ABC ID
        const existingStudentByAbcId = await Student.findOne({ abcId });
        if (existingStudentByAbcId) {
            console.log("Student with this ABC ID already exists.");
            return res.status(400).json({ success: false, message: "Student with this ABC ID already exists." });
        }

        // Create and save student
        const studentData = new Student({
            firstName,
            middleName,
            lastName,
            collegeName,
            degree,
            branch,
            prnNumber,
            abcId,
            email,
            contact,
            passoutYear
        });

        await studentData.save();

        console.log("Student registered successfully.");
        return res.json({ success: true, message: "Student registered successfully." });

    } catch (err) {
        console.error("Error adding student:", err.message);
        res.status(500).json({ success: false, message: "Error adding student: " + err.message });
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

app.get("/clgstudentrecords", async (req, res) => {
    try {
        if (!req.session.collegeName) {
            res.redirect('/clglogin');
            return;
        }

        const { course, status } = req.query; // Get filter values from query params

        // Find students whose `prnNumber` exists in `RegisteredStudent` with the same collegeName as logged-in college
        const registeredStudents = await RegisteredStudent.find({ collegeName: req.session.collegeName }).select("prnNumber").lean();
        const studentPRNs = registeredStudents.map(student => student.prnNumber);

        let filter = { prnNumber: { $in: studentPRNs } }; // Filter students who belong to the logged-in college

        if (course && course !== "all") {
            filter.courseName = course;
        }
        if (status && status !== "all") {
            filter.status = status;
        }

        // Fetch filtered student records
        const students = await EnrolledStudent.find(filter).lean();

        // Get unique course names based on students from the logged-in college
        const courses = await EnrolledStudent.distinct("courseName", filter);

        // Set available statuses
        const statuses = ["Ongoing", "Completed", "Approval Pending"];

        res.render("collegeStudentRecords", { students, courses, statuses, selectedCourse: course, selectedStatus: status });
    } catch (err) {
        console.error("Error fetching student records:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/export-student-records", async (req, res) => {
    try {
        console.log("Export route hit!"); // Debugging

        // Fetch student data from the database
        const students = await EnrolledStudent.find({}).lean();

        // Create a new Excel Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Student Records");

        // Define Table Headers
        worksheet.columns = [
            { header: "PRN", key: "prnNumber", width: 15 },
            { header: "ABC ID", key: "abcId", width: 20 },
            { header: "Student Name", key: "studentName", width: 25 },
            { header: "Course Name", key: "courseName", width: 30 },
            { header: "College Name", key: "collegeName", width: 30 },
            { header: "Completion Status", key: "status", width: 15 },
            { header: "Enrollment Date", key: "enrollmentDate", width: 20 },
            { header: "Completion Date", key: "completionDate", width: 20 },
            { header: "Certificate URL", key: "certificateUrl", width: 40 }
        ];

        // Add student data to Excel
        students.forEach(student => {
            worksheet.addRow({
                prnNumber: student.prnNumber,
                abcId: student.abcId || "N/A",
                studentName: student.studentName,
                courseName: student.courseName,
                collegeName: student.collegeName,
                status: student.status,
                enrollmentDate: student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : "",
                completionDate: student.completionDate ? new Date(student.completionDate).toLocaleDateString() : "",
                certificateUrl: student.certificateUrl || "N/A"
            });
        });

        const currentDate = new Date().toISOString().split("T")[0];

        // Set Headers for Download
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename=student_records_${currentDate}.xlsx`);

        // Write file and send response
        await workbook.xlsx.write(res);
        res.end();
        console.log("Excel file sent!"); // Debugging
    } catch (error) {
        console.error("Error generating Excel file:", error);
        res.status(500).send("Error generating file.");
    }
});

const currentYear = new Date().getFullYear();

app.get("/clgstudentapproval", async (req, res) => {
    if (!req.session.collegeName) return res.redirect("/clglogin");

    try {
        // Fetch pending enrollments with the current college name and "Approval Pending" status
        const pendingEnrollments = await EnrolledStudent.find({
            status: "Approval Pending"
        }).lean();

        // Fetch registered students based on PRNs from the pending enrollments
        const registeredPRNs = pendingEnrollments.map(e => e.prnNumber);
        const studentDetails = await RegisteredStudent.find({ prnNumber: { $in: registeredPRNs } }).lean();

        // Filter students based on the session college name
        const filteredStudents = studentDetails.filter(student => student.collegeName === req.session.collegeName);

        // Get the current year
        const currentYear = new Date().getFullYear();

        // Enrich the enrollment data with student details and year calculation
        const enrichedStudents = pendingEnrollments.map(enrollment => {
            const student = filteredStudents.find(s => s.prnNumber === parseInt(enrollment.prnNumber));
            if (!student) return null;

            let duration = 4; // Default duration for degree
            if (student.degree.toLowerCase().includes("bca") || student.degree.toLowerCase().includes("bsc")) {
                duration = 3; // Set duration for BCA/BSc
            }

            // Calculate the student's current year based on the passout year
            const calculatedYear = student.passoutYear - currentYear;
            let yearText;
            switch (calculatedYear) {
                case 3: yearText = "1st Year"; break;
                case 2: yearText = "2nd Year"; break;
                case 1: yearText = "3rd Year"; break;
                case 0: yearText = "4th Year"; break;
                default: yearText = "Graduated / Invalid"; break;
            }

            return {
                _id: enrollment._id,
                prnNumber: enrollment.prnNumber,
                abcId: student.abcId,
                name: `${student.firstName} ${student.middleName || ""} ${student.lastName}`.trim(),
                collegeName: student.collegeName,  // Using the college from RegisteredStudent
                branch: student.branch,
                degree: student.degree,
                year: yearText,
                courseName: enrollment.courseName,
                status: enrollment.status
            };
        }).filter(Boolean); // Remove nulls

        res.render("collegeStudentApproval", { students: enrichedStudents });
    } catch (err) {
        console.error("Error loading approvals:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.put("/approve-student/:studentId", async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // Update the status to 'Ongoing' for students with 'Approval Pending' status
        const updatedStudent = await EnrolledStudent.findOneAndUpdate(
            { _id: studentId, status: "Approval Pending" }, // Only update students with 'Approval Pending'
            { $set: { status: "Ongoing" } }, // Set the status to 'Ongoing'
            { new: true } // Return the updated document
        );

        if (updatedStudent) {
            res.json({ success: true, message: "Student approved and marked as Ongoing!" });
        } else {
            res.json({ success: false, message: "Student not found or already approved." });
        }
    } catch (error) {
        console.error("Error approving student:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Reject student
app.post('/clgstudentapproval/reject/:id', async (req, res) => {
    await EnrolledStudent.findByIdAndDelete(req.params.id);
    res.redirect('/clgstudentapproval');
});

app.post('/clgstudentapproval/bulk-approve', async (req, res) => {
    try {
        const studentIds = req.body.studentIds; // Get the list of selected student IDs

        if (!studentIds || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: "No students selected for approval." });
        }

        // Update the status of the selected students to "Ongoing"
        const updatedStudents = await EnrolledStudent.updateMany(
            { _id: { $in: studentIds }, status: "Approval Pending" }, // Only update students with 'Approval Pending'
            { $set: { status: "Ongoing" } }
        );

        if (updatedStudents.modifiedCount > 0) {
            res.redirect('/clgstudentapproval');
        } else {
            res.redirect('/clgstudentapproval');
        }
    } catch (error) {
        console.error("Error approving students:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/clgstudentapproval/bulk-reject', async (req, res) => {
    try {
        const studentIds = req.body.studentIds; // Get the list of selected student IDs

        if (!studentIds || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: "No students selected for rejection." });
        }

        // Reject the selected students (delete them)
        await EnrolledStudent.deleteMany({ _id: { $in: studentIds } });

        res.redirect('/clgstudentapproval');
    } catch (error) {
        console.error("Error rejecting students:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

/* -------------------------------------------------------------------- Course Modules -------------------------------------------------------------------- */
app.get("/course-signup", (req, res) => {
    res.render("courseSignup");
});

app.get("/course-login", (req, res) => {
    res.render("courseLogin");
});

app.get("/course-dashboard", async (req, res) => {
    if (!req.session.collegeID) {
        return res.redirect("/course-login");
    }

    try {
        const courses = await Course.find({ collegeID: req.session.collegeID });
        res.render("courseDashboard", {
            userInitials: req.session.collegeName.charAt(0),
            courses
        });
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).send("Error loading courses.");
    }
});

app.get("/course-upload", (req, res) => {
    res.render("courseUpload");
});

app.post("/course-signup", async (req, res) => {
    const { password } = req.body;

    // Password validation: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordValidation = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordValidation.test(password)) {
        return res.status(400).send('Password does not meet the security requirements.');
    }

    try {
        // Check if the college is already registered
        const existingCollege = await College.findOne({ collegeID: req.body.collegeID });

        if (existingCollege) {
            return res.status(400).send('Duplicate College ID. Registration failed.');
        }

        // Create a new registered college document
        const newCollege = new College({
            collegeID: req.body.collegeID,
            collegeName: req.body.collegeName,
            password: req.body.password
        });

        await newCollege.save();
        res.redirect('/course-login'); // Redirect to course login after successful signup
    } catch (err) {
        console.error('Error during course signup:', err.message);
        res.status(400).send('Error during signup: ' + err.message);
    }
});

app.post("/course-login", async (req, res) => {
    try {
        const collegeID = req.body.collegeID; // Get college ID from request
        const password = req.body.password; // Get plaintext password

        // Find the registered college by ID
        const college = await College.findOne({ collegeID: req.body.collegeID });

        // Check if college exists and password matches
        if (college && college.password === password) {
            req.session.collegeID = college.collegeID;
            req.session.collegeName = college.collegeName; // Store college name in session

            res.redirect("/course-dashboard"); // Redirect to course dashboard
        } else {
            res.send("Wrong Details"); // Handle incorrect login
        }
    } catch (error) {
        console.error("Error during course module login:", error);
        res.status(500).send("An error occurred during login.");
    }
});

app.post("/uploadcourse", uploadCourseImage.single('image'), async (req, res) => {
    if (!req.session.collegeID) {
        return res.redirect('/course-login');
    }

    console.log(req.body);

    let credits = req.body.credits;
    if (credits === "others" && req.body.customCredits) {
        credits = Number(req.body.customCredits);
    }
    if (isNaN(credits)) {
        // Delete uploaded image if validation fails
        if (req.file) {
            const imagePath = path.join(__dirname, '..', 'public', 'uploads', 'courseImage', req.file.filename);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting unused image:', err);
                else console.log('Unused image deleted due to validation error.');
            });
        }
        return res.status(400).send('Please enter a valid number for credits.');
    }

    const newCourseData = {
        courseName: req.body.courseName,
        courseDescription: req.body.courseDescription,
        credits: credits,
        duration: req.body.duration,
        mode: req.body.mode,
        collegeID: req.session.collegeID,
        collegeName: req.session.collegeName,
        facultyName: req.body.facultyName,
        courseModules: req.body.courseModules,
        image: req.file ? `/uploads/courseImage/${req.file.filename}` : null
    };

    try {
        const newCourse = new Course(newCourseData);
        await newCourse.save();
        console.log('Course saved successfully:', newCourse);
        return res.json({ success: true, message: 'Course uploaded successfully.' });
    } catch (error) {
        console.error('Error saving course:', error);

        // Delete uploaded image on DB error
        if (req.file) {
            const imagePath = path.join(__dirname, '..', 'public', 'uploads', 'courseImage', req.file.filename);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting image after DB failure:', err);
                else console.log('Image deleted after DB save error.');
            });
        }

        res.status(500).json({ success: false, message: 'Error saving course: ' + error.message });
    }
});

app.get("/view-course/:id", async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).send('Course not found');
        }

        const modulesArray = course.courseModules.split(/\n/).map(module => module.trim());

        // Render the course detail page with the course data
        res.render('courseDetails', {
            _id: course._id.toString(),  // Ensure this is sent correctly
            courseName: course.courseName,
            courseDescription: course.courseDescription,
            credits: course.credits,
            duration: course.duration,
            mode: course.mode,
            collegeID: course.collegeID,
            collegeName: course.collegeName,
            facultyName: course.facultyName,
            modules: modulesArray,
            image: course.image
            // Include any other fields you want to display
        });
    } catch (error) {
        console.error('Error fetching course details:', error);
        res.status(500).send('Error fetching course details');
    }
});

app.delete("/delete-course/:id", async (req, res) => {
    try {
        await Course.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ success: false });
    }
});

app.post("/update-course/:id", uploadCourseImage.single("image"), async (req, res) => {
    if (!req.session.collegeID) {
        return res.redirect('/course-login');
    }

    try {
        const courseId = req.params.id;

        console.log("Updating course:", courseId);
        console.log(req.body);

        let credits = req.body.credits;
        if (credits === "others" && req.body.customCredits) {
            credits = Number(req.body.customCredits);
        }
        if (isNaN(credits)) {
            return res.status(400).send("Please enter a valid number for credits.");
        }

        const existingCourse = await Course.findOne({ _id: courseId, collegeID: req.session.collegeID });

        if (!existingCourse) {
            return res.status(404).json({ success: false, message: "Course not found or unauthorized." });
        }

        const updatedData = {
            courseName: req.body.courseName,
            courseDescription: req.body.courseDescription,
            credits: credits,
            duration: req.body.duration,
            mode: req.body.mode,
            facultyName: req.body.facultyName,
            courseModules: req.body.courseModules,
            collegeID: req.session.collegeID,
            collegeName: req.session.collegeName,
        };

        // If new image uploaded, delete old image
        if (req.file) {
            if (existingCourse.image) {
                const oldImagePath = path.join(__dirname, '..', 'src', existingCourse.image);
                fs.unlink(oldImagePath, (err) => {
                    if (err) console.error("Error deleting old image:", err);
                    else console.log("Old image deleted:", existingCourse.image);
                });
            }

            updatedData.image = `/uploads/courseImage/${req.file.filename}`;
        }

        const updatedCourse = await Course.findByIdAndUpdate(courseId, updatedData, { new: true });

        console.log("Course updated successfully:", updatedCourse);
        return res.json({ success: true, message: "Course updated successfully." });

    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ success: false, message: "Error updating course: " + error.message });
    }
});

app.get("/edit-course/:id", async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        res.render("editCourse", { course });
    } catch (error) {
        console.error("Error fetching course for edit:", error);
        res.status(500).send("Error loading course.");
    }
});

app.get("/view-enrolled-students/:courseId", async (req, res) => {
    try {
        const courseId = req.params.courseId;

        // Fetch course details
        const course = await Course.findById(courseId);

        // Fetch students enrolled in this course
        const students = await EnrolledStudent.find({ courseId });

        res.render("courseEnrolledStudents", { course, students });
    } catch (error) {
        console.error("Error fetching course details:", error);
        res.status(500).send("Server Error");
    }
});

app.put("/declare-course/:courseId", async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const completionDate = new Date(); // Current timestamp

        const updatedStudents = await EnrolledStudent.updateMany(
            { courseId, status: "Ongoing" }, // Only update ongoing students
            { $set: { status: "Completed", completionDate: completionDate } }
        );

        if (updatedStudents.modifiedCount > 0) {
            res.json({ success: true, message: "Course marked as completed!" });
        } else {
            res.json({ success: false, message: "No students found or already completed." });
        }
    } catch (error) {
        console.error("Error updating course status:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.put("/declare-student/:studentId", async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const completionDate = new Date();

        const updatedStudent = await EnrolledStudent.findOneAndUpdate(
            { _id: studentId, status: "Ongoing" }, // Only update ongoing students
            { $set: { status: "Completed", completionDate: completionDate } },
            { new: true } // Return the updated document
        );

        if (updatedStudent) {
            res.json({ success: true, message: "Student marked as completed!", completionDate });
        } else {
            res.json({ success: false, message: "Student already completed or not found." });
        }
    } catch (error) {
        console.error("Error updating student status:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/export-enrolled-students", async (req, res) => {
    try {
        console.log("Export route hit!"); // Debugging

        const courseId = req.query.courseId;
        if (!courseId) {
            return res.status(400).send("Course ID is required.");
        }

        // Fetch the course details to get the course name
        const course = await Course.findById(courseId).lean();
        if (!course) {
            return res.status(404).send("Course not found.");
        }

        // Format course name to avoid invalid filename characters
        const formattedCourseName = course.courseName.replace(/[^a-zA-Z0-9_-]/g, "_"); // Replace special characters with "_"

        // Fetch student data from the database
        const students = await EnrolledStudent.find({ courseId }).lean();

        if (!students.length) {
            return res.status(404).send("No enrolled students found.");
        }

        // Create a new Excel Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Enrolled Students");

        // Define Table Headers
        worksheet.columns = [
            { header: "PRN", key: "prnNumber", width: 15 },
            { header: "ABC ID", key: "abcId", width: 20 },
            { header: "Student Name", key: "studentName", width: 25 },
            { header: "Course Name", key: "courseName", width: 30 },
            { header: "College Name", key: "collegeName", width: 30 },
            { header: "Completion Status", key: "status", width: 15 },
            { header: "Enrollment Date", key: "enrollmentDate", width: 20 },
            { header: "Completion Date", key: "completionDate", width: 20 },
            { header: "Certificate URL", key: "certificateUrl", width: 40 }
        ];

        // Add student data to Excel
        students.forEach(student => {
            worksheet.addRow({
                prnNumber: student.prnNumber,
                abcId: student.abcId || "N/A",
                studentName: student.studentName,
                courseName: student.courseName,
                collegeName: student.collegeName,
                status: student.status,
                enrollmentDate: student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : "",
                completionDate: student.completionDate ? new Date(student.completionDate).toLocaleDateString() : "",
                certificateUrl: student.certificateUrl || "N/A"
            });
        });

        // Set the Dynamic File Name
        const fileName = `enrolled_students_${formattedCourseName}.xlsx`;

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

        // Write file and send response
        await workbook.xlsx.write(res);
        res.end();
        console.log("Excel file sent!"); // Debugging
    } catch (error) {
        console.error("Error generating Excel file:", error);
        res.status(500).send("Error generating file.");
    }
});

app.get('/view-classwork/:courseId', async (req, res) => {
    const courseId = req.params.courseId;

    try {
        const course = await Course.findById(courseId);
        const assignments = await Assignment.find({ courseId: courseId }); // Fetch assignments based on courseId

        if (!course) {
            return res.status(404).send('Course not found');
        }

        res.render('courseClasswork', {
            courseName: course.courseName,
            courseId: courseId,
            assignments: assignments
        });
    } catch (error) {
        console.error('Error fetching course or assignments:', error);
        res.status(500).send('Error fetching course or assignments');
    }
});

app.get("/create-assignment/:courseId", (req, res) => {
    const { courseId } = req.params;
    res.render("courseCreateAssignment", { courseId }); // you'll need to make this view
});

app.post("/create-assignment", async (req, res) => {
    const { courseId, title, topic, dueDate, marks } = req.body;

    try {
        await Assignment.create({ courseId, title, topic, dueDate, marks });
        res.redirect(`/classwork/${courseId}`);
    } catch (err) {
        console.error("Error creating assignment:", err);
        res.status(500).send("Error creating assignment");
    }
});

app.post('/create-assignment/:courseId', uploadAssignmentFile.single('assignmentFile'), async (req, res) => {
    try {
        const { assignmentTitle, assignmentInstructions, dueDate, marks, topic } = req.body;
        const courseId = req.params.courseId;

        const newAssignment = new Assignment({
            title: assignmentTitle,
            description: assignmentInstructions,
            dueDate,
            marks,
            topic,
            courseId,
            file: req.file ? `/uploads/assignmentFiles/${req.file.filename}` : null
        });

        await newAssignment.save();
        return res.json({ success: true, message: 'Assignment created successfully.' });
    } catch (err) {
        console.error('Error creating assignment:', err);
        return res.status(500).json({ success: false, message: 'Error creating assignment.' });
    }
});

app.get("/edit-assignment/:courseId/:assignmentId", async (req, res) => {
    const { courseId, assignmentId } = req.params;

    try {
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) {
            return res.status(404).send("Assignment not found");
        }

        // Format dueDate to YYYY-MM-DD for HTML input
        const formattedDueDate = assignment.dueDate
            ? assignment.dueDate.toISOString().split("T")[0]
            : "";

        res.render("courseEditAssignment", {
            courseId,
            assignment: {
                ...assignment.toObject(),
                dueDate: formattedDueDate
            }
        });
    } catch (err) {
        console.error("Error loading assignment:", err);
        res.status(500).send("Server error");
    }
});

app.post("/edit-assignment/:assignmentId", uploadAssignmentFile.single('file'), async (req, res) => {
    const { assignmentId } = req.params;
    const { assignmentTitle, assignmentInstructions, topic, dueDate, marks } = req.body;
    const file = req.file;

    try {
        const updateData = {
            title: assignmentTitle,
            description: assignmentInstructions,
            topic,
            dueDate: new Date(dueDate),
            marks
        };

        if (file) {
            updateData.file = {
                name: file.originalname,
                path: "/uploads/assignmentFiles/" + file.filename,
                mimeType: file.mimetype,
                uploadedAt: new Date()
            };
        }

        await Assignment.findByIdAndUpdate(assignmentId, updateData);
        res.status(200).json({ message: "Assignment updated successfully" });
    } catch (err) {
        console.error("Error updating assignment:", err);
        res.status(500).json({ message: "Failed to update assignment" });
    }
});

app.delete("/delete-assignment/:assignmentId", async (req, res) => {
    const { assignmentId } = req.params;

    try {
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ success: false, message: "Assignment not found." });
        }

        // Check and delete uploaded file if exists
        if (assignment.filePath) {
            const filePath = path.join(__dirname, '..', 'src', assignment.filePath); // adjust path as per your structure
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.warn("Error deleting file:", err.message);
                } else {
                    console.log("Assignment file deleted:", filePath);
                }
            });
        }

        await Assignment.findByIdAndDelete(assignmentId);

        res.json({ success: true, message: "Assignment deleted successfully." });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ success: false, message: "Failed to delete assignment." });
    }
});

app.get("/assignment-submissions/:courseId/:assignmentId", async (req, res) => {
    const { courseId, assignmentId } = req.params;

    try {
        // Fetch the course to validate it exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).send("Course not found");
        }

        // Fetch the assignment for the course
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).send("Assignment not found");
        }

        // Fetch all submissions for the assignment
        const submissions = await Submission.find({ assignmentId: assignmentId });

        // Render the view with assignment and submissions
        res.render("courseAssignmentSubmissions", {
            title: "View Submissions",
            courseId: courseId,
            assignment: assignment,
            submissions: submissions // Pass the submissions data
        });
    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).send("Server error");
    }
});

app.post("/submit-feedback/:submissionId", async (req, res) => {
    const { submissionId } = req.params;
    const { marks, feedback } = req.body;

    try {
        const submission = await Submission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({ error: "Submission not found" });
        }

        submission.marksObtained = marks;
        submission.feedback = feedback;
        submission.status = 'Graded'; // Optional: update status

        await submission.save();

        res.json({ success: true, message: "Feedback saved successfully" });
    } catch (error) {
        console.error("Error saving feedback:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}); 

app.get('/course/:courseId/attendance', async (req, res) => {
    const { courseId } = req.params;

    try {
        const course = await Course.findById(courseId);
        const attendance = await Attendance.find({ courseId })
            .populate('studentId', 'name prn college abcId')
            .sort({ completionDate: -1 });

        res.render("courseAttendance", {
            course,
            attendanceRecords: attendance
        });
    } catch (error) {
        console.error("Error fetching attendance:", error);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
});

app.post('/course/:courseId/attendance', async (req, res) => {
    const { courseId } = req.params;
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'Invalid request format. Expected an array of records.' });
    }

    try {
        const attendanceDocs = [];

        function excelDateToJSDate(serial) {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899 UTC
            return new Date(excelEpoch.getTime() + serial * 86400000); // 86400000 ms per day
        }

        for (const record of records) {
            const student = await Student.findOne({
                $or: [
                    { prn: record.prn },
                    { abcId: record.abcId }
                ]
            });

            if (!student) {
                console.warn(`Student not found for PRN: ${record.prn} or ABC ID: ${record.abcId}`);
                continue;
            }

            let parsedDate = null;
            if (record.completionDate) {
                if (typeof record.completionDate === 'number') {
                    // Convert Excel serial date to JS Date
                    parsedDate = excelDateToJSDate(record.completionDate);
                } else {
                    const tempDate = new Date(record.completionDate);
                    if (!isNaN(tempDate)) {
                        parsedDate = tempDate;
                    } else {
                        console.warn(`Invalid completionDate for student ${student._id}: ${record.completionDate}`);
                    }
                }
            }

            attendanceDocs.push({
                courseId,
                studentId: student._id,
                studentName: record.studentName,
                prnNumber: record.prn,
                collegeName: record.college,
                abcId: record.abcId,
                completionDate: parsedDate,
                attendance: Number(record.attendance) || 0,
                totalClasses: Number(record.totalClasses) || 0,
                percentage: ((record.attendance / record.totalClasses) * 100).toFixed(2) || 0
            });
        }

        if (attendanceDocs.length === 0) {
            return res.status(400).json({ error: "No valid attendance records to save." });
        }

        await Attendance.insertMany(attendanceDocs);
        res.status(201).json({ message: 'Attendance records saved successfully' });
    } catch (error) {
        console.error("Error saving attendance:", error);
        res.status(500).json({ error: 'Failed to save attendance records' });
    }
});

// GET grades page
app.get('/course/:courseId/grades', async (req, res) => {
    const { courseId } = req.params;

    try {
        const course = await Course.findById(courseId);
        const grade = await Grade.find({ courseId })
            .populate('studentId', 'name prn college abcId')
            .sort({ completionDate: -1 });

        res.render('courseGrades', {
            course,
            grades: grade
        });

    } catch (error) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ error: 'Failed to fetch grades' });
    }
});

// POST grades (import) handler
app.post('/course/:courseId/grades', async (req, res) => {
    const { courseId } = req.params;
    const { records } = req.body;  // <-- expect 'records' array in JSON body

    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'Invalid request format. Expected an array of records.' });
    }

    try {
        function calculateGrade(marks, total) {
            const percent = (marks / total) * 100;
            if (percent >= 90) return 'A+';
            if (percent >= 80) return 'A';
            if (percent >= 70) return 'B+';
            if (percent >= 60) return 'B';
            if (percent >= 50) return 'C';
            return 'F';
        }

        function excelDateToJSDate(serial) {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899 UTC
            return new Date(excelEpoch.getTime() + serial * 86400000); // 86400000 ms per day
        }

        const gradeDocs = [];

        for (const record of records) {
            const student = await Student.findOne({
                $or: [
                    { prn: record.prnNumber || record.prn },
                    { abcId: record.abcId }
                ]
            });

            if (!student) {
                console.warn(`Student not found for PRN: ${record.prnNumber || record.prn} or ABC ID: ${record.abcId}`);
                continue;
            }

            let parsedDate = null;
            if (record.completionDate) {
                if (typeof record.completionDate === 'number') {
                    // Convert Excel serial date to JS Date
                    parsedDate = excelDateToJSDate(record.completionDate);
                } else {
                    const tempDate = new Date(record.completionDate);
                    if (!isNaN(tempDate)) {
                        parsedDate = tempDate;
                    } else {
                        console.warn(`Invalid completionDate for student ${student._id}: ${record.completionDate}`);
                    }
                }
            }

            const marksObtained = Number(record.marksObtained) || 0;
            const totalMarks = Number(record.totalMarks) || 0;
            if (totalMarks === 0) {
                console.warn(`Total marks zero or invalid for student ${student._id}`);
                continue;
            }

            const percentage = ((marksObtained / totalMarks) * 100).toFixed(2);
            const grade = calculateGrade(marksObtained, totalMarks);

            gradeDocs.push({
                courseId,
                studentId: student._id,
                studentName: record.studentName || student.name,
                prnNumber: record.prnNumber || student.prn,
                collegeName: record.collegeName || student.college,
                abcId: record.abcId || student.abcId,
                completionDate: parsedDate,
                marksObtained,
                totalMarks,
                percentage,
                grade
            });
        }

        if (gradeDocs.length === 0) {
            return res.status(400).json({ error: "No valid grade records to save." });
        }

        for (const doc of gradeDocs) {
            const existing = await Grade.findOne({ courseId, studentId: doc.studentId });
            if (existing) {
                existing.studentName = doc.studentName;
                existing.prnNumber = doc.prnNumber;
                existing.collegeName = doc.collegeName;
                existing.abcId = doc.abcId;
                existing.completionDate = doc.completionDate;
                existing.marksObtained = doc.marksObtained;
                existing.totalMarks = doc.totalMarks;
                existing.percentage = doc.percentage;
                existing.grade = doc.grade;
                await existing.save();
            } else {
                await Grade.create(doc);
            }
        }

        res.status(201).json({ message: 'Grades saved successfully' });
    } catch (error) {
        console.error("Error saving grades:", error);
        res.status(500).json({ error: 'Failed to save grades' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});