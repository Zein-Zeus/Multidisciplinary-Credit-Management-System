function showConfirmation(event) {
    event.preventDefault(); // Prevent the form from submitting immediately

    // Simulate form data handling (e.g., validate or process the form data here)
    const formData = new FormData(event.target);

    // You can log form data or process it as needed
    console.log('Form Data:', Object.fromEntries(formData.entries()));

    // Show the confirmation message
    const confirmationMessage = document.createElement('div');
    confirmationMessage.textContent = 'Certificate uploaded successfully!';
    confirmationMessage.style.padding = '15px';
    confirmationMessage.style.backgroundColor = '#e0ffe0';
    confirmationMessage.style.color = '#28a745';
    confirmationMessage.style.border = '1px solid #28a745';
    confirmationMessage.style.marginTop = '20px';
    confirmationMessage.style.borderRadius = '5px';
    confirmationMessage.style.textAlign = 'center';

    // Append the message to the form
    const form = document.querySelector('.upload-form');
    form.appendChild(confirmationMessage);

    // Clear the form fields (optional)
    event.target.reset();
}
