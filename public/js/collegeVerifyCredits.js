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

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

async function fetchStudentData() {
    try {
        const response = await fetch('/student-certificates');
        if (!response.ok) {
            throw new Error('Failed to fetch student data');
        }
        const data = await response.json();
        console.log('Fetched student data:', data);
        loadStudentData(data);
    } catch (error) {
        console.error('Error fetching student data:', error);
    }
}

function loadStudentData(studentData) {
    console.log(studentData);  // Log to check the structure of the data

    // Sort the data by recency (newest first)
    studentData.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    const tableBody = document.getElementById('student-data');
    tableBody.innerHTML = '';
    studentData.forEach(student => {
        console.log(student);  // Log individual student data

        const formattedDate = formatTimestamp(student.uploadedAt);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${student.studentPRN}</td>
            <td>${student.courseName}</td>
            <td>${student.credits}</td>
            <td>${student.courseOrganization}</td>
            <td><button onclick="viewCertificate('${student.certificatePath}')">View Certificate</button></td>
            <td>
                <button class="accept-btn" onclick="updateStatus('${student._id}', 'Approved')">Accept</button>
                <button class="reject-btn" onclick="updateStatus('${student._id}', 'Rejected')">Reject</button>
                <input type="text" placeholder="Remark" id="remark-${student._id}" class="remark-input" />
            </td>
            <td>${student.status}</td>
            <td>${student.remarks}</td>
        `;
        tableBody.appendChild(row);
    });
}

//<td>${student.studentName || 'N/A'}

function viewCertificate(certificatePath) {
    const modal = document.getElementById('modal');
    const certificateDetails = document.getElementById('certificate-details');
    certificateDetails.innerHTML = `<iframe src="${certificatePath}" width="100%" height="400" border: none object-fit: contain" frameborder="0"></iframe>`;
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
}

async function updateStatus(id, status) {
    const remark = document.getElementById(`remark-${id}`).value;
    try {
        const response = await fetch(`/review-certificate/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status, remarks: remark })
        });

        if (!response.ok) {
            throw new Error('Failed to update certificate status');
        }

        alert('Status updated successfully');
        fetchStudentData(); // Refresh the data
    } catch (error) {
        console.error('Error updating certificate status:', error);
    }
}

window.onload = fetchStudentData;