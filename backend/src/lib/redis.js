import { Redis } from "@upstash/redis";
import config from "../config.js";

// Build a singleton Redis client if credentials are provided
let redisClient = null;

if (config.REDIS_URL && config.REDIS_TOKEN) {
  try {
    redisClient = new Redis({
      url: config.REDIS_URL,
      token: config.REDIS_TOKEN,
    });
  } catch (err) {
    console.error("Failed to initialize Redis client", err);
    redisClient = null;
  }
}

export function getRedisClient() {
  return redisClient;
}

export function isRedisEnabled() {
  return Boolean(redisClient);
}
