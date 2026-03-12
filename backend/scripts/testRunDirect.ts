import "dotenv/config";
import jwt from "jsonwebtoken";
import db from "../src/db/index";

async function test() {
  try {
    const user = await db.query.users.findFirst();
    const project = await db.query.projects.findFirst();
    const promptArray = await db.query.prompts.findMany();
    const engines = await db.query.aiEngines.findMany({
      where: (e, { eq }) => eq(e.isActive, true),
    });

    if (!user || !project) {
      console.error("No user or project found in DB");
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
    );

    console.log(
      "Triggering run for promptIds:",
      promptArray.map((p: any) => p.id),
      "engineIds:",
      engines.map((e: any) => e.id),
    );

    const runRes = await fetch("http://localhost:3000/api/runs/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        promptIds: promptArray.map((p: any) => p.id),
        engineIds: engines.map((e: any) => e.id),
      }),
    });

    const data = await runRes.json();
    if (!runRes.ok) {
      console.error("Run failed with status:", runRes.status);
      console.error("Response data:", data);
    } else {
      console.log("Run success:", data);
    }
  } catch (error: any) {
    console.error("Request failed completely:", error.message);
  }
  process.exit(0);
}

test();
