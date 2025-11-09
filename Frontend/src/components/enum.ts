import { ObjectId } from "mongodb";
import { Type } from "../pages/dashboard";

export interface CardProps{
    title: string,
    type: Type,
    link: string,
    _id: ObjectId,
    onDelete?: (id:ObjectId)=>void,
    readOnly?: boolean
}
