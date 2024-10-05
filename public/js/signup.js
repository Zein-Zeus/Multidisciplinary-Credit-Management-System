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
    const firstNameInput = document.getElementById('student-name');
    const lastNameInput = document.getElementById('student-lastname');
    const prnDropdown = document.getElementById('student-prn');
    const emailField = document.getElementById('Email');
    const collegeField = document.getElementById('college-name');
    const abcIdField = document.getElementById('ABC');
    const contactField = document.getElementById('Contact'); // Added contact field

    let prnData = [];

    async function updatePRNDropdown() {
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();

        // Clear existing PRN dropdown options
        prnDropdown.innerHTML = '<option value="">Select your PRN</option>';

        if (firstName || lastName) {
            try {
                console.log('Fetching PRNs with:', firstName, lastName);  // Logging first and last name
                const response = await fetch(`/api/getPrn?firstName=${firstName}&lastName=${lastName}`);
                prnData = await response.json();
                console.log('Received PRN data:', prnData);  // Log the fetched PRN data

                if (prnData.length > 0) {
                    prnData.forEach(student => {
                        const prn = student.prnNumber || '';
                        const displayName = `${student.firstName || ''} ${student.lastName || ''}`.trim();

                        if (prn && displayName) {
                            // prnDropdown.innerHTML += `<option value="${prn}">${prn} - ${displayName}</option>`;
                            prnDropdown.innerHTML += `<option value="${prn}">${prn}</option>`;
                        }
                    });
                } else {
                    prnDropdown.innerHTML = '<option value="">No matching PRNs found</option>';
                }
            } catch (error) {
                console.error('Error fetching PRNs:', error);
            }
        }
    }

    prnDropdown.addEventListener('change', async function () {
        const selectedPrn = prnDropdown.value;

        if (selectedPrn) {
            try {
                const response = await fetch(`/get-student-info?prnNumber=${selectedPrn}`);
                const selectedStudent = await response.json();

                if (selectedStudent) {
                    emailField.value = selectedStudent.email || '';
                    collegeField.value = selectedStudent.collegeName || '';
                    abcIdField.value = selectedStudent.abcId || '';
                    contactField.value = selectedStudent.contact || ''; // Autofill contact number
                } else {
                    emailField.value = '';
                    collegeField.value = '';
                    abcIdField.value = '';
                    contactField.value = ''; // Clear contact number if no student found
                }
            } catch (error) {
                console.error('Error fetching student info:', error);
            }
        }
    });

    firstNameInput.addEventListener('input', updatePRNDropdown);
    lastNameInput.addEventListener('input', updatePRNDropdown);
});

