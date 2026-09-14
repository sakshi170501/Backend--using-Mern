import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

console.log("CLOUDINARY FILE LOADED");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log(
    "Cloudinary API Key:",
    cloudinary.config().api_key ? "FOUND" : "MISSING"
);

console.log(
    "Cloudinary Cloud Name:",
    process.env.CLOUDINARY_CLOUD_NAME ? "FOUND" : "MISSING"
);

console.log(
    "Cloudinary Secret:",
    process.env.CLOUDINARY_API_SECRET ? "FOUND" : "MISSING"
);

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            console.log("No local file path");
            return null;
        }

        console.log("Local file:", localFilePath);

        if (!fs.existsSync(localFilePath)) {
            console.log("File does not exist:", localFilePath);
            return null;
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        console.log("File uploaded successfully");
        console.log("URL:", response.secure_url);

        // Delete local file after successful upload
        try {
            fs.unlinkSync(localFilePath);
            console.log("Local file deleted");
        } catch (deleteError) {
            console.log("Could not delete local file:", deleteError);
        }

        return response;

    } catch (error) {
        console.log("========== CLOUDINARY ERROR ==========");
        console.log(error);
        console.log("======================================");

        throw error;
    }
};

export { uploadOnCloudinary };