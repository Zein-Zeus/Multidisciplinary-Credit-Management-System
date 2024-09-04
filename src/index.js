const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const { Student, updateGoogleSheet, getGoogleSheetData } = require("./mongodb");
const session = require('express-session');
const crypto = require('crypto');

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
app.get("/", (req, res) => {
    res.render("login");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.get("/home", async(req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    const user = await Student.findOne({ prnNumber: req.session.prnNumber });

    if (user) {
        res.render('home', {
            userName: user.studentName,
            userInitials: user.studentName.split(' ').map(name => name[0]).join('')
        });
    } else {
        res.status(404).send('User not found');
    }
});

app.get("/dashboard", async (req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    const user = await Student.findOne({ prnNumber: req.session.prnNumber });

    if (user) {
        res.render('dashboard', {
            userName: user.studentName,
            userInitials: user.studentName.split(' ').map(name => name[0]).join('')
        });
    } else {
        res.status(404).send('User not found');
    }
});

app.get("/course", async(req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    const user = await Student.findOne({ prnNumber: req.session.prnNumber });

    if (user) {
        res.render('courses', {
            userName: user.studentName,
            userInitials: user.studentName.split(' ').map(name => name[0]).join('')
        });
    } else {
        res.status(404).send('User not found');
    }
});

app.get("/certificate", async(req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    const user = await Student.findOne({ prnNumber: req.session.prnNumber });

    if (user) {
        res.render('certificate', {
            userName: user.studentName,
            userInitials: user.studentName.split(' ').map(name => name[0]).join('')
        });
    } else {
        res.status(404).send('User not found');
    }
});

app.get("/AICoursePage", async(req, res) => {
    if (!req.session.prnNumber) {
        return res.redirect('/login');
    }

    const user = await Student.findOne({ prnNumber: req.session.prnNumber });

    if (user) {
        res.render('AICoursePage', {
            userName: user.studentName,
            userInitials: user.studentName.split(' ').map(name => name[0]).join('')
        });
    } else {
        res.status(404).send('User not found');
    }
});

app.post("/signup", async (req, res) => {
    try {
        const existingStudent = await Student.findOne({ prnNumber: req.body.prnNumber });
        if (existingStudent) {
            console.log('Student with this PRN number already exists.');
            return res.redirect("login");
        }

        const studentData = new Student({
            studentName: req.body.studentName,
            prnNumber: req.body.prnNumber,
            Email: req.body.Email,
            Contact: req.body.Contact,
            collegeName: req.body.collegeName,
            abcId: req.body.abcId,
            password: req.body.password
        });

        await studentData.save();

        // Update Google Sheet with masked password
        await updateGoogleSheet({
            studentName: req.body.studentName,
            prnNumber: req.body.prnNumber,
            Email: req.body.Email,
            Contact: req.body.Contact,
            collegeName: req.body.collegeName,
            abcId: req.body.abcId,
            password: '#######' // Masked password
        });

        res.redirect('/login');
    } catch (err) {
        res.status(400).send('Error adding student: ' + err.message);
    }
});

app.post("/login", async (req, res) => {
    try {
        const prnNumber = Number(req.body.prnNumber); // Convert to number
        const password = req.body.password; // Use plaintext password

        const user = await Student.findOne({ prnNumber: prnNumber });

        if (user && user.password === password) {
            req.session.prnNumber = user.prnNumber;
            req.session.studentName = user.studentName;

            res.redirect("/dashboard");
        } else {
            res.send("Wrong Details");
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.send("Wrong Details");
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

       
