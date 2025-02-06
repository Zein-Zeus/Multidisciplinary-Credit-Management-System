document.addEventListener("DOMContentLoaded", function () {
    const checkboxes = document.querySelectorAll(".filter-checkbox");
    const courseCards = document.querySelectorAll(".course-card");

    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", filterCourses);
    });

    function filterCourses() {
        const selectedColleges = [...document.querySelectorAll("input[data-filter='college']:checked")].map(cb => cb.value);
        const selectedModes = [...document.querySelectorAll("input[data-filter='mode']:checked")].map(cb => cb.value);

        courseCards.forEach(course => {
            const college = course.getAttribute("data-college");
            const mode = course.getAttribute("data-mode");

            const matchesCollege = selectedColleges.length === 0 || selectedColleges.includes(college);
            const matchesMode = selectedModes.length === 0 || selectedModes.includes(mode);

            if (matchesCollege && matchesMode) {
                course.style.display = "block"; // Show matching courses
            } else {
                course.style.display = "none"; // Hide non-matching courses
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search");
    const courseCards = document.querySelectorAll(".course-card");

    searchInput.addEventListener("input", function () {
        const searchText = searchInput.value.toLowerCase();

        courseCards.forEach(course => {
            const courseName = course.querySelector(".course-name").textContent.toLowerCase();
            const matchesSearch = courseName.includes(searchText);

            if (matchesSearch) {
                course.style.display = "block"; // Show matching courses
            } else {
                course.style.display = "none"; // Hide non-matching courses
            }
        });
    });
});
