// canvas is lazy-loaded on first use to avoid loading ~150 MB of native
// libs (Cairo, Pango, libjpeg) at startup for every process — this alone
// was the primary cause of the memory-limit crashes on Render.
let _canvas = null;
async function getCanvas() {
  if (!_canvas) {
    _canvas = await import('canvas');
  }
  return _canvas;
}

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function formatDesignationForDisplay(designation) {
  if (!designation) return 'IEEE Member';
  const executivePositions = { 'Chair': 'Chair', 'Vice Chair': 'Vice Chair', 'Secretary': 'Secretary', 'Treasurer': 'Treasurer', 'Web Master': 'Web Master' };
  if (executivePositions[designation]) return executivePositions[designation];
  if (designation.includes('Secretary') || designation.includes('Vice Secretary')) return designation;
  if (designation === 'CS_Head') return 'CS Head';
  if (designation.includes('_Head')) {
    const team = designation.replace('_Head', '');
    const teamNames = { 'COMSOC': 'ComSoc', 'EVENT': 'Event', 'Joint_Secretary': 'Joint Secretary' };
    return `${teamNames[team] || team} Head`;
  }
  if (designation === 'Joint_Sec') return 'Joint Secretary';
  const teamDisplayNames = { 'CS': 'CS Member', 'COMSOC': 'ComSoc Member', 'WIE': 'WIE Member', 'RAS': 'RAS Member', 'Design': 'Design Team', 'Audit': 'Audit Team', 'Editorial': 'Editorial Team', 'EVENT': 'Event Team', 'CNM': 'CNM Member', 'Joint_Secretary': 'Joint Secretary' };
  if (teamDisplayNames[designation]) return teamDisplayNames[designation];
  return designation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const fetchImageFromUrl = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
};

export async function generateIDCard({ userName, userPhoto, teamName, eventName, userCollege, userRollNo, membershipType, ieeeMembershipId, userDesignation }) {
  // Lazy-load canvas only when actually generating an ID card
  const { createCanvas, loadImage, registerFont } = await getCanvas();

  // Register font on first use (safe to call multiple times)
  const fontPath = path.join(projectRoot, 'backend/public/fonts/PlayfairDisplay-Bold.ttf');
  if (fs.existsSync(fontPath)) {
    try { registerFont(fontPath, { family: 'Playfair Display', weight: 'bold' }); } catch {}
  }

  // 1. PATH SETUP
  const isMemberCard = teamName === 'IEEE Member' || teamName === 'Member' || (membershipType && (eventName === 'IEEE Student Branch, RGIPT' || !eventName || eventName.includes('IEEE Student Branch')));
  const isCodeForHer = eventName && (eventName.toLowerCase().includes('codeforher') || eventName.toLowerCase().includes('code for her'));
  
  const frontendMemberPath = path.join(projectRoot, 'ieee_frontend/public/images/member_id.png');
  const backendMemberPath = path.join(projectRoot, 'backend/public/images/member_id.png');
  const frontendEventPath = path.join(projectRoot, 'ieee_frontend/public/images/id.png');
  const backendEventPath = path.join(projectRoot, 'backend/public/images/id.png');
  const frontendCodeForHerPath = path.join(projectRoot, 'ieee_frontend/public/images/codeforher_id.png');
  const backendCodeForHerPath = path.join(projectRoot, 'backend/public/images/codeforher_id.png');
  
  let templatePath = null;
  if (isMemberCard) {
    if (fs.existsSync(frontendMemberPath)) templatePath = frontendMemberPath;
    else if (fs.existsSync(backendMemberPath)) templatePath = backendMemberPath;
  } else {
    if (isCodeForHer) {
      if (fs.existsSync(frontendCodeForHerPath)) templatePath = frontendCodeForHerPath;
      else if (fs.existsSync(backendCodeForHerPath)) templatePath = backendCodeForHerPath;
      else if (fs.existsSync(frontendEventPath)) templatePath = frontendEventPath;
      else if (fs.existsSync(backendEventPath)) templatePath = backendEventPath;
    } else {
      if (fs.existsSync(frontendEventPath)) templatePath = frontendEventPath;
      else if (fs.existsSync(backendEventPath)) templatePath = backendEventPath;
    }
  }
  
  // 2. LOAD TEMPLATE
  let templateImage;
  let width, height;
  try {
    if (templatePath && fs.existsSync(templatePath)) {
      templateImage = await loadImage(templatePath);
      width = templateImage.width;
      height = templateImage.height;
    } else {
      let imageFileName;
      if (isMemberCard) imageFileName = 'member_id.png';
      else if (isCodeForHer) imageFileName = 'codeforher_id.png';
      else imageFileName = 'id.png';
      const frontendImageUrl = `${FRONTEND_URL}/images/${imageFileName}`;
      const imageBuffer = await fetchImageFromUrl(frontendImageUrl);
      templateImage = await loadImage(imageBuffer);
      width = templateImage.width;
      height = templateImage.height;
    }
  } catch (error) {
    console.error('❌ Error loading template image:', error.message);
    width = 1012; height = 1431; templateImage = null;
  }
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 3. DRAW BACKGROUND
  if (templateImage) ctx.drawImage(templateImage, 0, 0, width, height);
  else { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }

  // =======================================================
  // DRAWING LOGIC
  // =======================================================

  if (isCodeForHer) {
    // === CODE FOR HER ID CARD GENERATION ===
    
    // 1. Setup Layout Constants
    ctx.textAlign = 'left';
    const textLeftX = width * 0.12;
    
    // Y Coordinates
    const teamY = height * 0.78; 
    const nameY = height * 0.85;
    const collegeY = height * 0.90;

    // 2. ERASE TEMPLATE PLACEHOLDERS
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, height * 0.72, width, height * 0.23);

    // 3. DRAW TEXT
    ctx.fillStyle = '#000000';
    
    // Reduction factor to decrease font sizes significantly
    const reductionFactor = 1.5;

    // A. Team Name (Top - Playfair Display Bold)
    // Original base: 0.055 -> New base: ~0.036
    const teamFontSize = Math.floor((height * 0.055) / reductionFactor); 
    ctx.font = `900 ${teamFontSize}px "Playfair Display", "Times New Roman", serif`;
    ctx.fillText((teamName || 'TEAM NAME').toUpperCase(), textLeftX, teamY);

    // B. User Name (Middle - Arial Bold)
    // Original base: 0.035 -> New base: ~0.023
    const nameFontSize = Math.floor((height * 0.035) / reductionFactor);
    ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
    ctx.fillText((userName || 'YOUR NAME').toUpperCase(), textLeftX, nameY);

    // C. College Name (Bottom - Arial)
    // Original base: 0.025 -> New base: ~0.016
    const collegeFontSize = Math.floor((height * 0.025) / reductionFactor);
    ctx.font = `${collegeFontSize}px Arial, sans-serif`;
    ctx.fillText((userCollege || 'RGIPT').toUpperCase(), textLeftX, collegeY);


    // 4. DRAW PHOTO (Rounded Corners)
    if (userPhoto) {
      try {
        let image;
        if (userPhoto.startsWith('data:image') || userPhoto.startsWith('http')) {
          image = await loadImage(userPhoto);
        } else {
          image = await loadImage(Buffer.from(userPhoto, 'base64'));
        }

        // Photo Dimensions & Position
        const photoW = width * 0.60;
        const photoH = height * 0.38;
        const photoX = (width - photoW) / 2;
        const photoY = height * 0.21;
        const borderRadius = 40;

        ctx.save();
        ctx.beginPath();
        // Rounded Rectangle Path
        ctx.moveTo(photoX + borderRadius, photoY);
        ctx.lineTo(photoX + photoW - borderRadius, photoY);
        ctx.quadraticCurveTo(photoX + photoW, photoY, photoX + photoW, photoY + borderRadius);
        ctx.lineTo(photoX + photoW, photoY + photoH - borderRadius);
        ctx.quadraticCurveTo(photoX + photoW, photoY + photoH, photoX + photoW - borderRadius, photoY + photoH);
        ctx.lineTo(photoX + borderRadius, photoY + photoH);
        ctx.quadraticCurveTo(photoX, photoY + photoH, photoX, photoY + photoH - borderRadius);
        ctx.lineTo(photoX, photoY + borderRadius);
        ctx.quadraticCurveTo(photoX, photoY, photoX + borderRadius, photoY);
        ctx.closePath();
        ctx.clip(); 

        // Draw Image (Cover Fit)
        const imgRatio = image.width / image.height;
        const areaRatio = photoW / photoH;
        let drawX, drawY, drawW, drawH;

        if (imgRatio > areaRatio) { 
          drawH = photoH;
          drawW = photoH * imgRatio;
          drawX = photoX - (drawW - photoW) / 2; 
          drawY = photoY;
        } else { 
          drawW = photoW;
          drawH = photoW / imgRatio;
          drawX = photoX;
          drawY = photoY - (drawH - photoH) / 2; 
        }

        ctx.drawImage(image, drawX, drawY, drawW, drawH);
        ctx.restore();
        
      } catch (error) {
        console.error('Error loading user photo:', error);
      }
    }

  } else {
    // === MEMBER / OTHER EVENT ID CARD GENERATION (STRICTLY UNCHANGED) ===
    const textLeftX = width * 0.09;
    const nameY = height * 0.235;
    const subTextY = height * 0.285;
    const idY = height * 0.33;
    const nameFontSize = Math.floor(height * 0.045);
    const subFontSize = Math.floor(height * 0.025);

    const cleanName = (userName || 'MEMBER NAME').toUpperCase();
    ctx.font = `900 ${nameFontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(textLeftX, nameY - nameFontSize, width * 0.6, nameFontSize * 1.2);
    ctx.fillStyle = '#4a2c2a';
    ctx.fillText(cleanName, textLeftX, nameY);

    let subText = 'Member';
    if (membershipType === 'ieee_member') {
      const designationToFormat = userDesignation || teamName;
      subText = (designationToFormat && designationToFormat !== 'IEEE Member' && designationToFormat !== 'Member') ? formatDesignationForDisplay(designationToFormat) : 'IEEE Member';
    } else if (teamName) {
      subText = teamName;
    }
    ctx.font = `${subFontSize}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(textLeftX, subTextY - subFontSize, width * 0.5, subFontSize * 1.2);
    ctx.fillStyle = '#4a2c2a';
    ctx.fillText(subText, textLeftX, subTextY);

    if (ieeeMembershipId) {
      ctx.font = `${subFontSize}px Arial`;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(textLeftX, idY - subFontSize, width * 0.5, subFontSize * 1.2);
      ctx.fillStyle = '#4a2c2a';
      ctx.fillText(`ID: ${ieeeMembershipId}`, textLeftX, idY);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(textLeftX, idY - subFontSize, width * 0.5, subFontSize * 1.2);
    }

    if (userPhoto) {
      try {
        let image;
        if (userPhoto.startsWith('data:image') || userPhoto.startsWith('http')) {
          image = await loadImage(userPhoto);
        } else {
          image = await loadImage(Buffer.from(userPhoto, 'base64'));
        }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(width * 0.35, height);
        ctx.quadraticCurveTo(width * 0.35, height * 0.42, width, height * 0.42);
        ctx.lineTo(width, height);
        ctx.lineTo(width * 0.35, height);
        ctx.closePath();
        ctx.clip();

        const photoX = width * 0.35;
        const photoY = height * 0.42;
        const photoW = width * 0.65;
        const photoH = height * 0.58;
        const imgRatio = image.width / image.height;
        const areaRatio = photoW / photoH;
        let drawX, drawY, drawW, drawH;
        if (imgRatio > areaRatio) {
          drawH = photoH; drawW = photoH * imgRatio; drawX = photoX - (drawW - photoW) / 2; drawY = photoY;
        } else {
          drawW = photoW; drawH = photoW / imgRatio; drawX = photoX; drawY = photoY - (drawH - photoH) / 2;
        }
        ctx.drawImage(image, drawX, drawY, drawW, drawH);
        ctx.restore();
      } catch (error) {
        console.error('Error loading user photo:', error);
      }
    }
  }

  return canvas.toBuffer('image/png');
}