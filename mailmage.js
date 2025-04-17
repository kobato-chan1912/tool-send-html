const sql = require('mssql/msnodesqlv8');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

const pool = new sql.ConnectionPool({
  connectionString: process.env.CONNECTION_STRING
});


async function processRecord(record, connection) {
  try {
    console.log(`-- Đang xử lý HTML KeyID: ${record.KeyID} --`);
    const htmlPath = path.resolve(record.DuongDanHTMLMau);
    const outputPath = path.resolve(record.DuongDanKetQua);

    let htmlContent = await fs.readFile(htmlPath, 'utf-8');

    // Replace all Key BB01, CCC12, ...
    for (const key in record) {
      if (/^[A-Z]{2,3}\d{2}$/.test(key)) {
        const value = record[key] || '';
        const regex = new RegExp(key, 'g');
        htmlContent = htmlContent.replace(regex, value);
      }
    }

    // Rewrite HTML
    await fs.writeFile(outputPath, htmlContent, 'utf-8');

    console.log(`-- Đã xử lý HTML KeyID: ${record.KeyID} --`);
    return 'ok';
  } catch (err) {
    console.error(`-- Lỗi xử lý HTML KeyID: ${record.KeyID} --`, err);
    return `lỗi: ${err.message}`;
  }
}

async function callProcedure(connection, KeyID, DuongDan) {
  try {
    await connection
      .request()
      .input('KeyID_MailMage', sql.UniqueIdentifier, KeyID)
      .input('DuongDan', sql.NVarChar(500), DuongDan)
      .execute('ReturnLinkPDFFromHTML');
    console.log(`-- Đã gọi procedure [ReturnLinkPDFFromHTML] với KeyID: ${KeyID} --`);
  } catch (err) {
    console.error('❌ Lỗi khi gọi procedure:', err);
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

      if (result === 'ok') {
        await callProcedure(connection, record.KeyID, record.DuongDanKetQua);
      }
    }

  } catch (err) {
    console.error('❌ Lỗi kết nối SQL Server:', err);
  } finally {
    pool.close();
  }
}


main()
module.exports = { main };
