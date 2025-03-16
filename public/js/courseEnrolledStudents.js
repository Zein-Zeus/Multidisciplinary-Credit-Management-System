async function declareCourseCompleted(courseId) {
    try {
        const response = await fetch(`/declare-course/${courseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();
        if (data.success) {
            alert("Course marked as completed!");
            location.reload(); // Refresh to see the updated status and completion date
        } else {
            alert("No students updated or course already completed.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while updating course status.");
    }
}

// Export to Excel
function exportToExcel() {
    let table = document.querySelector("table");
    let wb = XLSX.utils.table_to_book(table, { sheet: "Enrolled Students" });
    XLSX.writeFile(wb, "enrolled_students.xlsx");
}