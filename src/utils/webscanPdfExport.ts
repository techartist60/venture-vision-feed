import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface WebsiteAnalysis {
  problem: string;
  targetAudience: string;
  coreFeatures: string[];
  valueProposition: string;
  mainConcept: string;
  keywords: string[];
  summary: string;
}

interface SimilarWebsite {
  name: string;
  url: string;
  description: string;
  similarityScore: number;
}

interface WebScanData {
  websiteTitle: string;
  scannedUrl: string;
  analysis: WebsiteAnalysis;
  similarWebsites: SimilarWebsite[];
  overallSimilarityScore: number;
  uniquenessScore: number;
  scanDate?: string;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

export function exportWebScanToPdf(data: WebScanData) {
  // Validate required fields
  if (!data) {
    console.error('WebScan PDF export: No data provided');
    alert('Cannot generate PDF: No scan data available');
    return;
  }

  if (!data.analysis) {
    console.error('WebScan PDF export: Missing analysis data');
    alert('Cannot generate PDF: Analysis data is missing');
    return;
  }

  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('WebScan Report', 14, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const scanDate = data.scanDate ? new Date(data.scanDate) : new Date();
    const dateText = `Scanned on ${scanDate.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}`;
    doc.text(dateText, 14, 35);

    yPosition = 55;

    // Scanned Website Section
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Scanned Website', 14, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(data.websiteTitle || 'Unknown Website', 14, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(59, 130, 246);
    doc.text(data.scannedUrl || '', 14, yPosition);
    yPosition += 15;

  // Scores Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Similarity Scores', 14, yPosition);
  yPosition += 10;

  // Score boxes
  const scoreBoxWidth = 80;
  const scoreBoxHeight = 25;
  
  // Overall Similarity
  const similarityColor = data.overallSimilarityScore >= 75 ? [239, 68, 68] : 
                          data.overallSimilarityScore >= 50 ? [245, 158, 11] : 
                          data.overallSimilarityScore >= 25 ? [234, 179, 8] : [34, 197, 94];
  doc.setFillColor(similarityColor[0], similarityColor[1], similarityColor[2]);
  doc.roundedRect(14, yPosition, scoreBoxWidth, scoreBoxHeight, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.overallSimilarityScore}%`, 14 + scoreBoxWidth / 2, yPosition + 12, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Overall Similarity', 14 + scoreBoxWidth / 2, yPosition + 20, { align: 'center' });

  // Uniqueness Score
  const uniquenessColor = data.uniquenessScore >= 75 ? [34, 197, 94] : 
                          data.uniquenessScore >= 50 ? [234, 179, 8] : 
                          data.uniquenessScore >= 25 ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(uniquenessColor[0], uniquenessColor[1], uniquenessColor[2]);
  doc.roundedRect(104, yPosition, scoreBoxWidth, scoreBoxHeight, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.uniquenessScore}%`, 104 + scoreBoxWidth / 2, yPosition + 12, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Uniqueness Score', 104 + scoreBoxWidth / 2, yPosition + 20, { align: 'center' });

  yPosition += scoreBoxHeight + 15;

  // Idea Analysis Section
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Idea Analysis', 14, yPosition);
  yPosition += 10;

  doc.setTextColor(0, 0, 0);
  
    // Main Concept
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Main Concept:', 14, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    const mainConceptLines = doc.splitTextToSize(data.analysis?.mainConcept || 'N/A', pageWidth - 28);
    doc.text(mainConceptLines, 14, yPosition);
    yPosition += mainConceptLines.length * 5 + 8;

    // Problem Solved
    doc.setFont('helvetica', 'bold');
    doc.text('Problem Solved:', 14, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    const problemLines = doc.splitTextToSize(data.analysis?.problem || 'N/A', pageWidth - 28);
    doc.text(problemLines, 14, yPosition);
    yPosition += problemLines.length * 5 + 8;

    // Target Audience
    doc.setFont('helvetica', 'bold');
    doc.text('Target Audience:', 14, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    const audienceLines = doc.splitTextToSize(data.analysis?.targetAudience || 'N/A', pageWidth - 28);
    doc.text(audienceLines, 14, yPosition);
    yPosition += audienceLines.length * 5 + 8;

    // Core Features
    doc.setFont('helvetica', 'bold');
    doc.text('Core Features:', 14, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    const coreFeatures = data.analysis?.coreFeatures || [];
    coreFeatures.forEach((feature: string) => {
      doc.text(`• ${feature}`, 18, yPosition);
      yPosition += 5;
    });
    yPosition += 5;

    // Keywords
    doc.setFont('helvetica', 'bold');
    doc.text('Keywords:', 14, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    const keywords = data.analysis?.keywords || [];
    doc.text(keywords.join(', ') || 'N/A', 14, yPosition);
    yPosition += 15;

    // Check if we need a new page for similar websites
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Similar Websites Section
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const similarWebsites = data.similarWebsites || [];
    doc.text(`Similar Websites Found (${similarWebsites.length})`, 14, yPosition);
    yPosition += 10;

    if (similarWebsites.length === 0) {
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('No significantly similar websites found. Your idea appears to be unique!', 14, yPosition);
    } else {
      // Create table for similar websites
      const tableData = similarWebsites.map((website: SimilarWebsite) => [
        website.name || '',
        website.url || '',
        `${website.similarityScore || 0}%`,
        (website.description || '').substring(0, 80) + ((website.description || '').length > 80 ? '...' : '')
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Website', 'URL', 'Similarity', 'Description']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 50, textColor: [59, 130, 246] },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 75 }
        },
        margin: { left: 14, right: 14 },
        didDrawCell: (cellData: any) => {
          // Make URLs clickable
          if (cellData.column.index === 1 && cellData.cell.section === 'body') {
            const url = tableData[cellData.row.index]?.[1];
            if (url) {
              doc.link(cellData.cell.x, cellData.cell.y, cellData.cell.width, cellData.cell.height, { url });
            }
          }
        }
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated by Idestrim WebScan | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Download the PDF immediately using blob for faster performance
    const safeTitle = (data.websiteTitle || 'scan').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `webscan-${safeTitle}-${Date.now()}.pdf`;
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating WebScan PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
