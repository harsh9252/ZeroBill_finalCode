import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReactDOM from 'react-dom/client';

/**
 * Universal PDF Generator for InvoiceBillBook
 * Fixed: Full A4 page fill, no vertical centering gap, correct render width
 */
export const generateUniversalPDF = async ({
    component,
    element,
    filename = 'document.pdf',
    renderWidth: customRenderWidth, // Optional custom width (e.g. 945 for 250mm)
    margin: customMargin, // Optional custom margin (default 10)
    orientation = 'portrait', // 'portrait' or 'landscape'
    onSuccess,
    onError,
    onStart
}) => {
    if (onStart) onStart();

    try {
        const tempDiv = document.createElement('div');

        //  Use customRenderWidth or default to 794 (A4 at 96dpi)
        const renderWidth = customRenderWidth || (orientation === 'landscape' ? 1123 : 794);

        Object.assign(tempDiv.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: `${renderWidth}px`,
            background: '#ffffff',
            margin: '0',
            padding: '0',
            boxSizing: 'border-box',
            zIndex: '-10'
        });
        tempDiv.className = 'notranslate';
        tempDiv.setAttribute('translate', 'no');

        document.body.appendChild(tempDiv);

        if (component) {
            const root = ReactDOM.createRoot(tempDiv);
            await new Promise(resolve => {
                root.render(component);
                
                //  Wait for both a timeout AND for fonts to be ready
                const checkReady = async () => {
                    // Give React time to render initial DOM
                    await new Promise(r => setTimeout(r, 500));
                    
                    // Wait for fonts if browser supports it
                    if (document.fonts && document.fonts.ready) {
                        await document.fonts.ready;
                    }
                    
                    // Final buffer for images and styles
                    setTimeout(resolve, 800); 
                };
                checkReady();
            });
            // Store root to unmount later
            tempDiv._reactRoot = root;
        } else if (element) {
            const clonedElement = element.cloneNode(true);
            // Ensure cloned element is visible and has proper styling
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.position = 'relative';
            clonedElement.style.width = '100%';
            tempDiv.appendChild(clonedElement);
            // Small delay for any internal rendering/images
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            throw new Error('Neither component nor element provided to generateUniversalPDF');
        }

        let pageElements = Array.from(tempDiv.querySelectorAll('.pdf-page, .invoice-container, .invoice-box, .letterhead-container'));
        
        //  Filter out nested elements to prevent duplicate rendering
        // If element A contains element B, and both are in the list, keep only A.
        const filteredPages = pageElements.filter((el, index) => {
            return !pageElements.some((otherEl, otherIndex) => 
                index !== otherIndex && otherEl.contains(el)
            );
        });

        const pages = filteredPages.length === 0 ? [tempDiv] : filteredPages;
        pages.forEach(p => p.classList.add('pdf-capture'));

        // Determine PDF format based on renderWidth
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });
        pdf.setProperties({ title: filename.replace('.pdf', '') });

        const A4_WIDTH_MM = orientation === 'landscape' ? 297 : 210;
        const A4_HEIGHT_MM = orientation === 'landscape' ? 210 : 297;
        const MARGIN_MM = customMargin !== undefined ? Number(customMargin) : 0;
        const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - (2 * MARGIN_MM);

        for (let i = 0; i < pages.length; i++) {
            const pageElement = pages[i];

            pageElement.style.width = `${renderWidth}px`;
            pageElement.style.minWidth = `${renderWidth}px`;
            pageElement.style.maxWidth = `${renderWidth}px`;
            
            pageElement.style.overflow = 'hidden';
            pageElement.style.margin = '0';
            pageElement.style.padding = '0';
            pageElement.style.boxSizing = 'border-box';
            pageElement.style.boxShadow = 'none';
            pageElement.style.borderRadius = '0';

            const canvas = await html2canvas(pageElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: renderWidth,
                windowWidth: renderWidth,
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            // Calculate height in MM scaled to A4 current width (portrait width or landscape width)
            const totalHeightInMm = (canvasHeight * A4_WIDTH_MM) / canvasWidth;
            
            const OVERLAP_MM = 2; // small overlap to prevent content being lost if cut at the edge
            const EPSILON_MM = 4; 
            let numPagesForThisElement = Math.ceil((totalHeightInMm - EPSILON_MM) / (CONTENT_HEIGHT_MM - OVERLAP_MM));
            
            if (pages.length > 1 && totalHeightInMm < (CONTENT_HEIGHT_MM + 10)) {
                numPagesForThisElement = 1;
            } else if (numPagesForThisElement < 1) {
                numPagesForThisElement = 1;
            }

            for (let j = 0; j < numPagesForThisElement; j++) {
                if (i > 0 || j > 0) {
                    pdf.addPage('a4', orientation);
                }

                // Add the image with a negative offset and vertical margin, including overlap
                pdf.addImage(imgData, 'JPEG', 0, MARGIN_MM - (j * (CONTENT_HEIGHT_MM - OVERLAP_MM)), A4_WIDTH_MM, totalHeightInMm);
            }
        }

        pdf.save(filename);

        if (tempDiv._reactRoot) tempDiv._reactRoot.unmount();
        document.body.removeChild(tempDiv);

        if (onSuccess) onSuccess();

    } catch (error) {
        console.error('Universal PDF Generation Error:', error);
        if (onError) onError(error);
    }
};
