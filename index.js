

const mailmage = require("./mailmage.js")
const sendmail = require("./sendmail.js")

async function main() {
    

  await mailmage.main()
  await sendmail.main()


  }
  
  async function loop() {
    while (true) {
      await main();
      await new Promise(resolve => setTimeout(resolve, 5000)); // 
    }
  }
  
  console.log("\n\n--- Chương trình bắt đầu chạy --- \n\n")
  loop();
  