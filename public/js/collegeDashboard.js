function updateDateTime() {
  const now = new Date();

  // Format date part: April 23, 2025
  const datePart = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });

  // Format time part: 12:03:19 AM
  const timePart = now.toLocaleTimeString('en-UK', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
  });

  document.getElementById("todayDate").textContent = `${datePart}, ${timePart}`;
}

updateDateTime();
setInterval(updateDateTime, 1000);
