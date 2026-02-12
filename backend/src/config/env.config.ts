import {getEnv} from  "../utils/get_env";
import dotenv from 'dotenv';
export const envConfig = {
  port: parseInt(getEnv('PORT'), 10) || 3000,
  databaseUrl: getEnv('DATABASE_URL'),
  jwtSecret: getEnv('JWT_SECRET'),
  nodeEnv: getEnv('NODE_ENV') || 'development',
  frontend_origin: getEnv('FRONTEND_ORIGIN') || 'http://localhost:3000',
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN') || '1h',
  


  
};  

