// tool.js

async function main() {
    console.log("Đang chạy hàm main vào lúc:", new Date().toLocaleString());
    
    // Giả lập xử lý mất 2-3 giây
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("Hoàn thành hàm main vào lúc:", new Date().toLocaleString());
  }
  
  async function loop() {
    while (true) {
      await main();
      await new Promise(resolve => setTimeout(resolve, 5000)); // đợi 5 giây sau khi main() hoàn thành
    }
  }
  
  main();
  