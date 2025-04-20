document.addEventListener("DOMContentLoaded", function () {
    const submissions = JSON.parse(localStorage.getItem("submissions") || "[]");
    const assignmentId = localStorage.getItem("currentAssignmentId");
    const assignmentTitle = localStorage.getItem("currentAssignmentTitle");

    document.getElementById("assignment-title").textContent = assignmentTitle;

    const listContainer = document.getElementById("submission-list");
    const filtered = submissions.filter(s => s.assignmentId === assignmentId);

    if (filtered.length === 0) {
        listContainer.innerHTML = "<p>No submissions found.</p>";
        return;
    }

    filtered.forEach((submission, index) => {
        const card = document.createElement("div");
        card.className = "submission-card";

        card.innerHTML = `
      <h3>${submission.studentName}</h3>
      <p><strong>Submitted:</strong> ${new Date(submission.submittedDate).toLocaleString()}</p>
      <button class="view-btn" data-index="${index}">View</button>
      <div class="submission-details hidden" id="details-${index}">
        <p><strong>File:</strong> <a href="${submission.fileUrl}" target="_blank">Download</a></p>
        <div class="feedback-group">
          <label for="marks-${index}">Marks:</label>
          <input type="number" id="marks-${index}" value="${submission.marks || ""}">
          <label for="feedback-${index}">Feedback:</label>
          <textarea id="feedback-${index}" rows="3">${submission.feedback || ""}</textarea>
          <button onclick="saveFeedback(${index})">Save Feedback</button>
        </div>
      </div>
    `;

        listContainer.appendChild(card);
    });

    // View toggling
    document.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            const index = this.dataset.index;
            const details = document.getElementById(details - ${ index });
            details.classList.toggle("hidden");
        });
    });
});

function saveFeedback(index) {
    const submissions = JSON.parse(localStorage.getItem("submissions") || "[]");
    const assignmentId = localStorage.getItem("currentAssignmentId");

    const filtered = submissions.filter(s => s.assignmentId === assignmentId);
    const target = filtered[index];

    const marks = document.getElementById(marks - ${ index }).value;
    const feedback = document.getElementById(feedback - ${ index }).value;

    target.marks = marks;
    target.feedback = feedback;

    const updated = submissions.map(s => {
        return (s.assignmentId === assignmentId && s.studentName === target.studentName) ? target : s;
    });

    localStorage.setItem("submissions", JSON.stringify(updated));
    alert("Feedback saved!");
}