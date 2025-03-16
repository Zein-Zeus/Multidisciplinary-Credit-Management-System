document.getElementById('course-upload-form').addEventListener('submit', async function (e) {
    e.preventDefault(); // Prevent default form submission

    const formData = new FormData(this);

    try {
        const response = await fetch('/uploadcourse', {
            method: 'POST',
            body: formData
        });

        const data = await response.json(); // Parse JSON response

        // Show popup with message
        if (response.ok) {
            showPopup("Course uploaded successfully!");
            this.reset(); // Reset form after success
        } else {
            showPopup("Error: " + data.message);
        }
    } catch (error) {
        console.error("Error:", error);
        showPopup("⚠ An unexpected error occurred.");
    }
});

// Function to show pop-up notification
function showPopup(message) {
    const popup = document.getElementById("popup-notification");
    const popupMessage = document.getElementById("popup-message");

    popupMessage.textContent = message;
    popup.style.display = "block";

    setTimeout(() => {
        popup.style.display = "none"; // Hide after 3s
    }, 3000);
}