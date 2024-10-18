import { z } from 'zod';

export const addressSchema = z.object({
    address: z.string().min(5, "Address is required and must be at least 5 characters"),
    nickname: z.string(),
    contactName: z.string().min(1, "Contact name is required"),
    mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(15, "Mobile number must be at most 15 digits"),
    latitude: z.number().min(-90, "Latitude must be at least -90").max(90, "Latitude must be at most 90"),
    longitude: z.number().min(-180, "Longitude must be at least -180").max(180, "Longitude must be at most 180"),
});

// with id
export const locationModalSchema = addressSchema.extend({
    id: z.string(),
});

export const userRoleSchema = z.object({
    role: z.enum(["USER", "DRIVER"]),
    vehicleClass: z.string().optional()
}).superRefine((data) => {
    if (data.role === "DRIVER" && !data.vehicleClass) {
        return { vehicleClass: "Vehicle class is required" }
    }
    return {};
}
);

export const locationSchema = z.object({
    latitude: z.number().min(-90, "Latitude must be at least -90").max(90, "Latitude must be at most 90"),
    longitude: z.number().min(-180, "Longitude must be at least -180").max(180, "Longitude must be at most 180"),
});
export const availablitySchema = z.object({
    available: z.boolean(),
    location: locationSchema.optional()
});

export const bookingSchema = z.object({
    vehicleClass: z.string(),
    pickupAddressId: z.string(),
    deliveryAddressId: z.string(),
    distance: z.number(),
    duration: z.number(),
    price: z.number(),
});