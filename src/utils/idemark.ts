// Idemark utility functions for digital fingerprinting and certificate generation
import CryptoJS from 'crypto-js';

export interface IdemarkData {
  idemarkId: string;
  fingerprintHash: string;
  timestamp: string;
  title: string;
  description?: string;
  category?: string;
  userName?: string;
}

// Generate a unique Idemark ID
export function generateIdemarkId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `IDM-${timestamp}-${randomPart}`;
}

// Generate SHA-256 fingerprint hash from content
export function generateFingerprintHash(content: {
  title: string;
  description: string;
  category?: string;
  timestamp: string;
  userId: string;
}): string {
  const dataString = JSON.stringify({
    title: content.title.trim().toLowerCase(),
    description: content.description.trim().toLowerCase(),
    category: content.category?.toLowerCase() || '',
    timestamp: content.timestamp,
    userId: content.userId,
  });
  
  return CryptoJS.SHA256(dataString).toString(CryptoJS.enc.Hex);
}

// Format fingerprint for display (shortened version)
export function formatFingerprintShort(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
}

// Format timestamp for display
export function formatIdemarkTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
}

// Generate certificate data URL (simple HTML-based certificate)
export function generateCertificateHTML(data: IdemarkData): string {
  const verificationUrl = `${window.location.origin}/idemark/verify/${data.idemarkId}`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Idemark Certificate - ${data.idemarkId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .certificate {
      background: white;
      width: 100%;
      max-width: 800px;
      padding: 60px;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      position: relative;
      overflow: hidden;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: linear-gradient(90deg, #8b5cf6, #06b6d4, #10b981);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      background: linear-gradient(135deg, #8b5cf6, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    .title-section {
      text-align: center;
      margin: 40px 0;
      padding: 30px;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border-radius: 12px;
    }
    .certificate-title {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .idea-title {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }
    .details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 30px 0;
    }
    .detail-item {
      padding: 20px;
      background: #f8fafc;
      border-radius: 12px;
      border-left: 4px solid #8b5cf6;
    }
    .detail-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .detail-value {
      font-size: 14px;
      color: #1e293b;
      font-weight: 600;
      word-break: break-all;
    }
    .fingerprint {
      grid-column: span 2;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
    .verification {
      text-align: center;
      margin-top: 40px;
      padding: 20px;
      background: linear-gradient(135deg, #8b5cf6, #06b6d4);
      border-radius: 12px;
      color: white;
    }
    .verification-label {
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 8px;
    }
    .verification-url {
      font-size: 14px;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      color: #94a3b8;
      font-size: 12px;
    }
    @media print {
      body { background: white; }
      .certificate { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo">IDESTRIM</div>
      <div class="subtitle">Certificate of Originality</div>
    </div>
    
    <div class="title-section">
      <div class="certificate-title">This certifies that the following idea has been validated and marked with Idemark</div>
      <div class="idea-title">${escapeHtml(data.title)}</div>
    </div>
    
    <div class="details">
      <div class="detail-item">
        <div class="detail-label">Idemark ID</div>
        <div class="detail-value">${data.idemarkId}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Timestamp</div>
        <div class="detail-value">${formatIdemarkTimestamp(data.timestamp)}</div>
      </div>
      ${data.userName ? `
      <div class="detail-item">
        <div class="detail-label">Creator</div>
        <div class="detail-value">${escapeHtml(data.userName)}</div>
      </div>
      ` : ''}
      ${data.category ? `
      <div class="detail-item">
        <div class="detail-label">Category</div>
        <div class="detail-value">${escapeHtml(data.category)}</div>
      </div>
      ` : ''}
      <div class="detail-item fingerprint">
        <div class="detail-label">Digital Fingerprint (SHA-256)</div>
        <div class="detail-value">${data.fingerprintHash}</div>
      </div>
    </div>
    
    <div class="verification">
      <div class="verification-label">Verify this certificate at</div>
      <div class="verification-url">${verificationUrl}</div>
    </div>
    
    <div class="footer">
      <p>This certificate was generated by Idestrim's Idemark system.</p>
      <p>The digital fingerprint proves the existence and timestamp of this idea.</p>
    </div>
  </div>
</body>
</html>
`;
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Download certificate as HTML file
export function downloadCertificate(data: IdemarkData): void {
  const html = generateCertificateHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `idemark-certificate-${data.idemarkId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
