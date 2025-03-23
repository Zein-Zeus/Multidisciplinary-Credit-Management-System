let activeFilterIndex = null;

function toggleFilter(index) {
    const filterBox = document.getElementById("filter-box");
    const filterSelect = document.getElementById("filter-select");
    const filterIcons = document.querySelectorAll(".filter-icon");

    if (activeFilterIndex === index) {
        // Close filter if already open
        filterBox.style.display = "none";
        filterIcons[index].textContent = "▼";
        activeFilterIndex = null;
    } else {
        // Open filter dropdown and position it correctly
        activeFilterIndex = index;
        const thElements = document.querySelectorAll("th");
        const rect = thElements[index].getBoundingClientRect();

        filterBox.style.display = "block";
        filterBox.style.position = "absolute";
        filterBox.style.top = `${rect.bottom + window.scrollY}px`;
        filterBox.style.left = `${rect.left + window.scrollX}px`;

        // Reset all icons
        filterIcons.forEach(icon => (icon.textContent = "▼"));
        filterIcons[index].textContent = "▲";

        // Populate dropdown
        populateFilterOptions(index);
    }
}

function populateFilterOptions(columnIndex) {
    const filterSelect = document.getElementById("filter-select");
    const tableRows = document.querySelectorAll("tbody tr");
    const uniqueValues = new Set();

    tableRows.forEach(row => {
        const cell = row.children[columnIndex];
        if (cell) uniqueValues.add(cell.textContent.trim());
    });

    // Clear existing options and add new ones
    filterSelect.innerHTML = '<option value="all">All</option>';
    uniqueValues.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        filterSelect.appendChild(option);
    });
}

function applyFilter() {
    if (activeFilterIndex === null) return;

    const filterValue = document.getElementById("filter-select").value.toLowerCase();
    const tableRows = document.querySelectorAll("tbody tr");

    tableRows.forEach(row => {
        const cell = row.children[activeFilterIndex];
        if (cell) {
            const cellText = cell.textContent.toLowerCase();
            row.style.display = filterValue === "all" || cellText === filterValue ? "" : "none";
        }
    });
}

// Hide filter when clicking outside
document.addEventListener("click", function (event) {
    const filterBox = document.getElementById("filter-box");
    if (!filterBox.contains(event.target) && !event.target.classList.contains("filter-icon")) {
        filterBox.style.display = "none";
        activeFilterIndex = null;
        document.querySelectorAll(".filter-icon").forEach(icon => (icon.textContent = "▼"));
    }
});

// Export to Excel Function
function exportToExcel() {
    window.location.href = "/export-student-records";
}

function toggleMenu() {
    const menu = document.querySelector(".content");
    const button = document.querySelector(".collapsible");
    menu.classList.toggle("active");
    button.innerHTML = menu.classList.contains("active") ? "×" : "☰";
}
