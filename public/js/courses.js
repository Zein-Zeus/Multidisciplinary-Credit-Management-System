document.addEventListener("DOMContentLoaded", function () {
    const filters = document.querySelectorAll(".filter-checkbox");
    const courses = document.querySelectorAll(".card");

    filters.forEach(filter => {
        filter.addEventListener("change", function () {
            applyFilters();
        });
    });

    function applyFilters() {
        let activeFilters = [];

        filters.forEach(filter => {
            if (filter.checked) {
                activeFilters.push(filter.id.replace('filter-', ''));
            }
        });

        courses.forEach(course => {
            let courseLabel = course.querySelector(".card-label").textContent.toLowerCase();
            if (activeFilters.length === 0 || activeFilters.includes(courseLabel)) {
                course.style.display = "block";
            } else {
                course.style.display = "none";
            }
        });
    }
});
