import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const IMAGE_MIME_PATTERN = /^image\/(jpeg|png|webp)$/;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const imageUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  fileFilter: (_req, file, cb) =>
    cb(null, IMAGE_MIME_PATTERN.test(file.mimetype)),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
};
