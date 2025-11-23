import { ObjectId } from "mongodb";
import { Type } from "../pages/dashboard";

export interface CardProps{
    title: string,
    type: Type,
    link?: string,
    body?: string,
    _id: ObjectId,
    onDelete?: (id:ObjectId)=>Promise<void>,
    readOnly?: boolean
}
