import { loadImage, createCanvas } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.join(__dirname, '../public/images/id.png') || 
                     path.join(__dirname, '../../ieee_frontend/public/images/id.png');

async function analyzeTemplate() {
  try {
    if (!fs.existsSync(templatePath)) {
      console.error('Template not found at:', templatePath);
      return;
    }

    const template = await loadImage(templatePath);
    console.log('📐 Template Dimensions:');
    console.log(`   Width: ${template.width}px`);
    console.log(`   Height: ${template.height}px`);
    console.log(`   Aspect Ratio: ${(template.width / template.height).toFixed(2)}:1`);
    
    // Create a canvas to analyze
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(template, 0, 0);
    
    // Calculate approximate positions based on typical ID card layout
    console.log('\n📍 Estimated Positions (based on template description):');
    console.log(`   Photo (circular, left): X=${Math.floor(template.width * 0.06)}, Y=${Math.floor(template.height * 0.12)}, Size=${Math.floor(template.width * 0.18)}`);
    console.log(`   Name (middle, centered): Y=${Math.floor(template.height * 0.80)}`);
    console.log(`   Team (middle, left): X=${Math.floor(template.width * 0.22)}, Y=${Math.floor(template.height * 0.85)}`);
    
    console.log('\n✅ Template analysis complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzeTemplate();





