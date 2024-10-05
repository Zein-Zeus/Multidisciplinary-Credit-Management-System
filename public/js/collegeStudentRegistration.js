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

document.addEventListener("DOMContentLoaded", function() {
    var coll = document.querySelector(".collapsible");
    
    coll.addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
            content.style.display = "none";
        } else {
            content.style.display = "block";
        }
    });
});
