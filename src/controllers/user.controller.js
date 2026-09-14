import { asyncHandler } from "../utils/asynhandler.js";
import { ApiError } from "../utils/Apierrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // Get user details
    const { fullName, email, username, password } = req.body;

    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    // Validation
    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Check existing user
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(
            409,
            "User with email or username already exists"
        );
    }

    // Get file paths
    const avatarlocalpath = req.files?.avatar?.[0]?.path;
    const coverimagelocalpath = req.files?.coverImage?.[0]?.path;

    console.log("Avatar local path:", avatarlocalpath);
    console.log("Cover image local path:", coverimagelocalpath);

    // Avatar is required
    if (!avatarlocalpath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload avatar
    const avatar = await uploadOnCloudinary(avatarlocalpath);

    console.log("Avatar Cloudinary response:", avatar);

    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // Upload cover image only if provided
    let coverImage = null;

    if (coverimagelocalpath) {
        coverImage = await uploadOnCloudinary(coverimagelocalpath);

        console.log("Cover Cloudinary response:", coverImage);
    }

    // Create user
    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.secure_url,
        coverImage: coverImage?.secure_url || ""
    });

    // Remove password and refresh token
    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res.status(201).json(
        new ApiResponse(
            200,
            createUser,
            "User registered successfully"
        )
    );
});

export { registerUser };