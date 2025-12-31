import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"]
    },
    phone: {
        type: String,
        required: [true, "Phone number is required"]

    },
    email: {
        type: String,
        default: null
    },
    category: {
        type: String,
        required: [true, "Category is required"]
    },
    city: {
        type: String,
        required: [true, "City is required"]
    }
})

export const Contact = mongoose.model("Contact", contactSchema);