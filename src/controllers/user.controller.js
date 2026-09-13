import { asyncHandler } from "../utils/asynhandler.js";

const registerUser=asyncHandler(async(requestAnimationFrame,res)=>{
    res.status(200).json({
        message:"sakshi is best"
    })
})

export {registerUser}