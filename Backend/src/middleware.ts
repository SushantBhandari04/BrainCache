import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config";
import { UserModel } from "./db";



const UserMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      res.status(401).json({ message: "Authorization token is required" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {username:string, password:string};  // Cast to 'User'

    const {username, password} = decoded;

    const foundUser = await UserModel.findOne({username, password});

    if(!foundUser){
        res.status(401).json({
            message: "No such user exists."
        })
        return;
    }

    req.user = foundUser; // This assumes you added 'user' to the Request interface

    next();
  } catch (e) {
    res.status(401).json({
      message: "Invalid or expired token",
      error: e instanceof jwt.JsonWebTokenError ? e.message : 'Unknown error'
    });
  }
};

export default UserMiddleware
