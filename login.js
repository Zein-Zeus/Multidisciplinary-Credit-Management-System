document.addEventListener('DOMContentLoaded', function() {
    const loginButton = document.getElementById('login-button');
    if (!loginButton) {
        console.error('Login button not found');
        return;
    }

    loginButton.addEventListener('click', function() {
        const studentName = document.getElementById('student-name').value;
        const collegeName = document.getElementById('college-name').value;
        const pnrNumber = document.getElementById('pnr-number').value;

        if (!studentName || !collegeName || !pnrNumber) {
            alert('Please fill in all fields.');
            return;
        }

        if (pnrNumber.length !== 12 || !/^\d{12}$/.test(pnrNumber)) {
            alert('PNR Number must contain exactly 12 digits.');
            return;
        }

        // Redirect to the next page
        window.location.href = 'home.html'; // Change this URL to your next page
    });
});