document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent the default form submission
    
    const studentName = document.getElementById('student-name').value;
    const collegeName = document.getElementById('college-name').value;
    const prnNumber = document.getElementById('prn-number').value;
    const abcId = document.getElementById('ABC-id').value;

    const loginData = {
        studentName,
        collegeName,
        prnNumber,
        abcId
    };

    try {
        const response = await fetch('https://your-api-endpoint.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        if (response.ok) {
            const data = await response.json();
            // Handle successful login, e.g., redirect to dashboard
            window.location.href = '/dashboard.html'; // Adjust to your route
        } else {
            // Handle login error
            alert('Login failed. Please check your credentials and try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while trying to log in.');
    }
});
