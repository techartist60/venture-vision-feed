import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CategoryScores {
  tech: number;
  fashion: number;
  health: number;
  agriculture: number;
  arts: number;
}

interface MarketSimulation {
  adoptionRate: number;
  marketPenetration: number;
  competitionLevel: number;
  innovationIndex: number;
  projectedGrowth: number;
  sustainabilityScore: number;
}

interface ScanMetadata {
  extractedKeywords?: string[];
  categoryScores?: CategoryScores;
  marketSimulation?: MarketSimulation;
  bestSector?: string;
  bestLocation?: string;
  marketInsights?: string;
  recommendations?: string[];
  researchBased?: boolean;
}

interface InnovationRecord {
  title: string;
  description: string | null;
  owner: string | null;
  country: string | null;
  source_type: string;
  source_url: string | null;
  legal_status: string | null;
  patent_number: string | null;
}

interface ScanResult {
  id: string;
  similarity_score: number;
  similarity_tier: string;
  innovation_records: InnovationRecord;
}

interface IdescanData {
  title: string;
  description: string;
  imageUrl?: string | null;
  scanDate: string;
  metadata?: ScanMetadata;
  results: ScanResult[];
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

export function exportIdescanToPdf(data: IdescanData) {
  // Validate required fields
  if (!data) {
    console.error('Idescan PDF export: No data provided');
    alert('Cannot generate PDF: No scan data available');
    return;
  }

  if (!data.results) {
    console.error('Idescan PDF export: Missing results data');
    alert('Cannot generate PDF: Results data is missing');
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
    doc.text('Idescan Report', 14, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const scanDate = data.scanDate ? new Date(data.scanDate) : new Date();
    const dateText = `Scanned on ${scanDate.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}`;
    doc.text(dateText, 14, 35);

    yPosition = 55;

    // Your Idea Section
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Your Idea', 14, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title || 'Untitled', 14, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const description = data.description || 'No description provided';
    const descriptionLines = doc.splitTextToSize(description, pageWidth - 28);
    doc.text(descriptionLines, 14, yPosition);
    yPosition += descriptionLines.length * 5 + 10;

  // Keywords if available
  if (data.metadata?.extractedKeywords && data.metadata.extractedKeywords.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Key Concepts:', 14, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(data.metadata.extractedKeywords.join(', '), 14, yPosition);
    yPosition += 10;
  }

  // Market Recommendations if available
  if (data.metadata?.bestSector || data.metadata?.bestLocation) {
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Market Recommendations', 14, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    if (data.metadata.bestSector) {
      doc.setFont('helvetica', 'bold');
      doc.text('Best Sector:', 14, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(data.metadata.bestSector, 55, yPosition);
      yPosition += 6;
    }

    if (data.metadata.bestLocation) {
      doc.setFont('helvetica', 'bold');
      doc.text('Best Location:', 14, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(data.metadata.bestLocation, 55, yPosition);
      yPosition += 6;
    }

    if (data.metadata.marketInsights) {
      yPosition += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('Market Insights:', 14, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      const insightLines = doc.splitTextToSize(data.metadata.marketInsights, pageWidth - 28);
      doc.text(insightLines, 14, yPosition);
      yPosition += insightLines.length * 5 + 5;
    }

    yPosition += 5;
  }

  // Category Scores if available
  if (data.metadata?.categoryScores) {
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Category Similarity Scores', 14, yPosition);
    yPosition += 10;

    const categories = [
      { name: 'Technology', score: data.metadata.categoryScores.tech },
      { name: 'Fashion', score: data.metadata.categoryScores.fashion },
      { name: 'Health', score: data.metadata.categoryScores.health },
      { name: 'Agriculture', score: data.metadata.categoryScores.agriculture },
      { name: 'Arts', score: data.metadata.categoryScores.arts },
    ];

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    categories.forEach(cat => {
      doc.setFont('helvetica', 'normal');
      doc.text(`${cat.name}:`, 14, yPosition);
      doc.text(`${cat.score}%`, 55, yPosition);
      yPosition += 5;
    });
    yPosition += 10;
  }

  // Market Simulation if available
  if (data.metadata?.marketSimulation) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Market Performance Simulation', 14, yPosition);
    yPosition += 10;

    const metrics = [
      { name: 'Adoption Rate', value: data.metadata.marketSimulation.adoptionRate },
      { name: 'Market Penetration', value: data.metadata.marketSimulation.marketPenetration },
      { name: 'Competition Level', value: data.metadata.marketSimulation.competitionLevel },
      { name: 'Innovation Index', value: data.metadata.marketSimulation.innovationIndex },
      { name: 'Projected Growth', value: data.metadata.marketSimulation.projectedGrowth },
      { name: 'Sustainability', value: data.metadata.marketSimulation.sustainabilityScore },
    ];

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    metrics.forEach(metric => {
      doc.setFont('helvetica', 'normal');
      doc.text(`${metric.name}:`, 14, yPosition);
      doc.text(`${metric.value}%`, 70, yPosition);
      yPosition += 5;
    });
    yPosition += 10;
  }

  // Check if we need a new page for similar innovations
  if (yPosition > 180) {
    doc.addPage();
    yPosition = 20;
  }

  // Similar Innovations Section
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Similar Innovations Found (${data.results.length})`, 14, yPosition);
  yPosition += 10;

  if (data.results.length === 0) {
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('No similar innovations found. Your idea appears to be unique!', 14, yPosition);
  } else {
    // Create table for similar innovations
    const tableData = data.results.map(result => [
      result.innovation_records.title.substring(0, 40) + (result.innovation_records.title.length > 40 ? '...' : ''),
      result.innovation_records.source_type,
      `${result.similarity_score.toFixed(1)}%`,
      result.similarity_tier.replace('_', ' '),
      result.innovation_records.source_url || 'N/A'
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Title', 'Type', 'Score', 'Tier', 'Source Link']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25 },
        4: { cellWidth: 60, textColor: [59, 130, 246] }
      },
      margin: { left: 14, right: 14 },
      didDrawCell: (data: any) => {
        // Make source URLs clickable
        if (data.column.index === 4 && data.cell.section === 'body') {
          const url = tableData[data.row.index]?.[4];
          if (url && url !== 'N/A') {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
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
      `Generated by Idestrim Idescan | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

    // Download the PDF immediately using blob for faster performance
    const safeTitle = (data.title || 'scan').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `idescan-${safeTitle}-${Date.now()}.pdf`;
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
    console.error('Error generating Idescan PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
