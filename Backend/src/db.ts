import dotenv from "dotenv";
dotenv.config();

import mongoose, { model } from "mongoose"
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
mongoose.connect(process.env.MONGO_URI || "");

const UserSchema = new Schema({
    email: {type:String, required:true, unique:true},
    firstName: {type:String},
    lastName: {type:String},
    address: {type:String},
    googleId: {type:String},
    otpHash: {type:String},
    otpExpiresAt: {type:Date},
    otpLastSentAt: {type:Date},
    subscriptionPlan: {type:String, enum: ["free","pro"], default: "free"}
}, {
    timestamps: true
});

// Drop old username index if it exists (migration from old schema)
mongoose.connection.once('open', async () => {
    try {
        const collection = mongoose.connection.collection('users');
        const indexes = await collection.indexes();
        const usernameIndex = indexes.find((idx: any) => idx.name === 'username_1' || (idx.key && idx.key.username));
        if (usernameIndex) {
            await collection.dropIndex('username_1');
            console.log('✓ Dropped old username index');
        }
    } catch (err: any) {
        if (err.code !== 27 && err.codeName !== 'IndexNotFound') {
            console.error('Error dropping username index:', err.message);
        }
    }
});

const contentTypes = ['link','document',"youtube", "twitter", "article", "note"];

const SpaceSchema = new Schema({
    name: {type: String, required: true},
    description: {type: String},
    userId: {type: ObjectId, ref: 'Users', required: true}
}, {
    timestamps: true
});

const ContentSchema = new Schema({
    title: {type: String, required: true},
    link: {type: String, required: false},
    body: {type: String, required: false},
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

const ShareAccessSchema = new Schema({
    resourceType: {type: String, enum: ['space', 'content'], required: true},
    resourceId: {type: ObjectId, required: true},
    ownerId: {type: ObjectId, ref: 'Users', required: true},
    sharedWithId: {type: ObjectId, ref: 'Users', required: true},
    permissions: {type: String, enum: ['read', 'read-write'], default: 'read'}
}, {
    timestamps: true
})

// Compound index to prevent duplicate shares
ShareAccessSchema.index({ resourceType: 1, resourceId: 1, sharedWithId: 1 }, { unique: true });

const SpaceCommentSchema = new Schema({
    spaceId: {type: ObjectId, ref: 'Spaces', required: true},
    userId: {type: ObjectId, ref: 'Users', required: true},
    comment: {type: String, required: true, maxlength: 2000},
    edited: {type: Boolean, default: false}
}, {
    timestamps: true
});

// Index for faster queries
SpaceCommentSchema.index({ spaceId: 1, createdAt: -1 });

export const UserModel = model("Users",UserSchema);
export const ContentModel = model("Contents",ContentSchema);
export const TagsModel = model("Tags",TagsSchema);
export const SpaceModel = model("Spaces",SpaceSchema);
export const LinkModel = model("Links",LinkSchema);
export const ShareAccessModel = model("ShareAccess", ShareAccessSchema);
export const SpaceCommentModel = model("SpaceComments", SpaceCommentSchema);