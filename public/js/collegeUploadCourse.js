// document.getElementById("course-form").addEventListener("submit", function(event) {
//     event.preventDefault();
//     alert("Course has been submitted successfully!");
// });

document.addEventListener("DOMContentLoaded", function() {
    var coll = document.querySelector(".collapsible");
    
    coll.addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
            content.style.display = "none";
        } else {
            content.style.display = "block";
        }
    });
});

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


