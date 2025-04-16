const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');

// Thiết lập kết nối MySQL
const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 8889,
  user: 'root',
  password: 'root',
  database: 'CKSCA',
  socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock', // ✅ dùng socket thay vì host/port

});

async function processRecord(record, connection) {
  try {
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

    // 
    await connection.query(`UPDATE MailMage SET Status = 1 WHERE KeyID = ?`, [record.KeyID]);

    console.log(`✅ Đã xử lý record KeyID: ${record.KeyID}`);
  } catch (err) {
    console.error(`❌ Lỗi xử lý record KeyID: ${record.KeyID}`, err);
  }
}

async function main() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(`SELECT * FROM MailMage WHERE Status = 0`);

    for (const record of rows) {
      await processRecord(record, connection); // chạy tuần tự
    }
  } catch (err) {
    console.error('❌ Lỗi truy vấn MySQL:', err);
  } finally {
    connection.release();
    await pool.end(); 
  }
}

main();
