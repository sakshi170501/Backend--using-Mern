import { asyncHandler } from "../utils/asynhandler.js";
import { ApiError } from "../utils/Apierrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {

    // get user details from frontend

    // validation-not empty

    // check if user already exist: username,email

    // check for images, check for avatar

    // upload them to cloudinary

    // create user object-create entry in db

    // remove password and refresh token field from response

    // check for user creation

    // return res else return error

    const { fullName, email, username, password } = req.body;

    console.log("BODY:", req.body);

    if (
        [fullName, email, username].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "all fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(
            409,
            "User with email or username already exists"
        );
    }

    const avatarlocalpath = req.files?.avatar?.[0]?.path;
    const coverimagelocalpath = req.files?.coverImage?.[0]?.path;

    if (!avatarlocalpath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarlocalpath);
    const coverImage = await uploadOnCloudinary(coverimagelocalpath);

    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    console.log("avatarURL:", avatar);

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.secure_url,
        coverImage: coverImage?.secure_url || ""
    });

    const createUser = await User.findById(user._id)
        .select("-password -refreshToken");

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