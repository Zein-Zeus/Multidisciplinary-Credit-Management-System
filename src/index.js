const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const multer = require('multer'); // Import multer
const XLSX = require('xlsx'); // Import xlsx
const { Student, RegisteredStudent, Course, importExcelToMongoDB, College, EnrolledStudent, Assignment, Submission, Attendance } = require("./mongodb");
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");

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

//studentCourseDashboard
app.get("/course/:id", async (req, res) => {
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

        res.render("studentCourseDashboard", {
            title: "Student Course Dashboard",
            username: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
            course // sending the course data to the HBS file
        });
    } catch (error) {
        console.error("Error loading course details:", error);
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
            req.session.studentName = `${user.firstName} ${user.lastName}`; // Full name
            req.session.abcId = user.abcId; // Store abcId in session

            console.log("Logged in user abcId:", req.session.abcId); // Debugging log

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
            res.redirect('/clglogin');
        }
        const totalStudents = await RegisteredStudent.countDocuments(); // Count total students in the collection
        const totalCourses = await Course.countDocuments();
        res.render("collegeDashboard", { totalStudents, totalCourses }); // Pass the count to the view
    } catch (err) {
        console.error('Error fetching students:', err);
        res.status(500).send('Error fetching student data.');
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
    try {
        const courseId = req.params.courseId;
        const course = await Course.findById(courseId);

        if (!course) return res.status(404).send('Course not found');

        const assignments = await Assignment.find({ courseId });

        res.render('courseClasswork', {
            courseId: course._id.toString(),
            courseName: course.courseName,
            assignments: assignments 
        });
    } catch (error) {
        console.error("Error loading classwork view:", error);
        res.status(500).send("Internal server error");
    }
});

app.get("/create-assignment/:courseId", (req, res) => {
    const { courseId } = req.params;
    res.render("createAssignment", { courseId }); // you'll need to make this view
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});