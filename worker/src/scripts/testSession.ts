/**
 * Test script to verify the browser can use saved session
 */
import { browserPool } from "../browsers/browserPool.js";

async function test() {
  console.log("Testing browser pool with ChatGPT...");

  try {
    const context = await browserPool.getContext("ChatGPT");
    console.log("Context obtained");

    const page = await context.newPage();
    console.log("Page created");

    await page.goto("https://chatgpt.com", { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("Page loaded");

    await page.waitForTimeout(3000);

    // Check if logged in
    const chatInput = await page.$('div[contenteditable="true"]');
    if (chatInput) {
      console.log("SUCCESS: Chat input found - logged in!");
    } else {
      console.log("NOT logged in - need to login again");
    }

    await browserPool.closeAll();
    process.exit(0);

  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

test();
