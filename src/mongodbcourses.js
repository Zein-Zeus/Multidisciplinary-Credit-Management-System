const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

// Define the schema for a Course
const courseSchema = new mongoose.Schema({
    courseName: {
        type: String,
        required: true,
    },
    courseCredits: {
        type: Number,
        required: true,
    },
    courseCollege: {
        type: String,
        required: true,
    },
    courseFile: {
        type: String, // Store the file path of the uploaded course
        required: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
});

// Create a model for the Course
const Course = mongoose.model('Course', courseSchema);

// Set up Multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/courses'); // Directory where files will be stored
    },
    filename: (req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName); // Save the file with a timestamp to avoid name conflicts
    },
});

// File size limit: 5MB
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf/; // Accept only PDF files
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDFs are allowed!'));
        }
    },
});

// Route to handle course creation
const uploadCourse = (req, res) => {
    upload.single('certificate-upload')(req, res, (err) => {
        if (err) {
            return res.status(400).send({ error: err.message });
        }

        const { courseName, courseCredits, courseCollege } = req.body;
        const courseFile = req.file.filename;

        // Create a new course document
        const newCourse = new Course({
            courseName,
            courseCredits,
            courseCollege,
            courseFile,
        });

        // Save the course to the database
        newCourse.save()
            .then(() => res.status(200).send({ message: 'Course uploaded successfully!' }))
            .catch((err) => res.status(500).send({ error: 'Failed to upload course.' }));
    });
};

module.exports = {
    uploadCourse,
};
