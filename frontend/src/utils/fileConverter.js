import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdfjs-dist using local worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Converts a file (PDF or Image) to a base64 image data URL.
 * If it's already an image, it returns the data URL.
 * If it's a PDF, it renders the first page to a canvas and returns the image.
 * Word files (DOC/DOCX) are NOT supported and will throw an error.
 */
export const convertFileToImage = async (file) => {
  // Reject Word files immediately with a clear message
  if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
    throw new Error('WORD_NOT_SUPPORTED');
  }

  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (file.type === 'application/pdf') {
    return convertPdfToImage(file);
  }

  throw new Error('Unsupported file type');
};

const convertPdfToImage = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.8);
};
