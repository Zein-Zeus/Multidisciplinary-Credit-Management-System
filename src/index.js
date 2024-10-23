const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const multer = require('multer'); // Import multer
const XLSX = require('xlsx'); // Import xlsx
const { Student, RegisteredStudent, updateGoogleSheet, importExcelToMongoDB } = require("./mongodbstudent");
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');

const { uploadCourse } = require("./mongodbcourses"); // Import course upload function

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage }); // Create upload instance

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

app.set("view engine", "hbs");

// Routes
// Student
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
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });

    if (user) {
        res.render('studentHome', {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
        });
    } else {
        res.status(404).send('User not found');
    }
});

app.get("/dashboard", async (req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });

    if (user) {
        res.render('studentDashboard', {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
        });
    } else {
        res.status(404).send('User not found');
    }
});

app.get("/course", async(req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });

    if (user) {
        res.render('studentCourses', {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
        });
    } else {
        res.status(404).send('User not found');
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

app.get("/AICoursePage", async(req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    const user = await RegisteredStudent.findOne({ prnNumber: req.session.prnNumber });

    if (user) {
        res.render('AICoursePage', {
            userName: `${user.firstName} ${user.lastName}`,
            userInitials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
        });
    } else {
        res.status(404).send('User not found');
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

// Add this route for handling course upload
app.post("/submit-course", upload.single('certificate-upload'), uploadCourse);

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error during logout:", err);
            return res.status(500).send("Error during logout. Please try again.");
        }
        res.redirect('/login');
    });
});

// College routes
app.get("/clglogin", (req, res) => {
    res.render("collegeLogin");
});

app.get("/clghome", (req, res) => {
    res.render("collegeHome");
});

app.get("/clgdashboard", async (req, res) => {
    try {
        const totalStudents = await RegisteredStudent.countDocuments(); // Count total students in the collection
        res.render("collegeDashboard", { totalStudents }); // Pass the count to the view
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

app.post("/register", async (req, res) => {
    try {
        // Check for existing PRN number
        const existingStudentByPrn = await Student.findOne({ prnNumber: req.body.prnNumber });
        if (existingStudentByPrn) {
            console.log('Student with this PRN number already exists.');
            return res.status(400).send('Student with this PRN number already exists.'); // Optionally display an error message
        }

        // Check for existing ABC ID
        const existingStudentByAbcId = await Student.findOne({ abcId: req.body.abcId });
        if (existingStudentByAbcId) {
            console.log('Student with this ABC ID already exists.');
            return res.status(400).send('Student with this ABC ID already exists.'); // Optionally display an error message
        }

        // Create a new student document
        const studentData = new Student({
            firstName: req.body.firstName,
            middleName: req.body.middleName,
            lastName: req.body.lastName,
            collegeName: req.body.collegeName,
            prnNumber: req.body.prnNumber,
            abcId: req.body.abcId,
            email: req.body.email, // Make sure this matches the form input
            contact: req.body.contact // Assuming this is captured from the form
        });

        await studentData.save();
        // If you're updating a Google Sheet
        // await updateGoogleSheet(studentData);

        console.log('Student registered successfully.');
        return res.redirect('/clgstudentreg'); // Redirect after successful registration

    } catch (err) {
        console.error('Error adding student:', err.message);
        res.status(400).send('Error adding student: ' + err.message);
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


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
