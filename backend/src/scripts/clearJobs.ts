/**
 * Script xóa tất cả các job/run cũ trong database
 * Cách dùng: npx tsx src/scripts/clearJobs.ts
 */
import { db } from "../db/index.js";
import { runs, responses } from "../db/schema.js";

async function clearJobs() {
  console.log("🗑️  Bắt đầu xóa các job cũ...");

  try {
    // Xóa tất cả responses trước
    await db.delete(responses);
    console.log("✅ Đã xóa tất cả responses");

    // Xóa tất cả runs
    await db.delete(runs);
    console.log("✅ Đã xóa tất cả runs");

    console.log("🎉 Hoàn tất! Tất cả job đã được xóa.");
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }

  process.exit(0);
}

clearJobs();
