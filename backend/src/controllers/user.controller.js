import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error while generating access and refresh token")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;
  if ([username, email, fullName, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All details must be required");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })
  if (existedUser) {
    throw new ApiError(409, "User already exist in the database");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverLocalPath = req.files?.coverImage[0]?.path;
  let coverLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password
  });
  const createdUser = await User.findById(user._id).select("-password -refreshToken");
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering a user");
  }

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User created Successfully")
  )
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  if ((!email && !username) || !password) {
    throw new ApiError(400, "Email/Username and password are required");
  }
  const user = await User.findOne({
    $or: [{ email }, { username }]
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const checkPassword = await user.isPasswordCorrect(password);
  if (!checkPassword) {
    throw new ApiError(401, "Incorrect user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
  const cookieOption = {
    httpOnly: true,
    secure: true
  }
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOption)
    .cookie("refreshToken", refreshToken, cookieOption)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "logged in user successfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, {
    $set: { refreshToken: undefined }
  }, { new: true })
  const cookieOption = {
    httpOnly: true,
    secure: true
  }
  return res
    .status(200)
    .clearCookie("accessToken", cookieOption)
    .clearCookie("refreshToken", cookieOption)
    .json(new ApiResponse(200, {}, "Logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshtoken || req.body.refreshtoken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }
  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }
    if (!(user.refreshToken === incomingRefreshToken)) {
      throw new ApiError(401, "refresh token is expired or used");
    }
    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user._id);
    const cookieOption = {
      httpOnly: true,
      secure: true
    }
    return res
      .status(200)
      .cookie("refreshToken", refreshToken, cookieOption)
      .cookie("accessToken", accessToken, cookieOption)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(200, {}, "Password updated successfully");
})

const getCurrentUser = asyncHandler(async (req, res) => {
  // const user = await User.findById(req.user?._id).select("-password -refreshToken");
  return res.status(200).json(new ApiResponse(200, req.user, "User get succesfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "Email and full name is required");
  }
  const user = await User.findByIdAndUpdate(req.user?._id,
    { $set: { fullName, email } },
    { new: true }
  ).select("-password")
  return res.status(200).json(new ApiResponse(200, user, "user updated successfully"))
})

const updateAvatar = asyncHandler(async (req, res)=>{
  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath){
    return new ApiError(400, "Cannot find Avatar path");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if(!avatar.url){
    return new ApiError(401, "Error while uploading avatar");
  }
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {avatar: avatar.url}
  }, {new: true}).select("-password -refreshToken")
  return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateCoverImage = asyncHandler(async (req, res)=>{
  const coverLocalPath = req.file?.path;
  if(!coverLocalPath){
    return new ApiError(400, "Cannot find cover image path");
  }
  const coverImage = await uploadOnCloudinary(coverLocalPath);
  if(!coverImage.url){
    return new ApiError(401, "Error while uploading cover image");
  }
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {coverImage: coverImage.url}
  }, {new: true}).select("-password -refreshToken")
  return res.status(200).json(new ApiResponse(200, user, "Cover updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res)=>{
  const {username} = req.params;
  if(!username?.trim()){
    throw new ApiError(400, "cannot get username");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        }, 
        channelSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(404, "channel doesn't exist")
  }
  return res.status(200).json(new ApiResponse(200, channel[0], "User Channel fetched successfully"))

})





export { registerUser, loginUser, logoutUser }