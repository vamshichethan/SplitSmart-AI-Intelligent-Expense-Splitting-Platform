import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { notifications } from "../data.js";
import { sendReminderEmail } from "./email.js";
import { persistState } from "./persistence.js";
import { publishRealtimeEvent } from "./realtime.js";

const QUEUE_NAME = "splitsmart-jobs";
let connection = null;
let queue = null;
let worker = null;

export async function initializeQueues() {
  if (!process.env.REDIS_URL) {
    return { enabled: false, mode: "inline" };
  }

  if (queue && worker) {
    return { enabled: true, mode: "redis" };
  }

  connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
  });
  queue = new Queue(QUEUE_NAME, { connection });
  worker = new Worker(QUEUE_NAME, processJob, { connection });
  worker.on("failed", (job, error) => {
    console.error(`Queue job ${job?.id ?? "unknown"} failed`, error);
  });

  return { enabled: true, mode: "redis" };
}

export async function enqueueReminderEmailJob(payload) {
  if (!queue) {
    return processReminderEmailJob(payload);
  }

  return queue.add("reminder-email", payload, retryOptions());
}

export async function enqueueSettlementProcessingJob(payload) {
  if (!queue) {
    return processSettlementProcessingJob(payload);
  }

  return queue.add("settlement-processing", payload, retryOptions());
}

export async function closeQueues() {
  await worker?.close();
  await queue?.close();
  await connection?.quit();
  worker = null;
  queue = null;
  connection = null;
}

async function processJob(job) {
  if (job.name === "reminder-email") {
    return processReminderEmailJob(job.data);
  }

  if (job.name === "settlement-processing") {
    return processSettlementProcessingJob(job.data);
  }

  throw new Error(`Unknown queue job: ${job.name}`);
}

async function processReminderEmailJob({ notificationId, to, subject, text, groupId }) {
  const notification = notifications.find((item) => item.id === notificationId);
  const emailResult = await sendReminderEmail({ to, subject, text });

  if (notification) {
    notification.status = emailResult.skipped ? "smtp_not_configured" : "email_sent";
    notification.provider = emailResult.skipped ? "local" : "smtp";
    notification.providerMessage = emailResult.reason ?? emailResult.messageId;
    notification.sentAt = new Date().toISOString();
  }

  publishRealtimeEvent({
    type: "notification:updated",
    groupId,
    payload: { notificationId, status: notification?.status ?? "sent" }
  });
  await persistState();

  return { notificationId, status: notification?.status ?? "sent" };
}

async function processSettlementProcessingJob({ groupId, paymentId, method, amount }) {
  publishRealtimeEvent({
    type: "settlement:processed",
    groupId,
    payload: { paymentId, method, amount }
  });
  await persistState();

  return { paymentId, status: "processed" };
}

function retryOptions() {
  return {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  };
}
