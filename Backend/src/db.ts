import mongoose, { model } from "mongoose"
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
mongoose.connect("mongodb+srv://sushbh2004:Sushant%402004@cluster0.byi6a.mongodb.net/BrainCache");

const UserSchema = new Schema({
    username: {type:String, required:true, unique:true},
    password: {type:String, required:true},
    firstName: {type:String, required:true},
    lastName: {type:String, required:true},
    address: {type:String, required:true}
});

const contentTypes = ['link','document',"youtube", "twitter"];

const ContentSchema = new Schema({
    title: {type: String, required: true},
    link: {type: String, required: true},
    type: {type: String, enum: contentTypes, required: true},
    userId: {type: ObjectId, ref: 'Users', required: true},
    tags: [{type: ObjectId, ref: 'Tags'}]
})

const TagsSchema = new Schema({
    title: {type:String}
})

const LinkSchema = new Schema({
    hash: {type:String, required:true},
    userId: {type:ObjectId, ref:'Users'},
    contentId: {type:ObjectId, ref:'Contents'}
})

export const UserModel = model("Users",UserSchema);
export const ContentModel = model("Contents",ContentSchema);
export const TagsModel = model("Tags",TagsSchema);
export const LinkModel = model("Links",LinkSchema);