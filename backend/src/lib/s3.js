import { S3Client } from "@aws-sdk/client-s3";
import config from "../config.js";

// Configure S3 client with explicit region and endpoint to avoid redirects
const region = config.AWS_REGION || process.env.AWS_REGION || "eu-north-1";
const endpoint = `https://s3.${region}.amazonaws.com`;

export const s3Client = new S3Client({
  region,
  endpoint,
  credentials:
    config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export default s3Client;
