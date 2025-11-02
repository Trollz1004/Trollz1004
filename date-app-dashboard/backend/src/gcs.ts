import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

const storage = new Storage();

const bucketName = process.env.GCS_BUCKET_NAME as string;

export const uploadFile = async (file: Express.Multer.File): Promise<string> => {
  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(`${uuidv4()}-${file.originalname}`);

  const blobStream = blob.createWriteStream({
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      logger.error('Error uploading to GCS:', err);
      reject(err);
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
};
