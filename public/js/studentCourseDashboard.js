const uploadedFiles = [];

function openFileManager(index) {
    const fileInput = document.getElementById(`fileInput - ${ index }`);

    // If file already uploaded, do not allow re-upload
    if (!uploadedFiles[index]) {
        fileInput.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const fileInputs = document.querySelectorAll("input[type='file']");
    fileInputs.forEach((input, index) => {
        input.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const allowedTypes = ['application/pdf'];
                if (!allowedTypes.includes(file.type)) {
                    alert("File format not supported. Only PDF files can be uploaded.");
                    input.value = ""; // clear the file input
                    return;
                }

                uploadedFiles[index] = file;
                alert(`File "${file.name}" uploaded for assignment ${ index + 1}`);

        // Replace Upload button with file name
        const uploadBtn = document.getElementById(`uploadBtn - ${ index }`);
        const cell = uploadBtn.parentElement;
        cell.innerHTML = <span class="file-name">${file.name}</span>;
    }
    });
  });
});

//View file

function viewFile(index) {
    const file = uploadedFiles[index];
    if (file) {
        const fileURL = URL.createObjectURL(file);
        const viewer = document.getElementById('fileViewer');
        const modal = document.getElementById('fileModal');

        // Preview supported types only
        const previewTypes = ['application/pdf'];
        if (previewTypes.includes(file.type)) {
            viewer.src = fileURL;
            modal.style.display = 'block';
        } else {
            alert("Preview not supported for this file type. Please download to view.");
        }
    } else {
        alert("No file uploaded yet for this assignment.");
    }
}

function closeModal() {
    document.getElementById('fileModal').style.display = 'none';
    document.getElementById('fileViewer').src = '';
}

// Submit the assignment (upload and store file in the database)
function submitAssignment(index) {
    const fileInput = document.getElementById(`fileInput - ${ index }`);
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file first by clicking Upload.");
        return;
    }

    const formData = new FormData();
    formData.append('assignmentFile', file);

    fetch('/student-upload-assignment', { // updated route here
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
        })
        .catch(err => {
            console.error("Submit error:", err);
            alert("Something went wrong.");
        });
}