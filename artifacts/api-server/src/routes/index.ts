import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import leadsRouter from "./leads";
import activitiesRouter from "./activities";
import bookingsRouter from "./bookings";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";
import automationRouter from "./automation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(leadsRouter);
router.use(activitiesRouter);
router.use(bookingsRouter);
router.use(paymentsRouter);
router.use(dashboardRouter);
router.use(automationRouter);

export default router;
