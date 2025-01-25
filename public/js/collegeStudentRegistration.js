document.getElementById('import-button').addEventListener('click', function() {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', function() {
    const formData = new FormData(document.getElementById('import-form'));

    fetch('/import', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(data => {
        alert(data); // Display success message
        document.getElementById('file-input').value = ''; // Clear file input
    })
    .catch(error => {
        console.error('Error during import:', error);
        alert('Error during import: ' + error.message);
    });
});

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

document.getElementById("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission
    const formData = new FormData(event.target);

    try {
        const response = await fetch("/register", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();
        if (result.success) {
            showPopup("success", result.message);
        } else {
            showPopup("error", result.message);
        }
    } catch (error) {
        showPopup("error", "An unexpected error occurred.");
    }
});

function showPopup(type, message) {
    const popup = document.getElementById("popupNotification");
    popup.textContent = message;
    popup.className = `popup-notification ${type}`;
    popup.style.display = "block";

    // Hide the popup after 3 seconds
    setTimeout(() => {
        popup.style.display = "none";
    }, 3000);
}