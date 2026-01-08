import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';
import http from 'http';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root (go up from backend/src/utils to project root)
const projectRoot = path.resolve(__dirname, '../../../');

// Get frontend URL from environment variable
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Helper function to fetch image from URL
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

/**
 * Generate an ID card image for event registration using template image
 * @param {Object} options - ID card options
 * @param {string} options.userName - User's full name
 * @param {string} options.userPhoto - User's profile photo (base64 or URL)
 * @param {string} options.teamName - Team name or membership type
 * @param {string} options.eventName - Event name or organization name
 * @param {string} options.userCollege - User's college name
 * @param {string} options.userRollNo - User's roll number
 * @param {string} options.membershipType - 'ieee_member' or 'non_member'
 * @param {string} options.ieeeMembershipId - IEEE membership ID (if IEEE member)
 */
export async function generateIDCard({ userName, userPhoto, teamName, eventName, userCollege, userRollNo, membershipType, ieeeMembershipId }) {
  // 1. PATH SETUP
  // Use member_id.png for IEEE member ID cards, id.png for event ID cards
  // Member cards: teamName is "IEEE Member" or "Member", or when membershipType is provided
  // Event cards: teamName is actual team name for events
  const isMemberCard = teamName === 'IEEE Member' || teamName === 'Member' || (membershipType && (eventName === 'IEEE Student Branch, RGIPT' || !eventName || eventName.includes('IEEE Student Branch')));
  
  // Paths relative to project root
  const frontendMemberPath = path.join(projectRoot, 'ieee_frontend/public/images/member_id.png');
  const backendMemberPath = path.join(projectRoot, 'backend/public/images/member_id.png');
  const frontendEventPath = path.join(projectRoot, 'ieee_frontend/public/images/id.png');
  const backendEventPath = path.join(projectRoot, 'backend/public/images/id.png');
  
  let templatePath = null;
  if (isMemberCard) {
    // For member ID cards, use member_id.png (template with placeholders already set by user)
    // Priority: frontend path first (where user placed the template)
    if (fs.existsSync(frontendMemberPath)) {
      templatePath = frontendMemberPath;
      console.log('✅ Using member_id.png from frontend for IEEE member ID card:', frontendMemberPath);
    } else if (fs.existsSync(backendMemberPath)) {
      templatePath = backendMemberPath;
      console.log('✅ Using member_id.png from backend for IEEE member ID card:', backendMemberPath);
    } else {
      console.error('❌ member_id.png not found at:', frontendMemberPath);
      console.error('❌ Also checked:', backendMemberPath);
    }
  } else {
    // For event ID cards, use id.png
    if (fs.existsSync(frontendEventPath)) {
      templatePath = frontendEventPath;
      console.log('✅ Using id.png from frontend for event ID card');
    } else if (fs.existsSync(backendEventPath)) {
      templatePath = backendEventPath;
      console.log('✅ Using id.png from backend for event ID card');
    }
  }
  
  // 2. LOAD TEMPLATE
  let templateImage;
  let width, height;
  
  try {
    // Try loading from local file system first
    if (templatePath && fs.existsSync(templatePath)) {
      console.log('📷 Loading template from local file:', templatePath);
      templateImage = await loadImage(templatePath);
      width = templateImage.width;
      height = templateImage.height;
      console.log(`✅ Template loaded successfully from local: ${width}x${height}`);
    } else {
      // If local file doesn't exist, try fetching from frontend URL (for deployed environments)
      const imageFileName = isMemberCard ? 'member_id.png' : 'id.png';
      const frontendImageUrl = `${FRONTEND_URL}/images/${imageFileName}`;
      
      console.log('📷 Local template not found, trying to fetch from frontend:', frontendImageUrl);
      
      try {
        const imageBuffer = await fetchImageFromUrl(frontendImageUrl);
        templateImage = await loadImage(imageBuffer);
        width = templateImage.width;
        height = templateImage.height;
        console.log(`✅ Template loaded successfully from frontend URL: ${width}x${height}`);
      } catch (urlError) {
        console.error('❌ Failed to fetch template from frontend URL:', urlError.message);
        throw new Error(`Template not found locally and failed to fetch from ${frontendImageUrl}`);
      }
    }
  } catch (error) {
    console.error('❌ Error loading template image:', error.message);
    console.error('   Template path was:', templatePath);
    console.error('   Is member card:', isMemberCard);
    console.error('   Frontend URL:', FRONTEND_URL);
    // Fallback dimensions for vertical card
    width = 1012; 
    height = 1431; 
    templateImage = null;
  }
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 3. DRAW BACKGROUND
  if (templateImage) {
    ctx.drawImage(templateImage, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  // =======================================================
  // NEW COORDINATE CONFIGURATION (For member_id.png)
  // =======================================================
  
  // Text Anchor Points (Left aligned, ~9-10% padding from left)
  const textLeftX = width * 0.09;
  const nameY = height * 0.235;      // "Your Name" position
  const subTextY = height * 0.285;   // "Username" position
  const idY = height * 0.33;         // "ID - Your ID" position
  
  // Font Sizes
  const nameFontSize = Math.floor(height * 0.045); // Large
  const subFontSize = Math.floor(height * 0.025);  // Medium
  const smallFontSize = Math.floor(height * 0.020); // Small

  // =======================================================
  // DRAWING LOGIC
  // =======================================================

  // --- STEP 1: TEXT FIELDS (Name, Type, ID) ---
  // We use white rectangles to "erase" the placeholder text on the template first.

  // 1a. User Name
  const cleanName = (userName || 'MEMBER NAME').toUpperCase();
  ctx.font = `900 ${nameFontSize}px Arial`; // Extra Bold for name
  ctx.textAlign = 'left';
  
  // Erase "Your Name"
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(textLeftX, nameY - nameFontSize, width * 0.6, nameFontSize * 1.2);
  
  // Write Real Name (Dark Brown/Black color from template style)
  ctx.fillStyle = '#4a2c2a'; 
  ctx.fillText(cleanName, textLeftX, nameY);

  // 1b. Membership Type / Team (Replaces "Username")
  let subText = teamName || 'Member';
  if (membershipType === 'ieee_member') subText = 'IEEE Member';
  
  ctx.font = `${subFontSize}px Arial`;
  
  // Erase "Username"
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(textLeftX, subTextY - subFontSize, width * 0.5, subFontSize * 1.2);
  
  // Write Type
  ctx.fillStyle = '#4a2c2a';
  ctx.fillText(subText, textLeftX, subTextY);

  // 1c. IEEE ID (Replaces "ID - Your ID")
  if (ieeeMembershipId) {
    const idText = `ID: ${ieeeMembershipId}`;
    
    ctx.font = `${subFontSize}px Arial`;
    
    // Erase "ID - Your ID"
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(textLeftX, idY - subFontSize, width * 0.5, subFontSize * 1.2);
    
    // Write ID
    ctx.fillStyle = '#4a2c2a';
    ctx.fillText(idText, textLeftX, idY);
  } else {
    // If no ID, just erase the placeholder so it's clean
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(textLeftX, idY - subFontSize, width * 0.5, subFontSize * 1.2);
  }

  // --- STEP 2: DRAW USER PHOTO (Bottom Right Curve) ---
  // The black shape on the template is the photo container.
  // We create a clipping path that matches that shape.
  
  try {
    let image;
    if (userPhoto) {
      if (userPhoto.startsWith('data:image')) {
        const base64Data = userPhoto.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        image = await loadImage(imageBuffer);
      } else if (userPhoto.startsWith('http')) {
        image = await loadImage(userPhoto);
      } else {
        const imageBuffer = Buffer.from(userPhoto, 'base64');
        image = await loadImage(imageBuffer);
      }

      ctx.save();
      ctx.beginPath();
      
      // Define the curve shape (Approximation of the template's black blob)
      // Starts at bottom edge (approx 35% width), curves up to right edge (approx 40% height)
      ctx.moveTo(width * 0.35, height); // Bottom point
      // Curve to the Top-Right point using a control point
      // Control point (x: 0.35w, y: 0.45h) gives that convex shape
      ctx.quadraticCurveTo(width * 0.35, height * 0.42, width, height * 0.42);
      ctx.lineTo(width, height); // Corner
      ctx.lineTo(width * 0.35, height); // Close path
      ctx.closePath();
      
      // Clip to this shape
      ctx.clip();

      // Draw image filling this area
      // We calculate dimensions to ensure "cover" fit
      const photoX = width * 0.35;
      const photoY = height * 0.42;
      const photoW = width * 0.65;
      const photoH = height * 0.58;
      
      // Simple cover logic
      const imgRatio = image.width / image.height;
      const areaRatio = photoW / photoH;
      let drawX, drawY, drawW, drawH;
      
      if (imgRatio > areaRatio) { // Image is wider
        drawH = photoH;
        drawW = photoH * imgRatio;
        drawX = photoX - (drawW - photoW) / 2;
        drawY = photoY;
      } else { // Image is taller
        drawW = photoW;
        drawH = photoW / imgRatio;
        drawX = photoX;
        drawY = photoY - (drawH - photoH) / 2;
      }

      ctx.drawImage(image, drawX, drawY, drawW, drawH);
      ctx.restore();
      
    }
  } catch (error) {
    console.error('Error loading user photo:', error);
  }

  // --- STEP 3: OPTIONAL DETAILS (Barcode, etc) ---
  // The vertical barcode is already on the template image, 
  // so we don't need to draw it.
  
  return canvas.toBuffer('image/png');
}