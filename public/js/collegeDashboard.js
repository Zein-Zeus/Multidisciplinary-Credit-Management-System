// document.addEventListener("DOMContentLoaded", function() {
//     var coll = document.querySelector(".collapsible");
    
//     coll.addEventListener("click", function() {
//         this.classList.toggle("active");
//         var content = this.nextElementSibling;
//         if (content.style.display === "block") {
//             content.style.display = "none";
//         } else {
//             content.style.display = "block";
//         }
//     });
// });

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

// Set today's date
const today = new Date();
document.getElementById("todayDate").textContent = today.toDateString();

// Dynamic activity cards
const activities = [
  { icon: "✅", message: "John Doe registered for 'Intro to Python'" },
  { icon: "📌", message: "Course 'AI & Ethics' pending approval" },
  { icon: "🗓️", message: "2 new streams added today" },
  { icon: "🔄", message: "Course 'Data Structures' updated" }
];

const container = document.getElementById("activityContainer");

activities.forEach(activity => {
  const card = document.createElement("div");
  card.className = "activity-card";
  card.textContent = `${activity.icon} ${activity.message}`;
  container.appendChild(card);
});
