import { v2 as cloudinary } from "cloudinary";

export async function uploadReceiptImage(file) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return {
      provider: "local",
      originalName: file.originalname,
      size: file.size
    };
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "splitsmart-ai/receipts",
    resource_type: "image"
  });

  return {
    provider: "cloudinary",
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height
  };
}
