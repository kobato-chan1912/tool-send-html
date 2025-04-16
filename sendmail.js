const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs/promises');

// Kết nối MySQL
const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 8889,
  user: 'root',
  password: 'root',
  database: 'CKSCA',
  socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock',
});

async function sendEmail(record, attachments) {
  console.log(`-- Đang gửi mail: ${record.KeyID} --`)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: record.EmailGui,
      pass: record.EmailAppPassword
    }
  });

  const mailOptions = {
    from: record.EmailGui,
    to: record.EmailNhan,
    cc: record.EmailNhanCC || undefined,
    bcc: record.EmailNhanBCC || undefined,
    subject: 'Mail từ Tool MrSon',
    html: record.NoiDungHTML,
    attachments: attachments.map(file => ({
      filename: path.basename(file.DuongDan),
      path: file.DuongDan
    }))
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`-- Đã gửi mail: ${record.KeyID} | ${info.messageId} --`);
    return 'ok';
  } catch (err) {
    console.error(`-- Lỗi gửi mail: ${record.KeyID} --`, err.message);
    return `lỗi: ${err.message}`;
  }
}

async function main() {
  const connection = await pool.getConnection();
  try {
    const [emails] = await connection.query(`SELECT * FROM SendEmail WHERE TrangThai = '0'`);

    for (const record of emails) {
      const [files] = await connection.query(`SELECT * FROM FileDinhKemEmail WHERE KeyID_SendEmail = ?`, [record.KeyID]);
      const result = await sendEmail(record, files);

      await connection.query(`UPDATE SendEmail SET TrangThai = ? WHERE KeyID = ?`, [result, record.KeyID]);
    }
  } catch (err) {
    console.error('❌ Lỗi hệ thống:', err.message);
  } finally {
    connection.release();
    // await pool.end(); 
  }
}


module.exports = { main }