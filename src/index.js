const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const multer = require('multer'); // Import multer
const XLSX = require('xlsx'); // Import xlsx
const { Student, RegisteredStudent, Course, updateGoogleSheet, importExcelToMongoDB, College, EnrolledStudent } = require("./mongodb");
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const router = express.Router();
require('dotenv').config();
const mongoose = require("mongoose");  
const ExcelJS = require("exceljs");

hbs.registerHelper("json", function(context) {
    return JSON.stringify(context);
});

// Register 'eq' helper for Handlebars
hbs.registerHelper("eq", function (a, b) {
    return a === b;
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

        res.render("studentDashboard", {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
            ongoingCourses: enrolledCourses.filter(course => course.status === "Ongoing"),
            completedCourses: enrolledCourses.filter(course => course.status === "Completed"),
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).send("An error occurred while loading the dashboard");
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
    console.log(`Fetching details for PRN: ${prnNumber}`); // Debugging log

    try {
        const student = await Student.findOne({ prnNumber }).select('firstName middleName lastName collegeName abcId email contact');
        console.log("Found student data:", student); // Log the full response

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
            modules: modulesArray ,
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

app.post("/enroll", async (req, res) => {
    if (!req.session.prnNumber) {
        return res.status(401).send("Please log in to enroll in a course.");
    }

    try {
        let { courseId, courseName, collegeName } = req.body;

        // Validate courseId
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

        const enrollment = new EnrolledStudent({
            prnNumber: req.session.prnNumber,
            studentName: `${student.firstName} ${student.lastName}`,
            courseId: new mongoose.Types.ObjectId(courseId), // Convert to ObjectId
            courseName,
            collegeName,
            status: "Ongoing",
        });

        await enrollment.save();
        res.redirect("/dashboard");
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

app.get("/clgstudentrecords", async (req, res) => {
    try {
        const { course, status } = req.query; // Get filter values from query params

        let filter = {}; // Empty filter object

        if (course && course !== "all") {
            filter.courseName = course;
        }
        if (status && status !== "all") {
            filter.status = status;
        }

        // Fetch filtered student records
        const students = await EnrolledStudent.find(filter).lean();

        // Get unique course names
        const courses = await EnrolledStudent.distinct("courseName");

        // Set available statuses
        const statuses = ["Ongoing", "Completed"];

        res.render("collegeStudentRecords", { students, courses, statuses, selectedCourse: course, selectedStatus: status });
    } catch (err) {
        console.error("Error fetching student records:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/export-student-records", async (req, res) => {
    try {
        const { course, status } = req.query;

        let filter = {};

        if (course && course !== "all") {
            filter.courseName = course;
        }
        if (status && status !== "all") {
            filter.status = status;
        }

        const students = await EnrolledStudent.find(filter).lean();

        // Create a new workbook and add a worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Student Records");

        // Define columns
        worksheet.columns = [
            { header: "PRN", key: "prnNumber", width: 15 },
            { header: "Student Name", key: "studentName", width: 25 },
            { header: "Course Name", key: "courseName", width: 30 },
            { header: "College Name", key: "collegeName", width: 30 },
            { header: "Completion Status", key: "status", width: 15 },
            { header: "Enrollment Date", key: "enrollmentDate", width: 20 },
            { header: "Completion Date", key: "completionDate", width: 20 },
            { header: "Certificate URL", key: "certificateUrl", width: 40 }
        ];

        // Add student data to worksheet
        students.forEach(student => {
            worksheet.addRow({
                prnNumber: student.prnNumber,
                studentName: student.studentName,
                courseName: student.courseName,
                collegeName: student.collegeName,
                status: student.status,
                enrollmentDate: student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : "",
                completionDate: student.completionDate ? new Date(student.completionDate).toLocaleDateString() : "",
                certificateUrl: student.certificateUrl || "N/A"
            });
        });

        // Write to buffer and send response
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=student_records.xlsx");

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error generating Excel file:", error);
        res.status(500).send("Error generating file.");
    }
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

// Add this route for handling course upload
app.post("/uploadcourse", uploadCourseImage.single('image'), async (req, res) => {
    if (!req.session.collegeID) {
        return res.status(401).send("Unauthorized. Please login.");
    }

    console.log(req.body);
    
    let credits = req.body.credits;
    if (credits === "others" && req.body.customCredits) {
        credits = Number(req.body.customCredits);
    }
    if (isNaN(credits)) {
        return res.status(400).send('Please enter a valid number for credits.');
    }

    const newCourseData = {
        courseName: req.body.courseName,
        courseDescription: req.body.courseDescription,
        credits: credits,
        duration: req.body.duration,
        mode: req.body.mode,
        collegeID: req.session.collegeID, // Auto-fill from session
        collegeName: req.session.collegeName, // Auto-fill from session
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
        res.status(500).json({ success: false, message: 'Error saving course: ' + error.message });
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
        return res.status(401).send("Unauthorized. Please login.");
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

        // Prepare update data
        const updatedData = {
            courseName: req.body.courseName,
            courseDescription: req.body.courseDescription,
            credits: credits,
            duration: req.body.duration,
            mode: req.body.mode,
            facultyName: req.body.facultyName,
            courseModules: req.body.courseModules,
            collegeID: req.session.collegeID, // Ensure it belongs to logged-in college
            collegeName: req.session.collegeName, // Keep original name
        };

        // If a new image is uploaded, update it
        if (req.file) {
            updatedData.image = `/uploads/courseImage/${req.file.filename}`;
        }

        const updatedCourse = await Course.findOneAndUpdate(
            { _id: courseId, collegeID: req.session.collegeID }, // Ensure only the uploader can modify
            updatedData,
            { new: true }
        );

        if (!updatedCourse) {
            return res.status(404).json({ success: false, message: "Course not found or unauthorized." });
        }

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
        const completionDate = new Date(); // Capture current timestamp

        const updatedStudents = await EnrolledStudent.updateMany(
            { courseId, status: "Ongoing" }, // Update only ongoing courses
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
