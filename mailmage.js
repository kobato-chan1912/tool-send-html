const sql = require('mssql/msnodesqlv8');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();
const { exec } = require('child_process');


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

    let htmlContent = await fs.readFile(htmlPath, 'utf-8');

    // Replace all key kiểu BB01, CCC12...
    for (const key in record) {
      if (/^[A-Z]{2,3}\d{2}$/.test(key)) {
        const value = record[key] || '';
        const regex = new RegExp(key, 'g');
        htmlContent = htmlContent.replace(regex, value);
      }
    }


    // Tạo file HTML tạm thời
    const tempHtmlPath = path.join(outputFolder, `${record.KeyID}_temp.html`);
    await fs.writeFile(tempHtmlPath, htmlContent, 'utf-8');


    // Chạy command để tạo PDF từ HTML tạm thời
    const command = `"C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe" --enable-local-file-access "${tempHtmlPath}" "${pdfOutputPath}"`;

    await new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) {
          console.error(`❌ Lỗi tạo PDF: ${stderr}`);
          return reject(err);
        }
        resolve();
      });
    });

    // Xóa file HTML tạm thời
    await fs.unlink(tempHtmlPath);


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
      .execute('ReturnLinkPDFFromHTML');
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
