// document.getElementById("course-form").addEventListener("submit", function(event) {
//     event.preventDefault();
//     alert("Course has been submitted successfully!");
// });

function toggleMenu() {
    const menu = document.querySelector(".content");
    const button = document.querySelector(".collapsible");
    menu.classList.toggle("active");

    // Toggle the button text between ☰ and ×
    if (menu.classList.contains("active")) {
        button.innerHTML = "×";  // Change to "X" when menu is open
    } else {
        button.innerHTML = "☰";  // Change back to "☰" when menu is closed
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('courseUploadForm').addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the default form submission

        const formData = new FormData(event.target);

        try {
            const response = await fetch('/uploadcourse', {
                method: 'POST',
                body: formData
            });

            const result = await response.json(); // Parse JSON response

            // Display alert based on the response
            if (response.ok) {
                alert(result.message); // Show success message
            } else {
                alert(result.message); // Show error message
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An unexpected error occurred.'); // Handle unexpected errors
        }
    });
});


