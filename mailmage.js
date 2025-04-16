const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config()

// Thiết lập kết nối MySQL
const pool = mysql.createPool({
  host: process.env.db_host,
  port: process.env.db_port,
  user: process.env.db_user,
  password: process.env.db_password,
  database: process.env.db_database,
  socketPath: process.env.db_socket, // ✅ dùng socket thay vì host/port

});

async function processRecord(record, connection) {
  try {
    console.log(`-- Đang xử lý HTML KeyID: ${record.KeyID} --`);
    const htmlPath = path.resolve(record.DuongDanHTMLMau);
    const outputPath = path.resolve(record.DuongDanKetQua);

    let htmlContent = await fs.readFile(htmlPath, 'utf-8');

    // Replace AAA01 -> AAA20
    for (let i = 1; i <= 20; i++) {
      const key = `AAA${i.toString().padStart(2, '0')}`;
      const value = record[key] || '';
      const regex = new RegExp(key, 'g'); // Replace tất cả
      htmlContent = htmlContent.replace(regex, value);
    }

    // Ghi file HTML kết quả
    await fs.writeFile(outputPath, htmlContent, 'utf-8');

    console.log(`-- Đã xử lý HTML KeyID: ${record.KeyID} --`);
    return 'ok';

  } catch (err) {
    console.error(`-- Lỗi xử lý HTML KeyID: ${record.KeyID} --`, err);
    return `lỗi: ${err.message}`;
  }
}

async function main() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(`SELECT * FROM MailMage WHERE Status = '0'`);

    for (const record of rows) {
      const result = await processRecord(record, connection); // chạy tuần tự

      await connection.query(`UPDATE MailMage SET Status = ? WHERE KeyID = ?`, [result, record.KeyID]);
    }
  } catch (err) {
    console.error('❌ Lỗi truy vấn MySQL:', err);
  } finally {
    connection.release();
    // await pool.end(); 
  }
}

module.exports = { main }