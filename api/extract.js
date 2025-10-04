const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
  // Helper function to send JSON response
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(405, { error: 'Method not allowed' });
  }

  const { url } = req.body;
  
  if (!url) {
    return sendJson(400, { error: 'URL is required' });
  }

  let browser;
  
  try {
    console.log(`🔍 EXTRACTING ALL FROM: ${url}`);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font'){
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 15000});
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const results = await page.evaluate(() => {
      const allResults = [];

      // ===== GET ALL IMAGES =====
      const imgs = Array.from(document.querySelectorAll('img'));
      const imageUrls = new Set();

      imgs.forEach(img => {
        const src = img.src;
        const dataSrc = img.getAttribute('data-src');

        if (src && !src.includes('loading') && src.startsWith('http') && !imageUrls.has(src)) {
          imageUrls.add(src);
          allResults.push({
            type: 'IMAGE',
            url: src,
            format: src.split('.').pop()?.split('?')[0]?.toLowerCase() || 'unknown'
          });
        }

        if (dataSrc && dataSrc.startsWith('http') && !imageUrls.has(dataSrc)) {
          imageUrls.add(dataSrc);
          allResults.push({
            type: 'IMAGE',
            url: dataSrc,
            format: dataSrc.split('.').pop()?.split('?')[0]?.toLowerCase() || 'unknown'
          });
        }
      });

      // ===== GET ALL INTERACTIVE ELEMENTS =====
      const allNodes = document.querySelectorAll('*');
      const processedElements = new Set();

      allNodes.forEach(el => {
        const isInteractive =
          el.tagName === 'BUTTON' ||
          el.tagName === 'A' ||
          el.tagName === 'INPUT' ||
          el.tagName === 'SELECT' ||
          el.tagName === 'TEXTAREA' ||
          el.hasAttribute('onclick') ||
          el.hasAttribute('onmousedown') ||
          el.hasAttribute('onmouseup') ||
          el.hasAttribute('onchange') ||
          el.hasAttribute('href') ||
          el.hasAttribute('data-action') ||
          el.hasAttribute('data-toggle') ||
          el.hasAttribute('data-target') ||
          el.hasAttribute('data-server') ||
          el.hasAttribute('data-chapter') ||
          el.hasAttribute('data-url') ||
          el.hasAttribute('role') && (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') ||
          el.hasAttribute('tabindex') ||
          el.className.includes('btn') ||
          el.className.includes('button') ||
          el.className.includes('click') ||
          el.style.cursor === 'pointer' ||
          getComputedStyle(el).cursor === 'pointer';

        if (isInteractive) {
          const elementId = `${el.tagName}-${el.id}-${el.className}-${el.getAttribute('href') || ''}-${el.textContent?.trim().substring(0, 30) || ''}`;

          if (!processedElements.has(elementId)) {
            processedElements.add(elementId);

            const attrs = {};
            if (el.attributes) {
              for (let attr of el.attributes) {
                attrs[attr.name] = attr.value;
              }
            }

            allResults.push({
              type: 'INTERACTIVE',
              tag: el.tagName?.toLowerCase(),
              text: el.textContent?.trim().substring(0, 100) || '',
              id: el.id || '',
              className: el.className || '',
              title: el.getAttribute('title') || '',
              href: el.getAttribute('href') || '',
              onclick: el.getAttribute('onclick') || '',
              value: el.value || '',
              name: el.name || '',
              placeholder: el.placeholder || '',
              allAttributes: attrs
            });
          }
        }
      });

      return allResults;
    });

    console.log(`✅ COMPLETE: Extracted ${results.filter(r => r.type === 'IMAGE').length} images and ${results.filter(r => r.type === 'INTERACTIVE').length} interactive elements`);

    return sendJson(200, {
      success: true,
      url: url,
      results: results,
      counts: {
        total: results.length,
        images: results.filter(r => r.type === 'IMAGE').length,
        interactive: results.filter(r => r.type === 'INTERACTIVE').length
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return sendJson(500, { 
      error: 'Failed to extract content', 
      details: error.message 
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};