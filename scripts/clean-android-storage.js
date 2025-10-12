// scripts/clean-android-storage.js
const execSync = require('child_process').execSync;

const packageName = "com.appchatrn"; // đổi nếu bạn đặt tên khác

try {
  console.log("🧹 Dọn rác thiết bị Android...");

  // Gỡ app cũ (nếu còn)
  execSync(`adb uninstall ${packageName}`, { stdio: "inherit" });

  // Xoá cache và dữ liệu
  execSync(`adb shell pm clear ${packageName}`, { stdio: "inherit" });

  // Kiểm tra dung lượng /data
  const output = execSync(`adb shell df -h /data`).toString();
  const match = output.match(/(\d+(?:\.\d+)?)G\s+(\d+(?:\.\d+)?)G\s+(\d+(?:\.\d+)?)M/);

  if (match) {
    const free = parseFloat(match[3]);
    console.log(`📦 Bộ nhớ trống: ${free} MB`);
    if (free < 2000) {
      console.warn("⚠️ Bộ nhớ còn dưới 2 GB — khuyến nghị wipe emulator!");
    }
  }

  console.log("✅ Dọn xong, sẵn sàng build lại.");
} catch (e) {
  console.error("❌ Lỗi khi dọn bộ nhớ:", e.message);
}
