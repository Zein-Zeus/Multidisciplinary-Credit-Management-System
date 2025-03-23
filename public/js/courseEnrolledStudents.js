// Declare entire course as complete
async function declareCourseCompleted(courseId) {
    try {
        const response = await fetch(`/declare-course/${courseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();
        if (data.success) {
            alert("Course marked as completed!");
            location.reload(); // Refresh to update status
        } else {
            alert("No students updated or course already completed.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while updating course status.");
    }
}

// Mark individual student as completed
async function markStudentCompleted(studentId) {
    try {
        const response = await fetch(`/declare-student/${studentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();
        if (data.success) {
            alert("Student marked as completed!");
            location.reload(); // Refresh to update status
        } else {
            alert("Student is already completed or not found.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while updating student status.");
    }
}

// Export to Excel
function exportToExcel() {
    let table = document.querySelector("table");
    let wb = XLSX.utils.table_to_book(table, { sheet: "Enrolled Students" });
    XLSX.writeFile(wb, "enrolled_students.xlsx");
}