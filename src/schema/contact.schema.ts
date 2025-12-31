import z from "zod";

const categoryOptions = ["Plastic Components", "Injection Moulding", "Tooling Design", "Other"] as const;

const contactSchema = z.object({
    name: z
        .string({"error": "Name is required"})
        .trim()
        .min(2, "Name must be at least 2 characters")
        .regex(/^[a-zA-Z ]+$/, "Please Enter a valid Name"),
    phone: z
        .string({"error": "Phone is required"})
        .trim()
        .regex(/^[6-9][0-9]{9}$/, "Please Enter a valid 10 digit Phone Number"),
    category: z.enum(categoryOptions, {error: "Please select a valid category"}),
    city: z
        .string({error: "City is required"})
        .trim()
        .min(2, "Please Enter a valid City")
        .regex(/^[a-zA-Z ]+$/, "Please Enter a valid City"),
});

type TContact = z.infer<typeof contactSchema>;

export { contactSchema, type TContact, categoryOptions };