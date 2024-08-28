
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js"

export const verifyJwt = asyncHandler(async(req, _, next)=>{
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    if(!token){
      throw new ApiError(401, "Authenticate using the valid token");
    }
    const verifiedJwt = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    if(!verifiedJwt){
      throw new ApiError(401, "Authenticate using the valid token");
    }
    const user = await User.findById(verifiedJwt._id);
    if(!user){
      throw new ApiError(401, "Invalid access token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Cannot verify token")
  }
})