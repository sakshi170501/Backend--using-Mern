const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            console.log("No local file path");
            return null;
        }

        console.log("Local file:", localFilePath);

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        console.log("File uploaded successfully");
        console.log("URL:", response.secure_url);

        fs.unlinkSync(localFilePath);

        return response;

    } catch (error) {
        console.log("CLOUDINARY ERROR:", error);
        return null;
    }
};

export {uploadOnCloudinary};