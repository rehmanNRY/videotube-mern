import dotenv from 'dotenv'
import connectToDb from "./db/index.js"
import {app} from "./app.js"
dotenv.config({path: "./.env"})


connectToDb()
.then(()=>{
  app.on("error", ()=>{
    console.log("error", error);
  })
  app.listen(process.env.PORT || 8000,()=>{
    console.log(`App is listening on port: ${process.env.PORT}`);
  })
})
.catch((error)=>{
  console.log("Mongo db connection failed", error)
})


/*

import mongoose from "mongoose";
import { DB_NAME } from "./constants";
import express from "express"

const app = express();

( async ()=>{
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    app.on("error", ()=>{
      console.log("error", error);
      throw error
    })
    app.listen(process.env.PORT, ()=>{
      console.log(`App is listening on port ${PORT}`);
    })
  } catch (error) {
    console.error("error", error)
    throw error;
  }
})()
  */