document.addEventListener("DOMContentLoaded", function () {
  loadAssignments();

  document.getElementById("topicFilter").addEventListener("change", function () {
    const filterValue = this.value;
    const items = document.getElementsByClassName("assignment-card");
    Array.from(items).forEach(item => {
      if (filterValue === "all" || item.getAttribute("data-topic") === filterValue) {
        item.style.display = "block";
      } else {
        item.style.display = "none";
      }
    });
  });
});

// Load assignments into cards
function loadAssignments() {
  const assignmentsList = document.getElementById("assignments");
  assignmentsList.innerHTML = "";
  const assignments = JSON.parse(localStorage.getItem("assignments") || "[]");
  const topics = new Set();

  assignments.forEach((assignment, index) => {
    const card = document.createElement("div");
    card.className = "assignment-card";
    const formattedDate = new Date(assignment.dueDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

    card.innerHTML = `
      <strong>${assignment.title}</strong> <br>
      <small>Topic: ${assignment.topic}</small><br>
      <small>Due Date: ${formattedDate} | Marks: ${assignment.marks}</small><br>
      <div class="buttons">
        <button onclick="editAssignment(${index})">Edit</button>
        <button onclick="deleteAssignment(${index})" class="delete-btn">Delete</button>
        <button onclick="viewSubmissions(${index})">Submissions</button>
      </div>
    `;

    card.setAttribute("data-topic", assignment.topic);
    assignmentsList.appendChild(card);
    topics.add(assignment.topic);
  });

  // Update topic filter
  const topicFilter = document.getElementById("topicFilter");
  topicFilter.innerHTML = `<option value="all">All Topics</option>`;  // Fixed the string
  topics.forEach(topic => {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    topicFilter.appendChild(option);
  });
}

function viewSubmissions(index) {
  const assignments = JSON.parse(localStorage.getItem("assignments"));
  const assignment = assignments[index];

  // Save assignment info to localStorage
  localStorage.setItem("currentAssignmentId", `${assignment.title}-${index}`);  // Fixed string concatenation
  localStorage.setItem("currentAssignmentTitle", assignment.title);

  // Go to submissions page
  window.location.href = "view-submissions.html";
}

// Edit assignment inline
function editAssignment(index) {
  const assignments = JSON.parse(localStorage.getItem("assignments"));
  const assignment = assignments[index];

  const newTitle = prompt("Edit Title:", assignment.title);
  const newTopic = prompt("Edit Topic:", assignment.topic);
  const newDueDate = prompt("Edit Due Date:", assignment.dueDate);
  const newMarks = prompt("Edit Marks:", assignment.marks);

  if (newTitle && newTopic && newDueDate && newMarks) {
    assignments[index] = { title: newTitle, topic: newTopic, dueDate: newDueDate, marks: newMarks };
    localStorage.setItem("assignments", JSON.stringify(assignments));
    loadAssignments();
    alert("Assignment updated successfully!");
  }
}

// Delete assignment
function deleteAssignment(index) {
  if (confirm("Are you sure you want to delete this assignment?")) {
    let assignments = JSON.parse(localStorage.getItem("assignments"));
    assignments.splice(index, 1);
    localStorage.setItem("assignments", JSON.stringify(assignments));
    loadAssignments();
  }
}
