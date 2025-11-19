import mongoose, { model } from "mongoose"
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
mongoose.connect("mongodb+srv://sushbh2004:Sushant%402004@cluster0.byi6a.mongodb.net/BrainCache");

const UserSchema = new Schema({
    username: {type:String, required:true, unique:true},
    password: {type:String, required:true},
    firstName: {type:String, required:true},
    lastName: {type:String, required:true},
    address: {type:String, required:true},
    subscriptionPlan: {type:String, enum: ["free","pro"], default: "free"}
});

const contentTypes = ['link','document',"youtube", "twitter"];

const SpaceSchema = new Schema({
    name: {type: String, required: true},
    description: {type: String},
    userId: {type: ObjectId, ref: 'Users', required: true}
}, {
    timestamps: true
});

const ContentSchema = new Schema({
    title: {type: String, required: true},
    link: {type: String, required: true},
    type: {type: String, enum: contentTypes, required: true},
    userId: {type: ObjectId, ref: 'Users', required: true},
    spaceId: {type: ObjectId, ref: 'Spaces'},
    tags: [{type: ObjectId, ref: 'Tags'}]
}, {
    timestamps: true
})

const TagsSchema = new Schema({
    title: {type:String}
})

const LinkSchema = new Schema({
    hash: {type:String, required:true},
    userId: {type:ObjectId, ref:'Users'},
    contentId: {type:ObjectId, ref:'Contents'},
    spaceId: {type:ObjectId, ref:'Spaces'}
}, {
    timestamps: true
})

export const UserModel = model("Users",UserSchema);
export const ContentModel = model("Contents",ContentSchema);
export const TagsModel = model("Tags",TagsSchema);
export const SpaceModel = model("Spaces",SpaceSchema);
export const LinkModel = model("Links",LinkSchema);