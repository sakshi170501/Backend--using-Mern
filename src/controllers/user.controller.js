import { asyncHandler } from "../utils/asynhandler.js";
import { ApiError } from "../utils/Apierrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
const generateAccessandrefreshtokens=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforSave:false})
        return {accessToken,refreshToken};
        

    }
    catch(error){
        throw new ApiError(500,"something went wrong while generating refresh and access token")

    }
}

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

const loginUser=asyncHandler(async(req,res)=>{
    //req body->data
    //username or name
    //find the user
    //password check
    //access and refresh token
    //send cookie
    const{email,username,password}=req.body
    if(!username && !  email){
        throw new ApiError(400,"username or email is required")


    }
    const user=await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"user does not exist")
    }
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken}=await generateAccessandrefreshtokens(user._id)
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,
                refreshToken
            },
            "User logged In successfully"
        )
    )

})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
          $set:{
            refreshToken:undefined
          }  
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true,
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out"))


})


const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshhToken=req.cookies.refreshToken || req.body.refreshToken
    
    if(!incomingRefreshhToken){
        throw new ApiError(401,"unauthorized request")
    }
    try {
        const decodedToken=jwt.verify(
            incomingRefreshhToken,
            process.env.REFRESH_TOKEN_SECRET 
    
        )
        const user=await User.findById(decodedToken?._id)
        if(!user ){
            throw new ApiError(401,"INVALID REFRESH TOKEN ")
        }
        if(incomingRefreshhToken !==user?.refreshToken){
            throw new ApiError(401,"Refresh tokken is expired or used ")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
        const {accessToken,newrefreshToken}=await generateAccessandrefreshtokens(user._id)
         return res
         .status(200)
         .cookie("accessToken",accessToken,options)
         .cookie("refreshToken",newrefreshToken,options)
         .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newrefreshToken},
                "Access token   refreshed"
            )
         )
    } catch (error) {
        throw new ApiError(401,error?.message||"Invalid refresh token")
         
        
    }
     

})


const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const{oldPassword,newPassword}=req.body
    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }
    user.password=newPassword
    user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"))

})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(
        new ApiResponse(
        200,
        req.user,
        "current user fetched successfully"
        )
    )
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName||!email){
        throw new ApiError(400,"all fields are required")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email:email
            }
        },
        {new:true}

    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))

})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url

            },
            
        },
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar has been uploaded")
    )
})

const updateUserCover=asyncHandler(async(req,res)=>{
    const coverLocalPath=req.file?.path

    if(!coverLocalPath){
        throw new ApiError(400,"cover file is missing")
    }
    const coverImage=await uploadOnCloudinary(coverLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url

            },
            
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover image has been uploaded")
    )
})

  



export{loginUser,
    registerUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCover
    
        
};
