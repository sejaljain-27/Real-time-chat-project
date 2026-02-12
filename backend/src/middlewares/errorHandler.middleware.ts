import {ErrorRequestHandler} from "express";
import { HTTPSTATUS } from "../config/http.config";
import { AppError, ErrorCodes } from "../utils/app-error";



export const errorHandler:ErrorRequestHandler=(
  error,
  req,
  res,
  next
):any=>{
  console.log(`error occurred:${req.path}`,error);

  if (error instanceof AppError){
    return res.status(error.statusCode).json({
      message:error.message,
      errorCode:error.errorCode,
    });
  }




  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message:'An unexpected error occurred',
    error:error?.message || 'Internal Server Error',
    errorCode:ErrorCodes.ERR_INTERNAL,
  });

}