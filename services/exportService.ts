
export const exportToHtml = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Clone the element to avoid modifying the live DOM
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Remove "no-print" elements from the export
  const noPrintElements = clone.querySelectorAll('.no-print');
  noPrintElements.forEach(el => el.remove());

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(style => style.outerHTML)
    .join('\n');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    ${styles}
    <style>
        body { background-color: white !important; }
        .print-page { 
            margin: 0 auto !important; 
            box-shadow: none !important; 
            border: 1px solid #eee !important;
            break-after: page !important;
            page-break-after: always !important;
        }
    </style>
</head>
<body>
    <div class="export-container">
        ${clone.innerHTML}
    </div>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.htm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
