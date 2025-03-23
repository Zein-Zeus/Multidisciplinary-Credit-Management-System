const passwordInput = document.getElementById('password');
const passwordRequirements = document.getElementById('password-requirements');

// Show tooltip when the password input is focused
passwordInput.addEventListener('focus', () => {
    passwordRequirements.style.display = 'block';
    passwordRequirements.style.opacity = '1'; // Make it visible
});

// Hide tooltip when the password input loses focus
passwordInput.addEventListener('blur', () => {
    passwordRequirements.style.display = 'none';
});

// Optional: Keep tooltip open if there is a validation issue
passwordInput.addEventListener('input', () => {
    if (passwordInput.validity.valid) {
        passwordRequirements.style.display = 'none'; // Hide if valid
    } else {
        passwordRequirements.style.display = 'block'; // Show if invalid
    }
});


document.addEventListener('DOMContentLoaded', function () {
    const prnInput = document.getElementById('student-prn'); 
    const firstNameField = document.getElementById('student-name'); 
    const middleNameField = document.getElementById('student-middle-name'); 
    const lastNameField = document.getElementById('student-lastname'); 
    const emailField = document.getElementById('Email');
    const collegeField = document.getElementById('college-name');
    const abcIdField = document.getElementById('ABC');
    const contactField = document.getElementById('Contact');
    const degreeField = document.getElementById('degree');
    const branchField = document.getElementById('branch');
    const passoutYearField = document.getElementById('passoutYear');

    // Fetch student details when user stops typing (debounce)
    let timeout = null;
    prnInput.addEventListener('input', function () {
        clearTimeout(timeout); // Clear previous timeout to avoid multiple requests

        timeout = setTimeout(async function () {
            const enteredPrn = prnInput.value.trim();
            if (enteredPrn) {
                try {
                    const response = await fetch(`/get-student-info?prnNumber=${enteredPrn}`);
                    const studentData = await response.json();

                    if (studentData) {
                        firstNameField.value = studentData.firstName || '';
                        middleNameField.value = studentData.middleName || '';
                        lastNameField.value = studentData.lastName || '';
                        emailField.value = studentData.email || '';
                        collegeField.value = studentData.collegeName || '';
                        abcIdField.value = studentData.abcId || '';
                        contactField.value = studentData.contact || '';
                        degreeField.value = studentData.degree || '';
                        branchField.value = studentData.branch || '';
                        passoutYearField.value = studentData.passoutYear || '';
                    } else {
                        // Clear all fields if no data is found
                        firstNameField.value = '';
                        middleNameField.value = '';
                        lastNameField.value = '';
                        emailField.value = '';
                        collegeField.value = '';
                        abcIdField.value = '';
                        contactField.value = '';
                        degreeField.value = '';
                        branchField.value = '';
                        passoutYearField.value = '';
                    }
                } catch (error) {
                    console.error('Error fetching student info:', error);
                }
            }
        }, 500); // Delay the request to avoid excessive API calls
    });
});