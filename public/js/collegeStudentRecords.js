function exportToExcel() {
    const course = document.getElementById("course-select").value;
    const status = document.getElementById("status-select").value;

    // Construct the URL with filters
    let url = `/export-student-records?course=${course}&status=${status}`;

    // Trigger the file download
    window.location.href = url;
}

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