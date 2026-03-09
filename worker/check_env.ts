import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

console.log("PLAYWRIGHT_BROWSERS_PATH:", process.env.PLAYWRIGHT_BROWSERS_PATH);
console.log("CWD:", process.cwd());
