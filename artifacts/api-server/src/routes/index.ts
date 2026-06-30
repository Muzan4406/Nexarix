import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import tasksRouter from "./tasks";
import withdrawalsRouter from "./withdrawals";
import downlineRouter from "./downline";
import adminRouter from "./admin";
import activationRouter from "./activation";
import telegramRouter from "./telegram";
import storeRouter from "./store";
import formationsRouter from "./formations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(tasksRouter);
router.use(withdrawalsRouter);
router.use(downlineRouter);
router.use(adminRouter);
router.use(activationRouter);
router.use(telegramRouter);
router.use(storeRouter);
router.use(formationsRouter);

export default router;
