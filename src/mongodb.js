const mongoose = require('mongoose');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { stringify } = require('querystring');

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/MultidisciplinaryCreditManagementSystem", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connected to the MultidisciplinaryCreditManagementSystem Database");
    })
    .catch((err) => {
        console.log("Failed to connect to MongoDB", err);
    });

// Define the student schema
const studentSchema = new mongoose.Schema({
    firstName: String,
    middleName: String,
    lastName: String,
    collegeName: String,
    prnNumber: { type: Number, unique: true, required: true },
    abcId: { type: Number, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    contact: Number,
    passoutYear: { type: Number, required: true }, // New Field
    degree: { type: String, required: true }, // New Field
    branch: { type: String, required: true } // New Field
});

const registeredStudentSchema = new mongoose.Schema({
    firstName: String,
    middleName: String,
    lastName: String,
    prnNumber: { type: Number, required: true },
    Email: String,
    Contact: Number,
    collegeName: String,
    admissionYear: { type: Number, required: true },
    passoutYear: { type: Number, required: true },
    degree: { type: String, required: true },
    branch: { type: String, required: true },
    abcId: { type: Number, required: true },
    password: String
});

const courseSchema = new mongoose.Schema({
    courseName: { type: String, required: true },
    courseDescription: { type: String, required: true },
    credits: { type: Number, required: true },
    duration: { type: String, required: true },
    mode: { type: String, required: true, enum: ['online', 'offline'] },
    collegeID: { type: String, required: true },
    collegeName: { type: String, required: true },
    facultyName: { type: String, required: true },
    courseModules: { type: String },
    image: { type: String }
});

const collegeSchema = new mongoose.Schema({
    collegeID: String,
    collegeName: String,
    password: String
})

const enrolledStudentSchema = new mongoose.Schema({
    prnNumber: { type: String, required: true },
    studentName: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    courseName: { type: String, required: true },
    collegeName: { type: String, required: true },
    status: {
        type: String,
        enum: ["Ongoing", "Completed", "Approval Pending"],
        default: "Approval Pending"
    },
    enrollmentDate: { type: Date, default: Date.now },
    completionDate: { type: Date },
    certificateUrl: { type: String },
    abcId: { type: String }
});

const assignmentSchema = new mongoose.Schema({
    title: String,
    topic: String,
    uploadedAt: { type: Date, default: Date.now },
    dueDate: Date,
    marks: Number,
    description: String,
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    file: {
        name: String,       // Name of the file
        path: String,       // Path to the file
        mimeType: String,   // MIME type of the file
        uploadedAt: { type: Date, default: Date.now }  // Upload timestamp
    }
});

const submissionSchema = new mongoose.Schema({
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RegisteredStudent',
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    submittedDate: {
        type: Date,
        default: Date.now
    },
    fileUrl: {
        type: String
    },
    marks: {
        type: Number,
        default: null
    },
    feedback: {
        type: String,
        default: ''
    }
});

const attendanceSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredStudent', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['Present', 'Absent'], required: true }
});

const RegisteredStudent = mongoose.model('RegisteredStudent', registeredStudentSchema);
const Student = mongoose.model('StudentDetails', studentSchema);
const Course = mongoose.model('Course', courseSchema); // Create the Course model
const College = mongoose.model('CollegeDetails', collegeSchema)
const EnrolledStudent = mongoose.model("EnrolledStudent", enrolledStudentSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);
const Submission = mongoose.model('Submission', submissionSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

async function importExcelToMongoDB(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0]; // Get the first sheet
        const sheet = workbook.Sheets[sheetName];

        // Convert Excel sheet to JSON
        const jsonData = xlsx.utils.sheet_to_json(sheet);

        // Iterate through each row and save it to MongoDB
        for (let data of jsonData) {
            try {
                const newStudent = new Student({
                    firstName: data["First Name"],
                    middleName: data["Middle Name"] || "",
                    lastName: data["Last Name"],
                    collegeName: data["College Name"],
                    degree: data["Degree"],
                    branch: data["Branch"],
                    prnNumber: data["PRN Number"],
                    abcId: data["ABC ID"],
                    email: data["Email"],
                    contact: data["Contact"],
                    passoutYear: data["Passout Year"]
                });

                // Save student data to MongoDB
                await newStudent.save();
                console.log(`Inserted student: PRN ${data["PRN Number"]}, ABC ID ${data["ABC ID"]}`);
            } catch (err) {
                if (err.code === 11000) {
                    console.log(`Duplicate entry skipped: PRN ${data["PRN Number"]}, ABC ID ${data["ABC ID"]}`);
                } else {
                    console.error("Error saving student data:", err);
                }
            }
        }

        console.log("Data imported to MongoDB successfully!");
    } catch (error) {
        console.error("Error importing data to MongoDB:", error);
    }
}

// module.exports = { Student, RegisteredStudent, Course, importExcelToMongoDB, UploadedCertificate };
module.exports = { Student, RegisteredStudent, Course, importExcelToMongoDB, College, EnrolledStudent, Assignment, Submission, Attendance };