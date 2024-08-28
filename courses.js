//profile and logout dropdown
document.addEventListener("DOMContentLoaded", function() {
    var dropdownArrow = document.querySelector('.dropdown-arrow');
    var dropdownContent = document.getElementById("dropdown-content");

    if (dropdownArrow && dropdownContent) {
        dropdownArrow.addEventListener('click', function() {
            dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
        });

        // Close dropdown if clicked outside
        window.addEventListener('click', function(event) {
            if (!event.target.matches('.dropdown-arrow')) {
                dropdownContent.style.display = "none";
            }
        });
    } else {
        console.error("Dropdown arrow or content not found.");
    }
});


