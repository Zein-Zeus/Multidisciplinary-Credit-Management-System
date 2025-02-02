document.getElementById('import-button').addEventListener('click', function() {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', function() {
    const file = this.files[0];

    // Optional: Check file type before submitting
    if (file && file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        alert('Please upload a valid Excel file.');
        return;
    }

    const formData = new FormData(document.getElementById('import-form'));

    // Disable the button and show a loading message
    const importButton = document.getElementById('import-button');
    importButton.disabled = true;
    importButton.textContent = 'Uploading...';

    fetch('/import', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(data => {
        alert(data); // Display success message
        document.getElementById('file-input').value = ''; // Clear file input
        importButton.disabled = false;
        importButton.textContent = 'Import';
    })
    .catch(error => {
        console.error('Error during import:', error);
        alert('Error during import: ' + error.message);
        importButton.disabled = false;
        importButton.textContent = 'Import';
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

function showPopup(message) {
    const popup = document.getElementById('popup-notification');
    const popupMessage = document.getElementById('popup-message');
    popupMessage.textContent = message;  // Set the message
    popup.style.display = 'block';  // Display the popup
    
    setTimeout(() => {
        popup.style.display = 'none'; // Hide the popup after 5 seconds
    }, 5000);
}