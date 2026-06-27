import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import tasksRouter from "./tasks";
import withdrawalsRouter from "./withdrawals";
import downlineRouter from "./downline";
import adminRouter from "./admin";
import activationRouter from "./activation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(tasksRouter);
router.use(withdrawalsRouter);
router.use(downlineRouter);
router.use(adminRouter);
router.use(activationRouter);

export default router;
