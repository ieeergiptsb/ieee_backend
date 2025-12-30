import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate an ID card image for event registration using template image
 * @param {Object} options - ID card options
 */
export async function generateIDCard({ userName, userPhoto, teamName, eventName, userCollege, userRollNo }) {
  // 1. PATH SETUP (Kept same as your original code)
  const backendTemplatePath = path.join(__dirname, '../../public/images/id.png');
  const frontendTemplatePath = path.join(__dirname, '../../ieee_frontend/public/images/id.png');
  
  let templatePath = null;
  if (fs.existsSync(backendTemplatePath)) templatePath = backendTemplatePath;
  else if (fs.existsSync(frontendTemplatePath)) templatePath = frontendTemplatePath;
  
  // 2. LOAD TEMPLATE
  let templateImage;
  let width, height;
  
  try {
    if (templatePath && fs.existsSync(templatePath)) {
      templateImage = await loadImage(templatePath);
      width = templateImage.width;
      height = templateImage.height;
    } else {
      throw new Error(`Template not found.`);
    }
  } catch (error) {
    console.error('❌ Error loading template image:', error.message);
    // Fallback specific to the vertical template shown in your image
    width = 1012; 
    height = 1431; // Estimated vertical aspect ratio based on your upload
    templateImage = null;
  }
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 3. DRAW BACKGROUND
  if (templateImage) {
    ctx.drawImage(templateImage, 0, 0, width, height);
  } else {
    // Fallback background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  // =======================================================
  // COORDINATE CONFIGURATION (Tweaked for your ID.png)
  // =======================================================
  
  // 1. PHOTO PLACEMENT (The central box)
  // Based on the image, the box starts roughly 32% down and is centered
  const photoConfig = {
    y: height * 0.328,       // Vertical start of the box
    w: width * 0.418,        // Width of the box
    h: height * 0.365,       // Height of the box
  };
  photoConfig.x = (width - photoConfig.w) / 2; // Center horizontally

  // 2. TEXT CONFIGURATION
  const nameY = height * 0.735;   // Where "NAME" is written
  const teamY = height * 0.81;    // Where "TEAM:" is written
  const detailsY = height * 0.86; // Where we put Roll No/College
  
  // =======================================================
  // DRAWING LOGIC
  // =======================================================

  // --- STEP 1: DRAW USER PHOTO ---
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

      // Draw the photo strictly inside the box defined by the template
      // We assume the user wants to fill the box.
      ctx.drawImage(
        image, 
        photoConfig.x, 
        photoConfig.y, 
        photoConfig.w, 
        photoConfig.h
      );
      
      // Optional: Draw a thin border around photo to make it look clean
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(photoConfig.x, photoConfig.y, photoConfig.w, photoConfig.h);
      
    } else {
        // No photo provided? Leave the default cloud illustration from template
        // OR Draw a generic placeholder if you prefer
    }
  } catch (error) {
    console.error('Error loading user photo:', error);
  }

  // --- STEP 2: DRAW NAME ---
  // The template has "NAME" printed in black. We need to "erase" it first
  // by drawing a white box over it, then writing the real name.
  
  const nameFontSize = Math.floor(height * 0.045); // Large text
  ctx.font = `900 ${nameFontSize}px Arial`; // Extra Bold
  ctx.textAlign = 'center';
  
  // Measure text to center it
  const cleanName = (userName || 'PARTICIPANT').toUpperCase();
  
  // 2a. Eraser Rectangle (Adjust widths based on your font size)
  ctx.fillStyle = '#ffffff'; // Match the white background
  // Erase a rectangle roughly where "NAME" is on the template
  const eraserWidth = width * 0.6; 
  const eraserHeight = nameFontSize * 1.5;
  ctx.fillRect(
    (width / 2) - (eraserWidth / 2), 
    nameY - (eraserHeight / 1.5), 
    eraserWidth, 
    eraserHeight
  );

  // 2b. Write Name
  ctx.fillStyle = '#000000';
  ctx.fillText(cleanName, width / 2, nameY);


  // --- STEP 3: DRAW TEAM ---
  // The template has "TEAM:" printed on the left.
  // We want to write the team name to the RIGHT of that label.
  
  if (teamName) {
    const teamFontSize = Math.floor(height * 0.035);
    ctx.font = `bold ${teamFontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';

    // The "TEAM:" label ends roughly at 43% of the width
    const teamLabelEndX = width * 0.43; 
    
    // We strictly write the value, assuming "TEAM:" is already on the background
    // If the background "TEAM:" is getting covered, adjust 'teamLabelEndX'
    ctx.fillText(teamName.toUpperCase(), teamLabelEndX, teamY);
  }

  // --- STEP 4: DRAW COLLEGE / ROLL NO ---
  // There is no explicit slot, so we center this below the Team line
  // in a smaller, lighter font.
  
  if (userCollege || userRollNo) {
    const detailFontSize = Math.floor(height * 0.022);
    ctx.font = `${detailFontSize}px Arial`;
    ctx.fillStyle = '#555555'; // Dark grey
    ctx.textAlign = 'center';
    
    let detailText = '';
    if (userRollNo) detailText += `Roll: ${userRollNo}`;
    if (userRollNo && userCollege) detailText += ' | ';
    if (userCollege) detailText += userCollege;
    
    ctx.fillText(detailText, width / 2, detailsY);
  }

  return canvas.toBuffer('image/png');
}