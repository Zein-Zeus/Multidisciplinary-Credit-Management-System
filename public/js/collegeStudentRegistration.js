document.getElementById('import-button').addEventListener('click', function() {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', function() {
    const formData = new FormData(document.getElementById('import-form'));

    fetch('/import', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(data => {
        alert(data); // Display success message
        document.getElementById('file-input').value = ''; // Clear file input
    })
    .catch(error => {
        console.error('Error during import:', error);
        alert('Error during import: ' + error.message);
    });
});