const sql = require('mssql/msnodesqlv8');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();
const { exec } = require('child_process');

const puppeteer = require('puppeteer');

const pool = new sql.ConnectionPool({
  connectionString: process.env.CONNECTION_STRING
});

async function processRecord(record, connection) {
  try {
    console.log(`-- Đang xử lý HTML KeyID: ${record.KeyID} --`);

    const htmlPath = path.resolve(record.DuongDanHTMLMau);
    const outputFolder = path.resolve(record.DuongDanKetQua);
    const pdfFileName = `${record.KeyID}.pdf`;
    const pdfOutputPath = path.join(outputFolder, pdfFileName);
    const outputHtmlPath = path.join(outputFolder, `${record.KeyID}.html`);


    let htmlContent = await fs.readFile(htmlPath, 'utf-8');

    // Mảng lưu nội dung bị thay thế
    const placeholders = [];

    // Hàm thay thế bằng placeholder
    function replaceWithPlaceholder(html, pattern) {
      return html.replace(pattern, (match, p1) => {
        const placeholder = `__PLACEHOLDER_${placeholders.length}__`;
        placeholders.push(p1); // lưu giá trị gốc
        return match.replace(p1, placeholder);
      });
    }

    // 1. Tạm thời thay thế tất cả src="", href="", url(...) khỏi htmlContent
    htmlContent = replaceWithPlaceholder(htmlContent, /src="(.*?)"/g);
    htmlContent = replaceWithPlaceholder(htmlContent, /href="(.*?)"/g);
    htmlContent = replaceWithPlaceholder(htmlContent, /url\((['"]?)(.*?)\1\)/g);

    // 2. Replace các keys như BB01, CCC12...
    for (const key in record) {
      if (/^[A-Z]{2,3}\d{2}$/.test(key)) {
        const value = record[key] || '';
        const regex = new RegExp(key, 'g');
        htmlContent = htmlContent.replace(regex, value);
      }
    }

    // 3. Khôi phục lại các chuỗi đã thay bằng placeholder
    htmlContent = htmlContent.replace(/__PLACEHOLDER_(\d+)__/g, (_, index) => {
      return placeholders[parseInt(index)];
    });


    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--allow-file-access-from-files']
    });

    const page = await browser.newPage();

    // Load HTML từ nội dung, set base URL để hỗ trợ hình ảnh local


    await fs.writeFile(outputHtmlPath, htmlContent, 'utf-8');

    await page.goto(outputHtmlPath, {
      waitUntil: ['domcontentloaded', 'networkidle0']
    });





    page.$$('selector', page => page.style.pageBreakBefore = 'always')



    await page.pdf({
      path: pdfOutputPath,
      width: '200mm',
      height: '297mm',
      printBackground: false
    });


    await fs.unlink(outputHtmlPath);
    await browser.close();

    console.log(`-- Đã tạo PDF: ${pdfOutputPath} --`);

    return {
      status: 'ok',
      fileName: pdfFileName
    };
  } catch (err) {
    console.error(`-- Lỗi xử lý KeyID: ${record.KeyID} --`, err.message);
    return {
      status: 'error',
      error: err.message
    };
  }
}


async function callProcedure(connection, KeyID, fileNameOnly) {
  try {
    await connection
      .request()
      .input('KeyID_MailMage', sql.UniqueIdentifier, KeyID)
      .input('DuongDan', sql.NVarChar(500), fileNameOnly)
      .query(`EXEC ReturnLinkPDFFromHTML @KeyID_MailMage, @DuongDan`);

    console.log(`-- Đã gọi procedure với KeyID: ${KeyID}, File: ${fileNameOnly} --`);
  } catch (err) {
    console.error('❌ Lỗi gọi procedure:', err.message);
  }
}

async function main() {
  try {
    await pool.connect();
    const connection = pool;

    const result = await connection
      .request()
      .query(`SELECT * FROM MailMage WHERE Status = 0`);

    const rows = result.recordset;

    for (const record of rows) {
      const result = await processRecord(record, connection);

      if (result.status === 'ok') {
        await callProcedure(connection, record.KeyID, result.fileName);
      }
    }

  } catch (err) {
    console.error('❌ Lỗi kết nối SQL Server:', err.message);
  } finally {
    pool.close();
  }
}

// main()
module.exports = { main };
