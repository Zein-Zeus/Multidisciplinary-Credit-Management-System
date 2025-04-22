// Make sure you define courseId in your template, e.g.:
// <script>const courseId = "{{course._id}}";</script>

document.getElementById('excelInput').addEventListener('change', handleGradeFileUpload);

function downloadTemplate() {
    const data = [
        ["Student Name", "PRN", "College", "ABC ID", "Completion Date (YYYY-MM-DD)", "Marks Obtained", "Total Marks"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GradesTemplate");

    XLSX.writeFile(wb, "grades_template.xlsx");
}

function handleGradeFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const records = [];

        for (let i = 1; i < rows.length; i++) {
            const [studentName, prn, college, abcId, completionDate, marksObtained, totalMarks] = rows[i];

            if (prn || abcId) {
                records.push({
                    studentName: studentName || '',
                    prnNumber: prn || '',
                    collegeName: college || '',
                    abcId: abcId || '',
                    completionDate: completionDate || '',
                    marksObtained: Number(marksObtained) || 0,
                    totalMarks: Number(totalMarks) || 0,
                });
            }
        }

        if (records.length === 0) {
            alert("No valid grade records found in the uploaded file.");
            return;
        }

        fetch(`/course/${courseId}/grades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert("Error: " + data.error);
                return;
            }
            alert("Grades saved successfully!");
            location.reload();
        })
        .catch(err => {
            console.error("Error saving grades:", err);
            alert("Failed to save grades.");
        });
    };

    reader.readAsArrayBuffer(file);
}
