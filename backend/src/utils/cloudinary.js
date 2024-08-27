import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLODUINARY_CLOUD_NAME,
  api_key: process.env.CLODUINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    })
    // console.log("File uploaded on cloudinary successfully", uploadResult.url);
    fs.unlinkSync(localFilePath)
    return uploadResult
  } catch (error) {
    // fs.unlinkSync(localFilePath)
    return null;
  }
}

export {uploadOnCloudinary}