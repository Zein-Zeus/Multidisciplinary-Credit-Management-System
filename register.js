document.addEventListener('DOMContentLoaded', function() {
    const submitButton = document.getElementById('submit-button');
    if (!submitButton) {
        console.error('submit button not found');
        return;
    }

    submitButton.addEventListener('click', function() {
        const studentName = document.getElementById('student-name').value;
        const studentPrn = document.getElementById('student-prn').value;
        const Email = document.getElementById('Email').value;
        const Contact = document.getElementById('Contact').value;
        const collegeName = document.getElementById('college-name').value;
        const ABC = document.getElementById('ABC').value;

        if (!studentName || !studentPrn || !Email|| !Contact || !collegeName || !ABC) {
            alert('Please fill in all fields.');
            return;
        }

        if (studentPrn.length !== 12 || !/^\d{12}$/.test(pnrNumber)) {
            alert('PNR Number must contain exactly 12 digits.');
            return;
        }

        if (studentName && studentPrn && Email && Contact && collegeName && ABC) {
            prompt('Registered Successfully');
            return;
        }

        // Redirect to the next page
        window.location.href = 'index.html'; // Change this URL to your next page
    });
});