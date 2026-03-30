import { Request, Response } from "express";

const testFlowsRouter = {
  getSystemStatus: async (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  },
  listAllFlows: async (req: Request, res: Response) => {
    res.json({ flows: [] });
  },
  activateFlow: async (req: Request, res: Response) => {
    res.json({ success: true });
  },
  simulateMessage: async (req: Request, res: Response) => {
    res.json({ success: true });
  },
  triggerFlowManually: async (req: Request, res: Response) => {
    res.json({ success: true });
  },
  listRecentMessages: async (req: Request, res: Response) => {
    res.json({ messages: [] });
  },
  healthCheck: async (req: Request, res: Response) => {
    res.json({ status: "ok" });
  },
  clearTestMessages: async (req: Request, res: Response) => {
    res.json({ success: true });
  },
};

export default testFlowsRouter;
