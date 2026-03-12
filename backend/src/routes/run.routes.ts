import { Router } from "express";
import * as runController from "../controllers/run.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post("/run", authenticate, runController.triggerRun);
router.get("/", authenticate, runController.getRuns);
router.get(
  "/projects/:projectId/status",
  authenticate,
  runController.getProjectRunStatus,
);
router.get("/:id", authenticate, runController.getRun);

export default router;
