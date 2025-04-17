const sql = require('mssql/msnodesqlv8');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const pool = new sql.ConnectionPool({
  connectionString: process.env.CONNECTION_STRING
});


async function processRecord(record, connection) {
  try {
    console.log(`-- Đang xử lý Word KeyID: ${record.KeyID} --`);

    const templatePath = path.resolve(record.DuongDanHTMLMau); // .docx gốc
    const outputFolder = path.resolve(record.DuongDanKetQua);
    const outputDocxPath = path.join(outputFolder, `${record.KeyID}.docx`);
    const pdfOutputPath = path.join(outputFolder, `${record.KeyID}.pdf`);

    await fs.mkdir(outputFolder, { recursive: true });

    // 1. Đọc file Word mẫu
    const content = await fs.readFile(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });

    // 2. Lấy dữ liệu từ record để inject
    const data = {};
    for (const key in record) {
      if (/^[A-Z]{2,3}\d{2}$/.test(key)) {
        data[key] = record[key] || '';
      }
    }

    // 3. Thay nội dung
    doc.render(data);


    const bufferDocx = doc.getZip().generate({ type: 'nodebuffer' });

    // 4. Ghi file Word đã render
    await fs.writeFile(outputDocxPath, bufferDocx);

    // 5. Convert PDF
    const scriptPath = path.resolve(__dirname, 'convert.ps1');
    const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -inputPath "${outputDocxPath}" -outputPdfPath "${pdfOutputPath}"`;

    await execAsync(command);

   
    console.log(`-- Đã tạo PDF: ${pdfOutputPath} --`);

    await fs.unlink(outputDocxPath)

    return {
      status: 'ok',
      fileName: `${record.KeyID}.pdf`
    };
  } catch (err) {
    console.error(`❌ Lỗi xử lý Word KeyID: ${record.KeyID} --`, err.message);
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
