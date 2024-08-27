
const asyncHandler = (requestHandler)=>{
  return (req, res, next)=>{
    Promise.resolve(requestHandler(req, res, next)).catch((err)=>{
       next(err)
    })
  }
}


export {asyncHandler}


// Try catch method

// const asyncHandler = (fn) => async (req, res, next)=>{
//   try {
//     await fn(req, res, next)
//   } catch (err) {
//     console.log("error", err)
//     res.status(err.code || 500).json({
//       success: false,
//       message: err.message
//     })
//   }
// }

// export {asyncHandler}
