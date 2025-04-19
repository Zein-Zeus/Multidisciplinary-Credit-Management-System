document.getElementById("select-all").addEventListener("change", function () {
    const checkboxes = document.querySelectorAll('input[name="studentIds"]');
    checkboxes.forEach(cb => cb.checked = this.checked);
});

function approveStudent(studentId) {
    fetch(`/approve-student/${studentId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message); // Show success or failure message
        if (data.success) {
            location.reload(); // Reload the page to reflect the changes
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('There was an error processing your request');
    });
}

// Approve button confirmation
document.querySelectorAll('.approve-btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const confirmApprove = confirm("Are you sure you want to approve this student?");
        if (!confirmApprove) {
            e.preventDefault(); // Stop the form if user cancels
        }
    });
});

// Reject button confirmation
document.querySelectorAll('.reject-btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const confirmReject = confirm("Are you sure you want to reject this student?");
        if (!confirmReject) {
            e.preventDefault(); // Stop the form if user cancels
        }
    });
});

// Bulk Approve Confirmation
document.querySelector('.bulk-approve-btn')?.addEventListener('click', function(e) {
    const confirmBulkApprove = confirm("Are you sure you want to approve all selected students?");
    if (!confirmBulkApprove) {
        e.preventDefault(); // Stop submission if user cancels
    }
});

// Bulk Reject Confirmation
document.querySelector('.bulk-reject-btn')?.addEventListener('click', function(e) {
    const confirmBulkReject = confirm("Are you sure you want to reject all selected students?");
    if (!confirmBulkReject) {
        e.preventDefault(); // Stop submission if user cancels
    }
});
