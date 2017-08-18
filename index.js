const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const { promisify } = require('util');

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  };
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

const PORT = process.env.PORT || 4000;


const app = express();
app.use(morgan('combined'));
app.use(bodyParser.text({ type: () => true }));

app.get('*', async (req, res) => {
  await renderPDF(res, { url: req.query.url });
});

app.post('*', async (req, res) => {
  await renderPDF(res, { html: req.body });
});

async function renderPDF(res, obj) {
  try {
    const tempFilename = `tmp/${guid()}.pdf`;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    if (obj.url) {
      await page.goto(obj.url, { waitUntil: 'networkidle' });
    } else if (obj.html) {
      await page.setContent(obj.html);
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    } else {
      res.sendStatus(400);
      return
    }

    await page.pdf({
      path: tempFilename,
      scale: .944,
      format: 'A4',
      margin: { left: '1cm', right: '1cm', top: '1cm', bottom: '1cm' },
    });

    browser.close();

    await promisify(res.sendFile.bind(res))(tempFilename, { root: __dirname });
    await promisify(fs.unlink)(tempFilename);
  } catch (err) {
    res.status(500).send(`${err.message}\n${err.stack}`);
  }
}

if (!fs.existsSync('tmp')) {
  fs.mkdirSync('tmp');
}

app.listen(PORT);
console.log(`Listening on port ${PORT}`);
