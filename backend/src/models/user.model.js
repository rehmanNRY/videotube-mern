import mongoose, {Schema} from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
  watchHistory: [{
    type: Schema.Types.ObjectId,
    ref: "Video"
  }],
  username: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
    minLength: 3,
    maxLength: 32,
    index: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
  },
  fullName: {
    type: String,
    required: true,
    minLength: 3,
    maxLength: 32,
    trim: true,
    index: true,
  },
  avatar: {
    type: String, // cloudinary url
    required: true,
  },
  coverImage: {
    type: String,  // cloudinary url
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minLength: 6,
  },
  refreshToken: {
    type: String,
  },
}, {timestamps: true});

userSchema.pre("save", async function(next){
  if(!this.isModified("password")) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = async function(){
  return jwt.sign({
    _id: this._id,
    username: this.username,
    fullName: this.fullName,
    email: this.email
  }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXP
  })
}

userSchema.methods.generateRefreshToken = async function(){
  return jwt.sign({
    _id: this._id,
  }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY
  })
}

export const User = mongoose.model("User", userSchema)