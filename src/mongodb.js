const mongoose = require("mongoose");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const fs = require("fs");
const path = require("path");

// Load Google Sheets credentials
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const SHEET_ID = '1nylbEjFV-WUimEe6db_FVBV-leEJt0_B6dGr9L7AUBU'; // Your Google Sheet ID

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/studentData")
.then(() => {
    console.log("Mongodb Connected");
})
.catch((err) => {
    console.log("Failed to Connect", err);
});

const studentSchema = new mongoose.Schema({
    studentName: String,
    prnNumber: {
        type: Number,
        unique: true, // Ensure PRN number is unique
        required: true
    },
    Email: {
        type: String,
        unique: true, // Ensure Email is unique
        required: true
    },
    Contact: Number,
    collegeName: String,
    abcId: {
        type: Number,
        unique: true, // Ensure ABC ID is unique
        required: true
    },
    password: String
});

const Student = mongoose.model('StudentNew', studentSchema);

async function updateGoogleSheet(data) {
    try {
        const doc = new GoogleSpreadsheet(SHEET_ID);
        const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));

        await doc.useServiceAccountAuth({
            client_email: creds.client_email,
            private_key: creds.private_key
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['studentInfo'];
        
        if (!sheet) {
            throw new Error("Sheet not found!");
        }

        let headerValues = sheet.headerValues;
        if (!headerValues || headerValues.length === 0) {
            console.log("Headers not found. Setting default headers.");
            await sheet.setHeaderRow(['studentName', 'prnNumber', 'Email', 'Contact', 'collegeName', 'abcId', 'password']);
            headerValues = ['studentName', 'prnNumber', 'Email', 'Contact', 'collegeName', 'abcId', 'password'];
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

async function getGoogleSheetData(prnNumber) {
    try {
        const doc = new GoogleSpreadsheet(SHEET_ID);
        const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));

        await doc.useServiceAccountAuth({
            client_email: creds.client_email,
            private_key: creds.private_key
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['studentInfo'];
        
        if (!sheet) {
            throw new Error("Sheet not found!");
        }

        const rows = await sheet.getRows();
        const userRow = rows.find(row => Number(row.prnNumber) === prnNumber);
        return userRow ? userRow._rawData : null;
    } catch (error) {
        console.error('Error getting data from Google Sheet:', error);
        return null;
    }
}

module.exports = { Student, updateGoogleSheet, getGoogleSheetData };
