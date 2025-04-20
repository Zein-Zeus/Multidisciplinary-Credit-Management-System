document.getElementById('assignmentForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = document.getElementById('assignmentForm');
    const formData = new FormData(form);
    const courseId = window.location.pathname.split('/').pop(); // Gets courseId from URL

    try {
        const response = await fetch(`/create-assignment/${courseId}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        const popup = document.getElementById('popup-notification');
        const message = document.getElementById('popup-message');

        if (result.success) {
            message.innerText = result.message;
            popup.style.display = 'block';
            setTimeout(() => {
                popup.style.display = 'none';
                window.location.href = `/view-classwork/${courseId}`;
            }, 1500);
        } else {
            message.innerText = result.message;
            popup.style.display = 'block';
            setTimeout(() => {
                popup.style.display = 'none';
            }, 2000);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
});

// Function to show popup notification
function showPopup(message) {
  const popup = document.getElementById("popup-notification");
  const popupMessage = document.getElementById("popup-message");
  popupMessage.textContent = message;
  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}