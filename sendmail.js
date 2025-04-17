const sql = require('mssql/msnodesqlv8');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs/promises');
require('dotenv').config();

// Connect SQL Server
const pool = new sql.ConnectionPool({
  connectionString: process.env.CONNECTION_STRING

});

async function sendEmail(record, attachments) {
  console.log(`-- Đang gửi mail: ${record.KeyID} --`)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: record.EmailGui,
      pass: record.EmailAPI
    }
  });

  const mailOptions = {
    from: record.EmailGui,
    to: record.EmailNhan,
    cc: record.EmailNhanCC || undefined,
    bcc: record.EmailNhanBCC || undefined,
    subject: record.TieuDeEmail,
    html: record.NoiDungHTML,
    attachments: attachments.map(file => ({
      filename: path.basename(file.DuongDan),
      path: file.DuongDan.replace(/^[^\w]*([A-Za-z]:\\)/, '$1')
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
  try {
    await pool.connect();
    const result = await pool.request()
      .query(`SELECT * FROM SendEmail WHERE TrangThai = '0'`);

    const emails = result.recordset;

    for (const record of emails) {
      const filesResult = await pool.request()
        .input('KeyID_SendEmail', sql.UniqueIdentifier, record.KeyID)
        .query(`SELECT * FROM FileDinhKemEmail WHERE KeyID_SendEmail = @KeyID_SendEmail`);

      const files = filesResult.recordset;

      const sendResult = await sendEmail(record, files);

      // Call procedure ReturnStatusSendEmail
      await pool.request()
        .input('KeyID_SendEmail', sql.UniqueIdentifier, record.KeyID)
        .input('TrangThai', sql.NVarChar, sendResult)
        .query(`EXEC ReturnStatusSendEmail @KeyID_SendEmail, @TrangThai`);


      console.log(`-- Đã gọi procedure [ReturnStatusSendEmail] với KeyID: ${KeyID} --`);

    }

  } catch (err) {
    // console.error('❌ Lỗi hệ thống:', err.message);
  } finally {
    pool.close(); // close connect
  }
}



module.exports = { main }
