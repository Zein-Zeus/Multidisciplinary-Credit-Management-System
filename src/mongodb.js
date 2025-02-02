const mongoose = require('mongoose');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Load Google Sheets credentials
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const SHEET_ID = '1pKIFMd9BVxt9yhPMII3zL76Fo0BLRrh_1WihSWWE92w'; // Your Google Sheet ID

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/ABCWebsite", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connected to the ABCWebsite Database");
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
    prnNumber: {
        type: Number,
        unique: true, // Ensure PRN number is unique
        required: true
    },
    abcId: {
        type: Number,
        unique: true, // Ensure ABC ID is unique
        required: true
    },
    email: {
        type: String,
        unique: true, // Ensure Email is unique
        required: true
    },
    contact: Number
});

// Create a new model for registered students
const registeredStudentSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true // Make sure this is required if needed
    },
    middleName: String,
    lastName: {
        type: String,
        required: true // Make sure this is required if needed
    },
    prnNumber: {
        type: Number,
        required: true
    },
    Email: {
        type: String,
        required: true
    },
    Contact: Number,
    collegeName: String,
    abcId: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true // Make sure this is required if needed
    }
});

// Define the course schema
const courseSchema = new mongoose.Schema({
    // courseCode: {
    //     type: String,
    //     required: true
    // },
    courseName: {
        type: String,
        required: true // Remove the unique constraint
    },
    courseDescription: {
        type: String,
        required: true
    },
    credits: {
        type: Number,
        required: true
    },
    duration: {
        type: String, // Adjust type as needed
        required: true
    },
    mode: {
        type: String,
        required: true,
        enum: ['online', 'offline'] // Restrict values to 'online' or 'offline'
    },
    collegeName: {
        type: String,
        required: true
    },
    facultyName: {
        type: String,
        required: true
    },
    courseModules: {
        type: String // Adjust type as needed
    },
    courseOutcomes: {
        type: String // Adjust type as needed
    },
    image: {
        type: String
    }
});

const UploadedCertificateSchema = new mongoose.Schema({
    studentPRN: {
        type: String,
        required: true,
    },
    certificatePath: {
        type: String,
        required: true,
    },
    courseName: {
        type: String,
        required: true,
    },
    credits: {
        type: Number,
        required: true,
    },
    courseOrganization: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    remarks: {
        type: String,
        default: '',
    },
});

const RegisteredStudent = mongoose.model('RegisteredStudent', registeredStudentSchema);
const Student = mongoose.model('StudentDetails', studentSchema);
const Course = mongoose.model('Course', courseSchema); // Create the Course model
const UploadedCertificate = mongoose.model('UploadedCertificate', UploadedCertificateSchema);

async function updateGoogleSheet(data) {
    try {
        const doc = new GoogleSpreadsheet(SHEET_ID);
        const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));

        await doc.useServiceAccountAuth({
            client_email: creds.client_email,
            private_key: creds.private_key
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['StudentDetails'];
        
        if (!sheet) {
            throw new Error("Sheet not found!");
        }

        let headerValues = sheet.headerValues;
        if (!headerValues || headerValues.length === 0) {
            console.log("Headers not found. Setting default headers.");
            await sheet.setHeaderRow(['firstName', 'middleName', 'lastName', 'collegeName', 'prnNumber', 'abcId', 'email', 'contact']);
            headerValues = ['firstName', 'middleName', 'lastName', 'collegeName', 'prnNumber', 'abcId', 'email', 'contact'];
        } else {
            console.log("Headers in sheet:", headerValues);
        }

        // Mask password for Google Sheet
        const dataWithMaskedPassword = { ...data, password: '#######' };

        await sheet.addRows([dataWithMaskedPassword]);
        console.log('Sheet updated successfully');
    } catch (error) {
        console.error('Error updating Google Sheet:', error);
    }
}

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
                    firstName: data['First Name'],
                    middleName: data['Middle Name'],
                    lastName: data['Last Name'],
                    collegeName: data['College Name'],
                    prnNumber: data['PRN number'],
                    abcId: data['ABC ID'],
                    email: data['Email Id'],
                    contact: data['Contact'] // Ensure column names match your Excel file
                });

                // Save student data to MongoDB
                await newStudent.save();
                console.log(`Inserted student with PRN ${data['PRN number']} and ABC ID ${data['ABC ID']}`);
            } catch (err) {
                if (err.code === 11000) {
                    console.log(`Duplicate entry skipped for PRN ${data['PRN number']} and ABC ID ${data['ABC ID']}`);
                } else {
                    console.error('Error saving student data:', err);
                }
            }
        }

        console.log('Data imported to MongoDB successfully!');
    } catch (error) {
        console.error('Error importing data to MongoDB:', error);
    }
}

// New function to import courses from an Excel file
// async function importCoursesFromExcel(filePath) {
//     try {
//         const workbook = xlsx.readFile(filePath);
//         const sheetName = workbook.SheetNames[0]; // Get the first sheet
//         const sheet = workbook.Sheets[sheetName];
        
//         // Convert Excel sheet to JSON
//         const jsonData = xlsx.utils.sheet_to_json(sheet);

//         // Iterate through each row and save it to MongoDB
//         for (let data of jsonData) {
//             try {
//                 const newCourse = new Course({
//                     courseName: data['Course Name'],
//                     courseCode: data['Course Code'],
//                     description: data['Description'],
//                     credits: data['Credits']
//                 });

//                 // Save course data to MongoDB
//                 await newCourse.save();
//                 console.log(`Inserted course ${data['Course Name']} with code ${data['Course Code']}`);
//             } catch (err) {
//                 if (err.code === 11000) {
//                     console.log(`Duplicate entry skipped for course ${data['Course Name']} with code ${data['Course Code']}`);
//                 } else {
//                     console.error('Error saving course data:', err);
//                 }
//             }
//         }

//         console.log('Courses imported to MongoDB successfully!');
//     } catch (error) {
//         console.error('Error importing courses to MongoDB:', error);
//     }
// }

module.exports = { Student, RegisteredStudent, Course, updateGoogleSheet, importExcelToMongoDB, UploadedCertificate };
