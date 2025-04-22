document.getElementById('excelInput').addEventListener('change', handleFileUpload);

function downloadTemplate() {
    const data = [
        ["Student Name", "PRN", "College", "ABC ID", "Completion Date (YYYY-MM-DD)", "Attendance", "Total Classes"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AttendanceTemplate");

    XLSX.writeFile(wb, "attendance_template.xlsx");
}

function handleFileUpload(event) {
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
            const [studentName, prn, college, abcId, completionDate, attendance, totalClasses, percentage] = rows[i];

            if (prn || abcId) {
                records.push({
                    studentName: studentName || '',
                    prn: prn || '',
                    college: college || '',
                    abcId: abcId || '',
                    completionDate: completionDate || '',
                    attendance: attendance || '',
                    totalClasses: totalClasses || '',
                    percentage: percentage || ''
                });
            }
        }

        if (records.length === 0) {
            alert("No valid records found in the uploaded file.");
            return;
        }

        fetch(`/course/${courseId}/attendance`, {
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
                alert("Attendance saved successfully!");
                location.reload();
            })
            .catch(err => {
                console.error("Error saving attendance:", err);
                alert("Failed to save attendance.");
            });
    };

    reader.readAsArrayBuffer(file);
}
